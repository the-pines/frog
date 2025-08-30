'use client';

import AuthProvider from '@/contexts/AuthContext';
import Navigation from '@/components/layout/Navigation';
import Header from '@/components/layout/Header';

export default function AuthedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <main className="py-[70px]">
        <AuthProvider>{children}</AuthProvider>
      </main>

      <Navigation />
    </>
  );
}
