import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('the app installs a service worker and shows an offline page', async ({
  page,
  context,
}) => {
  await startDemo(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  // A page loaded before the worker took control: reload so it handles navigations.
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true)

  const manifest = await (
    await page.request.get('/manifest.webmanifest')
  ).json()
  expect(manifest.display).toBe('standalone')

  await context.setOffline(true)
  await page.goto('/activity').catch(() => {})
  await expect(
    page.getByRole('heading', { name: 'You are offline' }),
  ).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible()
})
