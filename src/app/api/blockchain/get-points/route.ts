import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress, zeroAddress } from 'viem';
import { publicClient } from '@/config/viem-config';
import pointsAbiJson from '@/lib/contracts/PointsToken.sol/PointsToken.json';

import {
  POINTS_TOKEN_ADDRESS,
  ADMIN_LEADERBOARD_ADDRESS,
} from '@/config/constants/addresses';

const abi = (pointsAbiJson as { abi: unknown }).abi as readonly unknown[];

function getPointsAddress(): `0x${string}` | null {
  const env = (POINTS_TOKEN_ADDRESS as `0x${string}`) || ('' as `0x${string}`);
  const fallback =
    (POINTS_TOKEN_ADDRESS as `0x${string}`) || ('' as `0x${string}`);
  const addr =
    env && env !== (('0x' + '0'.repeat(40)) as `0x${string}`) ? env : fallback;
  if (!addr || !isAddress(addr)) return null;
  return getAddress(addr);
}

const adminLeaderboardAbi = [
  {
    type: 'function',
    name: 'TOPK',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'topAt',
    stateMutability: 'view',
    inputs: [{ name: 'idx', type: 'uint256' }],
    outputs: [
      { name: 'user', type: 'address' },
      { name: 'pts', type: 'uint256' },
    ],
  },
] as const satisfies readonly unknown[];

function getAdminLeaderboardAddress(): `0x${string}` | null {
  const env =
    (ADMIN_LEADERBOARD_ADDRESS as `0x${string}`) || ('' as `0x${string}`);
  const fallback =
    (ADMIN_LEADERBOARD_ADDRESS as `0x${string}`) || ('' as `0x${string}`);
  const addr =
    env && env !== (('0x' + '0'.repeat(40)) as `0x${string}`) ? env : fallback;
  if (!addr || !isAddress(addr)) return null;
  return getAddress(addr);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const addressParam = (url.searchParams.get('address') || '').trim();
    const limitParam = Number(url.searchParams.get('limit') || '10');

    if (!addressParam || !isAddress(addressParam)) {
      return NextResponse.json(
        { error: 'Missing or invalid address' },
        { status: 400 }
      );
    }

    const pointsAddress = getPointsAddress();
    if (!pointsAddress) {
      return NextResponse.json(
        { error: 'Points token address not configured' },
        { status: 500 }
      );
    }

    const owner = getAddress(addressParam as `0x${string}`);

    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: pointsAddress,
        abi,
        functionName: 'balanceOf',
        args: [owner],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: pointsAddress,
        abi,
        functionName: 'decimals',
      }) as Promise<number>,
    ]);
    const symbol = 'points';

    // leaderboard from admin contract when configured
    let leaderboard: Array<{ address: `0x${string}`; points: string }> = [];
    try {
      const adminAddress = getAdminLeaderboardAddress();
      if (adminAddress) {
        const topk = (await publicClient.readContract({
          address: adminAddress,
          abi: adminLeaderboardAbi,
          functionName: 'TOPK',
        })) as bigint;

        const k = Number(topk);
        const calls = Array.from(
          { length: k },
          (_, i) =>
            publicClient.readContract({
              address: adminAddress,
              abi: adminLeaderboardAbi,
              functionName: 'topAt',
              args: [BigInt(i)],
            }) as Promise<readonly [`0x${string}`, bigint]>
        );
        const entries = await Promise.all(calls);
        leaderboard = entries
          .map((e) => ({ address: getAddress(e[0]), points: e[1] }))
          .filter((e) => e.address !== zeroAddress && e.points > BigInt(0))
          .slice(0, Math.min(10, Math.max(1, Math.min(100, limitParam))))
          .map((e) => ({ address: e.address, points: e.points.toString() }));
      }
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        symbol,
        decimals,
        balance: balance.toString(),
        leaderboard,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[GET /api/blockchain/get-points] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
