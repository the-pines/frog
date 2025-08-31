'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserIcon } from '@heroicons/react/24/outline';
import PointsBadge from '@/components/ui/PointsBadge';

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 mx-auto max-w-[393px]">
      <div
        className="
          relative rounded-b-2xl overflow-hidden shadow-xl
          border border-white/10 text-frog-foreground
        "
      >
        <div
          className="
            pointer-events-none absolute inset-0
            bg-white/10 dark:bg-black/20
            supports-[backdrop-filter]:bg-white/8
            supports-[backdrop-filter]:backdrop-blur-xl
            supports-[backdrop-filter]:backdrop-saturate-150
            [-webkit-backdrop-filter:blur(16px)_saturate(150%)]
          "
          aria-hidden
        />

        <div className="relative h-[56px] px-4 flex items-center justify-between">
          <Link href="/" aria-label="Home" className="rounded-xl">
            <Image
              src="/frog.png"
              alt="ribbit ribbit ribbit"
              width={40}
              height={40}
              priority
              sizes="40px"
              className="rounded-lg"
            />
          </Link>

          <div className="flex items-center gap-2">
            <PointsBadge />

            <Link
              href="/settings"
              aria-label="Profile & settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
            >
              <UserIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
