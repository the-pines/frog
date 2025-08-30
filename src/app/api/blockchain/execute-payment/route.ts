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

    return NextResponse.json({ ok: true, txHash }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/blockchain/execute-payment] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
