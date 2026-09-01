import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByToken, getAllNodes, recordSubFetch } from '@/lib/redis';
import { nodeToRawUrl, safeBase64Encode } from '@/lib/parser';
import { generateClashConfig } from '@/lib/clash';
import { ProxyNode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token) {
    return new NextResponse('Invalid subscription token', { status: 400 });
  }

  // 查找订阅
  const sub = await getSubscriptionByToken(token);
  if (!sub) {
    return new NextResponse('Subscription not found', { status: 404 });
  }

  if (sub.status === 'disabled') {
    return new NextResponse('Subscription is disabled', { status: 403 });
  }

  // 异步记录拉取计数与时间
  recordSubFetch(sub.id).catch((e) => console.error('Error recording sub fetch:', e));

  // 获取可用节点
  const allNodes = await getAllNodes();
  let availableNodes: ProxyNode[] = [];

  if (sub.nodeScope === 'all') {
    availableNodes = allNodes.filter((n) => n.status === 'active');
  } else {
    const idSet = new Set(sub.nodeIds || []);
    availableNodes = allNodes.filter((n) => idSet.has(n.id) && n.status === 'active');
  }

  // 识别客户端与请求格式
  const userAgent = req.headers.get('user-agent') || '';
  const searchParams = req.nextUrl.searchParams;
  let format = searchParams.get('format')?.toLowerCase();

  if (!format) {
    if (
      userAgent.includes('Clash') ||
      userAgent.includes('Stash') ||
      userAgent.includes('meta')
    ) {
      format = 'clash';
    } else {
      format = 'universal'; // 默认通用 base64 格式
    }
  }

  // 构造标准响应头
  const headers = new Headers({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'subscription-userinfo': 'upload=0; download=0; total=1073741824000; expire=0',
    'profile-update-interval': '24',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(sub.username || 'sub')}`,
  });

  // 1. Clash YAML 格式
  if (format === 'clash' || format === 'yaml') {
    headers.set('Content-Type', 'text/yaml; charset=utf-8');
    const clashYaml = generateClashConfig(availableNodes, `Sub-${sub.username}`);
    return new NextResponse(clashYaml, {
      status: 200,
      headers,
    });
  }

  // 2. JSON 格式
  if (format === 'json') {
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new NextResponse(
      JSON.stringify(
        {
          username: sub.username,
          nodeCount: availableNodes.length,
          updatedAt: new Date().toISOString(),
          nodes: availableNodes,
        },
        null,
        2
      ),
      {
        status: 200,
        headers,
      }
    );
  }

  // 3. Shadowsocks 专属格式
  if (format === 'ss') {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    const ssNodes = availableNodes.filter((n) => n.type === 'ss');
    const rawLinks = ssNodes.map((n) => nodeToRawUrl(n)).join('\n');
    return new NextResponse(safeBase64Encode(rawLinks), {
      status: 200,
      headers,
    });
  }

  // 4. 通用 / V2Ray / Base64 格式 (默认)
  headers.set('Content-Type', 'text/plain; charset=utf-8');
  const rawLinks = availableNodes.map((n) => nodeToRawUrl(n)).filter(Boolean).join('\n');
  const base64Content = safeBase64Encode(rawLinks);

  return new NextResponse(base64Content, {
    status: 200,
    headers,
  });
}
