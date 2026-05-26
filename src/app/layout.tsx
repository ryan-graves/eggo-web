import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  title: 'Eggo - Lego Collection Manager',
  description: 'Track and manage your Lego set collection',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale / userScalable:false — both disable pinch-to-zoom,
  // which fails WCAG SC 1.4.4 (Resize Text). Double-tap zoom (the
  // misfire users complain about) is suppressed at the CSS layer
  // instead via `touch-action: manipulation` in globals.css, which
  // leaves pinch intact for accessibility.
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      // Mono is the canonical brand expression (DESIGN.md). Setting it on
      // the SSR'd <html> means first-time visitors land on Mono instead of
      // briefly flashing the Baseplate-flavored base styles before
      // useUserPreferences hydrates and applies the stored UI theme.
      data-ui-theme="mono"
      className={`${inter.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
