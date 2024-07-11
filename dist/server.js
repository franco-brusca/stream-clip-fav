"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const worker_threads_1 = require("worker_threads");
const bull_1 = __importDefault(require("bull"));
const path_1 = __importDefault(require("path"));
const clipExtractor_1 = require("./clipExtractor");
const videoProcessor_1 = require("./videoProcessor");
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./tools/utils");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
// Obtener las configuraciones de Redis de las variables de entorno
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379; // Convertir REDIS_PORT a número
// Crear una cola de trabajos con la configuración de Redis
const jobQueue = new bull_1.default('jobQueue', {
    redis: {
        host: REDIS_HOST,
        port: REDIS_PORT
    }
});
app.get('/', (req, res) => {
    console.log('GET /');
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
// Endpoint para encolar un trabajo
app.post('/enqueue', async (req, res) => {
    console.log('GET /enqueue');
    const job = await jobQueue.add(req.body);
    res.json({ jobId: job.id });
});
// Endpoint para consultar el estado de un trabajo
app.get('/status/:id', async (req, res) => {
    const job = await jobQueue.getJob(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    const status = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    res.json({ status, progress, result });
});
app.get('/clipInfo', async (req, res) => {
    console.log('GET /clipInfo');
    const { url } = req.body;
    const clipInfo = await (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    else {
        const ytUrl = (0, utils_1.getUrlFromId)(clipInfo);
        const info = await ytdl_core_1.default.getInfo(ytUrl.fullUrl);
        const qualities = info.formats.filter(t => t.hasVideo && t.container == "mp4").map(i => { return { quality: i.quality, qualityLabel: i.qualityLabel, url: i.url }; });
        res.status(200).json({ clipInfo: clipInfo, qualities: qualities });
    }
});
app.post('/download', async (req, res) => {
    const { url, quality = 'highest' } = req.body;
    console.log('POST /download', url);
    const clipInfo = await (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
    console.log(`Video URL: ${videoUrl}`);
    await (0, videoProcessor_1.downloadAndProcessVideo)(videoUrl, clipInfo, quality, req, res);
});
// Endpoint para servir el archivo finalizado
app.post('/download-file', (req, res) => {
    const { file } = req.body;
    if (!file) {
        return res.status(404).send('No file available');
    }
    res.download(file, 'clip.mp4', (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error sending file');
        }
        else {
            // Eliminar el archivo después de enviarlo
            fs_1.default.unlink(file, () => { });
        }
    });
});
const CONCURRENCY = 4;
jobQueue.process(CONCURRENCY, async (job, done) => {
    const worker = new worker_threads_1.Worker('./dist/tasks/worker.js', { workerData: job.data });
    worker.on('message', (message) => {
        if (message.error) {
            done(new Error(message.error));
        }
        else if (message.result) {
            job.progress(100);
            done(null, message.data);
        }
        else {
            job.progress(message);
        }
    });
    worker.on('error', (error) => done(error));
    worker.on('exit', (code) => {
        if (code !== 0) {
            done(new Error(`Worker stopped with exit code ${code}`));
        }
    });
});
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
