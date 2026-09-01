import { NextResponse } from 'next/server';
import { getAvailableLocales, getAllLocalesData } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locales = getAvailableLocales();
    const data = getAllLocalesData();

    return NextResponse.json({
      locales,
      data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load locales' }, { status: 500 });
  }
}
