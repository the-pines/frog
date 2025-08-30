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
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50"
    >
      <div className="mx-auto w-full max-w-[393px]">
        <div className="border border-red-200 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/60">
          <ul className="grid grid-cols-3 h-[56px]">
            {navItems.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              const color = isActive ? 'text-[#836EF9]' : 'text-white/60';

              return (
                <li key={href} className="h-full">
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex h-full flex-col items-center justify-center gap-0.5"
                  >
                    <Icon className={`${color} h-6 w-6`} strokeWidth={2} />
                    <span
                      className={`${color} text-[11px] font-semibold leading-[135%]`}
                    >
                      {label}
                    </span>
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
