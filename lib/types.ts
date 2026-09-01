export type ProxyType = 'socks5' | 'socks' | 'ss' | 'vmess' | 'vless' | 'trojan' | 'http';

export interface ProxyNode {
  id: string;
  name: string;
  type: ProxyType;
  server: string;
  port: number;
  username?: string;
  password?: string;
  uuid?: string;
  cipher?: string; // e.g. aes-256-gcm, chacha20-poly1305, auto, none
  alterId?: number;
  network?: 'tcp' | 'ws' | 'grpc' | 'h2' | 'http';
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  skipCertVerify?: boolean;
  path?: string;
  host?: string;
  serviceName?: string; // for gRPC
  flow?: string; // for vless
  rawUrl?: string;
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  username: string; // 必填 用户名
  email?: string; // 可选 邮箱
  telegramChatId?: string; // 可选 Telegram Chat ID
  enableNotification: boolean; // 是否开启通知
  remark?: string; // 备注
  nodeScope: 'all' | 'custom'; // 全部节点 或 指定节点
  nodeIds: string[]; // 当 nodeScope 为 custom 时选中的节点 ID 列表
  token: string; // 16位加密 URL Token
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt: number;
  lastFetchedAt?: number;
  fetchCount?: number;
}

export interface SystemStats {
  totalNodes: number;
  activeNodes: number;
  totalSubs: number;
  activeSubs: number;
  totalFetches: number;
  redisConnected: boolean;
  resendConfigured: boolean;
  telegramConfigured: boolean;
}

export interface AdminUser {
  username: string;
  role: 'admin';
}

export interface NotificationResult {
  emailSent?: boolean;
  telegramSent?: boolean;
  emailError?: string;
  telegramError?: string;
}
