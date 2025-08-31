'use client';

import { RPC_URL } from '@/config/constants/envs';
import { useQuery } from '@tanstack/react-query';
import {
  Address,
  createPublicClient,
  defineChain,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
} from 'viem';
import { lisk } from 'viem/chains';
import { formatRounded } from './useQueryTransactions';

async function fetchErc20Balance(opts: {
  token: { address: Address; chain?: ReturnType<typeof defineChain> };
  owner: Address;
}) {
  const client = createPublicClient({
    chain: lisk,
    transport: http(RPC_URL),
  });

  const token = getAddress(opts.token.address);
  const owner = getAddress(opts.owner);

  const [raw, decimals, symbol] = await Promise.all([
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }) as Promise<bigint>,
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'decimals',
    }) as Promise<number>,
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'symbol',
    }) as Promise<string>,
  ]);

  return {
    token,
    owner,
    raw,
    decimals,
    symbol,
    formatted: formatUnits(raw, decimals),
    formattedShort: formatRounded(raw, decimals),
  };
}

export function useQueryTokenBalance(params: {
  owner?: Address;
  token?: { address: Address; chain?: ReturnType<typeof defineChain> };
}) {
  const enabled = Boolean(params.owner && params.token?.address);

  const query = useQuery({
    queryKey: [
      'token-balance',
      params.token?.address,
      params.owner,
      params.token?.chain?.id ?? lisk.id,
    ],
    enabled,
    refetchOnWindowFocus: false,
    queryFn: () =>
      fetchErc20Balance({
        owner: getAddress(params.owner!),
        token: {
          address: getAddress(params.token!.address),
          chain: params.token?.chain,
        },
      }),
  });

  return {
    data: query.data,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
