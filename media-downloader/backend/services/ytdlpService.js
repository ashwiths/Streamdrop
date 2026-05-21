/**
 * ytdlpService.js
 *
 * Wraps the bundled utils/yt-dlp Python3 zipapp via child_process.
 * No npm dependency on yt-dlp — the binary ships with the repo.
 * Works on Railway (nixpacks installs python3) and locally.
 */

import { spawn } from 'child_process';
import { existsSync, chmodSync, writeFileSync, unlinkSync, mkdirSync, symlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffprobePath = ffprobeStatic.path;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Ensure static ffmpeg/ffprobe binaries are linked for yt-dlp ────────────
const binDir = join(__dirname, '../bin');
if (!existsSync(binDir)) {
  mkdirSync(binDir, { recursive: true });
}

try {
  const ffmpegLink = join(binDir, os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  const ffprobeLink = join(binDir, os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  
  if (!existsSync(ffmpegLink)) {
    symlinkSync(ffmpegPath, ffmpegLink);
  }
  if (!existsSync(ffprobeLink)) {
    symlinkSync(ffprobePath, ffprobeLink);
  }
} catch (e) {
  console.error(`[ytdlp] Failed to create symlinks for ffmpeg/ffprobe:`, e.message);
}

const cookiesPath = join(__dirname, "..", "cookies.txt");
if (existsSync(cookiesPath)) {
  console.log(`[ytdlp] ✅ Cookies file found at: ${cookiesPath}`);
} else {
  console.error(`[ytdlp] ❌ Cookies file NOT FOUND at: ${cookiesPath}`);
}

const resolveYtDlpBinary = () => {
  const platform = os.platform();
  
  let binaryName = 'yt-dlp'; // Default fallback
  
  if (platform === 'win32') {
    binaryName = 'yt-dlp.exe';
  } else if (platform === 'linux' || platform === 'darwin') {
    binaryName = 'yt-dlp-linux';
  }

  // The binary is in the backend root, which is one level up from the services directory
  const bundledPath = join(__dirname, '..', binaryName);
  
  if (existsSync(bundledPath)) {
    console.log(`[ytdlp] Found platform-specific binary at: ${bundledPath}`);
    // Ensure binary is executable
    if (platform !== 'win32') {
      try {
         chmodSync(bundledPath, 0o755);
         console.log(`[ytdlp] Granted execution permissions to ${bundledPath}`);
      } catch (err) {
         console.warn(`[ytdlp] Could not chmod binary: ${err.message}`);
      }
    }
    return bundledPath;
  }
  
  console.log(`[ytdlp] Platform specific binary not found. Falling back to default 'yt-dlp'`);
  const rootFallback = join(__dirname, '..', 'yt-dlp');
  return existsSync(rootFallback) ? rootFallback : 'yt-dlp';
};

const YT_DLP_CMD = resolveYtDlpBinary();

const isProduction = !!process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Runs yt-dlp with the given args and returns { stdout, stderr }.
 * Rejects on non-zero exit or spawn error.
 * @param {string[]} args
 * @param {number} [timeoutMs=30000]
 */
const runYtDlp = async (args, timeoutMs = 30000, isRetry = false) => {
  const finalArgs = [...args];

  if (!existsSync(cookiesPath)) {
    throw new Error(`cookies.txt not found at ${cookiesPath}`);
  }

  // Always use local cookies file to bypass YouTube blocking
  // Force Node.js as the JavaScript runtime to solve EJS signature / n challenge solving successfully
  finalArgs.unshift('--cookies', cookiesPath, '--js-runtimes', 'node', '--ffmpeg-location', binDir);
  if (isRetry) {
    finalArgs.push('--extractor-args', 'youtube:player_client=android');
  } else {
    finalArgs.push('--extractor-args', 'youtube:player_client=ios');
  }

  console.log("Using cookies file:", cookiesPath);
  console.log(`[ytdlp] Injecting cookies from: ${cookiesPath} and forcing node JS runtime, ffmpeg: ${binDir}`);

  try {
    return await new Promise((resolve, reject) => {
      console.log(`[ytdlp] Executing: ${YT_DLP_CMD} ${finalArgs.slice(0, 3).join(' ')} ...`);

      const proc = spawn(YT_DLP_CMD, finalArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs, 
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('yt-dlp timed out'));
      }, timeoutMs);

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        console.log(`[ytdlp] Execution finished with exit code: ${code}`);
        if (stdout) console.log(`[ytdlp] STDOUT (snippet): ${stdout.substring(0, 300)}...`);
        if (stderr) console.error(`[ytdlp] STDERR (snippet): ${stderr.substring(0, 300)}...`);

        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          const error = new Error(`yt-dlp exited with code ${code}. Stderr: ${stderr}`);
          error.code = code;
          reject(error);
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        console.error(`[ytdlp] Spawn error executing ${YT_DLP_CMD}:`, err);
        reject(err);
      });
    });
  } catch (err) {
    if (!isRetry) {
      console.warn(`[ytdlp] Command failed, retrying with android player client...`);
      return await runYtDlp(args, timeoutMs, true);
    }
    throw err;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches full video metadata for a given YouTube URL.
 * Returns the parsed yt-dlp JSON object.
 * @param {string} url
 * @returns {Promise<object>}
 */
export const getVideoInfo = async (url) => {
  const { stdout } = await runYtDlp([
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
    url,
  ], 45000);

  const lines = stdout.split('\n').filter(Boolean);
  // --dump-json outputs one JSON object per video; take the first
  return JSON.parse(lines[0]);
};

/**
 * Downloads media to a specified temporary file path.
 * This is required for formats that need merging (e.g. video + audio),
 * because yt-dlp cannot pipe merged formats directly to stdout.
 *
 * @param {string} url
 * @param {'video'|'audio'} type
 * @param {string} [formatId]   - yt-dlp format_id for specific quality
 * @param {string} outputPath   - absolute path to temp file
 * @param {string} [qualityParam] - audio bitrate (e.g. '128K')
 */
export const downloadToTempFile = async (url, type = 'video', formatId = null, outputPath, qualityParam = '128K') => {
  let formatSelector;
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
  ];

  if (type === 'audio') {
    formatSelector = 'bestaudio';
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', qualityParam || '128K');
  } else {
    const ytDlpFormat = formatId || "bv*+ba/b";
    console.log("Using yt-dlp format:", ytDlpFormat);
    formatSelector = ytDlpFormat === "bv*+ba/b" ? "bv*+ba/b" : `${ytDlpFormat}+bestaudio/best`;
    args.push('--merge-output-format', 'mp4');
  }

  args.push('-f', formatSelector, '-o', outputPath, url, '--verbose');

  console.log(`[ytdlp] Downloading to file: type=${type} format=${formatSelector}`);
  console.log(`[ytdlp] Command: ${YT_DLP_CMD} ${args.join(' ')}`);
  console.log(`[ytdlp] Expecting FFmpeg execution for merging...`);

  try {
    return await runYtDlp(args, 180000); // 3 minutes timeout for download and merge
  } catch (err) {
    if (type === 'video' && formatSelector !== 'best') {
      console.warn(`[ytdlp] Video download failed with format "${formatSelector}": ${err.message}. Retrying with fallback format "best"...`);
      
      const fallbackArgs = args.map(arg => arg === formatSelector ? 'best' : arg);
      console.log(`[ytdlp] Retrying command: ${YT_DLP_CMD} ${fallbackArgs.join(' ')}`);
      
      return await runYtDlp(fallbackArgs, 180000);
    }
    throw err;
  }
};
