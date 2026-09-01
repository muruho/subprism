import { Redis } from '@upstash/redis';
import { ProxyNode, Subscription, SystemStats } from './types';

// 内存降级存储（用于未配置 Redis 时的本地运行和开发）
const globalMemoryStore = globalThis as unknown as {
  __subMgrNodes?: Map<string, ProxyNode>;
  __subMgrSubs?: Map<string, Subscription>;
  __subMgrTokenIndex?: Map<string, string>; // token -> subId
  __subMgrStats?: { totalFetches: number };
};

if (!globalMemoryStore.__subMgrNodes) {
  globalMemoryStore.__subMgrNodes = new Map();
}
if (!globalMemoryStore.__subMgrSubs) {
  globalMemoryStore.__subMgrSubs = new Map();
}
if (!globalMemoryStore.__subMgrTokenIndex) {
  globalMemoryStore.__subMgrTokenIndex = new Map();
}
if (!globalMemoryStore.__subMgrStats) {
  globalMemoryStore.__subMgrStats = { totalFetches: 0 };
}

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({ url, token });
      return redisClient;
    } catch (e) {
      console.warn('Failed to initialize Upstash Redis client:', e);
    }
  }

  return null;
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ----------------- 节点操作 (Nodes CRUD) -----------------

export async function getAllNodes(): Promise<ProxyNode[]> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const ids = await redis.smembers('nodes:list');
      if (!ids || ids.length === 0) return [];
      
      const pipeline = redis.pipeline();
      for (const id of ids) {
        pipeline.get(`node:${id}`);
      }
      const results = await pipeline.exec<ProxyNode[]>();
      return results
        .filter((item): item is ProxyNode => !!item)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Redis error getAllNodes:', e);
    }
  }

  // 内存降级
  return Array.from(globalMemoryStore.__subMgrNodes!.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export async function getNodeById(id: string): Promise<ProxyNode | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const node = await redis.get<ProxyNode>(`node:${id}`);
      return node || null;
    } catch (e) {
      console.error('Redis error getNodeById:', e);
    }
  }

  return globalMemoryStore.__subMgrNodes!.get(id) || null;
}

export async function saveNode(node: ProxyNode): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`node:${node.id}`, JSON.stringify(node));
      await redis.sadd('nodes:list', node.id);
      return;
    } catch (e) {
      console.error('Redis error saveNode:', e);
    }
  }

  globalMemoryStore.__subMgrNodes!.set(node.id, node);
}

export async function saveNodesBatch(nodes: ProxyNode[]): Promise<void> {
  if (nodes.length === 0) return;
  const redis = getRedisClient();
  if (redis) {
    try {
      const pipeline = redis.pipeline();
      for (const node of nodes) {
        pipeline.set(`node:${node.id}`, JSON.stringify(node));
        pipeline.sadd('nodes:list', node.id);
      }
      await pipeline.exec();
      return;
    } catch (e) {
      console.error('Redis error saveNodesBatch:', e);
    }
  }

  for (const node of nodes) {
    globalMemoryStore.__subMgrNodes!.set(node.id, node);
  }
}

export async function deleteNode(id: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`node:${id}`);
      await redis.srem('nodes:list', id);
      return;
    } catch (e) {
      console.error('Redis error deleteNode:', e);
    }
  }

  globalMemoryStore.__subMgrNodes!.delete(id);
}

// ----------------- 订阅操作 (Subscriptions CRUD) -----------------

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const ids = await redis.smembers('subs:list');
      if (!ids || ids.length === 0) return [];

      const pipeline = redis.pipeline();
      for (const id of ids) {
        pipeline.get(`sub:${id}`);
      }
      const results = await pipeline.exec<Subscription[]>();
      return results
        .filter((item): item is Subscription => !!item)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Redis error getAllSubscriptions:', e);
    }
  }

  return Array.from(globalMemoryStore.__subMgrSubs!.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const sub = await redis.get<Subscription>(`sub:${id}`);
      return sub || null;
    } catch (e) {
      console.error('Redis error getSubscriptionById:', e);
    }
  }

  return globalMemoryStore.__subMgrSubs!.get(id) || null;
}

export async function getSubscriptionByToken(token: string): Promise<Subscription | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const subId = await redis.get<string>(`sub:token:${token}`);
      if (subId) {
        return getSubscriptionById(subId);
      }
      // 备用检索：若无索引则全局遍历一次
      const all = await getAllSubscriptions();
      const match = all.find((s) => s.token === token);
      if (match) {
        await redis.set(`sub:token:${token}`, match.id);
        return match;
      }
      return null;
    } catch (e) {
      console.error('Redis error getSubscriptionByToken:', e);
    }
  }

  const subId = globalMemoryStore.__subMgrTokenIndex!.get(token);
  if (subId) {
    return globalMemoryStore.__subMgrSubs!.get(subId) || null;
  }
  const all = Array.from(globalMemoryStore.__subMgrSubs!.values());
  return all.find((s) => s.token === token) || null;
}

export async function saveSubscription(sub: Subscription): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`sub:${sub.id}`, JSON.stringify(sub));
      await redis.sadd('subs:list', sub.id);
      await redis.set(`sub:token:${sub.token}`, sub.id);
      return;
    } catch (e) {
      console.error('Redis error saveSubscription:', e);
    }
  }

  globalMemoryStore.__subMgrSubs!.set(sub.id, sub);
  globalMemoryStore.__subMgrTokenIndex!.set(sub.token, sub.id);
}

export async function deleteSubscription(id: string): Promise<void> {
  const sub = await getSubscriptionById(id);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`sub:${id}`);
      await redis.srem('subs:list', id);
      if (sub?.token) {
        await redis.del(`sub:token:${sub.token}`);
      }
      return;
    } catch (e) {
      console.error('Redis error deleteSubscription:', e);
    }
  }

  if (sub?.token) {
    globalMemoryStore.__subMgrTokenIndex!.delete(sub.token);
  }
  globalMemoryStore.__subMgrSubs!.delete(id);
}

export async function recordSubFetch(subId: string): Promise<void> {
  const sub = await getSubscriptionById(subId);
  if (!sub) return;

  sub.lastFetchedAt = Date.now();
  sub.fetchCount = (sub.fetchCount || 0) + 1;
  await saveSubscription(sub);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.incr('stats:fetches');
    } catch (e) {
      // ignore
    }
  } else {
    globalMemoryStore.__subMgrStats!.totalFetches += 1;
  }
}

// ----------------- 系统统计 -----------------

export async function getSystemStats(): Promise<SystemStats> {
  const nodes = await getAllNodes();
  const subs = await getAllSubscriptions();

  let totalFetches = subs.reduce((acc, cur) => acc + (cur.fetchCount || 0), 0);

  const redis = getRedisClient();
  if (redis) {
    try {
      const val = await redis.get<number>('stats:fetches');
      if (val) totalFetches = val;
    } catch (e) {
      // ignore
    }
  }

  return {
    totalNodes: nodes.length,
    activeNodes: nodes.filter((n) => n.status === 'active').length,
    totalSubs: subs.length,
    activeSubs: subs.filter((s) => s.status === 'active').length,
    totalFetches,
    redisConnected: isRedisConfigured(),
    resendConfigured: !!process.env.RESEND_API_KEY,
    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
  };
}
