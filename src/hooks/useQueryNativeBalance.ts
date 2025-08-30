'use client';

import { RPC_URL } from '@/config/constants/envs';
import { useQuery } from '@tanstack/react-query';
import {
  Address,
  createPublicClient,
  formatUnits,
  getAddress,
  http,
} from 'viem';
import { lisk } from 'viem/chains';

async function fetchNativeBalance(owner: Address) {
  const client = createPublicClient({
    chain: lisk,
    transport: http(RPC_URL),
  });

  const address = getAddress(owner);
  const wei = await client.getBalance({ address });
  const decimals = lisk.nativeCurrency.decimals ?? 18;
  const symbol = lisk.nativeCurrency.symbol ?? 'ETH';

  return {
    owner: address,
    wei,
    decimals,
    symbol,
    formatted: formatUnits(wei, decimals),
  };
}

export function useQueryNativeBalance(owner?: Address) {
  const enabled = Boolean(owner);

  const query = useQuery({
    queryKey: ['native-balance', owner, lisk.id],
    enabled,
    refetchOnWindowFocus: false,
    queryFn: () => fetchNativeBalance(owner!),
  });

  return {
    data: query.data,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
