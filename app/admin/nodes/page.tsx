'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  FileText,
  Trash2,
  Edit2,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { ProxyNode, ProxyType } from '@/lib/types';
import { nodeToRawUrl } from '@/lib/parser';
import { Switch } from '@/components/Switch';
import { useI18n } from '@/components/I18nProvider';

export default function NodesPage() {
  const { t } = useI18n();
  const [nodes, setNodes] = useState<ProxyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 模态框状态
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Partial<ProxyNode> | null>(null);

  // 批量导入状态
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ProxyNode[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // 快速示例填充
  const exampleLink = `socks://amRKSTV5ODNFUHdJOndvek5hMkRCb2dvQQ@198.65.112.64:6935#US-Socks5-Premium
ss://YWVzLTI1Ni1nY206cGFzc3dvcmRAMTk4LjY1LjExMi42NDo4Mzg4#HK-Shadowsocks-01
vmess://eyJhZGQiOiIxOTguNjUuMTEyLjY0IiwicG9ydCI6IjQ0MyIsImlkIjoiZjhhY2ZkNzctOWMyNy00NjFmLWE3Y2YtZDRjMGxiNTU1NmI4IiwiYWlkIjoiMCIsInNjeSI6ImF1dG8iLCJuZXQiOiJ3cyIsInRscyI6InRscyIsInBzIjoiSlAtVk1lc3MtV1MifQ==`;

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      }
    } catch (e) {
      console.error('Failed to fetch nodes:', e);
    } finally {
      setLoading(false);
    }
  };

  // 切换节点启用状态
  const toggleNodeStatus = async (node: ProxyNode) => {
    const newStatus = node.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? { ...n, status: newStatus } : n))
        );
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // 删除节点
  const handleDeleteNode = async (id: string) => {
    if (!confirm(t('nodes.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNodes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete node:', e);
    }
  };

  // 复制节点链接
  const handleCopyLink = (node: ProxyNode) => {
    const raw = nodeToRawUrl(node);
    navigator.clipboard.writeText(raw);
    setCopiedId(node.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 批量导入解析预览
  const handlePreviewImport = async () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError(t('nodes.inputLinkError'));
      return;
    }
    setImportLoading(true);
    try {
      const res = await fetch('/api/nodes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, previewOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解析失败');
      setImportPreview(data.nodes || []);
    } catch (e: any) {
      setImportError(e.message);
      setImportPreview([]);
    } finally {
      setImportLoading(false);
    }
  };

  // 确认批量导入
  const handleConfirmImport = async () => {
    setImportLoading(true);
    setImportError('');
    try {
      const res = await fetch('/api/nodes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, previewOnly: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '导入失败');
      setIsImportModalOpen(false);
      setImportText('');
      setImportPreview([]);
      fetchNodes();
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImportLoading(false);
    }
  };

  // 单节点保存 (新建/编辑)
  const handleSaveSingleNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    try {
      const isEdit = !!editingNode.id;
      const url = isEdit ? `/api/nodes/${editingNode.id}` : '/api/nodes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNode),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingNode(null);
        fetchNodes();
      } else {
        const d = await res.json();
        alert(d.error || '保存节点失败');
      }
    } catch (e: any) {
      alert(e.message || '网络异常');
    }
  };

  // 过滤
  const filteredNodes = nodes.filter((n) => {
    const matchSearch =
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.server.toLowerCase().includes(search.toLowerCase()) ||
      String(n.port).includes(search);
    const matchType = typeFilter === 'all' || n.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-600" />
            {t('nodes.title')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t('nodes.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setImportText('');
              setImportPreview([]);
              setImportError('');
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {t('nodes.batchImportBtn')}
          </button>
          <button
            onClick={() => {
              setEditingNode({
                type: 'socks5',
                name: '',
                server: '',
                port: 1080,
                status: 'active',
              });
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            {t('nodes.addNodeBtn')}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('nodes.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sliders className="w-4 h-4" />
            <span>{t('nodes.protocol')}:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('nodes.allProtocols')}</option>
            <option value="socks5">SOCKS5 / SOCKS</option>
            <option value="ss">Shadowsocks</option>
            <option value="vmess">VMess</option>
            <option value="vless">VLESS</option>
            <option value="trojan">Trojan</option>
            <option value="http">HTTP</option>
          </select>

          <button
            onClick={fetchNodes}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Nodes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            {t('common.loading')}
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Server className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            {t('nodes.noNodesFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">{t('nodes.colName')}</th>
                  <th className="px-6 py-3.5">{t('nodes.colProtocol')}</th>
                  <th className="px-6 py-3.5">{t('nodes.colServer')}</th>
                  <th className="px-6 py-3.5">{t('nodes.colAuth')}</th>
                  <th className="px-6 py-3.5">{t('nodes.colStatus')}</th>
                  <th className="px-6 py-3.5 text-right">{t('nodes.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{node.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {node.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-700 uppercase border border-blue-100">
                        {node.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                      {node.server}:{node.port}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {node.username && (
                        <div>
                          {t('nodes.fieldUsername')}: <span className="font-mono text-slate-700">{node.username}</span>
                        </div>
                      )}
                      {node.cipher && (
                        <div>
                          {t('nodes.fieldCipher')}: <span className="font-mono text-slate-700">{node.cipher}</span>
                        </div>
                      )}
                      {node.uuid && (
                        <div className="truncate max-w-[150px]">
                          UUID: <span className="font-mono text-slate-700">{node.uuid}</span>
                        </div>
                      )}
                      {node.tls && (
                        <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold mt-1">
                          TLS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={node.status === 'active'}
                          onChange={() => toggleNodeStatus(node)}
                          size="sm"
                        />
                        <span
                          className={`text-xs font-medium ${
                            node.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {node.status === 'active' ? t('common.enabled') : t('common.disabled')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCopyLink(node)}
                          title={t('nodes.copyRawLink')}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedId === node.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNode(node);
                            setIsEditModalOpen(true);
                          }}
                          title={t('nodes.editConfig')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNode(node.id)}
                          title={t('nodes.deleteNode')}
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

      {/* Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {t('nodes.importModalTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('nodes.importModalSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t('nodes.pasteLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setImportText(exampleLink)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('nodes.fillExample')}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`socks://amRKSTV5ODNFUHdJOndvek5hMkRCb2dvQQ@198.65.112.64:6935#Socks5-Example\nss://...\nvmess://...`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* 预览区域 */}
              {importPreview.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>{t('nodes.previewTitle')} ({importPreview.length})</span>
                    <span className="text-emerald-600 text-[11px] font-normal">{t('nodes.previewPassed')}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {importPreview.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[280px]">
                          <div className="font-medium text-slate-900 truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {p.server}:{p.port}
                          </div>
                        </div>
                        <span className="font-mono uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 text-sm font-medium rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handlePreviewImport}
                disabled={importLoading}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-xl transition-colors"
              >
                {importLoading ? t('nodes.parsing') : t('nodes.previewBtn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importLoading || !importText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {importLoading ? t('nodes.importing') : t('nodes.confirmImportBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Single Node Modal */}
      {isEditModalOpen && editingNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingNode.id ? t('nodes.editModalTitleEdit') : t('nodes.editModalTitleAdd')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleNode} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.colProtocol')} *
                  </label>
                  <select
                    value={editingNode.type}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, type: e.target.value as ProxyType })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="socks5">SOCKS5</option>
                    <option value="ss">Shadowsocks</option>
                    <option value="vmess">VMess</option>
                    <option value="vless">VLESS</option>
                    <option value="trojan">Trojan</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.fieldName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNode.name || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                    placeholder="如: US-Node-01"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.fieldServer')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNode.server || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, server: e.target.value })}
                    placeholder="198.65.112.64"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.fieldPort')} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingNode.port || 1080}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, port: parseInt(e.target.value, 10) })
                    }
                    placeholder="6935"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {(editingNode.type === 'socks5' || editingNode.type === 'http') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('nodes.fieldUsername')}
                    </label>
                    <input
                      type="text"
                      value={editingNode.username || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, username: e.target.value })}
                      placeholder={t('common.optional')}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('nodes.fieldPassword')}
                    </label>
                    <input
                      type="text"
                      value={editingNode.password || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, password: e.target.value })}
                      placeholder={t('common.optional')}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {editingNode.type === 'ss' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('nodes.fieldCipher')}
                    </label>
                    <input
                      type="text"
                      value={editingNode.cipher || 'aes-256-gcm'}
                      onChange={(e) => setEditingNode({ ...editingNode, cipher: e.target.value })}
                      placeholder="aes-256-gcm"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('nodes.fieldPassword')}
                    </label>
                    <input
                      type="text"
                      value={editingNode.password || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, password: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {(editingNode.type === 'vmess' || editingNode.type === 'vless') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.fieldUuid')} *
                  </label>
                  <input
                    type="text"
                    value={editingNode.uuid || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, uuid: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {editingNode.type === 'trojan' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nodes.fieldPassword')} *
                  </label>
                  <input
                    type="text"
                    value={editingNode.password || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingNode.tls || false}
                    onChange={(e) => setEditingNode({ ...editingNode, tls: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs text-slate-700 font-medium">{t('nodes.enableTls')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingNode.status === 'active'}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        status: e.target.checked ? 'active' : 'disabled',
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs text-slate-700 font-medium">{t('nodes.enableNode')}</span>
                </label>
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
                  {t('nodes.saveConfig')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
