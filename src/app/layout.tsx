import type { Metadata, Viewport } from 'next';
import { Radio_Canada_Big } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

// Single typeface for the whole site. Radio Canada Big is a variable font
// (wght 400–700) — omitting `weight` loads the full axis, so hierarchy can
// lean on weight as well as size.
const radioCanadaBig = Radio_Canada_Big({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-radio-canada-big',
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
    <html lang="en" className={radioCanadaBig.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
