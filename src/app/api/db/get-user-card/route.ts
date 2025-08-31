import z from 'zod';
import { eq } from 'drizzle-orm';
import { isAddress } from 'viem';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { users, cards } from '@/db/schema';
import { stripe } from '@/config/stripe-config';

const BodySchema = z.object({
  address: z
    .string()
    .min(1)
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid EVM address' }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { success, error, data } = BodySchema.safeParse(body);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.treeifyError(error),
        },
        { status: 400 }
      );
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.address, data.address),
    });
    if (!dbUser) {
      return NextResponse.json({ user: null, card: null }, { status: 404 });
    }
    const dbCard = await db.query.cards.findFirst({
      where: eq(cards.userId, dbUser.id),
    });
    if (!dbCard) {
      return NextResponse.json({ user: dbUser, card: null }, { status: 200 });
    }

    const stripeCard = await stripe.issuing.cards.retrieve(
      dbCard.stripeCardId,
      { expand: ['number', 'cvc', 'cardholder'] }
    );

    const user = {
      name: dbUser.name,
      card: {
        displayName: stripeCard.cardholder.name,
        expiry: `${stripeCard.exp_month}/${stripeCard.exp_year}`,
        number: stripeCard.number,
        cvc: stripeCard.cvc,
      },
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/db/get-user-card] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
