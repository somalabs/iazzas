import { test as setup } from '@playwright/test';
import { setupAuth } from '../setup/auth-agentes';

setup('authenticate', async () => {
  await setupAuth();
});
