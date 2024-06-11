"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndProcessVideo = void 0;
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path")); // Asegurarse de que esto esté importado
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const downloadAndProcessVideo = (videoUrl, clipInfo, videoQuality, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clippedVideoTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-video.mp4`);
    const clippedAudioTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}-audio.mp4`);
    console.log(`Archivos temporales creados: video: ${clippedVideoTempFilePath}, audio: ${clippedAudioTempFilePath}`);
    // Example of choosing a video format.
    let info = yield ytdl_core_1.default.getInfo(clipInfo.videoId);
    let formats = ytdl_core_1.default.filterFormats(info.formats, 'videoonly');
    let format = ytdl_core_1.default.chooseFormat(formats, { quality: 'highestvideo' });
    console.log(format);
    console.log(clipInfo);
    const downloadAndClipVideo = new Promise((resolve, reject) => {
        console.log('Iniciando descarga de video...');
        (0, fluent_ffmpeg_1.default)(format.url)
            .setStartTime(clipInfo.startTime)
            .setDuration(clipInfo.endTime - clipInfo.startTime)
            .outputOptions('-c:v libx264')
            .outputOptions('-preset ultrafast')
            .outputOptions('-threads 1') // Limitar a un hilo
            .output(clippedVideoTempFilePath)
            .on('start', commandLine => {
            console.log(`FFmpeg video command: ${commandLine}`);
        })
            .on('end', () => {
            console.log('Descarga y recorte de video completados');
            resolve(); // Procesar el archivo temporal como sea necesario
        })
            .on('error', (err, stdout, stderr) => {
            console.error(`FFmpeg video error: ${err.message}`);
            console.error(`FFmpeg video stdout: ${stdout}`);
            console.error(`FFmpeg video stderr: ${stderr}`);
        })
            .run();
    });
    const downloadAndClipAudio = new Promise((resolve, reject) => {
        console.log('Iniciando descarga y recorte de audio...');
        (0, fluent_ffmpeg_1.default)((0, ytdl_core_1.default)(videoUrl, { quality: 'lowestaudio' }))
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
        yield Promise.all([downloadAndClipVideo, downloadAndClipAudio]);
        console.log('Iniciando combinación final con FFmpeg...');
        // Crear archivo temporal para la salida
        const outputTempFilePath = path_1.default.join(os_1.default.tmpdir(), `${(0, uuid_1.v4)()}.mp4`);
        (0, fluent_ffmpeg_1.default)()
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
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            fs_1.default.unlink(outputTempFilePath, () => { });
        })
            .on('end', () => {
            console.log('Combinación final completada con éxito');
            fs_1.default.unlink(clippedVideoTempFilePath, () => { });
            fs_1.default.unlink(clippedAudioTempFilePath, () => { });
            // Leer el archivo de salida y enviarlo al cliente
            res.header('Content-Disposition', `attachment; filename="clip.mp4"`);
            res.contentType('video/mp4');
            const outputStream = fs_1.default.createReadStream(outputTempFilePath);
            outputStream.pipe(res).on('finish', () => {
                console.log('Stream finished');
                fs_1.default.unlink(outputTempFilePath, () => { });
            });
        })
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-c copy') // Copiar el audio y video sin recodificación
            .format('mp4')
            .save(outputTempFilePath);
    }
    catch (error) {
        console.error('Error durante la descarga y recorte:', error);
        res.status(500).json({ error: 'Error durante la descarga y recorte de video/audio' });
    }
});
exports.downloadAndProcessVideo = downloadAndProcessVideo;
