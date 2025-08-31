import { NextRequest, NextResponse } from 'next/server';

// Placeholder endpoint so it builds!!!
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = (url.searchParams.get('address') || '').trim();
    const limit = Number(url.searchParams.get('limit') || '20');
    const offset = Number(url.searchParams.get('offset') || '0');

    return NextResponse.json(
      { ok: true, address, limit, offset, transactions: [] },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
