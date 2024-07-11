import { parentPort, workerData } from 'worker_threads';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getUrlFromId, ClipInfo } from '../tools/utils';
import { extractVideoIdAndClipTimes } from '../clipExtractor';
import ytdl from '@distube/ytdl-core'

//ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');

// Función para iniciar o continuar el trabajo
const startWork = async (data) => {
    try {
        //const { url, videoQuality, }: { clipInfo: ClipInfo, videoQuality: string } = data
        console.log("data", data);
        const { url}: { url: string } = data
        const clipInfo = await extractVideoIdAndClipTimes(url);
        const ytUrl = getUrlFromId(clipInfo)

        const clippedVideoTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-video.mp4`);
        const clippedAudioTempFilePath = path.join(os.tmpdir(), `${uuidv4()}-audio.mp4`);

        const logging = (message: string) => {
            console.log(message)
        };

        const updateProgress = (progress: number) => {
            parentPort?.postMessage(progress);
        }

        logging('Starting video download and processing...');

        const info = await ytdl.getInfo(ytUrl.fullUrl);
        let format = ytdl.chooseFormat(info.formats, { quality: "highest" });

        logging('Video info retrieved.');

        const downloadAndClipVideo = new Promise<void>((resolve, reject) => {
            ffmpeg(format.url)
                .setStartTime(clipInfo.startTime)
                .setDuration(clipInfo.endTime - clipInfo.startTime)
                .outputOptions([
                    '-c:v libx264',
                    '-preset ultrafast',
                ])
                .output(clippedVideoTempFilePath)
                .on('start', commandLine => {
                    logging('FFmpeg video command started.');
                })
                .on('progress', progress => {
                    if (progress.percent)
                        logging(`{"progress": "${(progress.percent * 10).toFixed(2)}%"}`)
                    updateProgress(progress.percent * 10)
                })
                .on('end', () => {
                    logging(`{"progress": "100%"}`)
                    updateProgress(100)
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    logging(`FFmpeg video error: ${err.message}`);
                    reject(err);
                })
                .run();
        });

        const downloadAndClipAudio = new Promise<void>((resolve, reject) => {
            ffmpeg(ytdl(ytUrl.fullUrl, { quality: 'lowestaudio' }))
                .setStartTime(clipInfo.startTime)
                .setDuration(clipInfo.endTime - clipInfo.startTime)
                .outputOptions('-c:a aac')
                .outputOptions('-b:a 128k')
                .output(clippedAudioTempFilePath)
                .on('start', commandLine => {
                    logging('FFmpeg audio command started.');
                })
                .on('end', () => {
                    logging('Audio download and clipping completed.');
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    logging(`FFmpeg audio error: ${err.message}`);
                    reject(err);
                })
                .run();
        });

        await Promise.all([downloadAndClipVideo, downloadAndClipAudio]);

        logging('Starting final FFmpeg merge...');

        let outputFilePath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);

        ffmpeg()
            .input(clippedVideoTempFilePath)
            .input(clippedAudioTempFilePath)
            .on('start', commandLine => {
                logging('FFmpeg merge command started.');
            })
            .on('end', () => {
                logging('Merging completed successfully.');
                fs.unlink(clippedVideoTempFilePath, () => { });
                fs.unlink(clippedAudioTempFilePath, () => { });

                // Enviar URL del archivo finalizado al cliente
                logging(`${JSON.stringify({ message: "File ready", file: outputFilePath })}`)
                parentPort.postMessage({ result: 'Work completed successfully', data: { message: "File ready", file: outputFilePath } });
                parentPort?.close();
            })
            .on('error', (err, stdout, stderr) => {
                logging(`FFmpeg final error: ${err.message}`);
                fs.unlink(clippedVideoTempFilePath, () => { });
                fs.unlink(clippedAudioTempFilePath, () => { });
                fs.unlink(outputFilePath, () => { });
                //res.status(500).json({ error: 'Error al procesar el video final' });
            })
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-c copy') // Copiar el audio y video sin recodificación
            .format('mp4')
            .save(outputFilePath);
    } catch (error) {
        console.error('Error en downloadAndProcessVideo:', error);
        parentPort?.close();  // Finaliza el worker
    }
};

try {
    startWork(workerData);
} catch (error) {
    parentPort.postMessage({ error: error.message });
    process.exit(1);
}

