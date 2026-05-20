/**
 * cobaltService.js
 *
 * Uses the public Cobalt API (https://api.cobalt.tools/api/json)
 * and YouTube oEmbed to fetch metadata and stream URLs purely over HTTP.
 * This completely avoids the need for python3 or yt-dlp binaries in production.
 */

const COBALT_API_URL = 'https://api.cobalt.tools/api/json';

/**
 * Fetches video metadata using YouTube's oEmbed endpoint.
 * Mocks the duration and format list to exactly match the frontend's expected schema.
 * @param {string} url
 * @returns {Promise<object>}
 */
export const getCobaltInfo = async (url) => {
  console.log(`[cobalt] Fetching oEmbed info for ${url}`);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  
  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error('Could not fetch video info from YouTube oEmbed API.');
  }
  
  const data = await response.json();

  // Mock standard formats to satisfy frontend schema
  const mockVideoFormats = [
    { format_id: 'cobalt-1080', quality: '1080p', ext: 'mp4', type: 'video' },
    { format_id: 'cobalt-720', quality: '720p', ext: 'mp4', type: 'video' },
    { format_id: 'cobalt-360', quality: '360p', ext: 'mp4', type: 'video' }
  ];
  
  const mockAudioFormats = [
    { format_id: 'cobalt-audio', quality: '320kbps', ext: 'mp3', type: 'audio' },
    { format_id: 'cobalt-audio', quality: '128kbps', ext: 'mp3', type: 'audio' },
    { format_id: 'cobalt-audio', quality: '64kbps', ext: 'mp3', type: 'audio' }
  ];

  return {
    title: data.title || 'YouTube Video',
    thumbnail: data.thumbnail_url || '',
    duration: '0:00', // oEmbed doesn't provide duration
    uploader: data.author_name || '',
    view_count: null,
    formats: {
      video: mockVideoFormats,
      audio: mockAudioFormats
    }
  };
};

/**
 * Uses Cobalt API to get the direct download stream URL for the requested format.
 * @param {string} url 
 * @param {'video'|'audio'} type 
 * @param {string} [qualityLabel] e.g. "1080p", "128kbps"
 * @returns {Promise<string>} Direct media URL
 */
export const getCobaltStreamUrl = async (url, type = 'video', qualityLabel = '') => {
  console.log(`[cobalt] Requesting stream URL for ${url} | type=${type} | quality=${qualityLabel}`);
  
  const payload = {
    url,
    isAudioOnly: type === 'audio',
  };

  // Map quality label to Cobalt vQuality values (e.g. "1080p" -> "1080")
  if (type === 'video' && qualityLabel) {
    const vQuality = qualityLabel.replace('p', '').replace('K', '000');
    if (['144', '240', '360', '480', '720', '1080', '1440', '2160'].includes(vQuality)) {
      payload.vQuality = vQuality;
    }
  }

  const response = await fetch(COBALT_API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'StreamDrop-Backend/1.0'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[cobalt] Error response: ${text}`);
    throw new Error('Failed to retrieve direct URL from Cobalt API.');
  }

  const result = await response.json();
  if (result.status === 'stream' || result.status === 'redirect') {
    return result.url;
  } else if (result.url) {
    return result.url;
  }

  throw new Error('Cobalt API returned an unexpected response format.');
};
