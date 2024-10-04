"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUrlFromId = void 0;
const getUrlFromId = (clipInfo) => {
    return {
        videoId: clipInfo.videoId,
        fullUrl: `https://www.youtube.com/watch?v=${clipInfo.videoId}`,
    };
};
exports.getUrlFromId = getUrlFromId;
