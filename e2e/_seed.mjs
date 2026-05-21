import { chromium } from 'playwright-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3080';
const EMAIL = process.env.E2E_EMAIL ?? 'uxnight@example.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Test1234!seed';
const NAME = 'UX Night';
const USERNAME = 'uxnight';

/**
 * Sobe um browser + context já autenticado.
 * Tenta registrar (idempotente: ignora "já existe") e faz login via API;
 * o request context compartilha o cookie jar com o browser context.
 * @returns {Promise<{browser, context, base: string}>}
 */
export async function seededContext() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE });
  const api = context.request;

  await api
    .post(`${BASE}/api/auth/register`, {
      data: { name: NAME, username: USERNAME, email: EMAIL, password: PASSWORD, confirm_password: PASSWORD },
    })
    .catch(() => {});

  const login = await api.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!login.ok()) {
    await browser.close();
    throw new Error(`seed login falhou: ${login.status()} ${await login.text()}`);
  }
  return { browser, context, base: BASE };
}
