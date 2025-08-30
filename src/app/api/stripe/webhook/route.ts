import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { erc20Abi } from 'viem';
import { NextRequest } from 'next/server';

import { db } from '@/db';
import { cards, payments, users } from '@/db/schema';
import {
  stripe,
  STRIPE_HEADERS,
  STRIPE_WEBHOOK_SECRET_KEY,
} from '@/config/stripe-config';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import { gbpMinorToUsdcMinorToday } from '@/lib/gbpToUsd';
import { executorAccount, publicClient } from '@/config/viem-config';

export async function POST(req: NextRequest) {
  const body = await req.text();

  const stripeSignature = req.headers.get('stripe-signature');
  if (!stripeSignature) {
    return new Response('Missing stripe-signature', {
      status: 400,
      headers: STRIPE_HEADERS,
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      stripeSignature,
      STRIPE_WEBHOOK_SECRET_KEY
    );
  } catch (err) {
    console.error('[POST /api/webhook-stripe] error:', err);
    return new Response('Invalid signature', {
      status: 400,
      headers: STRIPE_HEADERS,
    });
  }

  // payment approval flow
  if (event.type === 'issuing_authorization.request') {
    const paymentAuthRequest = event.data.object;

    const { card, user } = await db
      .select({
        card: {
          id: cards.id,
        },
        user: {
          id: users.id,
          address: users.address,
        },
      })
      .from(cards)
      .innerJoin(users, eq(cards.userId, users.id))
      .where(eq(cards.stripeCardId, paymentAuthRequest.card.id))
      .limit(1)
      .then((r) => r[0]);
    if (!card || !user) {
      const reason = card ? 'user_not_found' : 'card_not_found';
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason },
        }),
        {
          status: 200,
          headers: STRIPE_HEADERS,
        }
      );
    }

    const paymentAuthPendingRequst = paymentAuthRequest.pending_request;
    if (!paymentAuthPendingRequst) {
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason: 'pending_request_not_found' },
        }),
        {
          status: 200,
          headers: STRIPE_HEADERS,
        }
      );
    }

    await db
      .insert(payments)
      .values({
        cardId: card.id,
        paymentId: paymentAuthRequest.id,
        amount: String(paymentAuthPendingRequst.amount),
        currency: paymentAuthPendingRequst.currency.toUpperCase(),
        merchant_name: paymentAuthRequest.merchant_data.name ?? 'no_name',
        merchant_amount: String(paymentAuthPendingRequst.merchant_amount),
        merchant_currency:
          paymentAuthPendingRequst.merchant_currency.toUpperCase(),
        status: 'started',
      })
      .onConflictDoNothing()
      .returning();

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

    const gbpMinor = String(paymentAuthRequest.amount);
    const { usdcMinor } = gbpMinorToUsdcMinorToday(gbpMinor);
    if (allowance < usdcMinor || balance < usdcMinor) {
      const reason =
        allowance < usdcMinor
          ? 'insufficient_usdc_allowance'
          : 'insufficient_usdc_balance';
      return new Response(
        JSON.stringify({
          approved: false,
          metadata: { reason },
        }),
        {
          status: 200,
          headers: STRIPE_HEADERS,
        }
      );
    }

    return new Response(JSON.stringify({ approved: true }), {
      status: 200,
      headers: STRIPE_HEADERS,
    });
  }

  // payment approve notification
  if (event.type === 'issuing_authorization.created') {
    const paymentAuthRequest = event.data.object;

    const payment = await db.query.payments.findFirst({
      where: eq(payments.paymentId, paymentAuthRequest.id),
    });
    if (!payment) {
      // i should create the payment object if this conditional happens
      return new Response('ok', {
        status: 200,
        headers: STRIPE_HEADERS,
      });
    }

    await db
      .update(payments)
      .set({
        status: paymentAuthRequest.approved ? 'completed' : 'cancelled',
        amount: String(paymentAuthRequest.amount),
        currency: paymentAuthRequest.currency.toUpperCase(),
        merchant_amount: String(paymentAuthRequest.merchant_amount),
        merchant_currency: paymentAuthRequest.merchant_currency.toUpperCase(),
      })
      .where(eq(payments.id, payment.id));

    if (paymentAuthRequest.approved) {
      try {
        const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/execute-payment`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: payment.id }),
          cache: 'no-store',
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('[execute-payment] non-200', res.status, text);
        }
      } catch (e) {
        console.error('[execute-payment] call failed', e);
      }
    }

    return new Response('ok', {
      status: 200,
      headers: STRIPE_HEADERS,
    });
  }

  return new Response('ignored', {
    status: 200,
    headers: STRIPE_HEADERS,
  });
}
