import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { NotificationResult, Subscription } from './types';

const TEMPLATE_DIR = path.join(process.cwd(), 'template');
const DEFAULT_LANGUAGE = 'zh-CN';

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    return new Resend(apiKey);
  } catch (e) {
    console.error('Failed to init Resend client:', e);
    return null;
  }
}

export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * 从 template/ 目录读取指定类型的模板文件 (mail_*.html / telegram_*.md)
 * 找不到对应语种时依次回退到默认语种与目录中的任意可用模板
 */
function readTemplate(kind: 'mail' | 'telegram', language?: string): string | null {
  const ext = kind === 'mail' ? 'html' : 'md';
  const candidates = [language, DEFAULT_LANGUAGE, 'en-US', 'ja-JP'].filter(
    (v, i, arr): v is string => !!v && arr.indexOf(v) === i
  );

  for (const lang of candidates) {
    const file = path.join(TEMPLATE_DIR, `${kind}_${lang}.${ext}`);
    try {
      if (fs.existsSync(file)) {
        return fs.readFileSync(file, 'utf-8');
      }
    } catch (e) {
      console.error(`Failed to read template ${file}:`, e);
    }
  }

  // 最终兜底：扫描目录中任意匹配前缀的模板
  try {
    if (fs.existsSync(TEMPLATE_DIR)) {
      const match = fs
        .readdirSync(TEMPLATE_DIR)
        .find((f) => f.startsWith(`${kind}_`) && f.endsWith(`.${ext}`));
      if (match) {
        return fs.readFileSync(path.join(TEMPLATE_DIR, match), 'utf-8');
      }
    }
  } catch (e) {
    console.error('Failed to scan template directory:', e);
  }

  return null;
}

/**
 * 将 {{key}} 占位符替换为变量值
 */
function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * 发送 Resend 邮件通知（模板来自 template/mail_<lang>.html）
 */
export async function sendEmailNotification({
  to,
  username,
  subUrl,
  clashUrl,
  v2rayUrl,
  nodeCount,
  language,
}: {
  to: string;
  username: string;
  subUrl: string;
  clashUrl: string;
  v2rayUrl: string;
  nodeCount: number;
  language?: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'RESEND_API_KEY 未配置' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SubPrism <onboarding@resend.dev>';

  const template = readTemplate('mail', language);
  if (!template) {
    return { success: false, error: `未找到邮件模板 (template/mail_${language || DEFAULT_LANGUAGE}.html)` };
  }

  const htmlContent = renderTemplate(template, {
    username,
    nodeCount,
    subUrl,
    clashUrl,
    v2rayUrl,
  });

  const subject =
    extractTitle(htmlContent) || `[SubPrism] Subscription (${username})`;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html: htmlContent,
    });

    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || '发送邮件异常' };
  }
}

/**
 * 发送 Telegram 机器人通知（模板来自 template/telegram_<lang>.md）
 */
export async function sendTelegramNotification({
  chatId,
  username,
  subUrl,
  clashUrl,
  v2rayUrl,
  nodeCount,
  language,
}: {
  chatId: string;
  username: string;
  subUrl: string;
  clashUrl: string;
  v2rayUrl: string;
  nodeCount: number;
  language?: string;
}): Promise<{ success: boolean; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN 未配置' };
  }

  const template = readTemplate('telegram', language);
  if (!template) {
    return {
      success: false,
      error: `未找到 Telegram 模板 (template/telegram_${language || DEFAULT_LANGUAGE}.md)`,
    };
  }

  const text = renderTemplate(template, {
    username,
    nodeCount,
    subUrl,
    clashUrl,
    v2rayUrl,
  }).trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API 错误' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || '发送 Telegram 消息异常' };
  }
}

/**
 * 针对某个订阅分发通知 (Email + Telegram)，按订阅语言读取对应模板
 */
export async function dispatchSubscriptionNotification(
  sub: Subscription,
  nodeCount: number,
  baseUrl: string
): Promise<NotificationResult> {
  const result: NotificationResult = {};
  const language = sub.language || DEFAULT_LANGUAGE;

  const subUrl = `${baseUrl}/sub/${sub.token}`;
  const clashUrl = `${baseUrl}/sub/${sub.token}?format=clash`;
  const v2rayUrl = `${baseUrl}/sub/${sub.token}?format=v2ray`;

  // 1. Email
  if (sub.email) {
    const emailRes = await sendEmailNotification({
      to: sub.email,
      username: sub.username,
      subUrl,
      clashUrl,
      v2rayUrl,
      nodeCount,
      language,
    });
    result.emailSent = emailRes.success;
    if (!emailRes.success) {
      result.emailError = emailRes.error;
    }
  }

  // 2. Telegram
  if (sub.telegramChatId) {
    const tgRes = await sendTelegramNotification({
      chatId: sub.telegramChatId,
      username: sub.username,
      subUrl,
      clashUrl,
      v2rayUrl,
      nodeCount,
      language,
    });
    result.telegramSent = tgRes.success;
    if (!tgRes.success) {
      result.telegramError = tgRes.error;
    }
  }

  return result;
}
