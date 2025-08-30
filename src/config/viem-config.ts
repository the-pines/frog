// note for my in the future:
// this only helps within isolates, not across them since each one is running different memory instances,
// add idempotency and secure lock writes to the db

import 'server-only';
import { lisk } from 'viem/chains';
import { EXECUTOR_PK, RPC_URL } from './constants/envs';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { http, createPublicClient, createWalletClient } from 'viem';

function makeClients() {
  const transport = http(RPC_URL);
  const executorAccount = privateKeyToAccount(EXECUTOR_PK, { nonceManager });
  const publicClient = createPublicClient({ chain: lisk, transport });
  const walletClient = createWalletClient({
    chain: lisk,
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
