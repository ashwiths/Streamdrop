import React from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiSliders, FiSmartphone } from 'react-icons/fi';
import { BsShieldCheck } from 'react-icons/bs';

const FEATURES = [
  {
    icon: <FiZap style={{ color: '#fff', fontSize: '28px' }} />,
    title: 'Blazing Fast',
    desc: 'Super-fast downloads with optimized servers. No waiting, just instant results.',
    glow: 'rgba(249, 115, 22, 0.18)',
    borderGlow: 'rgba(249, 115, 22, 0.45)',
    iconGlow: 'rgba(249, 115, 22, 0.4)',
  },
  {
    icon: <BsShieldCheck style={{ color: '#fff', fontSize: '28px' }} />,
    title: 'Safe & Secure',
    desc: "We don't store your files. 100% secure and your privacy is our priority.",
    glow: 'rgba(236, 72, 153, 0.18)',
    borderGlow: 'rgba(236, 72, 153, 0.45)',
    iconGlow: 'rgba(236, 72, 153, 0.4)',
  },
  {
    icon: <FiSliders style={{ color: '#fff', fontSize: '28px' }} />,
    title: 'Custom Quality',
    desc: 'Choose your preferred quality from 144p to 4K and audio formats.',
    glow: 'rgba(249, 115, 22, 0.18)',
    borderGlow: 'rgba(249, 115, 22, 0.45)',
    iconGlow: 'rgba(249, 115, 22, 0.4)',
  },
  {
    icon: <FiSmartphone style={{ color: '#fff', fontSize: '28px' }} />,
    title: 'Mobile Friendly',
    desc: 'Fully responsive and works perfectly on all devices. Download on the go!',
    glow: 'rgba(236, 72, 153, 0.18)',
    borderGlow: 'rgba(236, 72, 153, 0.45)',
    iconGlow: 'rgba(236, 72, 153, 0.4)',
  },
];

export default function WhyChoose() {
  return (
    <section
      id="features"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 100px',
        position: 'relative',
        zIndex: 10,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Premium Header with Glowing Dividers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '18px',
          marginBottom: '56px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '70px',
              height: '2px',
              background: 'linear-gradient(to left, #f97316, transparent)',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.5)',
            }}
          />
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: '#f97316', 
            boxShadow: '0 0 12px #f97316' 
          }} />
        </div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 800, 
          letterSpacing: '-0.02em', 
          color: '#fff', 
          margin: 0,
          textShadow: '0 0 20px rgba(255,255,255,0.1)'
        }}>
          Why Choose AshDrop?
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: '#f97316', 
            boxShadow: '0 0 12px #f97316' 
          }} />
          <div
            style={{
              width: '70px',
              height: '2px',
              background: 'linear-gradient(to right, #f97316, transparent)',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.5)',
            }}
          />
        </div>
      </div>

      {/* Feature Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '28px',
        }}
      >
        {FEATURES.map((f, idx) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ 
              scale: 1.05, 
              y: -8,
              borderColor: f.borderGlow,
              boxShadow: `0 20px 45px ${f.glow}, 0 0 15px rgba(255, 255, 255, 0.05)`,
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '40px 32px',
              borderRadius: '26px',
              background: 'rgba(8, 8, 12, 0.78)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 12px 45px rgba(0, 0, 0, 0.75)',
              cursor: 'pointer',
              minHeight: '260px',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            {/* Glow Icon wrapper with soft ambient backglow */}
            <div style={{ position: 'relative', marginBottom: '28px' }}>
              {/* Backglow layer */}
              <div style={{
                position: 'absolute',
                top: '-4px', left: '-4px',
                width: '68px', height: '68px',
                borderRadius: '20px',
                background: f.iconGlow,
                filter: 'blur(10px)',
                zIndex: 0,
                opacity: 0.8,
              }} />
              
              <div
                style={{
                  position: 'relative',
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
                }}
              >
                {f.icon}
              </div>
            </div>

            <h3 style={{ 
              fontSize: '19px', 
              fontWeight: 800, 
              color: '#fff', 
              margin: '0 0 12px 0', 
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {f.title}
            </h3>
            <p style={{ 
              fontSize: '14.5px', 
              lineHeight: 1.7, 
              color: 'rgba(255, 255, 255, 0.65)', 
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
