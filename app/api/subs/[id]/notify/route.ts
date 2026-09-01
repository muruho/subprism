import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionById, getAllNodes } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { dispatchSubscriptionNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const id = params.id;
  const sub = await getSubscriptionById(id);
  if (!sub) {
    return NextResponse.json({ error: '订阅不存在' }, { status: 404 });
  }

  if (!sub.email && !sub.telegramChatId) {
    return NextResponse.json(
      { error: '该订阅未配置邮箱或 Telegram Chat ID，无法发送通知' },
      { status: 400 }
    );
  }

  const allNodes = await getAllNodes();
  const nodeCount =
    sub.nodeScope === 'all'
      ? allNodes.filter((n) => n.status === 'active').length
      : sub.nodeIds.length;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const result = await dispatchSubscriptionNotification(sub, nodeCount, origin);

  return NextResponse.json({
    success: true,
    result,
  });
}
