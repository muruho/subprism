import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'sub_admin_session';

// 内存暂存未配置密码时生成的安全随机临时密码
const globalAuthStore = globalThis as unknown as {
  __subMgrRandomPassword?: string;
  __subMgrPasswordLogged?: boolean;
};

/**
 * 生成 16 位包含大写字母、小写字母和数字的高强度随机密码
 */
export function generateRandomPassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const all = upper + lower + digits;

  // 确保至少包含 1 个大写字母、1 个小写字母、1 个数字
  const chars: string[] = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
  ];

  // 填充剩余长度
  for (let i = chars.length; i < length; i++) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Fisher-Yates 洗牌算法随机打乱顺序
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export function getAdminCredentials() {
  const adminName =
    process.env.ADMIN_NAME ||
    process.env.admin_name ||
    'admin';

  let adminPassword =
    process.env.ADMIN_PASSWORD ||
    process.env.admin_password;

  // 如果环境变量未配置密码（或为空白字符串），则生成 16 位包含大小写字母与数字的随机密码并打印在控制台日志中
  if (!adminPassword || !adminPassword.trim()) {
    if (!globalAuthStore.__subMgrRandomPassword) {
      globalAuthStore.__subMgrRandomPassword = generateRandomPassword(16);
    }
    adminPassword = globalAuthStore.__subMgrRandomPassword;

    if (!globalAuthStore.__subMgrPasswordLogged) {
      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  ⚠️  [SubPrism 安全提示 / SECURITY NOTICE]                  │');
      console.log('│  未在环境变量中配置 ADMIN_PASSWORD！                        │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  👤 管理员账号: \x1b[36m${adminName.padEnd(42)}\x1b[0m│`);
      console.log(`│  🔑 临时管理员密码: \x1b[32m\x1b[1m${adminPassword.padEnd(38)}\x1b[0m│`);
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│  💡 提示: 请在 .env 中设置 ADMIN_PASSWORD 以持久化你的密码  │');
      console.log('└─────────────────────────────────────────────────────────────┘\n');
      globalAuthStore.__subMgrPasswordLogged = true;
    }
  }

  return { adminName, adminPassword };
}

export function getJwtSecret(): string {
  return process.env.AUTH_SECRET || 'sub_mgr_super_jwt_secret_token_default_2026';
}

export function verifyCredentials(u: string, p: string): boolean {
  const { adminName, adminPassword } = getAdminCredentials();
  return u === adminName && p === adminPassword;
}

export function signAdminToken(username: string): string {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      username,
      role: 'admin',
    },
    secret,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): { username: string; role: string } | null {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as { username: string; role: string };
    if (payload && payload.role === 'admin') {
      return payload;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getAdminSessionFromCookies(): { username: string; role: string } | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch (e) {
    return null;
  }
}

export function getAdminSessionFromRequest(req: NextRequest): { username: string; role: string } | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function setAdminAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    // 开发环境明确不使用 secure，避免 localhost 下 Cookie 丢失
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
}

export function clearAdminAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
