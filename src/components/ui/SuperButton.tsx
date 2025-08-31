'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import React from 'react';

type Props = {
  endpoint?: string; // defaults to /api/stripe/create-user
};

export default function CreateMockUserButton({
  endpoint = '/api/stripe/create-user',
}: Props) {
  const [loading, setLoading] = React.useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resp, setResp] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const { address } = useAppKitAccount();

  async function handleClick() {
    setLoading(true);
    setErr(null);
    setResp(null);

    // --- Mock data (UK / GB)
    const body = {
      user: {
        name: 'Cat McGee',
        address: address,
        provider: 'wallet' as const,
      },
      cardholder: {
        name: 'Cat McGee',
        individual: {
          first_name: 'Cat',
          last_name: 'McGee',
          dob: { day: 20, month: 4, year: 1996 },
        },
        billing: {
          address: {
            line1: '221B Chord Street',
            line2: undefined,
            city: 'London',
            state: 'Greater London',
            postal_code: 'NW2 6XE',
            country: 'GB' as const,
          },
        },
        email: undefined,
        phone_number: '+44 20 7944 0958',
        // metadata: { test: 1 }, // optional
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json?.error ?? 'Request failed'}`);
      } else {
        setResp(json);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-2xl px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-60"
      >
        {loading
          ? 'Creating Chad Frog (GB)…'
          : 'Create mock UK user (Chad Frog)'}
      </button>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {resp && (
        <pre className="text-xs whitespace-pre-wrap break-words p-3 rounded-xl bg-neutral-100">
          {JSON.stringify(resp, null, 2)}
        </pre>
      )}
    </div>
  );
}
