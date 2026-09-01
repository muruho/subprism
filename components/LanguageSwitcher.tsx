'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from './I18nProvider';
import { Globe, ChevronDown, Check } from 'lucide-react';

export function LanguageSwitcher({
  variant = 'default',
  direction = 'down',
  align = 'right',
}: {
  variant?: 'default' | 'minimal';
  direction?: 'up' | 'down';
  align?: 'left' | 'right';
}) {
  const { locale, setLocale, availableLocales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMeta = availableLocales.find((l) => l.code === locale) || {
    code: locale,
    name: locale,
    flag: '🌐',
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-xl transition-all cursor-pointer ${
          variant === 'minimal'
            ? 'px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80'
            : 'px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm'
        }`}
      >
        <Globe className="w-3.5 h-3.5 opacity-70" />
        <span className="text-xs">{currentMeta.flag} {currentMeta.name}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            direction === 'up'
              ? 'bottom-full mb-2 origin-bottom'
              : 'top-full mt-2 origin-top'
          } w-44 rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/10 border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto`}
        >
          <div className="space-y-0.5">
            {availableLocales.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLocale(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                  locale === item.code
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{item.flag || '🌐'}</span>
                  <span>{item.name}</span>
                </div>
                {locale === item.code && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
