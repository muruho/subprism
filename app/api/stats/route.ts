import { NextRequest, NextResponse } from 'next/server';
import { getSystemStats } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const stats = await getSystemStats();
  return NextResponse.json({ stats });
}
