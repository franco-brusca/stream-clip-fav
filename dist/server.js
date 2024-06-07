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
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const stream_1 = require("stream");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
// Verificar la disponibilidad de ffmpeg
fluent_ffmpeg_1.default.getAvailableFormats((err, formats) => {
    if (err) {
        console.error('Error comprobando ffmpeg:', err.message);
    }
    else {
        console.log('ffmpeg está disponible con los siguientes formatos:', formats);
    }
});
app.get('/', (req, res) => {
    console.log('GET /');
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
const extractVideoIdAndClipTimes = (clipUrl) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Extracting video ID and clip times from:', clipUrl);
    try {
        const response = yield axios_1.default.get(clipUrl);
        const html = response.data;
        const $ = cheerio_1.default.load(html);
        const scriptTags = $('script');
        let videoId = null;
        let startTime = null;
        let endTime = null;
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
    }
    catch (error) {
        console.error(`Error al extraer el ID del video y tiempos del clip: ${error}`);
        return null;
    }
});
app.post('/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url } = req.body;
    console.log('POST /download', url);
    const clipInfo = yield extractVideoIdAndClipTimes(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
    console.log(`Video URL: ${videoUrl}`);
    const videoStream = (0, ytdl_core_1.default)(videoUrl, { quality: 'highest' });
    const ffmpegStream = new stream_1.PassThrough();
    console.log('Iniciando ffmpeg con los siguientes parámetros:', {
        startTime: clipInfo.startTime,
        duration: clipInfo.endTime - clipInfo.startTime,
    });
    (0, fluent_ffmpeg_1.default)(videoStream)
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
}));
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
