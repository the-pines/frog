// note for my in the future:
// this only helps within isolates, not across them since each one is running different memory instances,
// add idempotency and secure lock writes to the db

import 'server-only';
import { liskSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { http, createPublicClient, createWalletClient } from 'viem';

const RPC_URL = process.env.RPC_URL || '';
const EXECUTOR_PK = process.env.EXECUTOR_PK! as `0x${string}`;

function makeClients() {
  const transport = http(RPC_URL);
  const executorAccount = privateKeyToAccount(EXECUTOR_PK, { nonceManager });
  const publicClient = createPublicClient({ chain: liskSepolia, transport });
  const walletClient = createWalletClient({
    chain: liskSepolia,
    transport,
    account: executorAccount,
  });

  return { publicClient, walletClient, executorAccount };
}

const globalKey = '__viem_clients__' as const;
type Bundle = ReturnType<typeof makeClients>;

declare global {
  var __viem_clients__: Bundle | undefined;
}

const bundle: Bundle =
  globalThis[globalKey] ?? (globalThis[globalKey] = makeClients());

export const { publicClient, walletClient, executorAccount } = bundle;
