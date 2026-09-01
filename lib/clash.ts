import yaml from 'js-yaml';
import { ProxyNode } from './types';

/**
 * 将 ProxyNode 转换为 Clash Proxy 节点配置对象
 */
export function nodeToClashProxy(node: ProxyNode): Record<string, any> | null {
  const name = node.name || `${node.type.toUpperCase()}-${node.server}:${node.port}`;

  switch (node.type) {
    case 'socks5':
    case 'socks': {
      const p: Record<string, any> = {
        name,
        type: 'socks5',
        server: node.server,
        port: node.port,
      };
      if (node.username) p.username = node.username;
      if (node.password) p.password = node.password;
      if (node.tls) {
        p.tls = true;
        if (node.skipCertVerify) p['skip-cert-verify'] = true;
        if (node.sni) p.sni = node.sni;
      }
      return p;
    }

    case 'ss': {
      const p: Record<string, any> = {
        name,
        type: 'ss',
        server: node.server,
        port: node.port,
        cipher: node.cipher || 'aes-256-gcm',
        password: node.password || '',
      };
      return p;
    }

    case 'vmess': {
      const p: Record<string, any> = {
        name,
        type: 'vmess',
        server: node.server,
        port: node.port,
        uuid: node.uuid || '',
        alterId: node.alterId || 0,
        cipher: node.cipher || 'auto',
      };
      if (node.tls) {
        p.tls = true;
        if (node.sni) p.servername = node.sni;
        if (node.skipCertVerify) p['skip-cert-verify'] = true;
      }
      if (node.network === 'ws') {
        p.network = 'ws';
        p['ws-opts'] = {};
        if (node.path) p['ws-opts'].path = node.path;
        if (node.host) p['ws-opts'].headers = { Host: node.host };
      } else if (node.network === 'grpc') {
        p.network = 'grpc';
        p['grpc-opts'] = {
          'grpc-service-name': node.serviceName || node.path || '',
        };
      }
      return p;
    }

    case 'vless': {
      const p: Record<string, any> = {
        name,
        type: 'vless',
        server: node.server,
        port: node.port,
        uuid: node.uuid || '',
      };
      if (node.tls) {
        p.tls = true;
        if (node.sni) p.servername = node.sni;
        if (node.skipCertVerify) p['skip-cert-verify'] = true;
      }
      if (node.flow) {
        p.flow = node.flow;
      }
      if (node.network === 'ws') {
        p.network = 'ws';
        p['ws-opts'] = {};
        if (node.path) p['ws-opts'].path = node.path;
        if (node.host) p['ws-opts'].headers = { Host: node.host };
      } else if (node.network === 'grpc') {
        p.network = 'grpc';
        p['grpc-opts'] = {
          'grpc-service-name': node.serviceName || node.path || '',
        };
      }
      return p;
    }

    case 'trojan': {
      const p: Record<string, any> = {
        name,
        type: 'trojan',
        server: node.server,
        port: node.port,
        password: node.password || '',
      };
      if (node.sni) p.sni = node.sni;
      if (node.skipCertVerify) p['skip-cert-verify'] = true;
      if (node.network === 'ws') {
        p.network = 'ws';
        p['ws-opts'] = {};
        if (node.path) p['ws-opts'].path = node.path;
        if (node.host) p['ws-opts'].headers = { Host: node.host };
      } else if (node.network === 'grpc') {
        p.network = 'grpc';
        p['grpc-opts'] = {
          'grpc-service-name': node.serviceName || node.path || '',
        };
      }
      return p;
    }

    case 'http': {
      const p: Record<string, any> = {
        name,
        type: 'http',
        server: node.server,
        port: node.port,
      };
      if (node.username) p.username = node.username;
      if (node.password) p.password = node.password;
      if (node.tls) p.tls = true;
      return p;
    }

    default:
      return null;
  }
}

/**
 * 生成完整的 Clash YAML 配置
 */
export function generateClashConfig(nodes: ProxyNode[], title = 'SubPrism'): string {
  const proxies: Record<string, any>[] = [];
  const proxyNames: string[] = [];

  for (const node of nodes) {
    if (node.status === 'disabled') continue;
    const p = nodeToClashProxy(node);
    if (p) {
      proxies.push(p);
      proxyNames.push(p.name);
    }
  }

  // 保证至少有代理或 DIRECT
  const availableProxyNames = proxyNames.length > 0 ? proxyNames : ['DIRECT'];

  const config = {
    port: 7890,
    'socks-port': 7891,
    'mixed-port': 7892,
    'allow-lan': true,
    mode: 'rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    dns: {
      enable: true,
      ipv6: false,
      'default-nameserver': ['223.5.5.5', '119.29.29.29'],
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      nameserver: ['https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query'],
    },
    proxies,
    'proxy-groups': [
      {
        name: '🚀 节点选择',
        type: 'select',
        proxies: ['⚡ 自动选择', '🛡️ 故障转移', ...availableProxyNames, 'DIRECT'],
      },
      {
        name: '⚡ 自动选择',
        type: 'url-test',
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        tolerance: 50,
        proxies: [...availableProxyNames],
      },
      {
        name: '🛡️ 故障转移',
        type: 'fallback',
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        proxies: [...availableProxyNames],
      },
      {
        name: '🐟 漏网之鱼',
        type: 'select',
        proxies: ['🚀 节点选择', 'DIRECT'],
      },
    ],
    rules: [
      'DOMAIN-SUFFIX,local,DIRECT',
      'IP-CIDR,127.0.0.0/8,DIRECT',
      'IP-CIDR,172.16.0.0/12,DIRECT',
      'IP-CIDR,192.168.0.0/16,DIRECT',
      'IP-CIDR,10.0.0.0/8,DIRECT',
      'IP-CIDR,100.64.0.0/10,DIRECT',
      'GEOIP,CN,DIRECT',
      'MATCH,🚀 节点选择',
    ],
  };

  return yaml.dump(config, { indent: 2, lineWidth: -1, noRefs: true });
}
