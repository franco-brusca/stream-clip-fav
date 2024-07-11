"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const utils_1 = require("../tools/utils");
const clipExtractor_1 = require("../clipExtractor");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
//ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
// Función para iniciar o continuar el trabajo
const startWork = async (data) => {
    try {
        //const { url, videoQuality, }: { clipInfo: ClipInfo, videoQuality: string } = data
        console.log("data", data);
        const { url } = data;
        const clipInfo = await (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
        const ytUrl = (0, utils_1.getUrlFromId)(clipInfo);
        const clippedVideoTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-video.mp4`);
        const clippedAudioTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-audio.mp4`);
        const logging = (message) => {
            console.log(message);
        };
        const updateProgress = (progress) => {
            worker_threads_1.parentPort?.postMessage(progress);
        };
        logging('Starting video download and processing...');
        const info = await ytdl_core_1.default.getInfo(ytUrl.fullUrl);
        let format = ytdl_core_1.default.chooseFormat(info.formats, { quality: "highest" });
        logging('Video info retrieved.');
        const downloadAndClipVideo = new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(format.url)
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
                    logging(`{"progress": "${(progress.percent * 10).toFixed(2)}%"}`);
                updateProgress(progress.percent * 10);
            })
                .on('end', () => {
                logging(`{"progress": "100%"}`);
                updateProgress(100);
                resolve();
            })
                .on('error', (err, stdout, stderr) => {
                logging(`FFmpeg video error: ${err.message}`);
                reject(err);
            })
                .run();
        });
        const downloadAndClipAudio = new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)((0, ytdl_core_1.default)(ytUrl.fullUrl, { quality: 'lowestaudio' }))
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
        let outputFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}.mp4`);
        (0, fluent_ffmpeg_1.default)()
            .input(clippedVideoTempFilePath)
            .input(clippedAudioTempFilePath)
            .on('start', commandLine => {
            logging('FFmpeg merge command started.');
        })
            .on('end', () => {
            logging('Merging completed successfully.');
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            // Enviar URL del archivo finalizado al cliente
            logging(`${JSON.stringify({ message: "File ready", file: outputFilePath })}`);
            worker_threads_1.parentPort.postMessage({ result: 'Work completed successfully', data: { message: "File ready", file: outputFilePath } });
            worker_threads_1.parentPort?.close();
        })
            .on('error', (err, stdout, stderr) => {
            logging(`FFmpeg final error: ${err.message}`);
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            fs_1.default.unlink(outputFilePath, () => { });
            //res.status(500).json({ error: 'Error al procesar el video final' });
        })
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-c copy') // Copiar el audio y video sin recodificación
            .format('mp4')
            .save(outputFilePath);
    }
    catch (error) {
        console.error('Error en downloadAndProcessVideo:', error);
        worker_threads_1.parentPort?.close(); // Finaliza el worker
    }
};
try {
    startWork(worker_threads_1.workerData);
}
catch (error) {
    worker_threads_1.parentPort.postMessage({ error: error.message });
    process.exit(1);
}
