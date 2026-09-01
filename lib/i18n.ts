import fs from 'fs';
import path from 'path';

export interface LocaleMeta {
  code: string;
  name: string;
  flag?: string;
}

export interface LocalePackage {
  _meta: LocaleMeta;
  [key: string]: any;
}

const LOCALES_DIR = path.join(process.cwd(), 'locales');

/**
 * 自动扫描 locales 目录下的所有 JSON 文件并提取语言元信息
 * 无需手动 import，放入新 json 文件即可自动生效！
 */
export function getAvailableLocales(): LocaleMeta[] {
  try {
    if (!fs.existsSync(LOCALES_DIR)) {
      return [{ code: 'zh-CN', name: '简体中文', flag: '🇨🇳' }];
    }

    const files = fs.readdirSync(LOCALES_DIR);
    const locales: LocaleMeta[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LOCALES_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed: LocalePackage = JSON.parse(content);
          if (parsed._meta) {
            locales.push(parsed._meta);
          } else {
            const code = file.replace('.json', '');
            locales.push({ code, name: code, flag: '🌐' });
          }
        } catch (e) {
          console.error(`Failed to parse locale file: ${file}`, e);
        }
      }
    }

    return locales;
  } catch (e) {
    console.error('Error scanning locales directory:', e);
    return [{ code: 'zh-CN', name: '简体中文', flag: '🇨🇳' }];
  }
}

/**
 * 读取所有语言包数据
 */
export function getAllLocalesData(): Record<string, LocalePackage> {
  const data: Record<string, LocalePackage> = {};

  try {
    if (!fs.existsSync(LOCALES_DIR)) {
      return data;
    }

    const files = fs.readdirSync(LOCALES_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LOCALES_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed: LocalePackage = JSON.parse(content);
          const code = parsed._meta?.code || file.replace('.json', '');
          data[code] = parsed;
        } catch (e) {
          console.error(`Failed to load locale file: ${file}`, e);
        }
      }
    }
  } catch (e) {
    console.error('Error loading locales data:', e);
  }

  return data;
}

/**
 * 获取指定语言的翻译字典
 */
export function getLocaleTranslations(code: string): LocalePackage | null {
  const all = getAllLocalesData();
  return all[code] || all['zh-CN'] || all['en-US'] || null;
}
