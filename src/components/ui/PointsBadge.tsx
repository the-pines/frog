'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits, type Address } from 'viem';

function useQueryPoints(address?: Address) {
  const enabled = Boolean(address);
  const query = useQuery({
    enabled,
    queryKey: ['points-badge', address],
    queryFn: async () => {
      const params = new URLSearchParams({
        address: address as string,
        limit: '5',
      });
      const resp = await fetch(
        `/api/blockchain/get-points?${params.toString()}`
      );
      if (!resp.ok) throw new Error('failed');
      return (await resp.json()) as {
        ok: boolean;
        balance: string;
        decimals: number;
        symbol: string;
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  return {
    data: query.data,
    loading: query.isPending,
  };
}

const PointsBadge: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = address as Address | undefined;
  const { data, loading } = useQueryPoints(userAddress);

  const display = useMemo(() => {
    if (!data) return '0';
    const full = formatUnits(BigInt(data.balance), data.decimals);
    const [int, dec] = full.split('.');
    return dec ? `${int}.${dec.slice(0, 2)}` : int;
  }, [data]);

  return (
    <Link
      href="/points"
      aria-label="Points"
      className="inline-flex h-10 items-center gap-2 rounded-2xl px-3"
      style={{
        background:
          'linear-gradient(135deg, rgba(5,43,53,0.9) 0%, rgba(14,53,92,0.9) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(87,158,168,0.25)',
      }}
    >
      <span className="text-white text-sm">{loading ? '…' : display}</span>
      <span className="text-white text-sm font-medium">points</span>
      <span className="text-white text-base">✨</span>
    </Link>
  );
};

export default PointsBadge;
