// Frontend-only helpers to convert wstETH amounts to USD using a hardcoded price

const PRICE_MICRO_USDC_PER_WST = 5_391_940_000n; // 5,391.94 USDC per 1 wstETH

export function wstWeiToUsdcMinor(
  wstWei: string | bigint,
  wstDecimals: number
): bigint {
  const wst = BigInt(String(wstWei || '0'));
  if (wst <= 0n) return 0n;
  const wstScale = 10n ** BigInt(wstDecimals);
  return (wst * PRICE_MICRO_USDC_PER_WST) / wstScale;
}

export function formatUsdFromUsdcMinor(usdcMinor: bigint): string {
  const cents = (usdcMinor + 5_000n) / 10_000n;
  const dollarsInt = cents / 100n;
  const centsTwo = Number(cents % 100n)
    .toString()
    .padStart(2, '0');
  const dollarsStr = dollarsInt
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${dollarsStr}.${centsTwo}`;
}

export function wstWeiToUsdString(
  wstWei: string | bigint,
  wstDecimals: number
): string {
  const usdcMinor = wstWeiToUsdcMinor(wstWei, wstDecimals);
  return formatUsdFromUsdcMinor(usdcMinor);
}

export function formatAddressShort(addr: string, head = 6, tail = 4) {
  if (!addr || addr.length < head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
