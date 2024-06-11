import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path'; // Asegurarse de que esto esté importado
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { filter } from 'cheerio/lib/api/traversing';

export const downloadAndProcessVideo = async (videoUrl: string, clipInfo: { videoId: string, startTime: number, endTime: number }, videoQuality: string, res: any): Promise<void> => {
  const clippedVideoTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-video.mp4`);
  const clippedAudioTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-audio.mp4`);

  console.log(`Archivos temporales creados: video: ${clippedVideoTempFilePath}, audio: ${clippedAudioTempFilePath}`);

  // Example of choosing a video format.
  let info = await ytdl.getInfo(clipInfo.videoId);
  let formats = ytdl.filterFormats(info.formats, 'videoonly');
  let format = ytdl.chooseFormat(formats, {quality:"highestvideo"});
  //let format = ytdl.chooseFormat(formats, { filter: format => format.qualityLabel === '720p' });
  console.log(format);
  console.log(clipInfo)

  const downloadAndClipVideo = new Promise<void>((resolve, reject) => {
    console.log('Iniciando descarga de video...');

    ffmpeg(format.url)
      .setStartTime(clipInfo.startTime)
      .setDuration(clipInfo.endTime-clipInfo.startTime)
      .outputOptions('-c:v libx264')
      .outputOptions('-preset ultrafast')
      .outputOptions('-tune zerolatency')
      .outputOptions('-loglevel verbose')
      // .outputOptions('-crf 28')
      // .outputOptions('-maxrate 500k')
      // .outputOptions('-bufsize 1000k')
      // .outputOptions('-vf scale=320:240')
      .output(clippedVideoTempFilePath)
      .on('start', commandLine => {
        console.log(`FFmpeg video command: ${commandLine}`);
      })
      .on('end', () => {
        console.log('Descarga y recorte de video completados');
        resolve()// Procesar el archivo temporal como sea necesario
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`FFmpeg video error: ${err.message}`);
        console.error(`FFmpeg video stdout: ${stdout}`);
        console.error(`FFmpeg video stderr: ${stderr}`);
      })
      .run();
  });


  const downloadAndClipAudio = new Promise<void>((resolve, reject) => {
    console.log('Iniciando descarga y recorte de audio...');
    ffmpeg(ytdl(videoUrl, { quality: 'lowestaudio' }))
      .setStartTime(clipInfo.startTime)
      .setDuration(clipInfo.endTime - clipInfo.startTime)
      .outputOptions('-c:a aac')
      .outputOptions('-b:a 128k')
      .output(clippedAudioTempFilePath)
      .on('start', commandLine => {
        console.log(`FFmpeg audio command: ${commandLine}`);
      })
      .on('end', () => {
        console.log('Descarga y recorte de audio completados');
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`FFmpeg audio error: ${err.message}`);
        console.error(`FFmpeg audio stdout: ${stdout}`);
        console.error(`FFmpeg audio stderr: ${stderr}`);
        reject(err);
      })
      .run();
  });

  try {
    await Promise.all([downloadAndClipVideo, downloadAndClipAudio]);

    console.log('Iniciando combinación final con FFmpeg...');
    // Crear archivo temporal para la salida
    const outputTempFilePath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);

    ffmpeg()
      .input(clippedVideoTempFilePath)
      .input(clippedAudioTempFilePath)
      .on('start', commandLine => {
        console.log(`FFmpeg final command: ${commandLine}`);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`FFmpeg final error: ${err.message}`);
        console.error(`FFmpeg final stdout: ${stdout}`);
        console.error(`FFmpeg final stderr: ${stderr}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al procesar el video final' });
        }
        fs.unlink(clippedVideoTempFilePath, () => { });
        fs.unlink(clippedAudioTempFilePath, () => { });
        fs.unlink(outputTempFilePath, () => { });
      })
      .on('end', () => {
        console.log('Combinación final completada con éxito');
        fs.unlink(clippedVideoTempFilePath, () => {});
        fs.unlink(clippedAudioTempFilePath, () => {});

        // Leer el archivo de salida y enviarlo al cliente
        res.header('Content-Disposition', `attachment; filename="clip.mp4"`);
        res.contentType('video/mp4');
        const outputStream = fs.createReadStream(outputTempFilePath);
        outputStream.pipe(res).on('finish', () => {
          console.log('Stream finished');
          fs.unlink(outputTempFilePath, () => { });
        });
      })
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions('-c copy') // Copiar el audio y video sin recodificación
      .format('mp4')
      .save(outputTempFilePath);
  } catch (error) {
    console.error('Error durante la descarga y recorte:', error);
    res.status(500).json({ error: 'Error durante la descarga y recorte de video/audio' });
  }
};
