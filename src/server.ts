import express, { Request, Response } from 'express';
import path from 'path';
import { extractVideoIdAndClipTimes } from './clipExtractor';
import { downloadAndProcessVideo } from './videoProcessor';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(compression())

app.get('/', (req: Request, res: Response) => {
  console.log('GET /');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.post('/download', async (req, res) => {
  const { url, quality = 'highest' }: { url: string, quality: string } = req.body;
  console.log('POST /download', url);

  const clipInfo = await extractVideoIdAndClipTimes(url);
  if (!clipInfo) {
    console.log('Clip no encontrado');
    return res.status(400).json({ error: 'Clip no encontrado' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
  console.log(`Video URL: ${videoUrl}`);

  await downloadAndProcessVideo(videoUrl, clipInfo, quality, req, res);
});

// Endpoint para servir el archivo finalizado
app.post('/download-file', (req, res) => {
  const { file }: {file: string} = req.body;
  if (!file) {
    return res.status(404).send('No file available');
  }
  res.download(file, 'clip.mp4', (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error sending file');
    } else {
      // Eliminar el archivo después de enviarlo
      fs.unlink(file, () => {});
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
