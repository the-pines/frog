import z from 'zod';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { cards } from '@/db/schema';

const BodySchema = z.object({
  userId: z.uuid(),
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

    const card = await db.query.cards.findFirst({
      where: eq(cards.userId, data.userId),
    });
    if (!card) {
      return NextResponse.json({ card: null }, { status: 404 });
    }

    return NextResponse.json({ card }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/db/get-card] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
