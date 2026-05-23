import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Resolves the studio config directory across both dev and prod layouts.
 *
 * - Dev (`npm run backend`): cwd is the repo root, so `cwd/config/studio` hits.
 * - Prod container: `Dockerfile.multi` copies config to `/app/config` and sets
 *   `WORKDIR /app/api`, so cwd is `/app/api` and the config lives one level up.
 *
 * `STUDIO_CONFIG_DIR` still overrides everything (used by tests and as a prod
 * escape hatch).
 */
export const getStudioConfigDir = (): string => {
  if (process.env.STUDIO_CONFIG_DIR) {
    return resolve(process.env.STUDIO_CONFIG_DIR);
  }
  const candidates = [
    resolve(process.cwd(), 'config/studio'),
    resolve(process.cwd(), '../config/studio'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? candidates[0];
};
