import express, { Request, Response } from "express";
import { Worker } from "worker_threads";
import Queue from "bull";
import path from "path";
import { extractVideoIdAndClipTimes } from "./clipExtractor";
import { downloadAndProcessVideo } from "./videoProcessor";
import cors from "cors";
import compression from "compression";
import fs from "fs";
import { getUrlFromId, YoutubeUrl } from "./tools/utils";
import ytdl from "@distube/ytdl-core";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(compression());

// Obtener las configuraciones de Redis de las variables de entorno
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379; // Convertir REDIS_PORT a número

// Crear una cola de trabajos con la configuración de Redis
const jobQueue = new Queue("jobQueue", {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

app.get("/", (req: Request, res: Response) => {
  console.log("GET /");
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Endpoint para encolar un trabajo
app.post("/enqueue", async (req, res) => {
  console.log("GET /enqueue");
  const job = await jobQueue.add(req.body);
  res.json({ jobId: job.id });
});

// Endpoint para consultar el estado de un trabajo
app.get("/status/:id", async (req, res) => {
  const job = await jobQueue.getJob(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const status = await job.getState();
  const progress = job.progress();
  const result = job.returnvalue;

  res.json({ status, progress, result });
});

app.get("/clipInfo", async (req: Request, res: Response) => {
  console.log("GET /clipInfo");
  const { url }: { url: string } = req.body;
  const clipInfo = await extractVideoIdAndClipTimes(url);
  if (!clipInfo) {
    console.log("Clip no encontrado");
    return res.status(400).json({ error: "Clip no encontrado" });
  } else {
    const ytUrl: YoutubeUrl = getUrlFromId(clipInfo);
    const info = await ytdl.getInfo(ytUrl.fullUrl);
    const qualities = info.formats
      .filter((t) => t.hasVideo && t.container == "mp4")
      .map((i) => {
        console.log({ i });
        return { quality: i.quality, qualityLabel: i.qualityLabel, url: i.url };
      });
    res.status(200).json({ clipInfo: clipInfo, qualities: qualities });
  }
});

app.post("/download", async (req, res) => {
  const { url, quality = "highest" }: { url: string; quality: string } =
    req.body;
  console.log("POST /download", url);

  const clipInfo = await extractVideoIdAndClipTimes(url);
  if (!clipInfo) {
    console.log("Clip no encontrado");
    return res.status(400).json({ error: "Clip no encontrado" });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
  console.log(`Video URL: ${videoUrl}`);

  await downloadAndProcessVideo(videoUrl, clipInfo, quality, req, res);
});

// Endpoint para servir el archivo finalizado
app.post("/download-file", (req, res) => {
  const { file }: { file: string } = req.body;
  if (!file) {
    return res.status(404).send("No file available");
  }
  res.download(file, "clip.mp4", (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(500).send("Error sending file");
    } else {
      // Eliminar el archivo después de enviarlo
      fs.unlink(file, () => {});
    }
  });
});

const CONCURRENCY = 4;
jobQueue.process(CONCURRENCY, async (job, done) => {
  const worker = new Worker("./dist/tasks/worker.js", { workerData: job.data });

  worker.on("message", (message) => {
    if (message.error) {
      done(new Error(message.error));
    } else if (message.result) {
      job.progress(100);
      done(null, message.data);
    } else {
      job.progress(message);
    }
  });

  worker.on("error", (error) => done(error));
  worker.on("exit", (code) => {
    if (code !== 0) {
      done(new Error(`Worker stopped with exit code ${code}`));
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
