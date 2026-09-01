'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Link2,
  Activity,
  Database,
  Mail,
  Send,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ProxyNode, Subscription, SystemStats } from '@/lib/types';
import { useI18n } from '@/components/I18nProvider';

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentNodes, setRecentNodes] = useState<ProxyNode[]>([]);
  const [recentSubs, setRecentSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, nodesRes, subsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/nodes'),
        fetch('/api/subs'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (nodesRes.ok) {
        const d = await nodesRes.json();
        setRecentNodes((d.nodes || []).slice(0, 5));
      }
      if (subsRes.ok) {
        const d = await subsRes.json();
        setRecentSubs((d.subs || []).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/nodes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Server className="w-4 h-4 text-slate-500" />
            {t('dashboard.importNodesBtn')}
          </Link>
          <Link
            href="/admin/subs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.createSubBtn')}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Nodes Stat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.totalNodes')}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {stats?.totalNodes ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {stats?.activeNodes ?? 0} {t('dashboard.activeNodesCount')}
            </span>
          </div>
        </div>

        {/* Subs Stat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.totalSubs')}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Link2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {stats?.totalSubs ?? 0}
            </span>
            <span className="text-xs text-indigo-600 font-medium">
              {stats?.activeSubs ?? 0} {t('dashboard.activeSubsCount')}
            </span>
          </div>
        </div>

        {/* Fetches Stat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.totalFetches')}
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {stats?.totalFetches ?? 0}
            </span>
            <span className="text-xs text-slate-400">{t('dashboard.fetchUnit')}</span>
          </div>
        </div>

        {/* Integrations Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('dashboard.integrationStatus')}
            </span>
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                {t('dashboard.redis')}:
              </span>
              {stats?.redisConnected ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('dashboard.redisConnected')}
                </span>
              ) : (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  {t('dashboard.redisMemory')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {t('dashboard.resend')}:
              </span>
              {stats?.resendConfigured ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('dashboard.configured')}
                </span>
              ) : (
                <span className="text-slate-400">{t('dashboard.unconfigured')}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-slate-400" />
                {t('dashboard.telegram')}:
              </span>
              {stats?.telegramConfigured ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('dashboard.configured')}
                </span>
              ) : (
                <span className="text-slate-400">{t('dashboard.unconfigured')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Subs & Recent Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              {t('dashboard.recentSubs')}
            </h2>
            <Link
              href="/admin/subs"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {t('dashboard.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSubs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {t('dashboard.noSubs')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSubs.map((sub) => (
                <div key={sub.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">
                        {sub.username}
                      </span>
                      {sub.remark && (
                        <span className="text-xs text-slate-400">({sub.remark})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Token: {sub.token}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sub.status === 'active' ? t('common.enabled') : t('common.disabled')}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {sub.fetchCount || 0} {t('dashboard.fetchUnit')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Nodes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              {t('dashboard.recentNodes')}
            </h2>
            <Link
              href="/admin/nodes"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {t('dashboard.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentNodes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {t('dashboard.noNodes')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentNodes.map((node) => (
                <div key={node.id} className="py-3 flex items-center justify-between">
                  <div className="truncate max-w-[240px]">
                    <div className="font-medium text-slate-900 text-sm truncate">
                      {node.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                      {node.server}:{node.port}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center uppercase px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                      {node.type}
                    </span>
                    <div className="text-[11px] text-emerald-600 font-medium mt-1">
                      {node.status === 'active' ? t('common.active') : t('common.disabled')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
