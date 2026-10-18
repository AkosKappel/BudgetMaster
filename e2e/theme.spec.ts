import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('the chosen theme applies at once and survives a reload', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/more')
  await page.getByText('Dark', { exact: true }).click()
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await expect.poll(background).toBe('rgb(15, 29, 26)')

  // Rendered on the server from the cookie, so there is no flash of the light theme.
  const html = await (await page.request.get('/more')).text()
  expect(html).toMatch(/<html[^>]*data-theme="dark"/)
  await page.reload()
  await expect.poll(background).toBe('rgb(15, 29, 26)')

  await page.getByText('Light', { exact: true }).click()
  await expect.poll(background).toBe('rgb(241, 244, 239)')
})
