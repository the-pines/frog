'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserIcon } from '@heroicons/react/24/outline';
import PointsBadge from '@/components/ui/PointsBadge';

export default function Header() {
  return (
    <header
      className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl fixed top-0 inset-x-0 z-50
                       border-b border-white/10 text-frog-foreground max-w-[393px] mx-auto rounded-b-2xl shadow-xl"
    >
      <div className="h-[56px] px-4 py-8 flex items-center justify-between">
        <Link href="/" aria-label="Home" className="rounded-xl">
          <Image
            src="/frog.png"
            alt="ribbit ribbit ribbit"
            width={48}
            height={48}
            priority
            sizes="48px"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/points"
            aria-label="Points"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
          >
            <span className="block h-5 w-5 rounded-md bg-white/20" />
            {/* <PointsBadge /> */}
          </Link>

          <Link
            href="/settings"
            aria-label="Profile & settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
          >
            <UserIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
