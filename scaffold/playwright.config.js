import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium', launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] } } },
  ],
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173/',
    timeout: 45000,
    reuseExistingServer: !process.env.CI,
  },
});
