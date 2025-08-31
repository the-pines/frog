import z from 'zod';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { erc20Abi, isAddress } from 'viem';
import type { Abi } from 'viem';

import { db } from '@/db';
import { users, vaults } from '@/db/schema';
import { publicClient } from '@/config/viem-config';
import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';

const QuerySchema = z.object({
  owner: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid EVM address' }),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner') ?? '';
    const parsed = QuerySchema.safeParse({ owner });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.address, parsed.data.owner),
    });

    if (!user) {
      return NextResponse.json({ vaults: [] }, { status: 200 });
    }

    const userVaults = await db.query.vaults.findMany({
      where: eq(vaults.userId, user.id),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    const abi = (vaultAbiJson as { abi: Abi }).abi;
    const enriched = await Promise.all(
      userVaults.map(async (v) => {
        try {
          const address = v.address as `0x${string}`;
          const [wsteth, goalWstETH, totalWstETHAssets] = await Promise.all([
            publicClient.readContract({
              address,
              abi,
              functionName: 'WSTETH',
            }) as Promise<`0x${string}`>,
            publicClient.readContract({
              address,
              abi,
              functionName: 'goalWstETH',
            }) as Promise<bigint>,
            publicClient.readContract({
              address,
              abi,
              functionName: 'totalWstETHAssets',
            }) as Promise<bigint>,
          ]);

          const [symbol, decimals] = await Promise.all([
            publicClient.readContract({
              address: wsteth,
              abi: erc20Abi,
              functionName: 'symbol',
            }) as Promise<string>,
            publicClient.readContract({
              address: wsteth,
              abi: erc20Abi,
              functionName: 'decimals',
            }) as Promise<number>,
          ]);

          // Fetch name from contract
          const name = (await publicClient.readContract({
            address: address,
            abi,
            functionName: 'name',
          })) as string;
          return {
            id: v.address,
            name,
            goalWei: goalWstETH.toString(),
            totalWei: totalWstETHAssets.toString(),
            token: { symbol, decimals },
          };
        } catch (e) {
          return {
            id: v.address,
            name: 'Vault',
            goalWei: '0',
            totalWei: '0',
            token: { symbol: 'WSTETH', decimals: 18 },
          };
        }
      })
    );

    return NextResponse.json({ vaults: enriched }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/vaults] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
