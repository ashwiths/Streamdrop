import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiUser, FiDownload, FiMusic, FiVideo, FiLoader, FiEye, FiYoutube } from 'react-icons/fi';
import { downloadMediaFile } from '../services/api';

export default function ResultCard({ videoInfo, originalUrl }) {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isHoveringThumb, setIsHoveringThumb] = useState(false);

  if (!videoInfo) return null;

  const { title, thumbnail, duration, uploader, view_count, formats = [] } = videoInfo;

  const videoQualities = ['360p', '720p', '1080p', '4K'];
  const audioQualities = ['64kbps', '128kbps', '320kbps'];

  const getFormatForVideo = (qualityLabel) => {
    if (!formats || !formats.video || formats.video.length === 0) return null;
    const num = qualityLabel.replace('p', '').replace('K', '000');
    // Prefer mp4 over webm for video
    const matching = formats.video.filter(f => f.quality && f.quality.toString().includes(num));
    if (matching.length > 0) {
      return matching.find(f => f.ext === 'mp4') || matching[0];
    }
    return formats.video[0];
  };

  const getFormatForAudio = (qualityLabel) => {
    if (!formats || !formats.audio || formats.audio.length === 0) return null;
    const kbps = qualityLabel.replace('kbps', '');
    
    // Allow any audio format because the backend will use FFmpeg to convert it to a pristine MP3
    const matching = formats.audio.filter(f => (f.abr && f.abr.toString() === kbps) || (f.quality && f.quality.toString().includes(kbps)));
    
    if (matching.length > 0) {
      return matching[0];
    }
    
    return formats.audio[0];
  };
  
  const handleFormatSelect = (fmtInfo) => {
    if (isDownloading) return;
    setSelectedFormat(fmtInfo);
  };

  const handleDownload = async () => {
    if (!selectedFormat || !selectedFormat.id) {
      alert("Please select a format to download.");
      return;
    }
    
    const urlToDownload = originalUrl || '';

    try {
      setIsDownloading(true);
      // We will force mp3 saving if it's audio because backend uses ffmpeg for pristine mp3 conversion
      const ext = selectedFormat.type === 'audio' ? 'mp3' : (selectedFormat.ext || 'mp4');
      const qualityParam = selectedFormat.type === 'audio' ? selectedFormat.label.replace('kbps', 'K') : null;
      
      const blob = await downloadMediaFile(urlToDownload, selectedFormat.id, ext, selectedFormat.type, qualityParam, title);
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      const safeTitle = (title || 'streamdrop_media').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      a.download = `${safeTitle}_${selectedFormat.label}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

    } catch (error) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getButtonText = () => {
    if (isDownloading) return 'Preparing download...';
    if (selectedFormat) {
      return `Download ${selectedFormat.type === 'audio' ? 'MP3' : 'MP4'} ${selectedFormat.label}`;
    }
    return 'Select a format';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        marginTop: '40px',
        width: '100%',
        maxWidth: '900px',
      }}
    >
      {/* Ambient Outer Glow */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(249,115,22,0.3) 0%, rgba(236,72,153,0.3) 100%)',
          filter: 'blur(40px)',
          opacity: 0.6,
          zIndex: -1,
          borderRadius: '32px'
        }}
      />

      <div
        className="flex flex-col lg:flex-row relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(14,14,20,0.85) 0%, rgba(8,8,12,0.95) 100%)',
          borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Subtle internal reflection */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '100%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />

        {/* ── LEFT SIDE: Thumbnail ── */}
        <div className="flex-1 w-full lg:basis-[350px] p-6 flex flex-col relative">
          <div 
            onMouseEnter={() => setIsHoveringThumb(true)}
            onMouseLeave={() => setIsHoveringThumb(false)}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#000',
            }}
          >
            <motion.img 
              animate={{ scale: isHoveringThumb ? 1.05 : 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              src={thumbnail || 'https://via.placeholder.com/640x360?text=No+Thumbnail'} 
              alt={title || "Thumbnail"} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            {/* Vignette Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.4) 100%)',
              pointerEvents: 'none'
            }} />

            {/* Platform Badge (Simulated YouTube) */}
            <div style={{
              position: 'absolute',
              top: '12px', left: '12px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              padding: '6px 10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <FiYoutube style={{ color: '#ff0000', fontSize: '14px' }} />
              <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>YouTube</span>
            </div>

            {/* Duration Badge */}
            <div style={{
              position: 'absolute',
              bottom: '12px', right: '12px',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <FiClock style={{ color: '#f97316' }} /> {duration || '0:00'}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE: Content & Formats ── */}
        <div className="flex-[1.5] w-full lg:basis-[400px] p-6 flex flex-col justify-center">
          
          {/* Metadata Header */}
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{
              margin: '0 0 10px 0',
              fontSize: '22px',
              color: '#fff',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}>
              {title || 'Unknown Title'}
            </h2>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiUser style={{ color: '#ec4899', fontSize: '14px' }} />
                <span>{uploader || 'Unknown Uploader'}</span>
              </div>
              
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiClock style={{ color: '#f97316', fontSize: '14px' }} />
                <span>{duration || '0:00'}</span>
              </div>
              
              {view_count && (
                <>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiEye style={{ color: '#a855f7', fontSize: '14px' }} />
                    <span>{Number(view_count).toLocaleString()} views</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)', marginBottom: '16px' }} />

          {/* Format Sections */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
            
            {/* Audio Formats */}
            <div style={{ flex: '1 1 180px' }}>
              <h3 style={{ 
                fontSize: '13px', 
                color: 'rgba(255,255,255,0.7)', 
                marginBottom: '14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                <div style={{ padding: '6px', background: 'rgba(236,72,153,0.15)', borderRadius: '8px' }}>
                  <FiMusic style={{ color: '#ec4899', fontSize: '14px' }} /> 
                </div>
                MP3 - Audio
              </h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {audioQualities.map((q) => {
                  const actualFormat = getFormatForAudio(q);
                  const isDisabled = !actualFormat || !actualFormat.format_id;
                  const isSelected = selectedFormat?.label === q && selectedFormat?.type === 'audio';
                  
                  return (
                    <motion.button
                      key={q}
                      whileHover={isDisabled || isDownloading ? {} : { scale: 1.03, y: -2 }}
                      whileTap={isDisabled || isDownloading ? {} : { scale: 0.97 }}
                      onClick={() => {
                          if (!isDisabled && !isDownloading) handleFormatSelect({ label: q, type: 'audio', id: actualFormat.format_id, ext: actualFormat.ext });
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                        boxShadow: isSelected ? '0 0 15px rgba(236,72,153,0.2)' : 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: (isDisabled || isDownloading) ? 'not-allowed' : 'pointer',
                        opacity: (isDisabled || isDownloading) ? 0.3 : 1,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {q}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Video Formats */}
            <div style={{ flex: '1 1 180px' }}>
              <h3 style={{ 
                fontSize: '13px', 
                color: 'rgba(255,255,255,0.7)', 
                marginBottom: '14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                <div style={{ padding: '6px', background: 'rgba(249,115,22,0.15)', borderRadius: '8px' }}>
                  <FiVideo style={{ color: '#f97316', fontSize: '14px' }} /> 
                </div>
                MP4 - Video
              </h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {videoQualities.map((q) => {
                  const actualFormat = getFormatForVideo(q);
                  const isDisabled = !actualFormat || !actualFormat.format_id;
                  const isSelected = selectedFormat?.label === q && selectedFormat?.type === 'video';
                  
                  return (
                    <motion.button
                      key={q}
                      whileHover={isDisabled || isDownloading ? {} : { scale: 1.03, y: -2 }}
                      whileTap={isDisabled || isDownloading ? {} : { scale: 0.97 }}
                      onClick={() => {
                          if (!isDisabled && !isDownloading) handleFormatSelect({ label: q, type: 'video', id: actualFormat.format_id, ext: actualFormat.ext });
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                        boxShadow: isSelected ? '0 0 15px rgba(249,115,22,0.2)' : 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: (isDisabled || isDownloading) ? 'not-allowed' : 'pointer',
                        opacity: (isDisabled || isDownloading) ? 0.3 : 1,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {q}
                    </motion.button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Action Button */}
          <div style={{ position: 'relative' }}>
            {/* Ambient animated glow for the button when a format is selected */}
            {selectedFormat && !isDownloading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  background: 'linear-gradient(90deg, #f97316, #ec4899, #a855f7)',
                  filter: 'blur(15px)',
                  borderRadius: '16px',
                  zIndex: 0,
                }}
              />
            )}
            
            <motion.button
              whileHover={(!selectedFormat || isDownloading) ? {} : { scale: 1.02 }}
              whileTap={(!selectedFormat || isDownloading) ? {} : { scale: 0.98 }}
              onClick={handleDownload}
              disabled={!selectedFormat || isDownloading}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                background: selectedFormat 
                  ? 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)' 
                  : 'rgba(255,255,255,0.05)',
                backgroundSize: '200% 200%',
                border: selectedFormat ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
                color: selectedFormat ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '16px',
                fontWeight: 700,
                cursor: (!selectedFormat || isDownloading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
                opacity: isDownloading ? 0.8 : 1,
                boxShadow: selectedFormat ? '0 10px 30px rgba(236,72,153,0.3), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none',
              }}
            >
              {isDownloading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <FiLoader style={{ fontSize: '22px' }} />
                </motion.div>
              ) : (
                <FiDownload style={{ fontSize: '20px' }} />
              )}
              {getButtonText()}
              
              {/* Button inner shine effect */}
              {selectedFormat && !isDownloading && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                  borderRadius: '16px 16px 0 0',
                  pointerEvents: 'none',
                }} />
              )}
            </motion.button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
