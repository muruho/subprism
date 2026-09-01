'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LocaleMeta, LocalePackage } from '@/lib/i18n';

// 内置基础兜底数据
import defaultZh from '@/locales/zh-CN.json';
import defaultEn from '@/locales/en-US.json';
import defaultJa from '@/locales/ja-JP.json';

interface I18nContextType {
  locale: string;
  setLocale: (code: string) => void;
  availableLocales: LocaleMeta[];
  t: (path: string, params?: Record<string, any>) => string;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'subprism_locale';

// 读取本地存储或 Cookie 中的初始语言，保证刷新页面即刻生效无跳动
function getInitialLocale(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;

      const match = document.cookie.match(/subprism_locale=([^;]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }

      if (navigator.language && navigator.language.startsWith('en')) {
        return 'en-US';
      }
    } catch (e) {
      // ignore
    }
  }
  return 'zh-CN';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // 使用初始化函数，首次渲染直接命中用户持久化语言
  const [locale, setLocaleState] = useState<string>(getInitialLocale);

  const [availableLocales, setAvailableLocales] = useState<LocaleMeta[]>([
    defaultZh._meta,
    defaultEn._meta,
    defaultJa._meta,
  ]);

  const [allTranslations, setAllTranslations] = useState<Record<string, LocalePackage>>({
    'zh-CN': defaultZh as LocalePackage,
    'en-US': defaultEn as LocalePackage,
    'ja-JP': defaultJa as LocalePackage,
  });

  const [loading, setLoading] = useState<boolean>(false);

  // 初始化：动态拉取 locales/ 下的所有可用语种（支持任意直接放入的 json）
  useEffect(() => {
    // 再次确认本地持久化语言
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== locale) {
      setLocaleState(saved);
    }

    fetch('/api/locales')
      .then((res) => res.json())
      .then((data) => {
        if (data.locales && Array.isArray(data.locales)) {
          setAvailableLocales(data.locales);
        }
        if (data.data) {
          setAllTranslations((prev) => ({ ...prev, ...data.data }));
        }
      })
      .catch((e) => console.error('Failed to fetch locales:', e));
  }, []);

  // 切换语言：双重持久化到 localStorage 和 Cookie (有效期 1 年)
  const setLocale = (code: string) => {
    setLocaleState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
      document.cookie = `subprism_locale=${encodeURIComponent(
        code
      )}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.error('Failed to persist locale:', e);
    }
  };

  /**
   * 翻译函数，支持点号层级查找和变量替换
   * 例: t('dashboard.title') 或 t('subs.selectedCount', { count: 5 })
   */
  const t = (path: string, params?: Record<string, any>): string => {
    const currentDict =
      allTranslations[locale] ||
      allTranslations['zh-CN'] ||
      allTranslations['en-US'];
    const fallbackDict = allTranslations['zh-CN'] || allTranslations['en-US'];

    const getValue = (obj: any, keyPath: string) => {
      if (!obj) return null;
      const parts = keyPath.split('.');
      let cur = obj;
      for (const p of parts) {
        if (cur === undefined || cur === null) return null;
        cur = cur[p];
      }
      return typeof cur === 'string' ? cur : null;
    };

    let result = getValue(currentDict, path) || getValue(fallbackDict, path) || path;

    if (params && typeof result === 'string') {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    return result;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        availableLocales,
        t,
        loading,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
