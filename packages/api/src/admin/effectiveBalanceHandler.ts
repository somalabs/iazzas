import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { EffectiveBalanceResult } from './effectiveBalance';
import type { ServerRequest } from '~/types/http';

export interface EffectiveBalanceHandlerDeps {
  getEffectiveBalanceConfig: (userId: string) => Promise<EffectiveBalanceResult>;
}

export function createEffectiveBalanceHandler(deps: EffectiveBalanceHandlerDeps) {
  return async function getEffectiveBalance(req: ServerRequest, res: Response) {
    try {
      const { userId } = req.params as { userId: string };
      if (!isValidObjectIdString(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      const result = await deps.getEffectiveBalanceConfig(userId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('[adminConfig] getEffectiveBalance error:', error);
      return res.status(500).json({ error: 'Failed to get effective balance config' });
    }
  };
}
