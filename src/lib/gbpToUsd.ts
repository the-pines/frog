function getGbpUsdTodayFake() {
  const rate = 1.27;
  const asOf = new Date().toISOString().slice(0, 10);
  return { rate, asOf };
}

export function gbpMinorToUsdcMinorToday(gbpMinor: string | bigint) {
  const { rate, asOf } = getGbpUsdTodayFake();

  const pence = BigInt(String(gbpMinor));
  if (pence <= BigInt(0)) {
    return {
      asOf,
      gbpUsd: rate,
      gbpMinor: '0',
      usdcMinor: BigInt(0),
    };
  }

  const ceilDiv = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b;

  const RATE_SCALE = BigInt(1_000_000);
  const rateScaled = BigInt(Math.round(rate * Number(RATE_SCALE)));
  const SCALE_DIFF = BigInt(10_000);

  const numerator = pence * SCALE_DIFF * rateScaled;
  const usdcMinor = ceilDiv(numerator, RATE_SCALE);

  return {
    asOf,
    gbpUsd: rate,
    gbpMinor: pence.toString(),
    usdcMinor: usdcMinor,
  };
}
