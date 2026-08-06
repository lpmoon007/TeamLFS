import type { Metadata, Viewport } from 'next';
import './globals.css';
import './profile-theme.css'; // MUST come after globals — the profile restyle wins on source order
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
        {/* Set the saved theme before first paint so there is no flash. Default: light. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lfs.theme');if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
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
