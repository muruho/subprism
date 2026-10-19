import mailZhCN from '@/template/mail_zh-CN.html';
import mailEnUS from '@/template/mail_en-US.html';
import mailJaJP from '@/template/mail_ja-JP.html';
import telegramZhCN from '@/template/telegram_zh-CN.md';
import telegramEnUS from '@/template/telegram_en-US.md';
import telegramJaJP from '@/template/telegram_ja-JP.md';

/**
 * 通知模板在构建时以字符串内联进 bundle，运行时无需依赖 fs，
 * 以兼容不支持文件系统的边缘函数环境。
 */
export const TEMPLATES: Record<'mail' | 'telegram', Record<string, string>> = {
  mail: {
    'zh-CN': mailZhCN,
    'en-US': mailEnUS,
    'ja-JP': mailJaJP,
  },
  telegram: {
    'zh-CN': telegramZhCN,
    'en-US': telegramEnUS,
    'ja-JP': telegramJaJP,
  },
};
