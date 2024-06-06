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
const port = 3000;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
const extractVideoIdAndClipTimes = (clipUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(clipUrl);
        const html = response.data;
        const $ = cheerio_1.default.load(html);
        const scriptTags = $('script');
        let videoId = null;
        let startTime = null;
        let endTime = null;
        for (let i = 0; i < scriptTags.length; i++) {
            const scriptTag = scriptTags[i];
            const scriptContent = $(scriptTag).html();
            if (scriptContent && scriptContent.includes('videoId')) {
                const videoIdMatch = scriptContent.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (videoIdMatch) {
                    videoId = videoIdMatch[1];
                }
                const startTimeMatch = scriptContent.match(/"startTime":(\d+)/);
                if (startTimeMatch) {
                    startTime = parseInt(startTimeMatch[1], 10);
                }
                const endTimeMatch = scriptContent.match(/"endTime":(\d+)/);
                if (endTimeMatch) {
                    endTime = parseInt(endTimeMatch[1], 10);
                }
                if (videoId && startTime !== null && endTime !== null) {
                    return { videoId, startTime, endTime };
                }
            }
        }
        return null;
    }
    catch (error) {
        console.error(`Error al extraer el ID del video y tiempos del clip: ${error}`);
        return null;
    }
});
app.post('/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url } = req.body;
    const clipIdMatch = url.match(/(?:clip\/)([a-zA-Z0-9_-]+)/);
    if (clipIdMatch) {
        const clipInfo = yield extractVideoIdAndClipTimes(url);
        if (!clipInfo) {
            return res.status(400).json({ error: 'Clip no encontrado' });
        }
        const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
        const videoStream = (0, ytdl_core_1.default)(videoUrl, { quality: 'highest', begin: `${clipInfo.startTime}s` });
        const ffmpegStream = new stream_1.PassThrough();
        (0, fluent_ffmpeg_1.default)(videoStream)
            .setStartTime(clipInfo.startTime)
            .setDuration(clipInfo.endTime - clipInfo.startTime)
            .format('mp4')
            .pipe(ffmpegStream);
        res.header('Content-Disposition', `attachment; filename="clip.mp4"`);
        ffmpegStream.pipe(res);
    }
    else {
        res.status(400).json({ error: 'URL de clip no válida' });
    }
}));
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
