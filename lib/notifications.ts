import { Resend } from 'resend';
import { NotificationResult, Subscription } from './types';

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
 * 发送 Resend 邮件通知
 */
export async function sendEmailNotification({
  to,
  username,
  subUrl,
  clashUrl,
  v2rayUrl,
  nodeCount,
}: {
  to: string;
  username: string;
  subUrl: string;
  clashUrl: string;
  v2rayUrl: string;
  nodeCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'RESEND_API_KEY 未配置' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SubPrism <onboarding@resend.dev>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
        .card { background-color: #ffffff; border-radius: 12px; max-width: 600px; margin: 20px auto; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; }
        .title { color: #111827; font-size: 24px; font-weight: 700; margin: 0; }
        .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-top: 8px; }
        .content { margin-top: 24px; line-height: 1.6; }
        .link-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 16px; word-break: break-all; }
        .link-title { font-weight: 600; font-size: 14px; color: #374151; margin-bottom: 4px; display: flex; align-items: center; }
        .link-url { font-family: monospace; font-size: 13px; color: #2563eb; text-decoration: none; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }
        .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">🚀 专属订阅链接已更新</h1>
          <div class="badge">用户: ${username} | 可用节点: ${nodeCount} 个</div>
        </div>
        <div class="content">
          <p>您好 <strong>${username}</strong>，您的专属代理订阅链接已准备完毕，请根据您使用的客户端选择下方对应的订阅格式：</p>
          
          <div class="link-box">
            <div class="link-title">🔗 通用订阅 (Universal / V2RayN / Shadowrocket)</div>
            <a class="link-url" href="${subUrl}">${subUrl}</a>
          </div>

          <div class="link-box">
            <div class="link-title">⚡ Clash / Meta 订阅</div>
            <a class="link-url" href="${clashUrl}">${clashUrl}</a>
            <div style="margin-top: 8px;">
              <a class="btn" href="clash://install-config?url=${encodeURIComponent(clashUrl)}">一键导入 Clash</a>
            </div>
          </div>

          <div class="link-box">
            <div class="link-title">🛡️ V2Ray 格式订阅</div>
            <a class="link-url" href="${v2rayUrl}">${v2rayUrl}</a>
          </div>

          <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
            提示：请妥善保管您的专属订阅链接，不要向公众传播以保证节点质量与安全。
          </p>
        </div>
        <div class="footer">
          由 SubPrism 订阅系统自动发送 · 感谢您的使用
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `[SubPrism] 您的专属代理订阅配置 (${username})`,
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
 * 发送 Telegram 机器人通知
 */
export async function sendTelegramNotification({
  chatId,
  username,
  subUrl,
  clashUrl,
  v2rayUrl,
  nodeCount,
}: {
  chatId: string;
  username: string;
  subUrl: string;
  clashUrl: string;
  v2rayUrl: string;
  nodeCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN 未配置' };
  }

  const text = `🎉 *专属订阅链接通知*

👤 *用户*: \`${username}\`
🌐 *节点数*: ${nodeCount} 个

🔗 *通用订阅链接*:
\`${subUrl}\`

⚡ *Clash 专用订阅*:
\`${clashUrl}\`

🛡️ *V2Ray 专用订阅*:
\`${v2rayUrl}\`

👉 _请复制上方订阅链接到对应客户端中更新配置。_`;

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
 * 针对某个订阅分发通知 (Email + Telegram)
 */
export async function dispatchSubscriptionNotification(
  sub: Subscription,
  nodeCount: number,
  baseUrl: string
): Promise<NotificationResult> {
  const result: NotificationResult = {};

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
    });
    result.telegramSent = tgRes.success;
    if (!tgRes.success) {
      result.telegramError = tgRes.error;
    }
  }

  return result;
}
