import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, Hex, isAddress } from 'viem';

import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';

const BodySchema = z.object({
  sharesToRedeem: z.string().min(1),
  router: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid router' }),
  swapCalldata: z.string().transform((s) => s as Hex),
  minEthOutWei: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const body = await req.json();
    const { success, error, data } = BodySchema.safeParse(body);
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid body', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    const vault = params.address as `0x${string}`;
    if (!isAddress(vault)) {
      return NextResponse.json({ error: 'Invalid vault' }, { status: 400 });
    }

    const abi = (vaultAbiJson as { abi: any }).abi as readonly unknown[];
    const dataCall = encodeFunctionData({
      abi,
      functionName: 'withdrawSplitToETH',
      args: [
        BigInt(data.sharesToRedeem),
        data.router as `0x${string}`,
        data.swapCalldata as Hex,
        BigInt(data.minEthOutWei),
      ],
    });

    const steps = [
      {
        to: vault,
        data: dataCall,
        value: '0x0',
        description: 'Withdraw to ETH via router',
      },
    ];

    return NextResponse.json({ steps }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/vaults/[address]/withdraw] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
