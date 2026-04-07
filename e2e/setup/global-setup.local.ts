import { FullConfig } from '@playwright/test';
// @ts-expect-error - config.local.ts must be created from config.local.example.ts
import localUser from '../config.local';
import authenticate from './authenticate';

async function globalSetup(config: FullConfig) {
  await authenticate(config, localUser);
}

export default globalSetup;
