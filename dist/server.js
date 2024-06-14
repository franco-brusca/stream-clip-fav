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
const path_1 = __importDefault(require("path")); // Asegurar que path está importado
const clipExtractor_1 = require("./clipExtractor");
const videoProcessor_1 = require("./videoProcessor");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.get('/', (req, res) => {
    console.log('GET /');
    res.sendFile(path_1.default.join(__dirname, '..', 'index.html'));
});
app.post('/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url, quality = 'lowest' } = req.body;
    console.log('POST /download', url);
    const clipInfo = yield (0, clipExtractor_1.extractVideoIdAndClipTimes)(url);
    if (!clipInfo) {
        console.log('Clip no encontrado');
        return res.status(400).json({ error: 'Clip no encontrado' });
    }
    const videoUrl = `https://www.youtube.com/watch?v=${clipInfo.videoId}`;
    console.log(`Video URL: ${videoUrl}`);
    yield (0, videoProcessor_1.downloadAndProcessVideo)(videoUrl, clipInfo, quality, res);
}));
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
