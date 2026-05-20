import axios from 'axios';

// ─── API Base URL ─────────────────────────────────────────────────────────────
// In production (Vercel), set VITE_API_URL in Vercel → Project → Environment Variables.
// Example value: https://your-app.railway.app/api
// Locally, this falls back to http://localhost:5000/api
let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (API_BASE && !API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.replace(/\/$/, '') + '/api';
}
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for info requests
});

export const fetchVideoInfo = async (url) => {
  try {
    const response = await api.post('/download/info', { url });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch video information.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The server took too long to respond.');
    }
    throw new Error('Network error or server is down. Please try again.');
  }
};

export const downloadMediaFile = async (url, formatId, ext, type, quality, title) => {
  try {
    const response = await api.post(
      '/download/file',
      { url, format: formatId, ext, type, quality, title },
      {
        responseType: 'blob',
        timeout: 120000, // 2 min timeout for file downloads
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.error || 'Failed to download file.');
      } catch (e) {
        throw new Error('Failed to download file.');
      }
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Download timed out. Try a lower quality format.');
    }
    throw new Error('Network error during download.');
  }
};
