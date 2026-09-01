import { NextRequest, NextResponse } from 'next/server';
import { clearAdminAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: '已安全退出' });
  clearAdminAuthCookie(res);
  return res;
}
