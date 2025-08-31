'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

async function fetchUser(address: Address) {
  const res = await fetch('/api/db/get-user-card', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: address.toLowerCase() }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return await res.json();
}

export function useGetUserDetails(address?: Address) {
  const enabled = Boolean(address);

  const query = useQuery({
    queryKey: ['user-details', address?.toLowerCase()],
    enabled,
    refetchOnWindowFocus: false,
    queryFn: () => fetchUser(address as Address),
  });

  return {
    data: query.data,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
