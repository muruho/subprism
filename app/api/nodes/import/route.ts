import { NextRequest, NextResponse } from 'next/server';
import { parseBatchUrls, parseProxyUrl } from '@/lib/parser';
import { saveNodesBatch } from '@/lib/redis';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, previewOnly } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '请输入要导入的节点链接文本' }, { status: 400 });
    }

    const parsedNodes = parseBatchUrls(text);

    if (parsedNodes.length === 0) {
      return NextResponse.json(
        { error: '未识别到有效的代理节点链接，请检查输入格式' },
        { status: 400 }
      );
    }

    // 若仅为预览则直接返回解析结果
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        count: parsedNodes.length,
        nodes: parsedNodes,
      });
    }

    // 保存到 Redis / 存储中
    await saveNodesBatch(parsedNodes);

    return NextResponse.json({
      success: true,
      count: parsedNodes.length,
      nodes: parsedNodes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '批量导入失败' }, { status: 500 });
  }
}
