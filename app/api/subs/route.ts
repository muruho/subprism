import { NextRequest, NextResponse } from 'next/server';
import { getAllSubscriptions, saveSubscription, getAllNodes } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { generateSubToken } from '@/lib/token';
import { dispatchSubscriptionNotification } from '@/lib/notifications';
import { Subscription } from '@/lib/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const subs = await getAllSubscriptions();
  return NextResponse.json({ subs });
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json({ error: '用户名 (username) 为必填项' }, { status: 400 });
    }

    const now = Date.now();
    const token = generateSubToken(username);
    const id = crypto.randomUUID();

    const sub: Subscription = {
      id,
      username,
      email: body.email?.trim() || undefined,
      telegramChatId: body.telegramChatId?.trim() || undefined,
      enableNotification: !!body.enableNotification,
      remark: body.remark?.trim() || undefined,
      nodeScope: body.nodeScope === 'custom' ? 'custom' : 'all',
      nodeIds: Array.isArray(body.nodeIds) ? body.nodeIds : [],
      token,
      status: body.status === 'disabled' ? 'disabled' : 'active',
      createdAt: now,
      updatedAt: now,
      fetchCount: 0,
    };

    await saveSubscription(sub);

    // 如果开启了通知，则自动发送通知
    if (sub.enableNotification && (sub.email || sub.telegramChatId)) {
      const allNodes = await getAllNodes();
      const nodeCount =
        sub.nodeScope === 'all'
          ? allNodes.filter((n) => n.status === 'active').length
          : sub.nodeIds.length;

      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${req.nextUrl.protocol}//${req.nextUrl.host}`;

      dispatchSubscriptionNotification(sub, nodeCount, origin).catch((e) =>
        console.error('Auto notification failed:', e)
      );
    }

    return NextResponse.json({ success: true, sub });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '创建订阅失败' }, { status: 500 });
  }
}
