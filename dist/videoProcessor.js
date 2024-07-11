"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndProcessVideo = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const downloadAndProcessVideo = async (videoUrl, clipInfo, videoQuality, req, res) => {
    try {
        const ytdl = require("@distube/ytdl-core");
        const clippedVideoTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-video.mp4`);
        const clippedAudioTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-audio.mp4`);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const sendProgress = (message) => {
            console.log(message);
            res.write(`data: ${message}\n\n`);
            res.flush();
        };
        sendProgress('Starting video download and processing...');
        const info = await ytdl.getInfo(videoUrl);
        let format = ytdl.chooseFormat(info.formats, { quality: videoQuality });
        sendProgress('Video info retrieved.');
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
                sendProgress('FFmpeg video command started.');
            })
                .on('progress', progress => {
                if (progress.percent)
                    sendProgress(`{"progress": "${(progress.percent * 10).toFixed(2)}%"}`);
            })
                .on('end', () => {
                sendProgress(`{"progress": "100%"}`);
                resolve();
            })
                .on('error', (err, stdout, stderr) => {
                sendProgress(`FFmpeg video error: ${err.message}`);
                reject(err);
            })
                .run();
        });
        const downloadAndClipAudio = new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(ytdl(videoUrl, { quality: 'lowestaudio' }))
                .setStartTime(clipInfo.startTime)
                .setDuration(clipInfo.endTime - clipInfo.startTime)
                .outputOptions([
                '-c:a aac',
                '-b:a 128k',
            ])
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
        let outputFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}.mp4`);
        (0, fluent_ffmpeg_1.default)()
            .input(clippedVideoTempFilePath)
            .input(clippedAudioTempFilePath)
            .on('start', commandLine => {
            sendProgress('FFmpeg merge command started.');
        })
            .on('end', () => {
            sendProgress('Merging completed successfully.');
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            // Enviar URL del archivo finalizado al cliente
            sendProgress(`${JSON.stringify({ message: "File ready", file: outputFilePath })}`);
        })
            .on('error', (err, stdout, stderr) => {
            sendProgress(`FFmpeg final error: ${err.message}`);
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            fs_1.default.unlink(outputFilePath, () => { });
            res.status(500).json({ error: 'Error al procesar el video final' });
        })
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-c copy') // Copiar el audio y video sin recodificación
            .format('mp4')
            .save(outputFilePath);
    }
    catch (error) {
        console.error('Error en downloadAndProcessVideo:', error);
        res.write(`data: ${JSON.stringify({ error: 'Error en downloadAndProcessVideo' })}\n\n`);
        res.end();
    }
};
exports.downloadAndProcessVideo = downloadAndProcessVideo;
