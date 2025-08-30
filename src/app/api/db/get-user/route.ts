import z from 'zod';
import { eq } from 'drizzle-orm';
import { isAddress } from 'viem';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { users } from '@/db/schema';

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

    const user = await db.query.users.findFirst({
      where: eq(users.address, data.address),
    });
    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/db/get-user] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
