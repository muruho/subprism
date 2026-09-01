'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Search,
  RefreshCw,
  Send,
  Mail,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  Sliders,
  QrCode,
} from 'lucide-react';
import { Subscription, ProxyNode } from '@/lib/types';
import { Switch } from '@/components/Switch';
import { getQRCodeUrl } from '@/lib/qrcode';
import { useI18n } from '@/components/I18nProvider';

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [nodes, setNodes] = useState<ProxyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 编辑/新建模态框
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Partial<Subscription> | null>(null);

  // 专属订阅链接与二维码模态框
  const [activeSubForLinks, setActiveSubForLinks] = useState<Subscription | null>(null);
  const [qrFormat, setQrFormat] = useState<'universal' | 'clash' | 'v2ray' | 'ss'>('universal');

  // 通知发送状态
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifyToast, setNotifyToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, nodesRes] = await Promise.all([
        fetch('/api/subs'),
        fetch('/api/nodes'),
      ]);

      if (subsRes.ok) {
        const d = await subsRes.json();
        setSubs(d.subs || []);
      }
      if (nodesRes.ok) {
        const d = await nodesRes.json();
        setNodes(d.nodes || []);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editingSub.username?.trim()) {
      alert(t('subs.fieldUsername') + ' ' + t('common.required'));
      return;
    }

    try {
      const isEdit = !!editingSub.id;
      const url = isEdit ? `/api/subs/${editingSub.id}` : '/api/subs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSub),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingSub(null);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || '保存订阅失败');
      }
    } catch (e: any) {
      alert(e.message || '网络异常');
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm(t('subs.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/subs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubs((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete sub:', e);
    }
  };

  const toggleSubStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/subs/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSubs((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
        );
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerNotify = async (sub: Subscription) => {
    setNotifyingId(sub.id);
    setNotifyToast(null);

    try {
      const res = await fetch(`/api/subs/${sub.id}/notify`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        const parts = [];
        if (data.result.emailSent) parts.push('Email Sent');
        if (data.result.telegramSent) parts.push('Telegram Pushed');
        if (data.result.emailError) parts.push(`Email: ${data.result.emailError}`);
        if (data.result.telegramError) parts.push(`TG: ${data.result.telegramError}`);

        setNotifyToast({
          msg: parts.join(' | ') || 'Notification triggered',
          type: 'success',
        });
      } else {
        setNotifyToast({
          msg: data.error || 'Failed to send notification',
          type: 'error',
        });
      }
    } catch (e: any) {
      setNotifyToast({ msg: e.message || 'Network Error', type: 'error' });
    } finally {
      setNotifyingId(null);
      setTimeout(() => setNotifyToast(null), 4000);
    }
  };

  const filteredSubs = subs.filter((s) => {
    return (
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.remark && s.remark.toLowerCase().includes(search.toLowerCase())) ||
      s.token.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getSubUrl = (token: string, format?: string) => {
    if (!baseUrl) return '';
    return format ? `${baseUrl}/sub/${token}?format=${format}` : `${baseUrl}/sub/${token}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notifyToast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium border ${
            notifyToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notifyToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{notifyToast.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-blue-600" />
            {t('subs.title')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t('subs.subtitle')}</p>
        </div>

        <button
          onClick={() => {
            setEditingSub({
              username: '',
              email: '',
              telegramChatId: '',
              enableNotification: true,
              remark: '',
              nodeScope: 'all',
              nodeIds: [],
              status: 'active',
            });
            setIsEditModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('subs.createSubBtn')}
        </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('subs.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {t('subs.totalCount', { count: subs.length })}
          </span>
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            {t('common.loading')}
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Link2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            {t('subs.noSubsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">{t('subs.colUser')}</th>
                  <th className="px-6 py-3.5">{t('subs.colToken')}</th>
                  <th className="px-6 py-3.5">{t('subs.colScope')}</th>
                  <th className="px-6 py-3.5">{t('subs.colChannel')}</th>
                  <th className="px-6 py-3.5">{t('subs.colFetches')}</th>
                  <th className="px-6 py-3.5">{t('subs.colStatus')}</th>
                  <th className="px-6 py-3.5 text-right">{t('subs.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{sub.username}</div>
                      {sub.remark ? (
                        <div className="text-xs text-slate-400 mt-0.5">{sub.remark}</div>
                      ) : (
                        <div className="text-[11px] text-slate-400">-</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                        <span>{sub.token}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        /sub/{sub.token}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {sub.nodeScope === 'all' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                          <Globe className="w-3 h-3" /> {t('subs.scopeAll')} ({nodes.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">
                          <Sliders className="w-3 h-3" /> {t('subs.scopeCustom')} ({sub.nodeIds?.length || 0})
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="space-y-1">
                        {sub.email && (
                          <div className="flex items-center gap-1.5 truncate max-w-[160px]" title={sub.email}>
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{sub.email}</span>
                          </div>
                        )}
                        {sub.telegramChatId && (
                          <div className="flex items-center gap-1.5 truncate max-w-[160px]" title={sub.telegramChatId}>
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-mono">TG: {sub.telegramChatId}</span>
                          </div>
                        )}
                        {!sub.email && !sub.telegramChatId && (
                          <span className="text-slate-400 text-[11px]">{t('settings.notConfigured')}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-900">
                        {sub.fetchCount || 0} {t('dashboard.fetchUnit')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {sub.lastFetchedAt
                          ? new Date(sub.lastFetchedAt).toLocaleString()
                          : t('subs.notFetched')}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sub.status === 'active'}
                          onChange={() => toggleSubStatus(sub)}
                          size="sm"
                        />
                        <span
                          className={`text-xs font-medium ${
                            sub.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {sub.status === 'active' ? t('common.enabled') : t('common.disabled')}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* 专属订阅与二维码弹窗按钮 */}
                        <button
                          onClick={() => {
                            setActiveSubForLinks(sub);
                            setQrFormat('universal');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('subs.subLinksBtn')}</span>
                        </button>

                        {/* 发送通知按钮 */}
                        <button
                          onClick={() => handleTriggerNotify(sub)}
                          disabled={notifyingId === sub.id || (!sub.email && !sub.telegramChatId)}
                          title={t('subs.sendNotify')}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Send
                            className={`w-4 h-4 ${notifyingId === sub.id ? 'animate-pulse text-blue-600' : ''}`}
                          />
                        </button>

                        {/* 编辑 */}
                        <button
                          onClick={() => {
                            setEditingSub(sub);
                            setIsEditModalOpen(true);
                          }}
                          title={t('common.edit')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* 删除 */}
                        <button
                          onClick={() => handleDeleteSub(sub.id)}
                          title={t('common.delete')}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Links & QR Code Modal */}
      {activeSubForLinks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  {t('subs.modalTitle')} ({activeSubForLinks.username})
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Token: {activeSubForLinks.token}
                </p>
              </div>
              <button
                onClick={() => setActiveSubForLinks(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* QR Code Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                  <img
                    src={getQRCodeUrl(
                      qrFormat === 'universal'
                        ? getSubUrl(activeSubForLinks.token)
                        : getSubUrl(activeSubForLinks.token, qrFormat),
                      200
                    )}
                    alt="Subscription QR Code"
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {t('subs.qrTitle')}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('subs.qrSubtitle')}
                    </p>
                  </div>

                  {/* QR Format Selector */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'universal', label: t('subs.formatUniversal') },
                      { key: 'clash', label: t('subs.formatClash') },
                      { key: 'v2ray', label: t('subs.formatV2ray') },
                      { key: 'ss', label: t('subs.formatSs') },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setQrFormat(f.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          qrFormat === f.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono break-all">
                    {qrFormat === 'universal'
                      ? getSubUrl(activeSubForLinks.token)
                      : getSubUrl(activeSubForLinks.token, qrFormat)}
                  </p>
                </div>
              </div>

              {/* Links List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('subs.multiFormats')}
                </h4>

                {/* 1. 通用订阅 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      🔗 {t('subs.formatUniversal')} (Base64)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          getSubUrl(activeSubForLinks.token),
                          `modal-uni-${activeSubForLinks.id}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {copiedKey === `modal-uni-${activeSubForLinks.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {t('subs.copyLink')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                    {getSubUrl(activeSubForLinks.token)}
                  </div>
                </div>

                {/* 2. Clash 配置 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      ⚡ {t('subs.formatClash')} (YAML)
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={`clash://install-config?url=${encodeURIComponent(
                          getSubUrl(activeSubForLinks.token, 'clash')
                        )}`}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t('subs.oneClickClash')}
                      </a>
                      <button
                        onClick={() =>
                          handleCopy(
                            getSubUrl(activeSubForLinks.token, 'clash'),
                            `modal-clash-${activeSubForLinks.id}`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {copiedKey === `modal-clash-${activeSubForLinks.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {t('subs.copyLink')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                    {getSubUrl(activeSubForLinks.token, 'clash')}
                  </div>
                </div>

                {/* 3. V2Ray 格式 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      🛡️ {t('subs.formatV2ray')}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          getSubUrl(activeSubForLinks.token, 'v2ray'),
                          `modal-v2-${activeSubForLinks.id}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {copiedKey === `modal-v2-${activeSubForLinks.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {t('subs.copyLink')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                    {getSubUrl(activeSubForLinks.token, 'v2ray')}
                  </div>
                </div>

                {/* 4. Shadowsocks 格式 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      🔑 {t('subs.formatSs')}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          getSubUrl(activeSubForLinks.token, 'ss'),
                          `modal-ss-${activeSubForLinks.id}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {copiedKey === `modal-ss-${activeSubForLinks.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {t('subs.copyLink')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                    {getSubUrl(activeSubForLinks.token, 'ss')}
                  </div>
                </div>

                {/* 5. JSON 格式 */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      📄 {t('subs.formatJson')}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          getSubUrl(activeSubForLinks.token, 'json'),
                          `modal-json-${activeSubForLinks.id}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {copiedKey === `modal-json-${activeSubForLinks.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {t('subs.copyLink')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                    {getSubUrl(activeSubForLinks.token, 'json')}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setActiveSubForLinks(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Subscription Modal */}
      {isEditModalOpen && editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSub.id ? t('subs.editModalTitle') : t('subs.addModalTitle')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('subs.fieldUsername')} *
                </label>
                <input
                  type="text"
                  required
                  value={editingSub.username || ''}
                  onChange={(e) => setEditingSub({ ...editingSub, username: e.target.value })}
                  placeholder="e.g. alice / user_01"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('subs.tokenTip')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('subs.fieldEmail')}
                  </label>
                  <input
                    type="email"
                    value={editingSub.email || ''}
                    onChange={(e) => setEditingSub({ ...editingSub, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('subs.fieldTg')}
                  </label>
                  <input
                    type="text"
                    value={editingSub.telegramChatId || ''}
                    onChange={(e) =>
                      setEditingSub({ ...editingSub, telegramChatId: e.target.value })
                    }
                    placeholder="e.g. 123456789"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('subs.fieldRemark')}
                </label>
                <input
                  type="text"
                  value={editingSub.remark || ''}
                  onChange={(e) => setEditingSub({ ...editingSub, remark: e.target.value })}
                  placeholder="e.g. VIP / 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('subs.nodeScope')}
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      editingSub.nodeScope === 'all'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nodeScope"
                        checked={editingSub.nodeScope === 'all'}
                        onChange={() => setEditingSub({ ...editingSub, nodeScope: 'all' })}
                        className="text-blue-600"
                      />
                      <span className="text-xs">{t('subs.allNodesOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{nodes.length}</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      editingSub.nodeScope === 'custom'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nodeScope"
                        checked={editingSub.nodeScope === 'custom'}
                        onChange={() => setEditingSub({ ...editingSub, nodeScope: 'custom' })}
                        className="text-blue-600"
                      />
                      <span className="text-xs">{t('subs.customNodesOption')}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {t('subs.selectedCount', { count: editingSub.nodeIds?.length || 0 })}
                    </span>
                  </label>
                </div>

                {/* 勾选节点列表 */}
                {editingSub.nodeScope === 'custom' && (
                  <div className="border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1.5 bg-slate-50">
                    {nodes.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">{t('subs.noNodesToSelect')}</p>
                    ) : (
                      nodes.map((node) => {
                        const isChecked = editingSub.nodeIds?.includes(node.id);
                        return (
                          <label
                            key={node.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2 truncate max-w-[300px]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = new Set(editingSub.nodeIds || []);
                                  if (e.target.checked) current.add(node.id);
                                  else current.delete(node.id);
                                  setEditingSub({
                                    ...editingSub,
                                    nodeIds: Array.from(current),
                                  });
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="font-medium text-slate-800 truncate">
                                {node.name}
                              </span>
                            </div>
                            <span className="font-mono uppercase text-[10px] text-slate-400 font-bold">
                              {node.type}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSub.enableNotification ?? true}
                    onChange={(checked) =>
                      setEditingSub({ ...editingSub, enableNotification: checked })
                    }
                    size="sm"
                  />
                  <span className="text-xs text-slate-700 font-medium">{t('subs.enableAutoNotify')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSub.status === 'active'}
                    onChange={(checked) =>
                      setEditingSub({
                        ...editingSub,
                        status: checked ? 'active' : 'disabled',
                      })
                    }
                    size="sm"
                  />
                  <span className="text-xs text-slate-700 font-medium">{t('subs.enableSub')}</span>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 -mx-6 -mb-6 flex items-center justify-end gap-3 bg-slate-50/50 rounded-b-2xl mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 text-sm font-medium rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {t('subs.saveSub')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
