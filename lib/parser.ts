import crypto from 'crypto';
import { ProxyNode, ProxyType } from './types';

/**
 * 辅助函数：安全 Base64 解码 (支持 URL-safe Base64 和标准 Base64)
 */
export function safeBase64Decode(str: string): string {
  try {
    let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) {
      normalized += '=';
    }
    return Buffer.from(normalized, 'base64').toString('utf-8');
  } catch (e) {
    return '';
  }
}

/**
 * 辅助函数：安全 Base64 编码
 */
export function safeBase64Encode(str: string, urlSafe = false): string {
  const b64 = Buffer.from(str, 'utf-8').toString('base64');
  if (urlSafe) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return b64;
}

/**
 * 解析 SOCKS / SOCKS5 链接
 * 支持格式：
 * 1. socks://amRKSTV5ODNFUHdJOndvek5hMkRCb2dvQQ@198.65.112.64:6935 (加密 base64 user:pass)
 * 2. socks5://username:password@198.65.112.64:6935#NodeName
 * 3. socks://198.65.112.64:6935#NodeName
 */
export function parseSocksUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    const hashIndex = cleanUrl.indexOf('#');
    let urlPart = hashIndex !== -1 ? cleanUrl.substring(0, hashIndex) : cleanUrl;
    const tag = hashIndex !== -1 ? decodeURIComponent(cleanUrl.substring(hashIndex + 1)) : '';

    // 去除 socks5:// 或 socks://
    const isSocks5 = urlPart.startsWith('socks5://');
    const isSocks = urlPart.startsWith('socks://');
    if (!isSocks && !isSocks5) return null;

    let body = isSocks5 ? urlPart.substring(9) : urlPart.substring(8);
    let username = '';
    let password = '';
    let host = '';
    let port = 1080;

    const atIndex = body.lastIndexOf('@');
    if (atIndex !== -1) {
      const userinfo = body.substring(0, atIndex);
      const hostport = body.substring(atIndex + 1);

      // 解析 userinfo：可能是明文 user:pass，也可能是 base64(user:pass)
      if (userinfo.includes(':')) {
        const [u, ...p] = userinfo.split(':');
        username = decodeURIComponent(u);
        password = decodeURIComponent(p.join(':'));
      } else {
        // 尝试 Base64 解码
        const decoded = safeBase64Decode(userinfo);
        if (decoded && decoded.includes(':')) {
          const [u, ...p] = decoded.split(':');
          username = u;
          password = p.join(':');
        } else {
          username = userinfo;
        }
      }

      // 解析 host:port
      const [h, pt] = hostport.split(':');
      host = h;
      port = parseInt(pt, 10) || 1080;
    } else {
      // 没有任何 @，直接是 host:port 或 base64
      if (body.includes(':')) {
        const [h, pt] = body.split(':');
        host = h;
        port = parseInt(pt, 10) || 1080;
      } else {
        const decoded = safeBase64Decode(body);
        if (decoded.includes('@')) {
          return parseSocksUrl(`socks://${decoded}${tag ? '#' + tag : ''}`);
        }
        return null;
      }
    }

    if (!host || !port) return null;

    return {
      type: 'socks5',
      name: tag || `SOCKS5-${host}:${port}`,
      server: host,
      port,
      username: username || undefined,
      password: password || undefined,
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 解析 Shadowsocks (ss://) 链接
 * 支持 SIP002 及 Legacy 格式
 */
export function parseShadowsocksUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    if (!cleanUrl.startsWith('ss://')) return null;

    const hashIndex = cleanUrl.indexOf('#');
    let urlPart = hashIndex !== -1 ? cleanUrl.substring(0, hashIndex) : cleanUrl;
    const tag = hashIndex !== -1 ? decodeURIComponent(cleanUrl.substring(hashIndex + 1)) : '';

    const body = urlPart.substring(5);

    let method = '';
    let password = '';
    let host = '';
    let port = 8388;

    if (body.includes('@')) {
      // SIP002: ss://base64(method:password)@host:port
      const [encodedUserInfo, hostPortPart] = body.split('@');
      const decodedUserInfo = safeBase64Decode(encodedUserInfo);
      if (decodedUserInfo && decodedUserInfo.includes(':')) {
        const [m, ...p] = decodedUserInfo.split(':');
        method = m;
        password = p.join(':');
      } else if (encodedUserInfo.includes(':')) {
        const [m, ...p] = encodedUserInfo.split(':');
        method = m;
        password = p.join(':');
      }

      const [h, pt] = hostPortPart.split('?')[0].split(':');
      host = h;
      port = parseInt(pt, 10) || 8388;
    } else {
      // Legacy: ss://base64(method:password@host:port)
      const decoded = safeBase64Decode(body.split('?')[0]);
      if (!decoded || !decoded.includes('@')) return null;
      const [userInfo, hostPort] = decoded.split('@');
      const [m, ...p] = userInfo.split(':');
      method = m;
      password = p.join(':');
      const [h, pt] = hostPort.split(':');
      host = h;
      port = parseInt(pt, 10) || 8388;
    }

    if (!host || !port) return null;

    return {
      type: 'ss',
      name: tag || `SS-${host}:${port}`,
      server: host,
      port,
      cipher: method || 'aes-256-gcm',
      password,
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 解析 VMess (vmess://) 链接 (Base64 JSON)
 */
export function parseVmessUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    if (!cleanUrl.startsWith('vmess://')) return null;

    const b64 = cleanUrl.substring(8);
    const jsonStr = safeBase64Decode(b64);
    if (!jsonStr) return null;

    const vmess = JSON.parse(jsonStr);
    const host = vmess.add || vmess.host || '';
    const port = parseInt(vmess.port, 10) || 443;
    const name = vmess.ps || `VMess-${host}:${port}`;

    return {
      type: 'vmess',
      name,
      server: host,
      port,
      uuid: vmess.id,
      alterId: parseInt(vmess.aid, 10) || 0,
      cipher: vmess.scy || 'auto',
      network: (vmess.net || 'tcp') as ProxyNode['network'],
      tls: vmess.tls === 'tls' || vmess.tls === true,
      sni: vmess.sni || vmess.host || undefined,
      path: vmess.path || undefined,
      host: vmess.host || undefined,
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 解析 VLESS (vless://) 链接
 */
export function parseVlessUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    if (!cleanUrl.startsWith('vless://')) return null;

    const url = new URL(cleanUrl);
    const uuid = url.username;
    const host = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const tag = url.hash ? decodeURIComponent(url.hash.substring(1)) : `VLESS-${host}:${port}`;
    const params = url.searchParams;

    return {
      type: 'vless',
      name: tag,
      server: host,
      port,
      uuid,
      network: (params.get('type') || 'tcp') as ProxyNode['network'],
      tls: params.get('security') === 'tls' || params.get('security') === 'reality',
      sni: params.get('sni') || undefined,
      path: params.get('path') || undefined,
      host: params.get('host') || undefined,
      flow: params.get('flow') || undefined,
      serviceName: params.get('serviceName') || undefined,
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 解析 Trojan (trojan://) 链接
 */
export function parseTrojanUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    if (!cleanUrl.startsWith('trojan://')) return null;

    const url = new URL(cleanUrl);
    const password = decodeURIComponent(url.username);
    const host = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const tag = url.hash ? decodeURIComponent(url.hash.substring(1)) : `Trojan-${host}:${port}`;
    const params = url.searchParams;

    return {
      type: 'trojan',
      name: tag,
      server: host,
      port,
      password,
      network: (params.get('type') || 'tcp') as ProxyNode['network'],
      tls: params.get('security') !== 'none',
      sni: params.get('sni') || undefined,
      path: params.get('path') || undefined,
      host: params.get('host') || undefined,
      skipCertVerify: params.get('allowInsecure') === '1' || params.get('allowInsecure') === 'true',
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 解析 HTTP / HTTPS 代理链接
 */
export function parseHttpUrl(raw: string): Partial<ProxyNode> | null {
  try {
    const cleanUrl = raw.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) return null;

    const url = new URL(cleanUrl);
    const host = url.hostname;
    const port = parseInt(url.port, 10) || (cleanUrl.startsWith('https://') ? 443 : 80);
    const tag = url.hash ? decodeURIComponent(url.hash.substring(1)) : `HTTP-${host}:${port}`;

    return {
      type: 'http',
      name: tag,
      server: host,
      port,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: cleanUrl.startsWith('https://'),
      rawUrl: raw,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 通用解析器：输入任意代理 URL 返回 ProxyNode 对象
 */
export function parseProxyUrl(rawUrl: string): ProxyNode | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let partial: Partial<ProxyNode> | null = null;

  if (trimmed.startsWith('socks://') || trimmed.startsWith('socks5://')) {
    partial = parseSocksUrl(trimmed);
  } else if (trimmed.startsWith('ss://')) {
    partial = parseShadowsocksUrl(trimmed);
  } else if (trimmed.startsWith('vmess://')) {
    partial = parseVmessUrl(trimmed);
  } else if (trimmed.startsWith('vless://')) {
    partial = parseVlessUrl(trimmed);
  } else if (trimmed.startsWith('trojan://')) {
    partial = parseTrojanUrl(trimmed);
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    partial = parseHttpUrl(trimmed);
  }

  if (!partial || !partial.server || !partial.port) {
    return null;
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  return {
    id,
    name: partial.name || `${partial.type?.toUpperCase()}-${partial.server}:${partial.port}`,
    type: partial.type || 'socks5',
    server: partial.server,
    port: partial.port,
    username: partial.username,
    password: partial.password,
    uuid: partial.uuid,
    cipher: partial.cipher,
    alterId: partial.alterId,
    network: partial.network,
    tls: partial.tls,
    sni: partial.sni,
    alpn: partial.alpn,
    skipCertVerify: partial.skipCertVerify,
    path: partial.path,
    host: partial.host,
    flow: partial.flow,
    serviceName: partial.serviceName,
    rawUrl: trimmed,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 批量解析多行文本中的代理节点
 */
export function parseBatchUrls(text: string): ProxyNode[] {
  const lines = text.split(/[\r\n]+/);
  const nodes: ProxyNode[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const node = parseProxyUrl(trimmed);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * 将 ProxyNode 转换为原始标准 URL 链接
 */
export function nodeToRawUrl(node: ProxyNode): string {
  const tag = encodeURIComponent(node.name || '');

  switch (node.type) {
    case 'socks5':
    case 'socks': {
      let auth = '';
      if (node.username || node.password) {
        // 如果有用户名和密码，按照规范编码为 base64 放入链接以兼容各类解析
        const rawAuth = `${node.username || ''}:${node.password || ''}`;
        auth = `${safeBase64Encode(rawAuth)}@`;
      }
      return `socks5://${auth}${node.server}:${node.port}#${tag}`;
    }

    case 'ss': {
      const cipher = node.cipher || 'aes-256-gcm';
      const userinfo = safeBase64Encode(`${cipher}:${node.password || ''}`, true);
      return `ss://${userinfo}@${node.server}:${node.port}#${tag}`;
    }

    case 'vmess': {
      const vmessObj = {
        v: '2',
        ps: node.name,
        add: node.server,
        port: String(node.port),
        id: node.uuid || '',
        aid: String(node.alterId || 0),
        scy: node.cipher || 'auto',
        net: node.network || 'tcp',
        type: 'none',
        host: node.host || '',
        path: node.path || '',
        tls: node.tls ? 'tls' : '',
        sni: node.sni || '',
      };
      return `vmess://${safeBase64Encode(JSON.stringify(vmessObj))}`;
    }

    case 'vless': {
      const params = new URLSearchParams();
      if (node.network) params.set('type', node.network);
      if (node.tls) params.set('security', 'tls');
      if (node.sni) params.set('sni', node.sni);
      if (node.path) params.set('path', node.path);
      if (node.host) params.set('host', node.host);
      if (node.flow) params.set('flow', node.flow);
      const query = params.toString();
      return `vless://${node.uuid || ''}@${node.server}:${node.port}${query ? '?' + query : ''}#${tag}`;
    }

    case 'trojan': {
      const params = new URLSearchParams();
      if (node.network) params.set('type', node.network);
      if (node.sni) params.set('sni', node.sni);
      if (node.path) params.set('path', node.path);
      if (node.host) params.set('host', node.host);
      if (node.skipCertVerify) params.set('allowInsecure', '1');
      const query = params.toString();
      return `trojan://${encodeURIComponent(node.password || '')}@${node.server}:${node.port}${query ? '?' + query : ''}#${tag}`;
    }

    case 'http': {
      let auth = '';
      if (node.username || node.password) {
        auth = `${encodeURIComponent(node.username || '')}:${encodeURIComponent(node.password || '')}@`;
      }
      const scheme = node.tls ? 'https' : 'http';
      return `${scheme}://${auth}${node.server}:${node.port}#${tag}`;
    }

    default:
      return node.rawUrl || '';
  }
}
