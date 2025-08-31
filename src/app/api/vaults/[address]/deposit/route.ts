import 'server-only';
import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { erc20Abi, isAddress } from 'viem';

import {
  publicClient,
  walletClient,
  executorAccount,
} from '@/config/viem-config';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';

const BodySchema = z.object({
  owner: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid owner address' }),
  usdcMinor: z.string().min(1),
  slippage: z.number().min(0).max(0.2).optional().default(0.005),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
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

    const { address } = await params;
    const vault = address as `0x${string}`;
    if (!isAddress(vault)) {
      return NextResponse.json({ error: 'Invalid vault' }, { status: 400 });
    }

    if (!LISK_USDC_ADDRESS) {
      return NextResponse.json(
        { error: 'USDC token address not configured' },
        { status: 500 }
      );
    }

    const abi = (vaultAbiJson as { abi: unknown }).abi as readonly unknown[];
    const [wsteth] = (await Promise.all([
      publicClient.readContract({
        address: vault,
        abi,
        functionName: 'WSTETH',
      }) as Promise<`0x${string}`>,
    ])) as [`0x${string}`];

    const ownerAddr = data.owner as `0x${string}`;
    const usdcMinor = BigInt(data.usdcMinor);

    //  verify allowance and balance from user to executor
    const [allowance, balance] = await Promise.all([
      publicClient.readContract({
        address: LISK_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [ownerAddr, executorAccount.address],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: LISK_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [ownerAddr],
      }) as Promise<bigint>,
    ]);

    if (allowance < usdcMinor || balance < usdcMinor) {
      const errorCode =
        allowance < usdcMinor
          ? 'insufficient_usdc_allowance'
          : 'insufficient_usdc_balance';
      return NextResponse.json(
        {
          error: errorCode,
          needed: usdcMinor.toString(),
          balance: balance.toString(),
          token: LISK_USDC_ADDRESS,
          spender: executorAccount.address,
        },
        { status: 402 }
      );
    }

    // pull USDC to executor
    const pullHash = await walletClient.writeContract({
      address: LISK_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transferFrom',
      args: [ownerAddr, executorAccount.address, usdcMinor],
      account: executorAccount,
    });
    await publicClient.waitForTransactionReceipt({ hash: pullHash });

    // compute amount
    const PRICE_MICRO_USDC_PER_WST = BigInt(5_391_940_000);
    const wstDecimals = (await publicClient.readContract({
      address: wsteth,
      abi: erc20Abi,
      functionName: 'decimals',
    })) as number;
    const wstScale = BigInt(10) ** BigInt(wstDecimals);
    const wstQuoted = (usdcMinor * wstScale) / PRICE_MICRO_USDC_PER_WST;
    if (wstQuoted === BigInt(0)) {
      return NextResponse.json({ error: 'zero_wst_quote' }, { status: 502 });
    }

    // ennsure executor has enough wstETH balance to fulfill the quoted amount
    const executorWst = (await publicClient.readContract({
      address: wsteth,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [executorAccount.address],
    })) as bigint;
    if (executorWst < wstQuoted) {
      return NextResponse.json(
        {
          error: 'insufficient_executor_wst',
          needed: wstQuoted.toString(),
          balance: executorWst.toString(),
        },
        { status: 402 }
      );
    }

    // approve vault to pull wstETH from executor (unlimited), then deposit for user
    const currentVaultAllowance = (await publicClient.readContract({
      address: wsteth,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [executorAccount.address, vault],
    })) as bigint;
    if (currentVaultAllowance < wstQuoted) {
      try {
        if (currentVaultAllowance > BigInt(0)) {
          const resetHash = await walletClient.writeContract({
            address: wsteth,
            abi: erc20Abi,
            functionName: 'approve',
            args: [vault, BigInt(0)],
            account: executorAccount,
          });
          await publicClient.waitForTransactionReceipt({ hash: resetHash });
        }
        const approveVaultHash = await walletClient.writeContract({
          address: wsteth,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vault, BigInt(2) ** BigInt(256) - BigInt(1)],
          account: executorAccount,
        });
        await publicClient.waitForTransactionReceipt({
          hash: approveVaultHash,
        });
      } catch (e) {
        return NextResponse.json(
          { error: 'approve_vault_failed', details: `${e}` },
          { status: 502 }
        );
      }
    }

    // call depositWstETHFor on the vault using executor's existing wstETH
    const depositHash = await walletClient.writeContract({
      address: vault,
      abi,
      functionName: 'depositWstETHFor',
      args: [wstQuoted, ownerAddr],
      account: executorAccount,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    return NextResponse.json(
      {
        ok: true,
        pulled: usdcMinor.toString(),
        wstUsed: wstQuoted.toString(),
        tx: {
          pullHash,
          depositHash,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[POST /api/vaults/[address]/deposit] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
