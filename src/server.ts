import express, { Request, Response } from 'express';
import path from 'path'; // Asegurar que path está importado
import { extractVideoIdAndClipTimes } from './clipExtractor';
import { downloadAndProcessVideo } from './videoProcessor';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  console.log('GET /');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.post('/download', async (req: Request, res: Response) => {
  const { url, quality = 'lowest' }: { url: string, quality: string } = req.body;
  console.log('POST /download', url);

  const clipInfo = await extractVideoIdAndClipTimes(url);
  if (!clipInfo) {
    console.log('Clip no encontrado');
    return res.status(400).json({ error: 'Clip no encontrado' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
  console.log(`Video URL: ${videoUrl}`);

  await downloadAndProcessVideo(videoUrl, clipInfo, quality, res);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
