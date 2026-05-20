import ytdl from '@distube/ytdl-core';
import { isValidUrl } from '../utils/helper.js';

// ─── URL Type Helpers ─────────────────────────────────────────────────────────

const isYouTubeUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  } catch {
    return false;
  }
};

const getExtensionFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
};

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v', 'flv']);
const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'opus']);

const isDirectMediaUrl = (url) => {
  const ext = getExtensionFromUrl(url);
  return ext && (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext));
};

const getMimeType = (ext) => {
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', ico: 'image/x-icon', tiff: 'image/tiff', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', mov: 'video/quicktime', m4v: 'video/mp4', flv: 'video/x-flv',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
    ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac', opus: 'audio/opus',
  };
  return map[ext] || 'application/octet-stream';
};

// ─── Generic URL Proxy ────────────────────────────────────────────────────────
/**
 * Fetches a URL and streams it directly to the Express response.
 * Used for direct image/video/audio file downloads.
 */
const proxyStream = async (url, res, filename) => {
  console.log(`[proxy] Streaming: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Remote server returned ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentLength = response.headers.get('content-length');

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  // Node 18+ fetch body is a Web ReadableStream — convert to Node stream
  const { Readable } = await import('stream');
  const nodeStream = Readable.fromWeb(response.body);
  nodeStream.pipe(res);

  return new Promise((resolve, reject) => {
    nodeStream.on('end', resolve);
    nodeStream.on('error', reject);
  });
};

// ─── Controller: GET /api/download/info ──────────────────────────────────────
export const getMediaInfo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ success: false, error: 'URL is required.' });
    if (!isValidUrl(url)) return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });

    console.log(`[getMediaInfo] URL: ${url}`);

    // ── YouTube ──────────────────────────────────────────────────────────────
    if (isYouTubeUrl(url)) {
      const info = await ytdl.getInfo(url);
      const details = info.videoDetails;

      const videoFormats = [];
      const audioFormats = [];

      info.formats.forEach((f) => {
        const formatObj = {
          format_id: f.itag.toString(),
          quality: f.qualityLabel || f.audioQuality || 'Unknown',
          ext: f.container || 'mp4',
          filesize: f.contentLength ? parseInt(f.contentLength) : null,
          vcodec: f.hasVideo ? (f.videoCodec || 'h264') : 'none',
          acodec: f.hasAudio ? (f.audioCodec || 'aac') : 'none',
        };
        if (f.hasVideo) videoFormats.push({ ...formatObj, type: 'video' });
        else if (f.hasAudio) audioFormats.push({ ...formatObj, type: 'audio' });
      });

      // Deduplicate by quality, sorted highest first
      const seen = new Set();
      const uniqueVideo = videoFormats
        .filter((f) => { if (seen.has(f.quality)) return false; seen.add(f.quality); return true; })
        .sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

      const totalSec = parseInt(details.lengthSeconds || 0);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const duration = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;

      const thumbnail = details.thumbnails?.[details.thumbnails.length - 1]?.url || '';

      console.log(`[getMediaInfo] YouTube OK — "${details.title}" | ${info.formats.length} formats`);

      return res.status(200).json({
        success: true,
        platform: 'youtube',
        title: details.title || '',
        thumbnail,
        duration,
        formats: { video: uniqueVideo, audio: audioFormats },
      });
    }

    // ── Direct Image / File URL ───────────────────────────────────────────────
    if (isDirectMediaUrl(url)) {
      const ext = getExtensionFromUrl(url);
      const isImage = IMAGE_EXTS.has(ext);
      const filename = url.split('/').pop().split('?')[0] || `download.${ext}`;

      console.log(`[getMediaInfo] Direct file — ext=${ext} | file=${filename}`);

      return res.status(200).json({
        success: true,
        platform: isImage ? 'image' : 'direct',
        title: filename,
        thumbnail: isImage ? url : '',
        duration: '',
        formats: {
          video: isImage ? [] : [{
            format_id: 'direct',
            quality: 'Original',
            ext,
            filesize: null,
            type: 'video',
          }],
          audio: AUDIO_EXTS.has(ext) ? [{
            format_id: 'direct',
            quality: 'Original',
            ext,
            filesize: null,
            type: 'audio',
          }] : [],
          image: isImage ? [{
            format_id: 'direct',
            quality: 'Original',
            ext,
            filesize: null,
            type: 'image',
          }] : [],
        },
      });
    }

    // ── Unsupported ───────────────────────────────────────────────────────────
    return res.status(422).json({
      success: false,
      error: 'Unsupported URL. Supported: YouTube videos, direct image/video/audio file links.',
    });

  } catch (error) {
    console.error('[getMediaInfo] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch media info.',
    });
  }
};

// ─── Controller: POST /api/download/file ─────────────────────────────────────
export const downloadFile = async (req, res) => {
  try {
    const { url, format, ext, type, title } = req.body;

    if (!url) return res.status(400).json({ success: false, error: 'URL is required.' });
    if (!isValidUrl(url)) return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });

    console.log(`[downloadFile] url=${url} | format=${format} | type=${type}`);

    const safeTitle = (title || 'streamdrop_download')
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 60) || 'streamdrop_download';

    const timestamp = Date.now();

    // ── YouTube Download ──────────────────────────────────────────────────────
    if (isYouTubeUrl(url)) {
      let stream;
      let filename;
      let contentType;

      if (type === 'audio') {
        stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        filename = `${safeTitle}_${timestamp}.m4a`;
        contentType = 'audio/mp4';
      } else {
        const opts = format
          ? { quality: format }
          : { quality: 'highest', filter: 'audioandvideo' };
        stream = ytdl(url, opts);
        filename = `${safeTitle}_${timestamp}.${ext || 'mp4'}`;
        contentType = 'video/mp4';
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-store');

      console.log(`[downloadFile] YouTube stream → ${filename}`);

      stream.on('error', (err) => {
        console.error('[downloadFile] ytdl stream error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream failed.', message: err.message });
        }
      });

      stream.on('end', () => console.log(`[downloadFile] Complete: ${filename}`));
      return stream.pipe(res);
    }

    // ── Direct Image / File Download ──────────────────────────────────────────
    if (isDirectMediaUrl(url) || format === 'direct') {
      const fileExt = ext || getExtensionFromUrl(url) || 'bin';
      const filename = `${safeTitle}_${timestamp}.${fileExt}`;
      console.log(`[downloadFile] Direct proxy → ${filename}`);
      return await proxyStream(url, res, filename);
    }

    // ── Unsupported URL Fallback ──────────────────────────────────────────────
    return res.status(422).json({
      success: false,
      error: 'Cannot download this URL. Supported: YouTube, direct image/video/audio links.',
    });

  } catch (error) {
    console.error('[downloadFile] Error:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Download failed.',
      });
    }
  }
};
