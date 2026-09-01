'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Database,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { SystemStats } from '@/lib/types';
import { useI18n } from '@/components/I18nProvider';

export default function SettingsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 测试表单状态
  const [testEmail, setTestEmail] = useState('');
  const [testTgChatId, setTestTgChatId] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [testResult, setTestResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', target: testEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ msg: 'Success: Email sent to ' + testEmail, type: 'success' });
      } else {
        setTestResult({ msg: data.error || 'Failed to send test email', type: 'error' });
      }
    } catch (e: any) {
      setTestResult({ msg: e.message || 'Network Error', type: 'error' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestTg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTgChatId) return;
    setTestingTg(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'telegram', target: testTgChatId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ msg: 'Success: Telegram message sent to ' + testTgChatId, type: 'success' });
      } else {
        setTestResult({ msg: data.error || 'Failed to send Telegram message', type: 'error' });
      }
    } catch (e: any) {
      setTestResult({ msg: e.message || 'Network Error', type: 'error' });
    } finally {
      setTestingTg(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            testResult.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {testResult.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{testResult.msg}</span>
        </div>
      )}

      {/* Grid: Env Status & Testers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Environment Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              {t('settings.envCheck')}
            </h2>

            <div className="divide-y divide-slate-100 text-sm">
              {/* Admin Auth */}
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    {t('settings.adminAuth')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t('settings.adminAuthDesc')}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.enabled')}
                </span>
              </div>

              {/* Sub Token */}
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    {t('settings.subToken')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t('settings.subTokenDesc')}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.ready')}
                </span>
              </div>

              {/* Upstash Redis */}
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    {t('settings.redisDb')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
                  </div>
                </div>
                {stats?.redisConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.redisNormal')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" /> {t('settings.redisDegraded')}
                  </span>
                )}
              </div>

              {/* Resend */}
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {t('settings.resendService')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t('settings.resendDesc')}
                  </div>
                </div>
                {stats?.resendConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.ready')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {t('settings.notConfigured')}
                  </span>
                )}
              </div>

              {/* Telegram */}
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Send className="w-4 h-4 text-slate-400" />
                    {t('settings.telegramService')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t('settings.telegramDesc')}
                  </div>
                </div>
                {stats?.telegramConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.ready')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {t('settings.notConfigured')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              {t('settings.guideTitle')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {t('settings.guideDesc')}
            </p>
            <pre className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-white/10 space-y-1">
              <div>ADMIN_NAME=admin</div>
              <div>ADMIN_PASSWORD=your_secure_password</div>
              <div>SUB_TOKEN=your_custom_secret_salt</div>
              <div>UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io</div>
              <div>UPSTASH_REDIS_REST_TOKEN=Axxx...</div>
              <div>RESEND_API_KEY=re_xxx...</div>
              <div>TELEGRAM_BOT_TOKEN=123456:ABC-xxx...</div>
            </pre>
          </div>
        </div>

        {/* Right 1 Col: Test Notification Tools */}
        <div className="space-y-6">
          {/* Email Tester */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              {t('settings.emailTester')}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {t('settings.emailTesterDesc')}
            </p>

            <form onSubmit={handleTestEmail} className="space-y-3">
              <input
                type="email"
                required
                placeholder={t('settings.testEmailPlaceholder')}
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={testingEmail || !testEmail}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {testingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {t('settings.sendingEmail')}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {t('settings.sendTestEmail')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Telegram Tester */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              {t('settings.tgTester')}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {t('settings.tgTesterDesc')}
            </p>

            <form onSubmit={handleTestTg} className="space-y-3">
              <input
                type="text"
                required
                placeholder={t('settings.testTgPlaceholder')}
                value={testTgChatId}
                onChange={(e) => setTestTgChatId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={testingTg || !testTgChatId}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {testingTg ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {t('settings.sendingTg')}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {t('settings.sendTestTg')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
