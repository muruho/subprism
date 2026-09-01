import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionById, saveSubscription, deleteSubscription } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { generateSubToken } from '@/lib/token';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const id = params.id;
  const existing = await getSubscriptionById(id);
  if (!existing) {
    return NextResponse.json({ error: '订阅不存在' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const username = body.username ? body.username.trim() : existing.username;

    // 如果用户名变更，重新计算 token
    const token =
      username !== existing.username ? generateSubToken(username) : existing.token;

    const updated = {
      ...existing,
      ...body,
      id,
      username,
      token,
      email: body.email !== undefined ? body.email.trim() || undefined : existing.email,
      telegramChatId:
        body.telegramChatId !== undefined
          ? body.telegramChatId.trim() || undefined
          : existing.telegramChatId,
      remark: body.remark !== undefined ? body.remark.trim() || undefined : existing.remark,
      nodeScope: body.nodeScope === 'custom' ? 'custom' : 'all',
      nodeIds: Array.isArray(body.nodeIds) ? body.nodeIds : existing.nodeIds,
      updatedAt: Date.now(),
    };

    await saveSubscription(updated);
    return NextResponse.json({ success: true, sub: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '更新订阅失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const id = params.id;
  await deleteSubscription(id);
  return NextResponse.json({ success: true });
}
