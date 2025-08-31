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
  description: 'jump and ribbit into freedom',
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
          <div className="relative min-h-svh bg-pond-moss bg-fixed">
            <main className="relative z-10 mx-auto max-w-[393px] min-h-svh text-frog-foreground">
              {children}
            </main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
