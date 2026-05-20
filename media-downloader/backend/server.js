import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRoutes from './routes/download.js';

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://linkdownload-orpin.vercel.app',
  'https://streamdrop-jd7q.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | env=${isProduction ? 'production' : 'development'}`);
  next();
});

// ─── Health & Root Endpoints ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'StreamDrop API',
    env: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'StreamDrop API is running.',
    version: '1.0.0',
    endpoints: ['/health', '/api', '/api/health', '/api/download/info', '/api/download/file'],
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'StreamDrop API',
    env: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/download', downloadRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found.', path: req.path });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message || err);
  res.status(500).json({
    error: 'Internal server error.',
    message: !isProduction ? err.message : undefined,
  });
});

// ─── Export for Vercel Serverless ─────────────────────────────────────────────
// @vercel/node requires a default export of the Express app.
export default app;

// ─── Local Dev: Start Server ──────────────────────────────────────────────────
// Only call app.listen() when NOT running on Vercel (VERCEL env var is set to '1' automatically).
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 StreamDrop backend running on http://localhost:${PORT}`);
  });
}
