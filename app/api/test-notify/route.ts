import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { sendEmailNotification, sendTelegramNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, target } = body; // type: 'email' | 'telegram'

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const subUrl = `${origin}/sub/test_demo_token`;
    const clashUrl = `${origin}/sub/test_demo_token?format=clash`;
    const v2rayUrl = `${origin}/sub/test_demo_token?format=v2ray`;

    if (type === 'email') {
      if (!target) {
        return NextResponse.json({ error: '请输入测试接收邮箱' }, { status: 400 });
      }
      const res = await sendEmailNotification({
        to: target,
        username: 'TestAdmin',
        subUrl,
        clashUrl,
        v2rayUrl,
        nodeCount: 5,
      });
      return NextResponse.json(res);
    }

    if (type === 'telegram') {
      if (!target) {
        return NextResponse.json({ error: '请输入测试 Telegram Chat ID' }, { status: 400 });
      }
      const res = await sendTelegramNotification({
        chatId: target,
        username: 'TestAdmin',
        subUrl,
        clashUrl,
        v2rayUrl,
        nodeCount: 5,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: '未知测试类型' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '测试失败' }, { status: 500 });
  }
}
