import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { isAddress } from 'viem';

import { db } from '@/db';
import { users, vaults } from '@/db/schema';
// removed on-chain reads; we only persist vault address for this MVP

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

    await db.insert(vaults).values({
      userId: user.id,
      collaborators: [],
      address,
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
