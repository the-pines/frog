import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { erc20Abi, isAddress } from 'viem';

import { db } from '@/db';
import { users, vaults } from '@/db/schema';
import { publicClient } from '@/config/viem-config';
import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';

const BodySchema = z.object({
  owner: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid owner address' }),
  address: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid vault address' }),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { success, error, data } = BodySchema.safeParse(body);
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid body', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.address, data.owner),
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const address = data.address as `0x${string}`;
    const abi = (vaultAbiJson as { abi: any }).abi as readonly unknown[];
    const [wsteth, name] = (await Promise.all([
      publicClient.readContract({
        address,
        abi,
        functionName: 'WSTETH',
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address,
        abi,
        functionName: 'name',
      }) as Promise<string>,
    ])) as [`0x${string}`, string];
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

    await db.insert(vaults).values({
      userId: user.id,
      collaborators: [],
      address,
      name,
      goal: '0',
      tokenSymbol: symbol,
      decimals,
      chainId: Number(publicClient.chain?.id || 0),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/vaults/attach] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
