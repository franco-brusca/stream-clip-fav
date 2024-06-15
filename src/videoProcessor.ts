import express, { json, Request, Response } from 'express';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const downloadAndProcessVideo = async (videoUrl: string, clipInfo: { videoId: string, startTime: number, endTime: number }, videoQuality: string, req: Request, res: Response): Promise<void> => {
  try {
    const clippedVideoTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-video.mp4`);
    const clippedAudioTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-audio.mp4`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (message: string) => {
      console.log(message)
      res.write(`data: ${message}\n\n`);
      res.flush();
    };

    sendProgress('Starting video download and processing...');

    const info = await ytdl.getInfo(videoUrl);
    let videos = ytdl.filterFormats(info.formats, 'videoonly');
    let format = ytdl.chooseFormat(videos, { filter: format => format.qualityLabel === '720p' || format.qualityLabel === '480p'});
    console.log(format)
   
    sendProgress('Video info retrieved.');

    const downloadAndClipVideo = new Promise<void>((resolve, reject) => {
      ffmpeg(format.url)
        .setStartTime(clipInfo.startTime)
        .setDuration(clipInfo.endTime - clipInfo.startTime)
        .outputOptions('-c:v libx264')
        .outputOptions('-preset ultrafast')
        .output(clippedVideoTempFilePath)
        .on('start', commandLine => {
          sendProgress('FFmpeg video command started.');
        })
        .on('progress', progress => {
          if(progress.percent)
          sendProgress(`{"progress": "${(progress.percent).toFixed(2)}%"}`)
        })
        .on('end', () => {
          sendProgress(`{"progress": "100%"}`)
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          sendProgress(`FFmpeg video error: ${err.message}`);
          reject(err);
        })
        .run();
    });

    const downloadAndClipAudio = new Promise<void>((resolve, reject) => {
      ffmpeg(ytdl(videoUrl, { quality: 'lowestaudio' }))
        .setStartTime(clipInfo.startTime)
        .setDuration(clipInfo.endTime - clipInfo.startTime)
        .outputOptions('-c:a aac')
        .outputOptions('-b:a 128k')
        .output(clippedAudioTempFilePath)
        .on('start', commandLine => {
          sendProgress('FFmpeg audio command started.');
        })
        .on('end', () => {
          sendProgress('Audio download and clipping completed.');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          sendProgress(`FFmpeg audio error: ${err.message}`);
          reject(err);
        })
        .run();
    });

    await Promise.all([downloadAndClipVideo, downloadAndClipAudio]);

    sendProgress('Starting final FFmpeg merge...');

    let outputFilePath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);

    ffmpeg()
      .input(clippedVideoTempFilePath)
      .input(clippedAudioTempFilePath)
      .on('start', commandLine => {
        sendProgress('FFmpeg merge command started.');
      })
      .on('end', () => {
        sendProgress('Merging completed successfully.');
        fs.unlink(clippedVideoTempFilePath, () => { });
        fs.unlink(clippedAudioTempFilePath, () => { });

        // Enviar URL del archivo finalizado al cliente
        sendProgress(`${JSON.stringify({ message: "File ready", file: outputFilePath})}`)
      })
      .on('error', (err, stdout, stderr) => {
        sendProgress(`FFmpeg final error: ${err.message}`);
        fs.unlink(clippedVideoTempFilePath, () => { });
        fs.unlink(clippedAudioTempFilePath, () => { });
        fs.unlink(outputFilePath, () => { });
        res.status(500).json({ error: 'Error al procesar el video final' });
      })
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions('-c copy') // Copiar el audio y video sin recodificación
      .format('mp4')
      .save(outputFilePath);
  } catch (error) {
    console.error('Error en downloadAndProcessVideo:', error);
    res.write(`data: ${JSON.stringify({ error: 'Error en downloadAndProcessVideo' })}\n\n`);
    res.end();
  }
};
