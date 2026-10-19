import type { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ProxyNode, Subscription, SystemStats } from './types';

type MysqlModule = typeof import('mysql2/promise');

const globalDb = globalThis as unknown as {
  __subMgrPool?: Pool;
  __subMgrSchemaReady?: Promise<void>;
  __subMgrMysql?: Promise<MysqlModule>;
};

/**
 * 延迟加载 mysql2：避免在应用启动（instrumentation / 路由模块求值）时
 * 立即引入依赖 Node net/tls/dns 的驱动，导致边缘运行时启动即崩溃。
 */
function loadMysql(): Promise<MysqlModule> {
  if (!globalDb.__subMgrMysql) {
    globalDb.__subMgrMysql = import('mysql2/promise');
  }
  return globalDb.__subMgrMysql;
}

function buildPoolOptions(): PoolOptions | null {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    return null;
  }

  return {
    host,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    charset: 'utf8mb4',
  };
}

export async function getPool(): Promise<Pool | null> {
  if (globalDb.__subMgrPool) return globalDb.__subMgrPool;

  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const options = buildPoolOptions();
  if (!url && !options) return null;

  const mysql = await loadMysql();

  globalDb.__subMgrPool = url
    ? mysql.createPool({
        uri: url,
        waitForConnections: true,
        connectionLimit: 5,
        maxIdle: 5,
        idleTimeout: 60000,
        queueLimit: 0,
        charset: 'utf8mb4',
      })
    : mysql.createPool(options as PoolOptions);

  return globalDb.__subMgrPool;
}

export function isDbConfigured(): boolean {
  return !!(
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL ||
    (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE)
  );
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS proxy_nodes (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    server VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    username VARCHAR(255) NULL,
    password VARCHAR(255) NULL,
    uuid VARCHAR(191) NULL,
    cipher VARCHAR(64) NULL,
    alter_id INT NULL,
    network VARCHAR(32) NULL,
    tls TINYINT(1) NOT NULL DEFAULT 0,
    sni VARCHAR(255) NULL,
    alpn TEXT NULL,
    skip_cert_verify TINYINT(1) NOT NULL DEFAULT 0,
    path VARCHAR(512) NULL,
    host VARCHAR(255) NULL,
    service_name VARCHAR(255) NULL,
    flow VARCHAR(64) NULL,
    raw_url TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    INDEX idx_nodes_created (created_at),
    INDEX idx_nodes_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    telegram_chat_id VARCHAR(128) NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
    enable_notification TINYINT(1) NOT NULL DEFAULT 0,
    remark VARCHAR(512) NULL,
    node_scope VARCHAR(16) NOT NULL DEFAULT 'all',
    node_ids TEXT NULL,
    token VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    last_fetched_at BIGINT NULL,
    fetch_count INT NOT NULL DEFAULT 0,
    UNIQUE KEY uniq_sub_token (token),
    INDEX idx_subs_created (created_at),
    INDEX idx_subs_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

export async function ensureSchema(): Promise<void> {
  const pool = await getPool();
  if (!pool) {
    throw new Error('MySQL 未配置：请设置 MYSQL_URL 或 MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE');
  }

  if (!globalDb.__subMgrSchemaReady) {
    globalDb.__subMgrSchemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await pool.query(statement);
      }
    })().catch((e) => {
      globalDb.__subMgrSchemaReady = undefined;
      throw e;
    });
  }

  await globalDb.__subMgrSchemaReady;
}

async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = await getPool();
  if (!pool) {
    throw new Error('MySQL 未配置：请设置 MYSQL_URL 或 MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE');
  }
  return fn(pool);
}

function parseJsonArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function rowToNode(row: any): ProxyNode {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    server: row.server,
    port: Number(row.port),
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    uuid: row.uuid ?? undefined,
    cipher: row.cipher ?? undefined,
    alterId: row.alter_id === null || row.alter_id === undefined ? undefined : Number(row.alter_id),
    network: row.network ?? undefined,
    tls: !!row.tls,
    sni: row.sni ?? undefined,
    alpn: parseJsonArray(row.alpn),
    skipCertVerify: !!row.skip_cert_verify,
    path: row.path ?? undefined,
    host: row.host ?? undefined,
    serviceName: row.service_name ?? undefined,
    flow: row.flow ?? undefined,
    rawUrl: row.raw_url ?? undefined,
    status: row.status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToSubscription(row: any): Subscription {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    telegramChatId: row.telegram_chat_id ?? undefined,
    language: row.language || 'zh-CN',
    enableNotification: !!row.enable_notification,
    remark: row.remark ?? undefined,
    nodeScope: row.node_scope === 'custom' ? 'custom' : 'all',
    nodeIds: parseJsonArray(row.node_ids) || [],
    token: row.token,
    status: row.status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    lastFetchedAt:
      row.last_fetched_at === null || row.last_fetched_at === undefined
        ? undefined
        : Number(row.last_fetched_at),
    fetchCount: Number(row.fetch_count || 0),
  };
}

// ----------------- 节点操作 (Nodes CRUD) -----------------

export async function getAllNodes(): Promise<ProxyNode[]> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM proxy_nodes ORDER BY created_at DESC'
    );
    return rows.map(rowToNode);
  });
}

export async function getNodeById(id: string): Promise<ProxyNode | null> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM proxy_nodes WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length ? rowToNode(rows[0]) : null;
  });
}

async function persistNode(pool: Pool, node: ProxyNode): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO proxy_nodes (
      id, name, type, server, port, username, password, uuid, cipher, alter_id,
      network, tls, sni, alpn, skip_cert_verify, path, host, service_name, flow,
      raw_url, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      type = VALUES(type),
      server = VALUES(server),
      port = VALUES(port),
      username = VALUES(username),
      password = VALUES(password),
      uuid = VALUES(uuid),
      cipher = VALUES(cipher),
      alter_id = VALUES(alter_id),
      network = VALUES(network),
      tls = VALUES(tls),
      sni = VALUES(sni),
      alpn = VALUES(alpn),
      skip_cert_verify = VALUES(skip_cert_verify),
      path = VALUES(path),
      host = VALUES(host),
      service_name = VALUES(service_name),
      flow = VALUES(flow),
      raw_url = VALUES(raw_url),
      status = VALUES(status),
      updated_at = VALUES(updated_at)`,
    [
      node.id,
      node.name,
      node.type,
      node.server,
      node.port,
      node.username ?? null,
      node.password ?? null,
      node.uuid ?? null,
      node.cipher ?? null,
      node.alterId ?? null,
      node.network ?? null,
      node.tls ? 1 : 0,
      node.sni ?? null,
      node.alpn ? JSON.stringify(node.alpn) : null,
      node.skipCertVerify ? 1 : 0,
      node.path ?? null,
      node.host ?? null,
      node.serviceName ?? null,
      node.flow ?? null,
      node.rawUrl ?? null,
      node.status,
      node.createdAt,
      node.updatedAt,
    ]
  );
}

export async function saveNode(node: ProxyNode): Promise<void> {
  await ensureSchema();
  await withPool((pool) => persistNode(pool, node));
}

export async function saveNodesBatch(nodes: ProxyNode[]): Promise<void> {
  if (nodes.length === 0) return;
  await ensureSchema();
  await withPool(async (pool) => {
    for (const node of nodes) {
      await persistNode(pool, node);
    }
  });
}

export async function deleteNode(id: string): Promise<void> {
  await ensureSchema();
  await withPool(async (pool) => {
    await pool.query('DELETE FROM proxy_nodes WHERE id = ?', [id]);
  });
}

// ----------------- 订阅操作 (Subscriptions CRUD) -----------------

export async function getAllSubscriptions(): Promise<Subscription[]> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM subscriptions ORDER BY created_at DESC'
    );
    return rows.map(rowToSubscription);
  });
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM subscriptions WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length ? rowToSubscription(rows[0]) : null;
  });
}

export async function getSubscriptionByToken(token: string): Promise<Subscription | null> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM subscriptions WHERE token = ? LIMIT 1',
      [token]
    );
    return rows.length ? rowToSubscription(rows[0]) : null;
  });
}

async function persistSubscription(pool: Pool, sub: Subscription): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO subscriptions (
      id, username, email, telegram_chat_id, language, enable_notification, remark,
      node_scope, node_ids, token, status, created_at, updated_at, last_fetched_at, fetch_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      username = VALUES(username),
      email = VALUES(email),
      telegram_chat_id = VALUES(telegram_chat_id),
      language = VALUES(language),
      enable_notification = VALUES(enable_notification),
      remark = VALUES(remark),
      node_scope = VALUES(node_scope),
      node_ids = VALUES(node_ids),
      token = VALUES(token),
      status = VALUES(status),
      updated_at = VALUES(updated_at),
      last_fetched_at = VALUES(last_fetched_at),
      fetch_count = VALUES(fetch_count)`,
    [
      sub.id,
      sub.username,
      sub.email ?? null,
      sub.telegramChatId ?? null,
      sub.language || 'zh-CN',
      sub.enableNotification ? 1 : 0,
      sub.remark ?? null,
      sub.nodeScope,
      JSON.stringify(sub.nodeIds || []),
      sub.token,
      sub.status,
      sub.createdAt,
      sub.updatedAt,
      sub.lastFetchedAt ?? null,
      sub.fetchCount ?? 0,
    ]
  );
}

export async function saveSubscription(sub: Subscription): Promise<void> {
  await ensureSchema();
  await withPool((pool) => persistSubscription(pool, sub));
}

export async function deleteSubscription(id: string): Promise<void> {
  await ensureSchema();
  await withPool(async (pool) => {
    await pool.query('DELETE FROM subscriptions WHERE id = ?', [id]);
  });
}

export async function recordSubFetch(subId: string): Promise<void> {
  await ensureSchema();
  await withPool(async (pool) => {
    await pool.query(
      'UPDATE subscriptions SET last_fetched_at = ?, fetch_count = fetch_count + 1 WHERE id = ?',
      [Date.now(), subId]
    );
  });
}

// ----------------- 系统统计 -----------------

export async function getSystemStats(): Promise<SystemStats> {
  await ensureSchema();
  return withPool(async (pool) => {
    const [[nodeRow]] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_nodes,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_nodes
      FROM proxy_nodes`
    );
    const [[subRow]] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_subs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_subs,
        COALESCE(SUM(fetch_count), 0) AS total_fetches
      FROM subscriptions`
    );

    return {
      totalNodes: Number(nodeRow?.total_nodes || 0),
      activeNodes: Number(nodeRow?.active_nodes || 0),
      totalSubs: Number(subRow?.total_subs || 0),
      activeSubs: Number(subRow?.active_subs || 0),
      totalFetches: Number(subRow?.total_fetches || 0),
      dbConnected: true,
      resendConfigured: !!process.env.RESEND_API_KEY,
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    };
  });
}
