'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Link2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<string>('admin');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthenticated');
      })
      .then((data) => {
        if (data.user?.username) {
          setAdminUser(data.user.username);
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      name: t('nav.dashboard'),
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      name: t('nav.nodes'),
      href: '/admin/nodes',
      icon: Server,
      active: pathname.startsWith('/admin/nodes'),
    },
    {
      name: t('nav.subs'),
      href: '/admin/subs',
      icon: Link2,
      active: pathname.startsWith('/admin/subs'),
    },
    {
      name: t('nav.settings'),
      href: '/admin/settings',
      icon: Settings,
      active: pathname.startsWith('/admin/settings'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-3.5 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">SubPrism</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="minimal" direction="down" align="right" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Spacious Brand Logo Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-indigo-500/20 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-base leading-tight">SubPrism</h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-6 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {t('nav.menuHeader')}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    item.active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Clean Admin User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-white uppercase flex-shrink-0">
                {adminUser.slice(0, 2)}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-white truncate">{adminUser}</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('common.adminOnline')}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title={t('common.logout')}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Desktop Top Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200/80 items-center justify-between px-8 sticky top-0 z-30">
          <div className="text-xs font-medium text-slate-400">
            {navItems.find((n) => n.active)?.name || t('nav.dashboard')}
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="default" direction="down" align="right" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
