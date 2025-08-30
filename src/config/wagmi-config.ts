import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, lisk } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';
import { REOWN_PROJECT_ID } from './constants/envs';

const networks: AppKitNetwork[] = [lisk];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: REOWN_PROJECT_ID,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
