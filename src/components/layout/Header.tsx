import Link from 'next/link';
import Image from 'next/image';
import { UserIcon } from '@heroicons/react/24/outline';
// import { PointsBadge } from '@/components/feature';

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto w-full max-w-[393px]">
        <div className="border border-red-200 flex items-center justify-between">
          <Link href="/" aria-label="Home" className="rounded-xl">
            <Image
              src="/frog.png"
              alt="Frog"
              width={24}
              height={24}
              priority
              sizes="24px"
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
              <UserIcon className="w-5 h-5 text-white/90" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
