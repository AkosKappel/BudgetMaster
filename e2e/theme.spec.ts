import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('the chosen theme applies at once and survives a reload', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/settings')
  await page.getByText('Dark', { exact: true }).click()
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await expect.poll(background).toBe('rgb(15, 29, 26)')

  // Rendered on the server from the cookie, so there is no flash of the light theme.
  const html = await (await page.request.get('/settings')).text()
  expect(html).toMatch(/<html[^>]*data-theme="dark"/)
  await page.reload()
  await expect.poll(background).toBe('rgb(15, 29, 26)')

  await page.getByText('Light', { exact: true }).click()
  await expect.poll(background).toBe('rgb(241, 244, 239)')
})

test('the theme menu is on every page, signed in or not', async ({ page }) => {
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  await page.goto('/sign-in')
  await page.getByRole('button', { name: /Change theme/ }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect.poll(background).toBe('rgb(15, 29, 26)')

  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByText(/Demo data, deleted in/)).toBeVisible()
  await page.getByRole('button', { name: 'Theme: Dark. Change theme' }).click()
  await page.getByRole('menuitemradio', { name: 'Light' }).click()
  await expect.poll(background).toBe('rgb(241, 244, 239)')
})
