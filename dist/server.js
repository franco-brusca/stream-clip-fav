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
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const path_1 = __importDefault(require("path"));
const clipExtractor_1 = require("./clipExtractor");
const videoProcessor_1 = require("./videoProcessor");
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./tools/utils");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.get('/', (req, res) => {
    console.log('GET /');
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
app.get('/clipInfo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('GET /clipInfo');
    const { url } = req.body;
    const clipInfo = yield (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    else {
        const ytUrl = (0, utils_1.getUrlFromId)(clipInfo);
        const info = yield ytdl_core_1.default.getInfo(ytUrl.fullUrl);
        const qualities = info.formats.filter(t => t.hasVideo && t.container == "mp4").map(i => { return { quality: i.quality, qualityLabel: i.qualityLabel, url: i.url }; });
        res.status(200).json({ clipInfo: clipInfo, qualities: qualities });
    }
}));
app.post('/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url, quality = 'highest' } = req.body;
    console.log('POST /download', url);
    const clipInfo = yield (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
    console.log(`Video URL: ${videoUrl}`);
    yield (0, videoProcessor_1.downloadAndProcessVideo)(videoUrl, clipInfo, quality, req, res);
}));
// Endpoint para servir el archivo finalizado
app.post('/download-file', (req, res) => {
    const { file } = req.body;
    if (!file) {
        return res.status(404).send('No file available');
    }
    res.download(file, 'clip.mp4', (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error sending file');
        }
        else {
            // Eliminar el archivo después de enviarlo
            fs_1.default.unlink(file, () => { });
        }
    });
});
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
