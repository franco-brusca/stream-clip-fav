export interface ClipInfo {
    videoId: string;
    startTime: number;
    endTime: number;
}

export interface YoutubeUrl {
    videoId: string
    fullUrl: string
}


export const getUrlFromId = (clipInfo: ClipInfo): YoutubeUrl => {
    return { videoId: clipInfo.videoId, fullUrl: `https://www.youtube.com/watch?v=${clipInfo.videoId}` };
}
