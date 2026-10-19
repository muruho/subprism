import zhCN from '@/locales/zh-CN.json';
import enUS from '@/locales/en-US.json';
import jaJP from '@/locales/ja-JP.json';

export interface LocaleMeta {
  code: string;
  name: string;
  flag?: string;
}

export interface LocalePackage {
  _meta: LocaleMeta;
  [key: string]: any;
}

/**
 * 语言包在构建时静态引入，运行时无需依赖 fs，
 * 以兼容不支持文件系统的边缘函数环境。
 * 新增语言时在此处补充 import 与映射。
 */
const LOCALES: Record<string, LocalePackage> = {
  'zh-CN': zhCN as LocalePackage,
  'en-US': enUS as LocalePackage,
  'ja-JP': jaJP as LocalePackage,
};

/**
 * 获取所有语言的元信息
 */
export function getAvailableLocales(): LocaleMeta[] {
  return Object.values(LOCALES)
    .map((pkg) => pkg._meta)
    .filter((meta): meta is LocaleMeta => !!meta);
}

/**
 * 读取所有语言包数据
 */
export function getAllLocalesData(): Record<string, LocalePackage> {
  return LOCALES;
}

/**
 * 获取指定语言的翻译字典
 */
export function getLocaleTranslations(code: string): LocalePackage | null {
  return LOCALES[code] || LOCALES['zh-CN'] || LOCALES['en-US'] || null;
}
