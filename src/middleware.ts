import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_MAX_AGE = 300;
const WAGMI_COOKIE_KEY = 'wagmi.store';

const PUBLIC_ROUTES = ['/login', '/signup'];
const PROTECTED_ROUTES = [
  '/',
  '/points',
  '/settings',
  '/transactions',
  '/vaults',
];

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function isProtectedRoute(pathname: string): boolean {
  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (isPublic) return false;
  if (PROTECTED_ROUTES.length === 0) return true;
  return PROTECTED_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/')
  );
}

function redirectWithNext(req: NextRequest, dest: string, nextPath?: string) {
  const url = new URL(dest, req.url);
  const candidate = nextPath ?? req.nextUrl.searchParams.get('next') ?? '';
  if (candidate && candidate.startsWith('/') && !candidate.startsWith('//')) {
    url.searchParams.set('next', candidate);
  }
  return NextResponse.redirect(url);
}

function getAddressFromWagmiCookie(raw?: string): string | null {
  if (!raw) return null;
  try {
    const decoded = raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const data = JSON.parse(decoded);
    const state = data?.state ?? data;
    const current = state?.current;
    const map = state?.connections;
    if (map?.__type !== 'Map' || !Array.isArray(map?.value) || !current)
      return null;
    // Expect: [ [ "<uid>", { accounts: [...] } ], ... ]
    const pair = map.value.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => Array.isArray(p) && p.length === 2 && p[0] === current
    );

    const accounts = pair?.[1]?.accounts;
    const addr = accounts?.[0];
    return typeof addr === 'string' ? addr : null;
  } catch {
    return null;
  }
}

function hasOnboardedCookie(
  req: NextRequest,
  address?: string | null
): boolean {
  const flag = req.cookies.get('ob')?.value === '1';
  const addr = req.cookies.get('ob_addr')?.value?.toLowerCase();
  if (!flag || !addr || !address) return false;
  return addr === address.toLowerCase();
}

async function isOnboarded(
  req: NextRequest,
  address: string
): Promise<boolean> {
  const base = new URL(req.url);
  const headers = {
    'content-type': 'application/json',
    cookie: req.headers.get('cookie') ?? '',
  };

  // a) user lookup
  const userRes = await fetch(new URL('/api/db/get-user', base), {
    method: 'POST',
    headers,
    body: JSON.stringify({ address }),
  });
  if (userRes.status !== 200) return false;
  const { user } = await userRes.json();
  if (!user?.id) return false;

  // b) card lookup
  const cardRes = await fetch(new URL('/api/db/get-card', base), {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.id }),
  });
  return cardRes.status === 200;
}

function setOnboardingCookies(res: NextResponse, address: string) {
  res.cookies.set({
    name: 'ob',
    value: '1',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set({
    name: 'ob_addr',
    value: address!.toLowerCase(),
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function middleware(req: NextRequest) {
  // const { pathname, search } = req.nextUrl;
  // if (isAssetPath(pathname)) return NextResponse.next();

  // const address = getAddressFromWagmiCookie(
  //   req.cookies.get(WAGMI_COOKIE_KEY)?.value
  // );
  // const isConnected = !!address;

  // // --- protected routes ---
  // if (isProtectedRoute(pathname)) {
  //   if (!isConnected) {
  //     return redirectWithNext(req, '/login', pathname + search);
  //   }

  //   // fast-path
  //   if (hasOnboardedCookie(req, address)) {
  //     return NextResponse.next();
  //   }

  //   // slow-path
  //   const onboarded = await isOnboarded(req, address!);
  //   if (!onboarded) {
  //     return redirectWithNext(req, '/signup', pathname + search);
  //   }

  //   const res = NextResponse.next();
  //   setOnboardingCookies(res, address);
  //   return res;
  // }

  // // fast-path
  // if (isAuthRoute(pathname)) {
  //   if (!isConnected) return NextResponse.next();

  //   // FAST PATH
  //   if (hasOnboardedCookie(req, address)) {
  //     return redirectWithNext(req, '/', pathname + search);
  //   }

  //   // slow-path
  //   const onboarded = await isOnboarded(req, address!);
  //   if (onboarded) {
  //     const res = redirectWithNext(req, '/', pathname + search);
  //     setOnboardingCookies(res, address);
  //     return res;
  //   }

  //   // connected but not onboarded
  //   if (pathname === '/login' || pathname.startsWith('/login/')) {
  //     return redirectWithNext(req, '/signup');
  //   }
  //   return NextResponse.next();
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
