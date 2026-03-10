import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { PriceHistoryEntry } from '../../../types';

function normalizeKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Falta el parámetro q' }, { status: 400 });
  }

  const cacheKey = normalizeKey(query);

  try {
    const rawEntries = await kv.lrange(`price_history:${cacheKey}`, 0, 29);
    const history: PriceHistoryEntry[] = rawEntries.map(entry =>
      typeof entry === 'string' ? JSON.parse(entry) : entry
    );
    return NextResponse.json({ success: true, history });
  } catch {
    // KV no configurado o error: devolver vacío sin fallar
    return NextResponse.json({ success: true, history: [] });
  }
}
