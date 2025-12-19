import { NextResponse } from 'next/server';
import { searchByName } from '@/lib/utils';

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const name = urlObj.searchParams.get('name') || '';

  try {
    const results = await searchByName(name);
    return NextResponse.json({ data: results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
