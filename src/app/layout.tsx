import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eggo - Lego Collection Manager',
  description: 'Track and manage your Lego set collection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
