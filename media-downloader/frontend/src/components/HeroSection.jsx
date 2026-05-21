import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiLink, FiDownload, FiAlertCircle } from 'react-icons/fi';
import { fetchVideoInfo } from '../services/api';
import Loader from './Loader';
import ResultCard from './ResultCard';

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
};

// Background subtle particle elements to make the scene alive
const STARS = [
  { top: '12%', left: '8%', size: '3px', delay: 0 },
  { top: '22%', left: '25%', size: '2px', delay: 1 },
  { top: '15%', left: '72%', size: '4px', delay: 2 },
  { top: '35%', left: '85%', size: '2px', delay: 1.5 },
  { top: '48%', left: '15%', size: '3px', delay: 3 },
  { top: '55%', left: '82%', size: '2px', delay: 0.5 },
  { top: '28%', left: '60%', size: '3px', delay: 2.5 },
];

export default function HeroSection() {
  const [url, setUrl] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoData, setVideoData] = useState(null);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a valid video link.');
      return;
    }
    setError(null);
    setVideoData(null);
    setLoading(true);

    try {
      const data = await fetchVideoInfo(url);
      setVideoData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch video information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="home"
      className="flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        position: 'relative',
        minHeight: '100svh',
        padding: 'clamp(100px, 16vw, 140px) 16px clamp(60px, 8vw, 80px)',
        fontFamily: "'Space Grotesk', sans-serif",
        background: '#020204',
      }}
    >

      {/* ── Background Image — Sharper & More Present ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 10%',
        backgroundRepeat: 'no-repeat',
        opacity: 0.9,
        zIndex: 0,
      }} />

      {/* ── Layered Gradient Overlays & Vignette (Dark center overlay for depth) ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, rgba(2,2,4,0.3) 0%, rgba(2,2,4,0.65) 50%, rgba(2,2,4,0.95) 90%, #020204 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* ── Bottom Blending to Page ── */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: '280px',
        background: 'linear-gradient(to bottom, transparent, rgba(2,2,4,0.85) 60%, #020204 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* ── Animated Background Particles / Stars ── */}
      {STARS.map((star, idx) => (
        <motion.div
          key={idx}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + idx % 3,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: idx % 2 === 0 ? '#f97316' : '#ec4899',
            boxShadow: `0 0 10px ${idx % 2 === 0 ? '#f97316' : '#ec4899'}`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Ambient Glowing Spheres ── */}
      <div 
        className="animate-float-glow-1"
        style={{
          position: 'absolute',
          top: '20%', left: '15%',
          width: '380px', height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
          filter: 'blur(70px)',
          zIndex: 2,
          pointerEvents: 'none',
        }} 
      />
      <div 
        className="animate-float-glow-2"
        style={{
          position: 'absolute',
          bottom: '25%', right: '10%',
          width: '420px', height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          filter: 'blur(70px)',
          zIndex: 2,
          pointerEvents: 'none',
        }} 
      />

      {/* ── Content ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* Pill Badge */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} style={{ marginBottom: '28px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '999px',
            background: 'rgba(10, 10, 15, 0.75)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            boxShadow: '0 0 15px rgba(249,115,22,0.1)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            <FiZap style={{ color: '#f97316', fontSize: '13px' }} />
            Fast • Secure • Unlimited
          </span>
        </motion.div>

        {/* Sharp High-Contrast Heading */}
        <motion.h1
          custom={0.08}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          style={{
            margin: 0,
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: 'clamp(2.5rem, 6.5vw, 4.4rem)',
            fontFamily: "'Space Grotesk', sans-serif",
            textShadow: '0 10px 40px rgba(0,0,0,0.7)',
          }}
        >
          <span style={{ color: '#ffffff', display: 'block', marginBottom: '4px' }}>
            Download Videos &amp; Audio
          </span>
          <span 
            className="premium-glow-text"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #f97316 0%, #ff529a 50%, #ec4899 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 4.5s linear infinite',
              paddingBottom: '2px',
            }}
          >
            From Any Platform
          </span>
        </motion.h1>

        {/* Sharpened Subtitle */}
        <motion.p
          custom={0.16}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          style={{
            margin: '22px 0 0',
            fontSize: '16.5px',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.75)',
            maxWidth: '520px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textShadow: '0 4px 15px rgba(0,0,0,0.6)',
          }}
        >
          Paste the link of any video from YouTube, Instagram, TikTok,
          Facebook, and more. Download in MP4, MP3 with your preferred quality.
        </motion.p>

        {/* ── Premium Glass Downloader Card ── */}
        <motion.div
          custom={0.24}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          style={{ marginTop: '40px', width: '100%', maxWidth: '720px' }}
        >
          <div
            className="animated-border-glow"
            style={{
              borderRadius: '20px',
              padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 28px)',
              background: 'rgba(8, 8, 12, 0.82)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(249,115,22,0.3)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(249,115,22,0.1)',
            }}
          >
            {/* Input Form */}
            <form onSubmit={handleDownload} className="flex flex-col gap-3">
              <div style={{ position: 'relative', width: '100%', height: '54px' }}>
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '16px',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 1,
                }}>
                  <FiLink style={{ color: 'rgba(255,255,255,0.5)', fontSize: '17px' }} />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your video link here..."
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    paddingLeft: '46px',
                    paddingRight: '16px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: inputFocused
                      ? '1px solid rgba(249,115,22,0.8)'
                      : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: inputFocused
                      ? '0 0 20px rgba(249,115,22,0.2), inset 0 2px 4px rgba(0,0,0,0.5)'
                      : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '15px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: '500',
                    outline: 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Download Button */}
              <motion.button
                whileHover={{ 
                  scale: 1.03, 
                  boxShadow: '0 0 32px rgba(249,115,22,0.55)',
                  background: 'linear-gradient(135deg, #f97316 0%, #ff4b91 100%)'
                }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full sm:w-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16.5px 32px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
                  transition: 'background 0.3s ease',
                  minWidth: '140px',
                }}
              >
                Download
                <FiDownload style={{ fontSize: '16px', strokeWidth: 2.5 }} />
              </motion.button>
            </form>

            {/* Example Link */}
            <p style={{ margin: '16px 0 0', fontSize: '13px', textAlign: 'left', display: 'flex', gap: '6px' }}>
              <span style={{ color: '#f97316', fontWeight: 600 }}>Example: </span>
              <span style={{ color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
              </span>
            </p>
          </div>
        </motion.div>

        {/* Dynamic States */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ width: '100%', maxWidth: '720px', display: 'flex', justifyContent: 'center' }}
            >
              <Loader />
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                marginTop: '20px',
                width: '100%',
                maxWidth: '720px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#ef4444',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <FiAlertCircle style={{ fontSize: '20px' }} />
              <span style={{ fontSize: '15px', fontWeight: 500 }}>{error}</span>
            </motion.div>
          )}

          {videoData && !loading && !error && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <ResultCard videoInfo={videoData} originalUrl={url} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
