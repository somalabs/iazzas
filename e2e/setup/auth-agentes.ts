import { chromium, devices } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.resolve(process.cwd(), 'e2e/.auth-agentes.json');
export const AUTH_FILE_MOBILE = path.resolve(process.cwd(), 'e2e/.auth-agentes-mobile.json');

const EMAIL = 'e2e-agentes@test.local';
const PASSWORD = 'E2eAgentes!2026';

async function doLogin(contextOptions: object, authFile: string, label: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto('http://localhost:3090/login', { timeout: 25000, waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name=email]', { timeout: 15000 });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/c/new', { timeout: 20000 });
  await page.waitForSelector('[data-testid="new-chat-button"]', { timeout: 10000 });

  await context.storageState({ path: authFile });
  await browser.close();
  console.log(`✓ ${label}: storageState salvo em`, authFile);
}

/** Login once for Desktop Chrome project. */
export async function setupAuth() {
  await doLogin({ ...devices['Desktop Chrome'] }, AUTH_FILE, 'auth-agentes');
}

/** Login once for Mobile Chrome project (independent session). */
export async function setupAuthMobile() {
  await doLogin({ ...devices['Desktop Chrome'] }, AUTH_FILE_MOBILE, 'auth-agentes-mobile');
}
