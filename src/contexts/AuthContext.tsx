'use client';

import { useEffect, useRef } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePathname, useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

const REDIRECT_DELAY_MS = 400;

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const { address, isConnected } = useAppKitAccount();

  const timerRef = useRef<number | null>(null);
  const alreadyRedirectedRef = useRef(false);

  useEffect(() => {
    if (isConnected || address) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    if (alreadyRedirectedRef.current) return;

    timerRef.current = window.setTimeout(() => {
      alreadyRedirectedRef.current = true;
      router.replace('/login');
    }, REDIRECT_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, address, pathname, router]);

  return <>{children}</>;
};

export default AuthProvider;
