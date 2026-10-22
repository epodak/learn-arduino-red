// Local forensic recapture only. Never add captures to Git without a separate
// publication/rights decision. Mirrors are owned by ../mirror and are immutable.
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://learn-arduino-red.vercel.app';
const routes = ['/', '/es/', '/pt/', '/fr/', '/de/', '/it/', '/tr/', '/id/', '/zh/', '/ja/', '/ko/', '/hi/'];
const destination = path.resolve(import.meta.dirname, '../../probe/playwright-recapture');
const captured = new Map();
const outstanding = new Set();
const errors = [];
const pages = [];
await mkdir(destination, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request:${request.url()}:${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() !== 200 || response.request().method() !== 'GET') return;
    if (!response.url().startsWith(`${origin}/`)) return;
    if (response.request().resourceType() === 'document') return;
    const task = (async () => {
      const url = new URL(response.url());
      const safePath = url.pathname.split('/').filter(Boolean).filter((part) => part !== '.' && part !== '..');
      if (safePath.length === 0) return;
      const body = await response.body();
      const sha256 = createHash('sha256').update(body).digest('hex');
      const relative = path.join('resources', ...safePath);
      // Query-specific resources keep independent names.
      const saved = url.search ? `${relative}-${createHash('sha256').update(url.search).digest('hex').slice(0, 8)}` : relative;
      const target = path.resolve(destination, saved);
      if (!target.startsWith(destination + path.sep)) throw new Error(`Unsafe response path: ${url}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      captured.set(url.href, { saved, bytes: body.length, sha256, contentType: response.headers()['content-type'] || '' });
    })().catch((error) => errors.push(`response:${response.url()}:${error.message}`));
    outstanding.add(task);
    task.finally(() => outstanding.delete(task));
  });

  for (const route of routes) {
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const root = document.querySelector('#app');
      return root && !root.hasAttribute('inert');
    }, null, { timeout: 50000 });
    await page.waitForTimeout(700);
    const result = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      lessonCount: document.querySelectorAll('#lesson-list li').length,
      canvas: Boolean(document.querySelector('#board-canvas')),
    }));
    pages.push({ route, httpStatus: response?.status(), ...result });
    const filename = route === '/' ? 'en' : route.replaceAll('/', '');
    await writeFile(path.join(destination, `${filename}.html`), await page.content(), 'utf8');
    if (route === '/' || route === '/zh/') {
      await page.screenshot({ path: path.join(destination, `${filename}.png`), animations: 'disabled' });
    }
    console.log(`captured ${route}: ${result.lang}, ${result.lessonCount} lessons`);
  }
  await Promise.allSettled([...outstanding]);
  const report = { origin, capturedAt: new Date().toISOString(), pages, resources: Object.fromEntries(captured), errors };
  await writeFile(path.join(destination, 'capture-manifest.json'), JSON.stringify(report, null, 2), 'utf8');
  if (pages.some((p) => p.httpStatus !== 200 || p.lessonCount !== 16) || errors.length > 0) {
    console.error(`capture incomplete: ${JSON.stringify(errors.slice(0, 10))}`);
    process.exitCode = 1;
  }
  console.log(`Captured ${pages.length} routes and ${captured.size} resources into ${destination}.`);
} finally {
  await browser.close();
}
