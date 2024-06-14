import axios from 'axios';
import cheerio from 'cheerio';

export const extractVideoIdAndClipTimes = async (clipUrl: string): Promise<{ videoId: string, startTime: number, endTime: number } | null> => {
  console.log('Extracting video ID and clip times from:', clipUrl);
  try {
    const response = await axios.get(clipUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    const scriptTags = $('script');
    let videoId: string | null = null;
    let startTime: number | null = null;
    let endTime: number | null = null;

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
  } catch (error) {
    console.error(`Error al extraer el ID del video y tiempos del clip: ${error}`);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request data:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
    return null;
  }
};
