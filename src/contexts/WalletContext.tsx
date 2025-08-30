'use client';

import { ReactNode } from 'react';
import { lisk } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, wagmiConfig } from '@/config/wagmi-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cookieToInitialState, WagmiProvider } from 'wagmi';
import { BASE_URL, REOWN_PROJECT_ID } from '@/config/constants/envs';

createAppKit({
  adapters: [wagmiAdapter],
  projectId: REOWN_PROJECT_ID,
  networks: [lisk],
  defaultNetwork: lisk,
  metadata: {
    name: 'frog',
    description: 'jump jump jump',
    url: BASE_URL,
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: {
    analytics: true,
  },
});

const queryClient = new QueryClient();

interface WalletProviderProps {
  cookies: string | null;
  children: ReactNode;
}

const WalletProvider: React.FC<WalletProviderProps> = ({
  cookies,
  children,
}) => {
  const initialState = cookieToInitialState(wagmiConfig, cookies);
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProvider;
