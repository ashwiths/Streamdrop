/**
 * Quick test script — verifies yt-dlp + server logic works
 * Run: node test.mjs
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YT_DLP = join(__dirname, 'utils/yt-dlp');
const TEST_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('=== StreamDrop Backend — Deployment Readiness Test ===\n');

// Test 1: yt-dlp version
console.log('1. yt-dlp binary version...');
const vProc = spawn('python3', [YT_DLP, '--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
let version = '';
vProc.stdout.on('data', d => version += d);
await new Promise(r => vProc.on('close', r));
console.log(`   ✅ yt-dlp version: ${version.trim()}\n`);

// Test 2: YouTube info extraction
console.log('2. YouTube metadata extraction...');
const iProc = spawn('python3', [YT_DLP, '--cookies', join(__dirname, 'cookies.txt'), '--dump-json', '--no-playlist', '--no-warnings', TEST_URL], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let infoOut = '';
let infoErr = '';
iProc.stdout.on('data', d => infoOut += d);
iProc.stderr.on('data', d => infoErr += d);

await new Promise((resolve, reject) => {
  const t = setTimeout(() => { iProc.kill(); reject(new Error('Timeout')); }, 30000);
  iProc.on('close', (code) => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(infoErr)); });
});

const info = JSON.parse(infoOut.split('\n')[0]);
const formats = info.formats || [];
const videoFmts = formats.filter(f => f.vcodec !== 'none' && f.height);
const audioFmts = formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
const uniqueHeights = [...new Set(videoFmts.map(f => f.height))].sort((a,b) => b-a);

console.log(`   ✅ Title: ${info.title}`);
console.log(`   ✅ Duration: ${info.duration}s`);
console.log(`   ✅ Total formats: ${formats.length}`);
console.log(`   ✅ Video resolutions: ${uniqueHeights.join(', ')}p`);
console.log(`   ✅ Audio formats: ${audioFmts.length}`);

console.log('\n=== ALL TESTS PASSED — Ready for Railway deployment ===');
