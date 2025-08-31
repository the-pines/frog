'use client';

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  parseAbiItem,
  type EIP1193Provider,
} from 'viem';
import { lisk } from 'viem/chains';
import { RPC_URL, BLOCKSCOUT_URL } from '@/config/constants/envs';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import Spinner from '@/components/ui/Spinner';
import SuperButton from '@/components/ui/SuperButton';

type ApprovalRow = {
  token: Address;
  spender: Address;
  allowance: bigint;
  symbol: string;
  decimals: number;
};

async function fetchTokenListForAddress(owner: Address): Promise<Address[]> {
  // Use Blockscout ERC-20 txs to derive a lightweight token list the user interacted with
  // Fallback: include known tokens like USDC
  const urls = [
    `${BLOCKSCOUT_URL}?module=account&action=tokentx&address=${owner}&page=1&offset=100&sort=desc`,
  ];
  try {
    const res = await fetch(urls[0]!);
    const json = await res.json();
    const arr: Array<{ contractAddress?: string; contractaddress?: string }> =
      Array.isArray(json?.result) ? json.result : [];
    const set = new Set<string>();
    for (const it of arr) {
      const ca = (it.contractAddress || it.contractaddress || '').trim();
      if (ca && /^0x[a-fA-F0-9]{40}$/.test(ca))
        set.add(getAddress(ca as Address));
    }
    // Ensure USDC is present
    if (LISK_USDC_ADDRESS) set.add(getAddress(LISK_USDC_ADDRESS));
    return Array.from(set) as Address[];
  } catch {
    return [getAddress(LISK_USDC_ADDRESS)];
  }
}

async function fetchApprovals(owner: Address): Promise<ApprovalRow[]> {
  const client = createPublicClient({ chain: lisk, transport: http(RPC_URL) });

  const tokens = await fetchTokenListForAddress(owner);

  const approvalEvent = parseAbiItem(
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
  );

  const results: ApprovalRow[] = [];

  for (const token of tokens) {
    try {
      // Pull metadata once
      const [symbol, decimals] = await Promise.all([
        client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: 'symbol',
        }) as Promise<string>,
        client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: 'decimals',
        }) as Promise<number>,
      ]);

      // Find all approvals where user is owner; then compact by last seen per spender
      const logs = await client.getLogs({
        address: token,
        event: approvalEvent,
        args: { owner },
        fromBlock: BigInt(0),
        toBlock: 'latest',
      });

      if (!logs.length) continue;

      const spenderToLatestValue = new Map<Address, bigint>();
      for (const log of logs) {
        const spender = getAddress((log.args?.spender ?? '0x') as Address);
        // We will verify live allowance; store a placeholder value here
        spenderToLatestValue.set(spender, BigInt(0));
      }

      // Verify live allowance and include only active (>0)
      for (const [spender] of spenderToLatestValue) {
        try {
          const allowance = (await client.readContract({
            address: token,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [owner, spender],
          })) as bigint;
          if (allowance > BigInt(0)) {
            results.push({ token, spender, allowance, symbol, decimals });
          }
        } catch {}
      }
    } catch {}
  }

  // Sort by symbol then spender for stable UI
  results.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  return results;
}

function useEnsName(addr?: Address | null) {
  const list = addr ? [addr] : [];
  const q = useQuery({
    queryKey: ['ens-name', list[0]],
    enabled: list.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const a = String(list[0]);
      try {
        const r = await fetch(`https://api.ensideas.com/ens/resolve/${a}`);
        if (r.ok) {
          const j = (await r.json()) as {
            name?: string | null;
            displayName?: string | null;
          };
          return j?.name || j?.displayName || null;
        }
      } catch {}
      try {
        const r2 = await fetch(`https://api.web3.bio/profile/evm/${a}`);
        if (r2.ok) {
          const txt = await r2.text();
          try {
            const j2 = JSON.parse(txt) as
              | { primaryDomain?: { name?: string } }
              | { name?: string }
              | { domains?: Array<{ name?: string }> }
              | null;
            const n2 =
              (j2 as { primaryDomain?: { name?: string } })?.primaryDomain
                ?.name ||
              (j2 as { name?: string })?.name ||
              ((j2 as { domains?: Array<{ name?: string }> })?.domains || [])
                .map((d) => d?.name)
                .filter((s): s is string => Boolean(s))
                .filter((s) => /\.eth$/i.test(s))
                .sort((x, y) => x.length - y.length)[0] ||
              null;
            return n2;
          } catch {
            const m = txt.match(/"name"\s*:\s*"([a-z0-9-]+\.eth)"/gi);
            if (m && m.length)
              return m.map((s) => s.replace(/.*:\s*"|"/g, ''))[0] || null;
          }
        }
      } catch {}
      return null;
    },
  });
  return q.data ?? null;
}

export default function Settings() {
  const { address } = useAppKitAccount();
  const owner = (address as Address | undefined) ?? undefined;

  const ens = useEnsName(owner ?? null);

  const ident = useMemo(() => {
    if (!owner) return '—';
    if (ens) return ens;
    const s = String(owner);
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }, [owner, ens]);

  const approvalsQuery = useQuery({
    queryKey: ['approvals', owner],
    enabled: Boolean(owner),
    refetchOnWindowFocus: true,
    queryFn: () => fetchApprovals(getAddress(owner!)),
  });

  const revoke = useCallback(
    async (row: ApprovalRow) => {
      const eth = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
      if (!eth || !owner) return;
      const wallet = createWalletClient({ transport: custom(eth) });
      await wallet.writeContract({
        address: row.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [row.spender, BigInt(0)],
        account: owner,
        chain: null,
      });
      approvalsQuery.refetch();
    },
    [owner, approvalsQuery]
  );

  // Attempt wagmi's disconnect for logout
  const logout = useCallback(async () => {
    try {
      // Lazy import to avoid adding wagmi to top-level bundle if unused
      const mod = await import('wagmi');
      const { disconnect } = mod as unknown as {
        disconnect: (args?: { connector?: unknown }) => Promise<void> | void;
      };
      // Best-effort: call disconnect if present
      try {
        await disconnect();
      } catch {}
    } finally {
      try {
        // Soft redirect to login
        window.location.href = '/login';
      } catch {}
    }
  }, []);

  const prettyAllowance = useCallback((raw: bigint, decimals: number) => {
    const infiniteThreshold = BigInt(2) ** BigInt(255);
    if (raw >= infiniteThreshold) return 'Unlimited';
    try {
      return formatUnits(raw, decimals);
    } catch {
      return raw.toString();
    }
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[393px] px-4 pt-10 pb-12 flex flex-col gap-6">
      <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 px-6 py-6 text-center">
        <div className="text-[11px] uppercase tracking-wide text-frog-muted mb-0">
          Account
        </div>
        <div className="text-base font-semibold text-frog-foreground">
          Logged in as
        </div>
        <div className="mt-1 text-xl leading-tight font-extrabold tracking-tight text-frog-foreground font-display">
          {ident}
        </div>
        <div className="mt-4">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/8 px-4 h-10 text-sm text-frog-foreground"
          >
            <span>Log out</span>
          </button>
        </div>
      </section>

      <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-frog-muted">
            Token Approvals
          </h2>
          {approvalsQuery.isFetching ? (
            <div className="text-frog-muted text-xs inline-flex items-center gap-2">
              <Spinner size={14} /> Refreshing…
            </div>
          ) : (
            <button
              onClick={() => approvalsQuery.refetch()}
              className="text-xs rounded-full border border-white/10 bg-white/5 hover:bg-white/8 px-3 h-8 text-frog-foreground/90"
            >
              Refresh
            </button>
          )}
        </div>
        <ul className="flex flex-col">
          {!owner ? (
            <li className="py-4 px-4 text-frog-muted text-sm">
              Connect wallet to view approvals.
            </li>
          ) : approvalsQuery.isLoading ? (
            <li className="py-4 px-4 text-frog-muted text-sm">
              Loading approvals…
            </li>
          ) : (approvalsQuery.data ?? []).length === 0 ? (
            <li className="py-4 px-4 text-frog-muted text-sm">
              No active approvals detected.
            </li>
          ) : (
            (approvalsQuery.data ?? []).map((row, idx) => (
              <li
                key={`${row.token}-${row.spender}-${idx}`}
                className="rounded-xl hover:bg-white/5"
              >
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <div className="text-frog-foreground text-sm truncate">
                      {row.symbol || 'Token'}
                      <span className="ml-2 text-frog-muted text-xs">
                        {row.token}
                      </span>
                    </div>
                    <div className="text-frog-muted text-xs truncate">
                      Spender{' '}
                      {`${row.spender.slice(0, 8)}…${row.spender.slice(-6)}`}
                    </div>
                    <div className="text-frog-muted text-xs">
                      Allowance {prettyAllowance(row.allowance, row.decimals)}{' '}
                      {row.symbol}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => revoke(row)}
                      className="rounded-full border border-rose-300/30 bg-rose-400/15 hover:bg-rose-400/25 text-rose-100 px-3 h-9 text-xs"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="px-4 py-3 text-[11px] text-frog-muted">
          Tip: Revoking approvals may stop this app from working correctly
        </div>
      </section>

      <SuperButton />
    </div>
  );
}
