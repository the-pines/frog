'use client';

import { lisk } from 'viem/chains';
import { useQuery } from '@tanstack/react-query';
import { BLOCKSCOUT_URL } from '@/config/constants/envs';
import { formatUnits, getAddress, type Address } from 'viem';

const MAX_DP = 4;

export type Transaction = {
  kind: 'native' | 'erc20';
  hash: string;
  from: Address;
  to: Address | null;
  blockNumber: number;
  timeStamp: number;

  // common extras
  direction: 'in' | 'out';
  formatted: string;
  formattedShort: string;
  decimals: number;
  symbol?: string;

  // native
  valueWei?: string;

  // erc20
  contractAddress?: Address;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: number;
  value?: string;
};

function norm(addr: string | null | undefined): Address | null {
  try {
    return addr ? getAddress(addr as Address) : null;
  } catch {
    return null;
  }
}

function trimZeros(s: string) {
  if (!s.includes('.')) return s;
  const [i, f] = s.split('.');
  const fx = f.replace(/0+$/g, '');
  return fx.length ? `${i}.${fx}` : i;
}

export function formatRounded(
  raw: bigint,
  decimals: number,
  maxFractionDigits = MAX_DP
) {
  if (maxFractionDigits < 0) return formatUnits(raw, decimals);
  if (decimals <= maxFractionDigits) {
    return trimZeros(formatUnits(raw, decimals));
  }
  const factor = BigInt(10) ** BigInt(decimals - maxFractionDigits);
  let q = raw / factor;
  const r = raw % factor;
  if (r * BigInt(2) >= factor) q += BigInt(1); // half-up
  return trimZeros(formatUnits(q, maxFractionDigits));
}

async function fetchTxs(opts: {
  address: Address;
  limit?: number;
  offset?: number;
  all?: boolean; // tokens and native
}) {
  const { address, limit = 20, offset = 0, all = true } = opts;
  const owner = getAddress(address);
  const page = Math.floor(offset / limit) + 1;

  const urls: string[] = [];
  if (all) {
    urls.push(
      `${BLOCKSCOUT_URL}?module=account&action=txlist&address=${owner}&page=${page}&offset=${limit}&sort=desc`
    );
  }
  urls.push(
    `${BLOCKSCOUT_URL}?module=account&action=tokentx&address=${owner}&page=${page}&offset=${limit}&sort=desc`
  );

  const resps = await Promise.all(urls.map((u) => fetch(u)));
  const jsons = await Promise.all(resps.map((r) => r.json()));

  const nativeRaw = all ? jsons[0]?.result ?? [] : [];
  const tokenRaw = all ? jsons[1]?.result ?? [] : jsons[0]?.result ?? [];

  // native txs (filter out value=0)
  const nativeTxs: Transaction[] = Array.isArray(nativeRaw)
    ? (nativeRaw
        .map((t) => {
          const valueStr = (t.value ?? '0') as string;
          if (valueStr === '0' || BigInt(valueStr) === BigInt(0)) return null;

          const from = norm(t.from ?? t.from_address);
          const to = norm(t.to ?? t.to_address);
          const decimals = lisk.nativeCurrency.decimals ?? 18;
          const symbol = lisk.nativeCurrency.symbol ?? 'ETH';
          const direction: 'in' | 'out' = to === owner ? 'in' : 'out';
          const raw = BigInt(valueStr);

          return {
            kind: 'native',
            hash: t.hash,
            from: from as Address,
            to,
            valueWei: valueStr,
            blockNumber: Number(t.blockNumber),
            timeStamp: Number(t.timeStamp),
            decimals,
            symbol,
            direction,
            formatted: formatUnits(raw, decimals),
            formattedShort: formatRounded(raw, decimals),
          } as Transaction;
        })
        .filter(Boolean) as Transaction[])
    : [];

  // erc-20 txs
  const erc20Txs: Transaction[] = Array.isArray(tokenRaw)
    ? tokenRaw.map((t) => {
        const from = norm(t.from ?? t.from_address);
        const to = norm(t.to ?? t.to_address);
        const contractAddress = norm(t.contractAddress ?? t.contractaddress) as Address; //prettier-ignore
        const tokenDecimal = Number(t.tokenDecimal ?? t.decimals ?? 18);
        const rawStr = (t.value ?? t.tokenValue ?? '0') as string;
        const raw = BigInt(rawStr);
        const symbol = t.tokenSymbol ?? t.symbol ?? '';
        const name = t.tokenName ?? t.name ?? '';
        const direction: 'in' | 'out' = to === owner ? 'in' : 'out';

        return {
          kind: 'erc20',
          hash: t.hash,
          from: from as Address,
          to,
          contractAddress,
          tokenSymbol: symbol,
          tokenName: name,
          tokenDecimal,
          value: rawStr,
          blockNumber: Number(t.blockNumber ?? t.block_number ?? 0),
          timeStamp: Number(t.timeStamp ?? t.timestamp ?? 0),
          decimals: tokenDecimal,
          symbol,
          direction,
          formatted: formatUnits(raw, tokenDecimal),
          formattedShort: formatRounded(raw, tokenDecimal),
        } as Transaction;
      })
    : [];

  const merged = all ? [...nativeTxs, ...erc20Txs] : erc20Txs;
  merged.sort((a, b) => b.timeStamp - a.timeStamp);

  return merged;
}

export function useQueryTransactions(params: {
  address?: Address;
  limit?: number;
  offset?: number;
  all?: boolean;
}) {
  const enabled = Boolean(params.address);

  const query = useQuery({
    queryKey: [
      'wallet-txs',
      params.address,
      params.limit ?? 20,
      params.offset ?? 0,
      params.all ?? true,
    ],
    enabled,
    refetchOnWindowFocus: true,
    queryFn: () =>
      fetchTxs({
        address: params.address as Address,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        all: params.all ?? true,
      }),
  });

  return {
    data: query.data as Transaction[] | undefined,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
