import type { Metadata } from 'next';
import { Manrope, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';

import './globals.css';

const ui = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
  weight: 'variable',
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: 'variable',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Frog',
  description: 'jump jump into your next life',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${ui.variable} ${display.variable} ${mono.variable} antialiased font-sans`}
      >
        <main className="relative max-w-[393px] min-h-[100vh] mx-auto border border-red-200">
          {children}
        </main>
      </body>
    </html>
  );
}
