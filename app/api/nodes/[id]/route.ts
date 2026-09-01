import { NextRequest, NextResponse } from 'next/server';
import { getNodeById, saveNode, deleteNode } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';

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
  const existing = await getNodeById(id);
  if (!existing) {
    return NextResponse.json({ error: '节点不存在' }, { status: 404 });
  }

  try {
    const body = await req.json();

    const updated = {
      ...existing,
      ...body,
      id, // 不允许修改 id
      port: body.port ? parseInt(body.port, 10) : existing.port,
      alterId: body.alterId !== undefined ? parseInt(body.alterId, 10) : existing.alterId,
      updatedAt: Date.now(),
    };

    await saveNode(updated);
    return NextResponse.json({ success: true, node: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '更新节点失败' }, { status: 500 });
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
  await deleteNode(id);
  return NextResponse.json({ success: true });
}
