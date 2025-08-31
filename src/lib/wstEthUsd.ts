// Frontend-only helpers to convert wstETH amounts to USD using a hardcoded price

const PRICE_MICRO_USDC_PER_WST = BigInt(5_391_940_000); // 5,391.94 USDC per 1 wstETH

export function wstWeiToUsdcMinor(
  wstWei: string | bigint,
  wstDecimals: number
): bigint {
  const wst = BigInt(String(wstWei || '0'));
  if (wst <= BigInt(0)) return BigInt(0);
  const wstScale = BigInt(10) ** BigInt(wstDecimals);
  return (wst * PRICE_MICRO_USDC_PER_WST) / wstScale;
}

export function formatUsdFromUsdcMinor(usdcMinor: bigint): string {
  const cents = (usdcMinor + BigInt(5_000)) / BigInt(10_000);
  const dollarsInt = cents / BigInt(100);
  const centsTwo = Number(cents % BigInt(100))
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
