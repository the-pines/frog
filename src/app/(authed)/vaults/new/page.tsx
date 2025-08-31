'use client';

import * as React from 'react';
import { isAddress } from 'viem';
import { useAppKitAccount } from '@reown/appkit/react';
import Spinner from '@/components/ui/Spinner';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ConfettiBurst = dynamic(
  () => import('@/components/ui/Confetti').then((m) => m.ConfettiBurst),
  { ssr: false }
);

export default function NewVaultPage() {
  const [mode, setMode] = React.useState<'create' | 'attach'>('create');
  const [name, setName] = React.useState('My Vault');
  const [goalUsd, setGoalUsd] = React.useState('0');
  const [address, setAddress] = React.useState('');
  const { address: owner } = useAppKitAccount();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [burstKey, setBurstKey] = React.useState(0);
  const router = useRouter();

  return (
    <div className="px-4 space-y-4">
      <div className="text-lg font-semibold">Add New Vault</div>

      <div className="flex gap-2 text-sm">
        <button
          className={`rounded-full border px-4 h-8 ${
            mode === 'create' ? 'bg-black/5 dark:bg-white/10' : ''
          }`}
          onClick={() => setMode('create')}
        >
          Create new
        </button>
        <button
          className={`rounded-full border px-4 h-8 ${
            mode === 'attach' ? 'bg-black/5 dark:bg-white/10' : ''
          }`}
          onClick={() => setMode('attach')}
        >
          Paste contract
        </button>
      </div>

      {mode === 'create' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="rounded-md border px-3 h-10 border-black/[.08] dark:border-white/[.145]"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-md border px-3 h-10 border-black/[.08] dark:border-white/[.145]"
              placeholder="Goal (USD)"
              value={goalUsd}
              onChange={(e) => setGoalUsd(e.target.value)}
            />
          </div>
          <button
            className="rounded-full border border-black/[.08] dark:border-white/[.145] px-4 h-10 hover:bg-black/[.02] dark:hover:bg-white/[.04] inline-flex items-center gap-2 disabled:opacity-50"
            disabled={submitting}
            onClick={async () => {
              try {
                setError('');
                setSuccess('');
                setSubmitting(true);
                // Convert USD to wstETH wei using hardcoded price (frontend only)
                const usdcMinor = BigInt(
                  Math.floor(Number(goalUsd || '0') * 1_000_000)
                );
                const PRICE_MICRO_USDC_PER_WST = BigInt(5_391_940_000);
                const goalWei =
                  (usdcMinor * BigInt(10) ** BigInt(18)) /
                  PRICE_MICRO_USDC_PER_WST;

                const res = await fetch('/api/vaults/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    owner,
                    goalWei: goalWei.toString(),
                    name,
                  }),
                });
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}));
                  setError(j?.error || 'Failed to create vault');
                } else {
                  setSuccess('Vault created');
                  setGoalUsd('0');
                  setBurstKey((n) => n + 1);
                  // Notify parent (overlay) to close and refresh
                  try {
                    if (typeof window !== 'undefined' && window.parent) {
                      window.parent.postMessage({ type: 'vault-created' }, '*');
                    }
                  } catch {}
                  // If not embedded, navigate back after a short celebration
                  if (
                    typeof window !== 'undefined' &&
                    window.parent === window
                  ) {
                    setTimeout(() => router.push('/vaults'), 900);
                  }
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? (
              <>
                <Spinner size={14} /> Creating…
              </>
            ) : (
              'Create Vault'
            )}
          </button>
          {(error || success) && (
            <div className="text-sm">
              {error && (
                <div className="text-red-600 dark:text-red-400">{error}</div>
              )}
              {success && (
                <div className="text-green-600 dark:text-green-400">
                  {success}
                </div>
              )}
            </div>
          )}
          {/* Celebration overlay */}
          <div className="relative">
            <ConfettiBurst burstKey={burstKey} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            className="rounded-md border px-3 h-10 border-black/[.08] dark:border-white/[.145] w-full"
            placeholder="Vault contract address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            className="rounded-full border border-black/[.08] dark:border-white/[.145] px-4 h-10 hover:bg-black/[.02] dark:hover:bg-white/[.04] disabled:opacity-50"
            disabled={!isAddress(address)}
            onClick={async () => {
              const res = await fetch('/api/vaults/attach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, address, name }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                alert(j?.error || 'Failed to attach vault');
              } else {
                alert('Vault attached');
              }
            }}
          >
            Attach Existing
          </button>
          <div className="text-xs opacity-70">
            You can contribute to attached vaults but cannot withdraw unless you
            are the owner.
          </div>
        </div>
      )}
    </div>
  );
}
