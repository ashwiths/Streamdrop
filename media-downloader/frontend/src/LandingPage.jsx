import React from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import HowItWorks from './components/HowItWorks';
import SupportedPlatforms from './components/SupportedPlatforms';
import WhyChoose from './components/WhyChoose';
import Faq from './components/Faq';
import BottomBar from './components/BottomBar';
import Footer from './components/Footer';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ 
        background: '#020204', 
        fontFamily: "'Space Grotesk', system-ui, sans-serif" 
      }}
    >
      {/* ── Fixed Navbar ── */}
      <Navbar />

      {/* ── Hero (full viewport) ── */}
      <HeroSection />

      {/* ── Cinematic Wrapper for Lower Sections ── */}
      <div 
        style={{ 
          position: 'relative',
          background: '#020204',
          zIndex: 5,
          overflow: 'hidden',
          paddingTop: '20px',
        }}
      >
        {/* Soft background mesh glow behind Supported Platforms */}
        <div 
          style={{
            position: 'absolute',
            top: '10%', left: '50%',
            transform: 'translateX(-50%)',
            width: '600px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)',
            filter: 'blur(100px)',
            zIndex: 1,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />

        {/* Soft background mesh glow behind Why Choose */}
        <div 
          style={{
            position: 'absolute',
            top: '45%', right: '5%',
            width: '500px', height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
            filter: 'blur(100px)',
            zIndex: 1,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />

        {/* Soft background mesh glow behind FAQ */}
        <div 
          style={{
            position: 'absolute',
            bottom: '15%', left: '8%',
            width: '550px', height: '550px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)',
            filter: 'blur(100px)',
            zIndex: 1,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />

        {/* Content sections layered on top of glowing background */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <HowItWorks />
          <SupportedPlatforms />
          <WhyChoose />
          <Faq />
          <BottomBar />
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
