'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAppKitAccount } from '@reown/appkit/react';
import { createWalletClient, custom, type EIP1193Provider } from 'viem';
import { erc20Abi } from 'viem';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import { wstWeiToUsdString } from '@/lib/wstEthUsd';
import { HIDDEN_VAULT_ADDRESSES } from '@/config/constants/addresses';
import Link from 'next/link';
import Spinner from '@/components/ui/Spinner';
import dynamic from 'next/dynamic';
import ProgressCircle from '@/components/ui/ProgressCircle';

const ConfettiBurst = dynamic(
  () => import('@/components/ui/Confetti').then((m) => m.ConfettiBurst),
  { ssr: false }
);

type VaultInfo = {
  owner: string;
  feeRecipient: string;
  feeBps: number;
  unlockTime: number;
  withdrawalsEnabled: boolean;
  canWithdraw: boolean;
  wsteth: `0x${string}`;
  token: { symbol: string; decimals: number };
  name: string;
  goalWstETH: string;
  totalWstETHAssets: string;
  user: null | {
    address: string;
    shares: string;
    principal: string;
    assets: string;
    profit: string;
  };
};

type ServerDepositResponse = {
  ok: boolean;
  data: { error?: string; spender?: `0x${string}` };
};

export default function VaultDetailPage() {
  const params = useParams();
  const id = (params?.address as string) || '';
  const { address } = useAppKitAccount();

  const [info, setInfo] = React.useState<VaultInfo | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [burstKey, setBurstKey] = React.useState(0);

  const [depositUsdc, setDepositUsdc] = React.useState('');
  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        setError('');
        const res = await fetch(
          `/api/vaults/${id}${address ? `?owner=${address}` : ''}`
        );
        const data = (await res.json()) as VaultInfo;
        if (mounted && res.ok) setInfo(data);
        else if (mounted) setError('Failed to load vault');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) run();
    return () => {
      mounted = false;
    };
  }, [id, address]);

  const isHidden = React.useMemo(
    () =>
      Boolean(id) &&
      HIDDEN_VAULT_ADDRESSES.includes(id.toLowerCase() as `0x${string}`),
    [id]
  );

  if (isHidden) {
    return (
      <div className="px-4">
        <div className="mt-4 text-sm text-frog-muted">
          This vault is hidden.
        </div>
        <Link
          href="/vaults"
          className="inline-block mt-3 rounded-full border border-white/10 px-4 h-10 hover:bg-white/5"
        >
          Back to vaults
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          href="/vaults"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 h-9 hover:bg-white/5 text-sm"
        >
          <span aria-hidden>←</span> Back
        </Link>
      </div>
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="h-3 w-12 skeleton rounded mb-2" />
            <div className="h-6 w-40 skeleton rounded" />
            <div className="mt-2 h-4 w-full skeleton rounded" />
          </div>
          <div className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4 grid grid-cols-2 gap-y-2 text-sm">
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
          <div className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 h-24" />
        </div>
      )}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && info && (
        <div className="space-y-4">
          {(() => {
            const goal = BigInt(info.goalWstETH || '0');
            const total = BigInt(info.totalWstETHAssets || '0');
            const pct =
              goal > BigInt(0)
                ? Number((total * BigInt(10000)) / goal) / 100
                : 0;
            const overGoal = total > goal;
            return (
              <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                <div className="relative flex flex-col items-center justify-center gap-2 mt-2">
                  <ProgressCircle
                    size={156}
                    stroke={16}
                    percent={pct}
                    label="Progress"
                  />
                  <div className="text-sm font-semibold text-frog-foreground">
                    {Math.round(pct)}%
                  </div>
                  {overGoal && (
                    <span
                      className="absolute right-2 top-2 text-xl"
                      aria-hidden
                    >
                      🎉
                    </span>
                  )}
                </div>
              </section>
            );
          })()}
          <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="text-xs text-frog-muted">Vault</div>
            <div className="font-semibold text-lg text-frog-foreground">
              {info.name || 'Vault'}
            </div>
            <div className="mt-2 text-sm break-all text-frog-foreground/90">
              {id}
              <button
                className="ml-2 inline-flex items-center rounded-full border border-white/10 px-2 h-6 hover:bg-white/5 text-xs"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(id);
                  } catch {}
                }}
              >
                Copy
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <div className="text-frog-muted">Goal</div>
              <div className="text-frog-foreground">
                {wstWeiToUsdString(info.goalWstETH || '0', info.token.decimals)}
              </div>
              <div className="text-frog-muted">Total</div>
              <div className="text-frog-foreground">
                {wstWeiToUsdString(
                  info.totalWstETHAssets || '0',
                  info.token.decimals
                )}
              </div>
            </div>
          </section>

          {info.user && (
            <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <div className="font-semibold mb-2 text-frog-foreground">
                My Profit
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <div className="text-frog-muted">Total assets</div>
                <div className="text-frog-foreground">
                  {wstWeiToUsdString(
                    info.user.assets || '0',
                    info.token.decimals
                  )}
                </div>
                <div className="text-frog-muted">Profit</div>
                <div className="text-frog-foreground">
                  {wstWeiToUsdString(
                    info.user.profit || '0',
                    info.token.decimals
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-3">
            <div className="font-semibold text-frog-foreground">Deposit</div>
            <div className="flex gap-2">
              <input
                className="rounded-md border border-white/10 bg-transparent px-3 h-10 min-w-[160px]"
                placeholder={`Amount (USDC)`}
                value={depositUsdc}
                onChange={(e) => setDepositUsdc(e.target.value)}
              />
              <button
                className="rounded-full border border-white/10 px-4 h-10 hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-50"
                disabled={submitting}
                onClick={async () => {
                  try {
                    setError('');
                    setSubmitting(true);
                    if (!address) {
                      setError('Connect wallet');
                      return;
                    }
                    const usdcMinor = BigInt(
                      Math.floor(Number(depositUsdc || '0') * 1e6)
                    ).toString();
                    const doServerDeposit = async () => {
                      const res = await fetch(`/api/vaults/${id}/deposit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ owner: address, usdcMinor }),
                      });
                      const data =
                        (await res.json()) as ServerDepositResponse['data'];
                      return { ok: res.ok, data } as ServerDepositResponse;
                    };

                    let result = await doServerDeposit();
                    if (
                      !result.ok &&
                      result.data?.error === 'insufficient_usdc_allowance'
                    ) {
                      const spender = result.data?.spender as
                        | `0x${string}`
                        | undefined;
                      if (!spender) {
                        setError('Missing spender for approval');
                        return;
                      }
                      const eth = (
                        window as Window & { ethereum?: EIP1193Provider }
                      ).ethereum;
                      if (!eth) {
                        setError('No wallet available');
                        return;
                      }
                      const client = createWalletClient({
                        transport: custom(eth),
                      });
                      try {
                        const approveHash = await client.writeContract({
                          address: LISK_USDC_ADDRESS,
                          abi: erc20Abi,
                          functionName: 'approve',
                          args: [spender, BigInt(2) ** BigInt(256) - BigInt(1)],
                          account: address as `0x${string}`,
                          chain: null,
                        });
                        console.log('Approved USDC:', approveHash);
                      } catch (e) {
                        console.error(e);
                        setError('Approval failed');
                        return;
                      }
                      // Retry server deposit
                      result = await doServerDeposit();
                    }

                    if (!result.ok) {
                      setError(result.data?.error || 'Server deposit failed');
                      return;
                    }
                    setDepositUsdc('');
                    setBurstKey((n) => n + 1);
                    const ref = await fetch(
                      `/api/vaults/${id}${address ? `?owner=${address}` : ''}`
                    );
                    if (ref.ok) {
                      const j = (await ref.json()) as VaultInfo;
                      setInfo(j);
                    }
                  } catch (e) {
                    console.error(e);
                    setError('Server deposit failed');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? (
                  <>
                    <Spinner size={14} /> Depositing…
                  </>
                ) : (
                  'Deposit'
                )}
              </button>
            </div>
            <div className="relative h-0">
              <ConfettiBurst burstKey={burstKey} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
