import z from 'zod';
import { eq } from 'drizzle-orm';
import { erc20Abi } from 'viem';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { users, cards, payments, executions, transfers } from '@/db/schema';
import {
  executorAccount,
  publicClient,
  walletClient,
} from '@/config/viem-config';
import {
  TREASURY_ADDRESS,
  LISK_USDC_ADDRESS,
} from '@/config/constants/addresses';
import { gbpMinorToUsdcMinorToday } from '@/lib/gbpToUsd';
import pointsAbiJson from '@/lib/contracts/PointsToken.sol/PointsToken.json';
import adminAbiJson from '@/lib/contracts/AdminMinterLeaderboard.sol/AdminMinterLeaderboard.json';
import {
  POINTS_TOKEN_ADDRESS as ENV_POINTS,
  ADMIN_LEADERBOARD_ADDRESS as ENV_ADMIN,
} from '@/config/constants/envs';
import {
  POINTS_TOKEN_ADDRESS as CONST_POINTS,
  ADMIN_LEADERBOARD_ADDRESS as CONST_ADMIN,
} from '@/config/constants/addresses';

const BodySchema = z.object({
  paymentId: z.uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { success, error, data } = BodySchema.safeParse(body);
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid Body', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, data.paymentId),
    });
    if (!payment) {
      return NextResponse.json(
        { error: 'No completed payment for card' },
        { status: 404 }
      );
    }
    const execution = await db.query.executions.findFirst({
      where: eq(executions.paymentId, payment.id),
    });
    if (execution) {
      return NextResponse.json(
        { error: 'Payment already executed', txHash: execution.txHash },
        { status: 409 }
      );
    }
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, payment.cardId),
    });
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, card.userId),
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userAddress = user.address as `0x${string}`;
    const [allowance, balance] = await Promise.all([
      publicClient.readContract({
        address: LISK_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, executorAccount.address],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: LISK_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      }) as Promise<bigint>,
    ]);

    const gbpMinor = String(payment.amount);
    const { usdcMinor } = gbpMinorToUsdcMinorToday(gbpMinor);
    if (allowance < usdcMinor || balance < usdcMinor) {
      const error =
        allowance < usdcMinor
          ? 'insufficient_usdc_allowance'
          : 'insufficient_usdc_balance';
      return NextResponse.json(
        {
          error,
          needed: usdcMinor.toString(),
          balance: balance.toString(),
        },
        { status: 402 }
      );
    }

    const txHash = await walletClient.writeContract({
      address: LISK_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transferFrom',
      args: [userAddress, TREASURY_ADDRESS, usdcMinor],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    await db.insert(executions).values({
      paymentId: payment.id,
      symbol: 'USDC',
      amount: usdcMinor.toString(),
      decimals: 6,
      txHash,
    });
    await db.insert(transfers).values({
      userId: user.id,
      symbol: 'USDC',
      amount: usdcMinor.toString(),
      decimals: 6,
      sender: userAddress,
      receiver: TREASURY_ADDRESS,
      txHash,
    });

    try {
      const pointsAddress = (ENV_POINTS || CONST_POINTS) as `0x${string}`;
      const adminAddress = (ENV_ADMIN || CONST_ADMIN) as `0x${string}`;
      if (pointsAddress && adminAddress) {
        const pointsAbi = (pointsAbiJson as { abi: unknown })
          .abi as readonly unknown[];
        const adminAbi = (adminAbiJson as { abi: unknown })
          .abi as readonly unknown[];
        // usdcMinor has 6 decimals; pointsDecimals may vary
        const pointsDecimals = (await publicClient.readContract({
          address: pointsAddress,
          abi: pointsAbi,
          functionName: 'decimals',
        })) as number;
        const scale = BigInt(10) ** BigInt(Math.max(0, pointsDecimals - 6));
        const POINTS_PER_USD = BigInt(100);
        const amount = BigInt(usdcMinor) * scale * POINTS_PER_USD;
        const awardTx = await walletClient.writeContract({
          account: executorAccount,
          address: adminAddress,
          abi: adminAbi,
          functionName: 'award',
          args: [userAddress, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: awardTx });
      }
    } catch {}

    return NextResponse.json({ ok: true, txHash }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/blockchain/execute-payment] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
