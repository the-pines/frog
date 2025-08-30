'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import LoginPage from '@/components/features/no-authed/login/LoginPage';

export default function Login() {
  const router = useRouter();

  const { address, isConnected } = useAppKitAccount();

  useEffect(() => {
    if (!isConnected) return;
    router.replace('/');
  }, [router, address, isConnected]);

  return <LoginPage />;
}
