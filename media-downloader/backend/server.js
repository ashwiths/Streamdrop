import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRoutes from './routes/download.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

console.log(`[boot] StreamDrop API starting...`);
console.log(`[boot] NODE_ENV=${process.env.NODE_ENV || 'development'} | PORT=${PORT} | Railway=${!!process.env.RAILWAY_ENVIRONMENT}`);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://linkdownload-orpin.vercel.app',
  'https://streamdrop-jd7q.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log(`[boot] Allowed CORS origins: ${allowedOrigins.join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, same-host)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle all preflight requests

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ─── Health & Root ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'StreamDrop API',
    status: 'running',
    version: '1.0.0',
    env: isProduction ? 'production' : 'development',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'StreamDrop API',
    uptime: Math.floor(process.uptime()),
    env: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'StreamDrop API is running.',
    version: '1.0.0',
    endpoints: [
      'GET  /health',
      'GET  /api',
      'GET  /api/health',
      'POST /api/download/info',
      'POST /api/download/file',
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'StreamDrop API',
    uptime: Math.floor(process.uptime()),
    env: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/download', downloadRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found.', path: req.path });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.stack || err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({
    error: 'Internal server error.',
    message: isProduction ? undefined : (err.message || 'Unknown error'),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
// Binds to 0.0.0.0 — required for Railway containers and Docker.
// VERCEL guard keeps this safe for Vercel serverless (VERCEL=1 auto-set by Vercel).
if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ StreamDrop API running on http://0.0.0.0:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown for Railway / Docker SIGTERM
  process.on('SIGTERM', () => {
    console.log('[shutdown] SIGTERM received — closing server gracefully...');
    server.close(() => {
      console.log('[shutdown] Server closed. Exiting.');
      process.exit(0);
    });
  });

  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
}

// ─── Export for Vercel Serverless ─────────────────────────────────────────────
export default app;
