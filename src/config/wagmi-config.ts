import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, liskSepolia } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';

const networks: AppKitNetwork[] = [liskSepolia];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: process.env.NEXT_PUBLIC_REOW_PROJECT_ID!,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
