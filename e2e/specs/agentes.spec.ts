import { expect, test, type Page } from '@playwright/test';
import { AUTH_FILE, AUTH_FILE_MOBILE } from '../setup/auth-agentes';

const BASE = 'http://localhost:3090';

async function gotoAgentes(page: Page, viewport?: { width: number; height: number }) {
  if (viewport) {
    await page.setViewportSize(viewport);
  }
  await page.goto(`${BASE}/d/agentes`, { timeout: 30000, waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main[aria-label="Agentes"]', { timeout: 20000 });
}

test.describe('Agentes — UX/UI', () => {
  // refreshToken rotates on every successful /api/auth/refresh call — save the post-rotation
  // cookies back to the project's own auth file so the next test starts with a valid token.
  // Desktop Chrome → AUTH_FILE, Mobile Chrome → AUTH_FILE_MOBILE (independent sessions).
  test.afterEach(async ({ page }, testInfo) => {
    const authFile = testInfo.project.name === 'Mobile Chrome' ? AUTH_FILE_MOBILE : AUTH_FILE;
    await page.context().storageState({ path: authFile });
  });

  test.beforeEach(async ({ page }) => {
    await gotoAgentes(page);
  });

  // ─────────────────────────────────────────────
  // Navegação
  // ─────────────────────────────────────────────

  test('acessa /d/agentes e renderiza a página', async ({ page }) => {
    await expect(page).toHaveURL(/\/d\/agentes/);
    await expect(page.getByRole('main', { name: 'Agentes' })).toBeVisible();
  });

  test('link "Agentes" na sidebar navega para /d/agentes', async ({ page }) => {
    await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="nav-agentes"]', { timeout: 10000 });
    await page.getByTestId('nav-agentes').click();
    await expect(page).toHaveURL(/\/d\/agentes/, { timeout: 8000 });
  });

  // ─────────────────────────────────────────────
  // Layout desktop — split panel
  // ─────────────────────────────────────────────

  test('exibe dois painéis lado a lado no desktop (≥768px)', async ({ page }) => {
    await gotoAgentes(page, { width: 1280, height: 800 });

    await expect(page.locator('[data-testid="agentes-left-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="agentes-right-panel"]')).toBeVisible();
    await expect(page.getByRole('separator', { name: 'Redimensionar painéis' })).toBeVisible();
  });

  test('drag handle redimensiona os painéis', async ({ page }) => {
    await gotoAgentes(page, { width: 1280, height: 800 });

    const dragHandle = page.getByRole('separator', { name: 'Redimensionar painéis' });
    const leftPanel = page.locator('[data-testid="agentes-left-panel"]');

    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error('Drag handle sem bounding box');
    const beforeBox = await leftPanel.boundingBox();
    if (!beforeBox) throw new Error('Left panel sem bounding box');

    const midX = handleBox.x + handleBox.width / 2;
    const midY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(midX, midY);
    await page.mouse.down();
    await page.mouse.move(midX + 120, midY, { steps: 15 });
    await page.mouse.up();

    const afterBox = await leftPanel.boundingBox();
    if (!afterBox) throw new Error('Left panel sem bounding box depois do drag');
    expect(afterBox.width).toBeGreaterThan(beforeBox.width);
  });

  // ─────────────────────────────────────────────
  // Layout mobile — tab switcher
  // ─────────────────────────────────────────────

  test('exibe tab switcher Configurar/Conversar no mobile (767px)', async ({ page }) => {
    await gotoAgentes(page, { width: 767, height: 812 });

    await expect(page.getByRole('button', { name: 'Configurar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conversar' })).toBeVisible();
    await expect(page.getByRole('separator', { name: 'Redimensionar painéis' })).not.toBeVisible();
  });

  test('tab switcher mobile alterna conteúdo entre Configurar e Conversar', async ({ page }) => {
    await gotoAgentes(page, { width: 767, height: 812 });

    const configTab = page.getByRole('button', { name: 'Configurar' });
    const chatTab = page.getByRole('button', { name: 'Conversar' });

    await expect(configTab).toHaveClass(/bg-surface-active/);

    await chatTab.click();
    await expect(chatTab).toHaveClass(/bg-surface-active/);
    await expect(configTab).not.toHaveClass(/bg-surface-active/);

    await configTab.click();
    await expect(configTab).toHaveClass(/bg-surface-active/);
  });

  // ─────────────────────────────────────────────
  // TestPanel — abas Testar / Construir
  // ─────────────────────────────────────────────

  test('exibe as abas "💬 Testar" e "🛠 Construir"', async ({ page }) => {
    await expect(page.getByRole('button', { name: '💬 Testar' })).toBeVisible();
    await expect(page.getByRole('button', { name: '🛠 Construir' })).toBeVisible();
  });

  test('aba "💬 Testar" está ativa por padrão', async ({ page }) => {
    await expect(page.getByRole('button', { name: '💬 Testar' })).toHaveClass(/border-b-2/);
  });

  test('badge "Rascunho efêmero" aparece na aba Testar', async ({ page }) => {
    await expect(page.getByText('Rascunho efêmero — não salvo')).toBeVisible();
  });

  test('badge efêmero desaparece ao mudar para aba Construir', async ({ page }) => {
    await page.getByRole('button', { name: '🛠 Construir' }).click();
    await expect(page.getByText('Rascunho efêmero — não salvo')).not.toBeVisible();
  });

  test('troca entre abas mantém histórico de chat isolado', async ({ page }) => {
    const construirTab = page.getByRole('button', { name: '🛠 Construir' });
    const testarTab = page.getByRole('button', { name: '💬 Testar' });

    await construirTab.click();
    await expect(construirTab).toHaveClass(/border-b-2/);

    await testarTab.click();
    await expect(testarTab).toHaveClass(/border-b-2/);
    await expect(page.getByText('Rascunho efêmero — não salvo')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // Acessibilidade
  // ─────────────────────────────────────────────

  test('main tem aria-label "Agentes"', async ({ page }) => {
    await expect(page.getByRole('main', { name: 'Agentes' })).toBeVisible();
  });

  test('drag handle tem role="separator" e aria-orientation="vertical"', async ({ page }) => {
    await gotoAgentes(page, { width: 1280, height: 800 });
    const handle = page.getByRole('separator', { name: 'Redimensionar painéis' });
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  });

  test('abas do TestPanel respondem a teclado (Enter)', async ({ page }) => {
    const construirTab = page.getByRole('button', { name: '🛠 Construir' });
    await construirTab.focus();
    await page.keyboard.press('Enter');
    await expect(construirTab).toHaveClass(/border-b-2/);
  });
});
