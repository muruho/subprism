import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, signAdminToken, setAdminAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 });
    }

    const isValid = verifyCredentials(username.trim(), password);
    if (!isValid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const token = signAdminToken(username.trim());
    const res = NextResponse.json({
      success: true,
      user: { username: username.trim(), role: 'admin' },
    });

    setAdminAuthCookie(res, token);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '登录异常' }, { status: 500 });
  }
}
