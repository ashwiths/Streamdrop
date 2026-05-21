import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiMenu, FiX, FiUser } from 'react-icons/fi';

const NAV_LINKS = ['Home', 'How It Works', 'Supported', 'Features', 'FAQ', 'About Us'];

const LINK_MAP = {
  'Home': 'home',
  'How It Works': 'how-it-works',
  'Supported': 'supported',
  'Features': 'features',
  'FAQ': 'faq',
  'About Us': 'about-us'
};

export default function Navbar() {
  const [active, setActive] = useState('Home');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const fn = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Sync scroll positions using IntersectionObserver (highly optimized, avoids layout thrashing)
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const name = Object.keys(LINK_MAP).find(key => LINK_MAP[key] === id);
          if (name) {
            setActive(name);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    Object.values(LINK_MAP).forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleScrollTo = (name) => {
    const id = LINK_MAP[name];
    const element = document.getElementById(id);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const targetTop = rect.top + scrollTop - 80; // Offset for fixed navbar

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
      setActive(name);
    }
  };

  const navStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    background: scrolled ? 'rgba(6, 6, 8, 0.85)' : 'rgba(6, 6, 8, 0.4)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: "'Space Grotesk', sans-serif",
  };

  const innerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoIconStyle = {
    width: '38px', height: '38px',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(249,115,22,0.4)',
    flexShrink: 0,
    cursor: 'pointer',
  };

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>

        {/* Logo */}
        <div 
          onClick={() => handleScrollTo('Home')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={logoIconStyle}>
            <FiDownload style={{ color: '#fff', fontSize: '18px', strokeWidth: 2.5 }} />
          </div>
          <span style={{ fontSize: '21px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#ffffff' }}>Stream</span>
            <span style={{ color: '#f97316' }}>Drop</span>
          </span>
        </div>

        {/* Center Nav — Desktop only */}
        <ul
          className="hidden md:flex items-center gap-2"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {NAV_LINKS.map((link) => (
            <li key={link} style={{ position: 'relative' }}>
              <button
                onClick={() => handleScrollTo(link)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  fontSize: '14.5px',
                  fontWeight: 500,
                  color: active === link ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {link === 'About Us' && (
                  <FiUser style={{ fontSize: '14px', opacity: 0.8 }} />
                )}
                {link}
                {active === link && (
                  <motion.div
                    layoutId="navbar-indicator"
                    style={{
                      position: 'absolute',
                      bottom: '-4px', left: '16px', right: '16px',
                      height: '2px',
                      borderRadius: '2px',
                      background: 'linear-gradient(90deg, #f97316, #ec4899)',
                      boxShadow: '0 0 10px rgba(249,115,22,0.5)',
                    }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Right Concept */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Floating Status Indicator — Desktop only */}
          <div
            className="hidden lg:flex items-center"
            style={{
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                flexShrink: 0,
              }}
            />
            Fast Servers Online
          </div>

          {/* Animated CTA Button */}
          <motion.button
            onClick={() => handleScrollTo('Home')}
            whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(249, 115, 22, 0.45)' }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '9px 20px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(249,115,22,0.25)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Try Now
          </motion.button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              padding: '8px', background: 'none',
              border: 'none', color: '#fff', cursor: 'pointer',
            }}
            className="flex md:hidden"
          >
            {mobileOpen ? <FiX style={{ fontSize: '24px' }} /> : <FiMenu style={{ fontSize: '24px' }} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(6, 6, 8, 0.95)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '12px 24px 20px',
              display: 'flex', flexDirection: 'column', gap: '6px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => { handleScrollTo(link); setMobileOpen(false); }}
                style={{
                  textAlign: 'left', padding: '12px 16px',
                  borderRadius: '12px', fontSize: '15px', fontWeight: 500,
                  color: active === link ? '#f97316' : 'rgba(255,255,255,0.7)',
                  background: active === link ? 'rgba(249,115,22,0.08)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'all 0.2s ease',
                }}
              >
                {link}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
