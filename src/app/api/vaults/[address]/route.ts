import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { erc20Abi, isAddress } from 'viem';

import { publicClient } from '@/config/viem-config';
import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';

const QuerySchema = z.object({
  owner: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => !a || isAddress(a), { message: 'Invalid owner address' })
    .optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner') ?? undefined;
    const { success, error } = QuerySchema.safeParse({ owner });
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid query', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    const address = params.address as `0x${string}`;
    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const abi = (vaultAbiJson as { abi: readonly unknown[] })
      .abi as readonly unknown[];
    const [ownerAddr, feeRecipient, feeBps, unlockTime, withdrawalsEnabled] =
      (await Promise.all([
        publicClient.readContract({ address, abi, functionName: 'owner' }),
        publicClient.readContract({
          address,
          abi,
          functionName: 'feeRecipient',
        }),
        publicClient.readContract({ address, abi, functionName: 'feeBps' }),
        publicClient.readContract({ address, abi, functionName: 'unlockTime' }),
        publicClient.readContract({
          address,
          abi,
          functionName: 'withdrawalsEnabled',
        }),
      ])) as [string, string, number, bigint, boolean];

    const [wsteth, goalWstETH, totalWstETHAssets, name] = (await Promise.all([
      publicClient.readContract({ address, abi, functionName: 'WSTETH' }),
      publicClient.readContract({ address, abi, functionName: 'goalWstETH' }),
      publicClient.readContract({
        address,
        abi,
        functionName: 'totalWstETHAssets',
      }),
      publicClient.readContract({ address, abi, functionName: 'name' }),
    ])) as [`0x${string}`, bigint, bigint, string];

    const [symbol, decimals] = (await Promise.all([
      publicClient.readContract({
        address: wsteth,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: wsteth,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ])) as [string, number];

    let user = null as null | {
      address: string;
      shares: string;
      principal: string;
      assets: string;
      profit: string;
    };
    if (owner) {
      const [shares, principal, assets, profit, canWithdraw] =
        (await Promise.all([
          publicClient.readContract({
            address,
            abi,
            functionName: 'userShares',
            args: [owner as `0x${string}`],
          }),
          publicClient.readContract({
            address,
            abi,
            functionName: 'userPrincipal',
            args: [owner as `0x${string}`],
          }),
          publicClient.readContract({
            address,
            abi,
            functionName: 'currentAssetsOf',
            args: [owner as `0x${string}`],
          }),
          publicClient.readContract({
            address,
            abi,
            functionName: 'profitOf',
            args: [owner as `0x${string}`],
          }),
          publicClient.readContract({
            address,
            abi,
            functionName: 'canWithdraw',
          }),
        ])) as [bigint, bigint, bigint, bigint, boolean];

      user = {
        address: owner,
        shares: shares.toString(),
        principal: principal.toString(),
        assets: assets.toString(),
        profit: profit.toString(),
      };

      return NextResponse.json(
        {
          owner: ownerAddr,
          feeRecipient,
          feeBps,
          unlockTime: Number(unlockTime),
          withdrawalsEnabled,
          canWithdraw,
          wsteth,
          name,
          token: { symbol, decimals },
          goalWstETH: goalWstETH.toString(),
          totalWstETHAssets: totalWstETHAssets.toString(),
          user,
        },
        { status: 200 }
      );
    }

    const canWithdraw = (await publicClient.readContract({
      address,
      abi,
      functionName: 'canWithdraw',
    })) as boolean;

    return NextResponse.json(
      {
        owner: ownerAddr,
        feeRecipient,
        feeBps,
        unlockTime: Number(unlockTime),
        withdrawalsEnabled,
        canWithdraw,
        wsteth,
        name,
        token: { symbol, decimals },
        goalWstETH: goalWstETH.toString(),
        totalWstETHAssets: totalWstETHAssets.toString(),
        user: null,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[GET /api/vaults/[address]] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
