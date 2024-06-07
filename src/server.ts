import express, { Request, Response } from 'express';
import path from 'path';
import ytdl from 'ytdl-core';
import axios from 'axios';
import cheerio from 'cheerio';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Verificar la disponibilidad de ffmpeg
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) {
    console.error('Error comprobando ffmpeg:', err.message);
  } else {
    console.log('ffmpeg está disponible con los siguientes formatos:', formats);
  }
});

app.get('/', (req: Request, res: Response) => {
  console.log('GET /');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const extractVideoIdAndClipTimes = async (clipUrl: string): Promise<{ videoId: string, startTime: number, endTime: number } | null> => {
  console.log('Extracting video ID and clip times from:', clipUrl);
  try {
    const response = await axios.get(clipUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    const scriptTags = $('script');
    let videoId: string | null = null;
    let startTime: number | null = null;
    let endTime: number | null = null;

    scriptTags.each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('"clipConfig"')) {
        const videoIdMatch = scriptContent.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        const clipConfigMatch = scriptContent.match(/"clipConfig":\{"postId":"([a-zA-Z0-9_-]+)","startTimeMs":"(\d+)","endTimeMs":"(\d+)"\}/);

        if (videoIdMatch && clipConfigMatch) {
          videoId = videoIdMatch[1];
          startTime = parseInt(clipConfigMatch[2], 10) / 1000;
          endTime = parseInt(clipConfigMatch[3], 10) / 1000;

          console.log(`Extracted videoId: ${videoId}, startTime: ${startTime}, endTime: ${endTime}`);
        }
      }
    });

    if (videoId && startTime !== null && endTime !== null) {
      return { videoId, startTime, endTime };
    }

    console.log('Failed to extract video ID and clip times');
    return null;
  } catch (error) {
    console.error(`Error al extraer el ID del video y tiempos del clip: ${error}`);
    return null;
  }
};

app.post('/download', async (req: Request, res: Response) => {
  const { url }: { url: string } = req.body;
  console.log('POST /download', url);

  const clipInfo = await extractVideoIdAndClipTimes(url);
  if (!clipInfo) {
    console.log('Clip no encontrado');
    return res.status(400).json({ error: 'Clip no encontrado' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
  console.log(`Video URL: ${videoUrl}`);

  const videoStream = ytdl(videoUrl, { quality: 'highest' });
  const ffmpegStream = new PassThrough();

  console.log('Iniciando ffmpeg con los siguientes parámetros:', {
    startTime: clipInfo.startTime,
    duration: clipInfo.endTime - clipInfo.startTime,
  });

  ffmpeg(videoStream)
    .on('start', commandLine => {
      console.log(`FFmpeg command: ${commandLine}`);
    })
    .on('error', (err, stdout, stderr) => {
      console.error(`FFmpeg error: ${err.message}`);
      console.error(`FFmpeg stdout: ${stdout}`);
      console.error(`FFmpeg stderr: ${stderr}`);
      res.status(500).json({ error: 'Error al procesar el video' });
    })
    .on('end', () => {
      console.log('FFmpeg processing finished');
    })
    .setStartTime(clipInfo.startTime)
    .setDuration(clipInfo.endTime - clipInfo.startTime)
    .format('mpegts')
    .pipe(ffmpegStream);

  res.header('Content-Disposition', `attachment; filename="clip.mp4"`);
  res.contentType('video/mp4');
  ffmpegStream.pipe(res);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
