/**
 * downloadController.js
 *
 * Handles:
 *   POST /api/download/info  → metadata extraction
 *   POST /api/download/file  → streaming download
 *
 * YouTube: uses bundled yt-dlp via ytdlpService.js
 * Images / direct URLs: fetched and proxied via Node fetch
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { isValidUrl } from '../utils/helper.js';
import { getVideoInfo, downloadToTempFile } from '../services/ytdlpService.js';
import { getCobaltInfo, getCobaltStreamUrl } from '../services/cobaltService.js';

const isProduction = !!process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

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

// ─── Format Seconds → "H:MM:SS" or "M:SS" ────────────────────────────────────
const formatDuration = (totalSec) => {
  if (!totalSec) return '0:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── Generic URL Proxy ────────────────────────────────────────────────────────
/**
 * Fetches a direct URL and streams it to the Express response.
 * Used for images, direct video/audio file links.
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

// ─── Controller: POST /api/download/info ──────────────────────────────────────
export const getMediaInfo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ success: false, error: 'URL is required.' });
    if (!isValidUrl(url)) return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });

    console.log(`[getMediaInfo] URL: ${url}`);

    // ── YouTube ──────────────────────────────────────────────────────────────
    if (isYouTubeUrl(url)) {
      let info;
      
      if (isProduction) {
        // PRODUCTION: Pure HTTP extraction via Cobalt & oEmbed
        try {
          info = await getCobaltInfo(url);
          console.log(`[getMediaInfo] Cobalt extraction OK — "${info.title}"`);
          return res.status(200).json({
            success: true,
            platform: 'youtube',
            ...info
          });
        } catch (cobaltErr) {
          console.error('[getMediaInfo] Cobalt error:', cobaltErr.message);
          return res.status(422).json({
            success: false,
            error: `Could not fetch video info: ${cobaltErr.message}`,
          });
        }
      } else {
        // LOCAL DEVELOPMENT: yt-dlp binary
        try {
          info = await getVideoInfo(url);
        } catch (ytErr) {
          console.error('[getMediaInfo] yt-dlp error:', ytErr.message);
          return res.status(422).json({
            success: false,
            error: `Could not fetch video info: ${ytErr.message}`,
          });
        }
      }

      // ── Parse formats from yt-dlp JSON ───────────────────────────────────
      const rawFormats = info.formats || [];

      const videoFormats = [];
      const audioFormats = [];
      const seen = new Set();

      rawFormats.forEach((f) => {
        const hasVideo = f.vcodec && f.vcodec !== 'none';
        const hasAudio = f.acodec && f.acodec !== 'none';
        const quality = f.height ? `${f.height}p` : (f.format_note || f.format_id);

        const formatObj = {
          format_id: f.format_id,
          quality,
          ext: f.ext || 'mp4',
          filesize: f.filesize || f.filesize_approx || null,
          vcodec: f.vcodec || 'none',
          acodec: f.acodec || 'none',
          fps: f.fps || null,
        };

        if (hasVideo && hasAudio) {
          // Single-stream (video+audio combined) — most compatible
          if (!seen.has(quality)) {
            seen.add(quality);
            videoFormats.push({ ...formatObj, type: 'video' });
          }
        } else if (hasVideo && !hasAudio) {
          // Video-only (needs merge) — still list for advanced users
          if (!seen.has(`v-${quality}`)) {
            seen.add(`v-${quality}`);
            videoFormats.push({ ...formatObj, type: 'video' });
          }
        } else if (!hasVideo && hasAudio) {
          audioFormats.push({ ...formatObj, type: 'audio' });
        }
      });

      // Sort video by resolution descending
      videoFormats.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

      const thumbnail =
        (info.thumbnails && info.thumbnails[info.thumbnails.length - 1]?.url) ||
        info.thumbnail || '';

      console.log(`[getMediaInfo] YouTube OK — "${info.title}" | ${videoFormats.length} video, ${audioFormats.length} audio formats`);

      return res.status(200).json({
        success: true,
        platform: 'youtube',
        title: info.title || '',
        thumbnail,
        duration: formatDuration(info.duration),
        uploader: info.uploader || info.channel || '',
        view_count: info.view_count || null,
        formats: { video: videoFormats, audio: audioFormats },
      });
    }

    // ── Direct Image / File URL ───────────────────────────────────────────────
    if (isDirectMediaUrl(url)) {
      const ext = getExtensionFromUrl(url);
      const isImage = IMAGE_EXTS.has(ext);
      const isAudio = AUDIO_EXTS.has(ext);
      const filename = url.split('/').pop().split('?')[0] || `download.${ext}`;

      console.log(`[getMediaInfo] Direct file — ext=${ext} | file=${filename}`);

      return res.status(200).json({
        success: true,
        platform: isImage ? 'image' : (isAudio ? 'audio' : 'direct'),
        title: filename,
        thumbnail: isImage ? url : '',
        duration: '',
        formats: {
          video: (!isImage && !isAudio) ? [{
            format_id: 'direct',
            quality: 'Original',
            ext,
            filesize: null,
            type: 'video',
          }] : [],
          audio: isAudio ? [{
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
    console.error('[getMediaInfo] Unexpected error:', error.message);
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

    // ── YouTube Download ───────────────────────────────────────────
    if (isYouTubeUrl(url)) {
      const downloadType = type === 'audio' ? 'audio' : 'video';
      const fileExt = downloadType === 'audio' ? 'm4a' : (ext || 'mp4');
      const contentType = downloadType === 'audio' ? 'audio/mp4' : 'video/mp4';
      const filename = `${safeTitle}_${timestamp}.${fileExt}`;

      if (isProduction) {
        // PRODUCTION: Use Cobalt direct stream proxy
        console.log(`[downloadFile] Starting Cobalt stream proxy → ${filename}`);
        // For format matching, we use the original format sent by the frontend (e.g. '1080p')
        // We look for the quality label if available, but the frontend currently sends format id like 'cobalt-1080'
        let qualityLabel = '';
        if (format && format.includes('cobalt-')) {
            qualityLabel = format.replace('cobalt-', '') + (type === 'video' ? 'p' : 'kbps');
        } else {
            // If they sent raw quality param
            qualityLabel = req.body.quality || '';
        }
        
        const streamUrl = await getCobaltStreamUrl(url, downloadType, qualityLabel);
        return await proxyStream(streamUrl, res, filename);
      } else {
        // LOCAL DEV: yt-dlp spawn
        // We download to a temp file because merged formats cannot be piped directly to stdout.
        const tempDir = os.tmpdir();
        const tempFilePrefix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const tempFilePathTemplate = path.join(tempDir, `${tempFilePrefix}.%(ext)s`);

        console.log(`[downloadFile] Starting yt-dlp temp file download → ${tempFilePathTemplate}`);
        
        try {
          await downloadToTempFile(url, downloadType, format, tempFilePathTemplate);
          
          // Find the actual file generated by yt-dlp
          const files = fs.readdirSync(tempDir);
          const downloadedFileName = files.find(f => f.startsWith(tempFilePrefix));
          
          if (!downloadedFileName) {
            throw new Error('Downloaded file not found on disk after yt-dlp completed.');
          }

          const actualTempFilePath = path.join(tempDir, downloadedFileName);
          const actualExt = path.extname(downloadedFileName).replace('.', '') || fileExt;
          const finalFilename = `${safeTitle}_${timestamp}.${actualExt}`;
          const actualContentType = getMimeType(actualExt);

          console.log(`[downloadFile] File exists, sending to client: ${actualTempFilePath} as ${finalFilename}`);
          
          res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
          res.setHeader('Content-Type', actualContentType);
          
          const stat = fs.statSync(actualTempFilePath);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Cache-Control', 'no-store');

          const readStream = fs.createReadStream(actualTempFilePath);
          readStream.pipe(res);

          readStream.on('end', () => {
            console.log(`[downloadFile] Finished sending to client. Cleaning up ${actualTempFilePath}`);
            fs.unlink(actualTempFilePath, (err) => {
              if (err) console.error(`[downloadFile] Cleanup error:`, err);
            });
          });

          readStream.on('error', (err) => {
            console.error(`[downloadFile] Read stream error:`, err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to read downloaded file.' });
            }
            fs.unlink(actualTempFilePath, () => {});
          });

          req.on('close', () => {
            if (!res.writableFinished) {
              console.log(`[downloadFile] Client aborted early. Cleaning up ${actualTempFilePath}`);
              readStream.destroy();
              fs.unlink(actualTempFilePath, () => {});
            }
          });

        } catch (err) {
          console.error(`[downloadFile] yt-dlp download error:`, err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download file via yt-dlp.', message: err.message });
          }
          // cleanup if failed but somehow created a file
          try {
            const files = fs.readdirSync(tempDir);
            const downloadedFileName = files.find(f => f.startsWith(tempFilePrefix));
            if (downloadedFileName) {
               fs.unlinkSync(path.join(tempDir, downloadedFileName));
            }
          } catch (e) {}
        }
        
        return; // handle by stream
      }
    }

    // ── Direct Image / File Download ──────────────────────────────────────────
    if (isDirectMediaUrl(url) || format === 'direct') {
      const fileExt = ext || getExtensionFromUrl(url) || 'bin';
      const filename = `${safeTitle}_${timestamp}.${fileExt}`;
      console.log(`[downloadFile] Direct proxy → ${filename}`);
      return await proxyStream(url, res, filename);
    }

    // ── Unsupported URL ───────────────────────────────────────────────────────
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
