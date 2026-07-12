import type { Metadata, Viewport } from 'next';
import './globals.css';
import './solo/soloengine.css'; // scoped under .soloui — cannot affect the team theme

export const metadata: Metadata = {
  title: 'The Signal',
  description: 'A live leadership simulation.',
};

export const viewport: Viewport = {
  themeColor: '#0b0f14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter + JetBrains Mono power the solo (.soloui) theme; harmless elsewhere. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
