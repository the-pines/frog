'use client';

import { useAppKit } from '@reown/appkit/react';
import { useCallback, useState } from 'react';

export default function LoginPage() {
  const [connecting, setConnecting] = useState(false);

  const { open } = useAppKit();

  const connect = useCallback(async () => {
    setConnecting(true);

    open().finally(() => {
      setConnecting(false);
    });
  }, [open]);

  return (
    <div className="flex flex-col justify-end pb-20 min-h-dvh">
      <div className="flex justify-center">
        <button className="" onClick={connect} disabled={connecting}>
          {connecting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black/70" />
              Opening wallet...
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-white/60 text-sm">
        No sign-ups. Connect a wallet to get started in seconds.
      </p>
    </div>
  );
}
