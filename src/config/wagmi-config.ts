import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, monadTestnet } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';

const networks: AppKitNetwork[] = [monadTestnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: process.env.NEXT_PUBLIC_REOW_PROJECT_ID!,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
