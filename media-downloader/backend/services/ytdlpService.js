/**
 * ytdlpService.js
 * 
 * Uses @distube/ytdl-core — a pure JavaScript YouTube downloader.
 * No Python or binary dependencies. Works on Vercel serverless.
 */

import ytdl from '@distube/ytdl-core';

/**
 * Fetches full video metadata for a given URL.
 * @param {string} url - YouTube video URL
 * @returns {Promise<object>} ytdl info object
 */
export const getVideoInfo = async (url) => {
  try {
    console.log(`[ytdl] Fetching info: ${url}`);
    const info = await ytdl.getInfo(url);
    return info;
  } catch (error) {
    console.error('[ytdl] getInfo error:', error.message);
    if (
      error.message.includes('No video id found') ||
      error.message.includes('Video unavailable') ||
      error.message.includes('Private video')
    ) {
      throw new Error('Unsupported URL, private, or unavailable video.');
    }
    throw new Error('Failed to fetch video info.');
  }
};

/**
 * Creates a readable stream for downloading media directly.
 * No temp files — streams directly to HTTP response.
 *
 * @param {string} url - YouTube video URL
 * @param {object} options - ytdl options (quality, filter, etc.)
 * @returns {ReadableStream}
 */
export const createDownloadStream = (url, options = {}) => {
  console.log(`[ytdl] Creating stream with options:`, options);
  return ytdl(url, options);
};
