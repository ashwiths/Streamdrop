import ytdl from '@distube/ytdl-core';
import { isValidUrl } from '../utils/helper.js';

/**
 * GET /api/download/info
 * Fetches media metadata for a given URL.
 */
export const getMediaInfo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required.' });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });
    }

    console.log(`[getMediaInfo] Fetching info for: ${url}`);

    const info = await ytdl.getInfo(url);
    const details = info.videoDetails;

    const videoFormats = [];
    const audioFormats = [];

    info.formats.forEach((f) => {
      const size = f.contentLength ? parseInt(f.contentLength) : null;

      const formatObj = {
        format_id: f.itag.toString(),
        quality: f.qualityLabel || f.audioQuality || 'Unknown',
        ext: f.container || 'mp4',
        filesize: size,
        vcodec: f.hasVideo ? (f.videoCodec || 'h264') : 'none',
        acodec: f.hasAudio ? (f.audioCodec || 'aac') : 'none',
      };

      if (f.hasVideo) {
        videoFormats.push({ ...formatObj, type: 'video' });
      } else if (f.hasAudio) {
        audioFormats.push({ ...formatObj, type: 'audio' });
      }
    });

    // Deduplicate video formats by quality label, keep highest resolution first
    const seenQualities = new Set();
    const uniqueVideoFormats = videoFormats
      .filter((f) => {
        if (seenQualities.has(f.quality)) return false;
        seenQualities.add(f.quality);
        return true;
      })
      .sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

    // Build human-readable duration string
    const totalSeconds = parseInt(details.lengthSeconds || 0);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const duration =
      h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;

    const thumbnail =
      details.thumbnails?.[details.thumbnails.length - 1]?.url || '';

    console.log(`[getMediaInfo] Success — title: "${details.title}", formats: ${info.formats.length}`);

    return res.status(200).json({
      success: true,
      title: details.title || '',
      thumbnail,
      duration,
      formats: {
        video: uniqueVideoFormats,
        audio: audioFormats,
      },
    });
  } catch (error) {
    console.error('[getMediaInfo] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch media info.',
    });
  }
};

/**
 * POST /api/download/file
 * Streams the media file directly to the client — no temp files, fully serverless-compatible.
 */
export const downloadFile = async (req, res) => {
  try {
    const { url, format, ext, type, title } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required.' });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });
    }

    console.log(`[downloadFile] url=${url} | format=${format} | type=${type}`);

    // Sanitize filename
    const safeTitle = (title || 'streamdrop_download')
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 60);

    let stream;
    let filename;
    let contentType;

    if (type === 'audio') {
      // Stream highest quality audio (m4a/webm — no ffmpeg needed)
      stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
      });
      filename = `${safeTitle}_${Date.now()}.m4a`;
      contentType = 'audio/mp4';
    } else {
      // Stream video — prefer combined (video+audio) when no specific format given
      const ytdlOptions = format
        ? { quality: format }                              // specific itag from /info
        : { quality: 'highest', filter: 'audioandvideo' }; // fallback combined stream

      stream = ytdl(url, ytdlOptions);
      filename = `${safeTitle}_${Date.now()}.${ext || 'mp4'}`;
      contentType = 'video/mp4';
    }

    // Set response headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-store');

    console.log(`[downloadFile] Streaming: ${filename}`);

    // Pipe stream directly to response — no filesystem writes
    stream.on('error', (err) => {
      console.error('[downloadFile] Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download stream failed.', message: err.message });
      }
    });

    stream.on('end', () => {
      console.log(`[downloadFile] Stream complete: ${filename}`);
    });

    stream.pipe(res);
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
