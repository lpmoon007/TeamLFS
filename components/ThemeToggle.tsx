'use client';
import { useEffect, useState } from 'react';

// Light/dark toggle. The layout's inline script sets data-theme before paint (no flash); this
// just reflects and flips it, persisting the choice. Default is light (easiest for reading).
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('lfs.theme', next); } catch {}
  };

  return (
    <button className="theme-toggle" onClick={toggle} title={theme === 'light' ? 'Switch to dark' : 'Switch to light'} aria-label="Toggle light or dark theme">
      {theme === 'light' ? '☾' : '☀'}
    </button>
  );
}
