import { test as setup } from '@playwright/test';
import { setupAuthMobile } from '../setup/auth-agentes';

setup('authenticate-mobile', async () => {
  await setupAuthMobile();
});
