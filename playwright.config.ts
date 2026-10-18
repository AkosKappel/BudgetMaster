import { defineConfig, devices } from '@playwright/test'

const port = 3100

// End-to-end tests run against the production build (`pnpm build` first) and a migrated
// database. Each test starts its own private demo, so no seed data is needed.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One worker locally: the dev machine also runs live apps.
  workers: process.env.CI ? 2 : 1,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node --env-file-if-exists=.env .output/server/index.mjs',
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    // Not production mode, so Better Auth's per-IP rate limits do not block the tests.
    // An empty key keeps test sign-ups from sending real emails through Resend.
    env: {
      PORT: String(port),
      BETTER_AUTH_URL: `http://localhost:${port}`,
      RESEND_API_KEY: '',
    },
  },
})
