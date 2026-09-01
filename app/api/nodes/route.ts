import { NextRequest, NextResponse } from 'next/server';
import { getAllNodes, saveNode } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { parseProxyUrl } from '@/lib/parser';
import { ProxyNode } from '@/lib/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const nodes = await getAllNodes();
  return NextResponse.json({ nodes });
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 如果传入了 rawUrl 则尝试解析
    if (body.rawUrl && (!body.server || !body.port)) {
      const parsed = parseProxyUrl(body.rawUrl);
      if (!parsed) {
        return NextResponse.json({ error: '无法解析该代理链接格式' }, { status: 400 });
      }
      if (body.name) parsed.name = body.name;
      await saveNode(parsed);
      return NextResponse.json({ success: true, node: parsed });
    }

    if (!body.name || !body.server || !body.port || !body.type) {
      return NextResponse.json({ error: '缺少必要的节点参数 (名称、类型、服务器、端口)' }, { status: 400 });
    }

    const now = Date.now();
    const node: ProxyNode = {
      id: body.id || crypto.randomUUID(),
      name: body.name.trim(),
      type: body.type,
      server: body.server.trim(),
      port: parseInt(body.port, 10),
      username: body.username?.trim() || undefined,
      password: body.password?.trim() || undefined,
      uuid: body.uuid?.trim() || undefined,
      cipher: body.cipher?.trim() || undefined,
      alterId: body.alterId ? parseInt(body.alterId, 10) : undefined,
      network: body.network || 'tcp',
      tls: !!body.tls,
      sni: body.sni?.trim() || undefined,
      path: body.path?.trim() || undefined,
      host: body.host?.trim() || undefined,
      skipCertVerify: !!body.skipCertVerify,
      rawUrl: body.rawUrl?.trim() || undefined,
      status: body.status === 'disabled' ? 'disabled' : 'active',
      createdAt: now,
      updatedAt: now,
    };

    await saveNode(node);
    return NextResponse.json({ success: true, node });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '添加节点失败' }, { status: 500 });
  }
}
