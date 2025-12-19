import { NextResponse } from 'next/server';
import { searchByName } from '@/lib/utils';

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const name = urlObj.searchParams.get('name') || '';

  try {
    const results = await searchByName(name);
    return NextResponse.json({ data: results });
  } catch (err: any) {
    const status = err?.status || 500;
    const body = { error: err?.message || String(err) };
    return NextResponse.json(body, { status });
  }
}
