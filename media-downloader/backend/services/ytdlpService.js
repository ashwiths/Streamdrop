/**
 * ytdlpService.js
 *
 * Wraps the bundled utils/yt-dlp Python3 zipapp via child_process.
 * No npm dependency on yt-dlp — the binary ships with the repo.
 * Works on Railway (nixpacks installs python3) and locally.
 */

import { spawn } from 'child_process';
import { existsSync, chmodSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import os from 'os';

const resolveYtDlpBinary = () => {
  const platform = os.platform();
  const cwd = process.cwd();
  
  let binaryName = 'yt-dlp'; // Default fallback
  
  if (platform === 'win32') {
    binaryName = 'yt-dlp.exe';
  } else if (platform === 'linux' || platform === 'darwin') {
    binaryName = 'yt-dlp-linux';
  }

  const bundledPath = join(cwd, binaryName);
  
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
  return existsSync(join(cwd, 'yt-dlp')) ? join(cwd, 'yt-dlp') : 'yt-dlp';
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
const runYtDlp = async (args, timeoutMs = 30000) => {
  let cookieFilePath = null;
  const finalArgs = [...args];

  if (process.env.YTDLP_COOKIES) {
    try {
      const tempDir = os.tmpdir();
      cookieFilePath = join(tempDir, `ytdlp-cookies-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`);
      writeFileSync(cookieFilePath, process.env.YTDLP_COOKIES, 'utf-8');
      console.log(`[ytdlp] Secure cookies loaded from environment to temp file: ${cookieFilePath}`);
      
      // Inject cookies parameter
      finalArgs.unshift('--cookies', cookieFilePath);
    } catch (err) {
      console.error(`[ytdlp] Failed to write temporary cookie file:`, err);
    }
  } else {
    console.log(`[ytdlp] No YTDLP_COOKIES found in environment, running anonymously.`);
  }

  return new Promise((resolve, reject) => {
    console.log(`[ytdlp] Executing: ${YT_DLP_CMD} ${finalArgs.slice(0, 3).join(' ')} ...`);

    const proc = spawn(YT_DLP_CMD, finalArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs, 
    });

    let stdout = '';
    let stderr = '';
    
    const cleanupCookies = () => {
      if (cookieFilePath && existsSync(cookieFilePath)) {
        try {
          unlinkSync(cookieFilePath);
          console.log(`[ytdlp] Securely deleted temporary cookies file.`);
        } catch (e) {
          console.error(`[ytdlp] Failed to clean up cookies file:`, e);
        }
      }
    };

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      cleanupCookies();
      reject(new Error('yt-dlp timed out'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      cleanupCookies();
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
      cleanupCookies();
      console.error(`[ytdlp] Spawn error executing ${YT_DLP_CMD}:`, err);
      reject(err);
    });
  });
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
 */
export const downloadToTempFile = async (url, type = 'video', formatId = null, outputPath) => {
  let formatSelector;

  if (type === 'audio') {
    // Best audio-only, prefer m4a for maximum compatibility
    formatSelector = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio';
  } else if (formatId && formatId !== 'best') {
    // Specific format — try the requested id, fall back to best single-stream mp4
    formatSelector = `${formatId}+bestaudio[ext=m4a]/${formatId}/best[ext=mp4]/best`;
  } else {
    // Default: best single-stream (no merge required, lowest friction on Railway)
    formatSelector = 'best[ext=mp4]/best[ext=webm]/best';
  }

  const args = [
    '-f', formatSelector,
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
    '-o', outputPath,
    url,
  ];

  console.log(`[ytdlp] Downloading to file: type=${type} format=${formatSelector}`);
  console.log(`[ytdlp] Command: ${YT_DLP_CMD} ${args.join(' ')}`);

  return await runYtDlp(args, 180000); // 3 minutes timeout for download and merge
};
