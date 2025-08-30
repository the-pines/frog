import { headers } from 'next/headers';
import { Metadata } from 'next';
import { Manrope, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';

import './globals.css';
import WalletProvider from '@/contexts/WalletContext';

const texts = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
  weight: 'variable',
});
const headlines = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: 'variable',
});
const amounts = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Frog',
  description: 'jump jump into your next life',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  return (
    <html lang="en">
      <body
        className={`${texts.variable} ${headlines.variable} ${amounts.variable} antialiased font-sans`}
      >
        <WalletProvider cookies={cookies}>
          <main className="relative mx-auto max-w-[393px] min-h-dvh flex flex-col border border-red-200">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
