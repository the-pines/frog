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
      <div
        className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl fixed bottom-0 inset-x-0 z-50
                    border-t border-white/10 text-frog-foreground mx-auto max-w-[340px] rounded-3xl mb-3 shadow-xl"
      >
        <ul className="grid grid-cols-3 h-[56px]">
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
    </nav>
  );
}
