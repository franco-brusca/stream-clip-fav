"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectBestVideo = void 0;
const MAX_RAM_MB = 500;
const BYTES_PER_MB = 1024 * 1024;
// Función para estimar el uso de RAM
const estimateMemoryUsage = (bitrate, contentLength) => {
    const totalMB = contentLength / BYTES_PER_MB;
    return totalMB;
};
// Función para filtrar y seleccionar el mejor video
const selectBestVideo = videos => {
    // Filtrar los videos que se ajustan al límite de memoria
    const filteredVideos = videos.filter(video => {
        const estimatedMemoryUsage = estimateMemoryUsage(video.bitrate, video.contentLength);
        return estimatedMemoryUsage <= MAX_RAM_MB;
    });
    // Ordenar los videos filtrados por calidad (resolución y bitrate)
    filteredVideos.sort((a, b) => {
        // Comparar por resolución primero (width x height)
        const resolutionA = a.width * a.height;
        const resolutionB = b.width * b.height;
        if (resolutionB !== resolutionA) {
            return resolutionB - resolutionA; // Mayor resolución primero
        }
        // Si la resolución es la misma, comparar por bitrate
        return b.bitrate - a.bitrate; // Mayor bitrate primero
    });
    // Seleccionar el mejor video
    return filteredVideos.length > 0 ? filteredVideos[0] : null;
};
exports.selectBestVideo = selectBestVideo;
