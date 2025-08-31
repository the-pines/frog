'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/transactions', label: 'Transactions', Icon: ArrowsRightLeftIcon },
  { href: '/vaults', label: 'Vaults', Icon: CubeIcon },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bottom navigation" className="w-full">
      <div className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[340px] mb-3">
        <div
          className="
            relative rounded-3xl overflow-hidden shadow-xl
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

          <ul className="relative grid grid-cols-3 h-[56px]">
            {navItems.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              const color = isActive ? 'text-frog-active font-medium' : '';

              return (
                <li key={href} className="h-full">
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex h-full flex-col items-center justify-center gap-0.5"
                  >
                    <Icon className={`${color} h-4 w-4`} strokeWidth={2} />
                    <span className={`${color} text-sm`}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
