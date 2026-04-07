import type { TBalanceConfig } from 'librechat-data-provider';
import type { IConfig } from '@librechat/data-schemas';
import type { Types, ClientSession } from 'mongoose';

type Principal = { principalType: string; principalId?: string | Types.ObjectId };

const BALANCE_FIELDS: (keyof TBalanceConfig)[] = [
  'enabled',
  'startBalance',
  'autoRefillEnabled',
  'refillAmount',
  'refillIntervalValue',
  'refillIntervalUnit',
];

interface EffectiveBalanceDeps {
  getUserPrincipals: (
    params: { userId: string | Types.ObjectId; role?: string | null },
    session?: ClientSession,
  ) => Promise<Principal[]>;
  getApplicableConfigs: (
    principals?: Principal[],
    session?: ClientSession,
  ) => Promise<IConfig[]>;
  getGlobalBalanceConfig: () => TBalanceConfig;
}

interface CacheEntry {
  config: TBalanceConfig;
  sources: Record<string, { principalType: string; principalId: string; priority: number } | { source: string }>;
  expiresAt: number;
}

export type EffectiveBalanceResult = {
  effective: TBalanceConfig;
  sources: CacheEntry['sources'];
};

export function createEffectiveBalanceService(deps: EffectiveBalanceDeps) {
  const cache = new Map<string, CacheEntry>();
  const TTL_MS = 60_000;

  function invalidateCache(userId?: string) {
    if (userId) {
      cache.delete(userId);
    } else {
      cache.clear();
    }
  }

  async function getEffectiveBalanceConfig(userId: string): Promise<EffectiveBalanceResult> {
    const now = Date.now();
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return { effective: cached.config, sources: cached.sources };
    }

    const principals = await deps.getUserPrincipals({ userId });
    const configs = await deps.getApplicableConfigs(principals);
    const globalConfig = deps.getGlobalBalanceConfig();

    const effective: Record<string, unknown> = {};
    const sources: CacheEntry['sources'] = {};

    const activeConfigs = configs.filter((c) => c.isActive);
    const sorted = [...activeConfigs].sort((a, b) => {
      const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (pDiff !== 0) return pDiff;
      const order: Record<string, number> = { role: 0, group: 1, user: 2 };
      return (order[a.principalType] ?? 0) - (order[b.principalType] ?? 0);
    });

    for (const config of sorted) {
      const balanceOverride = (config.overrides as Record<string, unknown>)?.balance;
      if (!balanceOverride || typeof balanceOverride !== 'object') continue;

      for (const field of BALANCE_FIELDS) {
        const value = (balanceOverride as Record<string, unknown>)[field];
        if (value !== undefined) {
          effective[field] = value;
          sources[field] = {
            principalType: config.principalType,
            principalId: config.principalId?.toString() ?? '',
            priority: config.priority ?? 0,
          };
        }
      }
    }

    const result: TBalanceConfig = { ...globalConfig };
    for (const field of BALANCE_FIELDS) {
      if (effective[field] !== undefined) {
        (result as Record<string, unknown>)[field] = effective[field];
      } else {
        sources[field] = { source: 'global' };
      }
    }

    cache.set(userId, { config: result, sources, expiresAt: now + TTL_MS });
    return { effective: result, sources };
  }

  return { getEffectiveBalanceConfig, invalidateCache };
}
