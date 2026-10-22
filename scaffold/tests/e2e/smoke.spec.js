import { test, expect } from '@playwright/test';

const routes = ['/', '/zh/', '/ja/', '/ko/', '/es/', '/pt/', '/fr/', '/de/', '/it/', '/tr/', '/id/', '/hi/'];

test('every language route loads sixteen independently registered lessons', async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('#lesson-list button')).toHaveCount(16);
    await expect(page.locator('#run-button')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe(route === '/' ? 'en' : route.slice(1, 3));
  }
});

test('selected lessons, controls, pins and the serial log use one runtime', async ({ page }) => {
  await page.goto('/zh/');
  await page.locator('[data-lesson="button"]').click();
  await expect(page.locator('#lesson-title')).toContainText('读取按钮');
  await page.locator('#run-button').click();
  await expect(page.locator('#run-state')).toContainText('运行中');
  await page.locator('#button-input').click();
  await expect(page.locator('#button-input')).toHaveAttribute('aria-pressed', 'true');
  const state = await page.evaluate(() => window.__fieldLab.getState());
  expect(state.pins.D13).toBe(1);
  expect(state.pins.D2).toBe(1);
  await expect(page.locator('#serial-list')).not.toBeEmpty();
  await page.locator('#run-button').click();
  await expect(page.locator('#run-state')).toContainText('待机');
  await page.locator('#reset-button').click();
  const reset = await page.evaluate(() => window.__fieldLab.getState());
  expect(reset.timeMs).toBe(0);
  expect(reset.pins).toEqual({});
});

test('keyboard part selection and lesson completion stay accessible', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-lesson="blink"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lesson-title')).toContainText('Blink');
  await page.locator('[data-part="led"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#part-pin')).toHaveText('D13');
  await page.locator('#complete-lesson').click();
  await expect(page.locator('#progress-count')).toHaveText('1 / 16');
  await page.reload();
  await expect(page.locator('#progress-count')).toHaveText('1 / 16');
  for (const button of await page.locator('button:visible').all()) {
    const name = await button.getAttribute('aria-label') || await button.innerText();
    expect(name.trim()).not.toBe('');
  }
});

test('runtime assets require no third-party hosts and the scene is interactive', async ({ page }) => {
  const external = [];
  const errors = [];
  page.on('request', (req) => { if (/^https?:/.test(req.url()) && !req.url().startsWith('http://127.0.0.1:4173/')) external.push(req.url()); });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  const canvas = page.locator('#scene-container canvas');
  await expect(canvas).toBeVisible();
  await page.locator('#camera-left').click();
  await page.locator('#camera-reset').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#pin-list')).toContainText('D13');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('mobile view has functional lesson navigation and no horizontal document overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only viewport gate');
  await page.goto('/zh/');
  await expect(page.locator('#lesson-list')).toBeVisible();
  await page.locator('[data-lesson="blink"]').click();
  await expect(page.locator('#lesson-title')).toContainText('LED');
  await page.locator('#run-button').click();
  await expect(page.locator('#run-state')).toContainText('运行中');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('store a viewport screenshot for manual visual review', async ({ page, isMobile }) => {
  await page.goto('/zh/');
  await expect(page.locator('#scene-container canvas')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `test-results/${isMobile ? 'mobile' : 'desktop'}-zh-review.png`,
    animations: 'disabled',
    fullPage: true,
  });
});
