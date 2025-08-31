'use client';

import AuthProvider from '@/contexts/AuthContext';
import Navigation from '@/components/layout/Navigation';
import Header from '@/components/layout/Header';
import PageTransition from '@/components/layout/PageTransition';

export default function AuthedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <main className="py-[85px]">
        <AuthProvider>
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </main>

      <Navigation />
    </>
  );
}
