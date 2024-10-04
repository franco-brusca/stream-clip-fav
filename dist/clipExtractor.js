"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVideoIdAndClipTimes = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const extractVideoIdAndClipTimes = async (clipUrl) => {
    console.log("Extracting video ID and clip times from:", clipUrl);
    try {
        const response = await axios_1.default.get(clipUrl);
        const html = response.data;
        const $ = cheerio_1.default.load(html);
        const scriptTags = $("script");
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
        console.log("Failed to extract video ID and clip times");
        return null;
    }
    catch (error) {
        console.error(`Error al extraer el ID del video y tiempos del clip: ${error}`);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
            console.error("Response headers:", error.response.headers);
        }
        else if (error.request) {
            console.error("Request data:", error.request);
        }
        else {
            console.error("Error messages:", error.message);
        }
        console.error("Error config:", error.config);
        return null;
    }
};
exports.extractVideoIdAndClipTimes = extractVideoIdAndClipTimes;
