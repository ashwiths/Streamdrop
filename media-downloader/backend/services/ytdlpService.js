/**
 * ytdlpService.js
 *
 * Wraps the bundled utils/yt-dlp Python3 zipapp via child_process.
 * No npm dependency on yt-dlp — the binary ships with the repo.
 * Works on Railway (nixpacks installs python3) and locally.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const localBinaryPath = join(process.cwd(), 'yt-dlp');
const YT_DLP_CMD = existsSync(localBinaryPath) ? localBinaryPath : 'yt-dlp';
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Runs yt-dlp with the given args and returns { stdout, stderr }.
 * Rejects on non-zero exit or spawn error.
 * @param {string[]} args
 * @param {number} [timeoutMs=30000]
 */
const runYtDlp = (args, timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    console.log(`[ytdlp] spawn: ${PYTHON_CMD} ${YT_DLP_CMD} ${args.slice(0, 3).join(' ')} ...`);

    const proc = spawn(PYTHON_CMD, [YT_DLP_CMD, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timed out'));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 || stdout.trim()) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        const msg = stderr.trim() || `yt-dlp exited with code ${code}`;
        reject(new Error(msg));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`spawn error: ${err.message}`));
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
 * Creates a child_process for streaming media directly to an HTTP response.
 * The caller is responsible for piping proc.stdout → res.
 *
 * @param {string} url
 * @param {'video'|'audio'} type
 * @param {string} [formatId]   - yt-dlp format_id for specific quality
 * @returns {ChildProcess}
 */
export const createDownloadStream = (url, type = 'video', formatId = null) => {
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
    '-o', '-',   // stream to stdout
    url,
  ];

  console.log(`[ytdlp] Stream: type=${type} format=${formatSelector}`);
  return spawn(PYTHON_CMD, [YT_DLP_CMD, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
};
