import { expect, test } from '@playwright/test'

import { expectNoAxeViolations, startDemo } from './helpers'

test('the desktop sidebar collapses, remembers it and toggles with Ctrl+B', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The sidebar is desktop only')
  await startDemo(page)
  const sidebar = page.locator('#sidebar')
  const width = () => sidebar.evaluate((el) => el.getBoundingClientRect().width)
  expect(await width()).toBeGreaterThan(200)

  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect.poll(width).toBeLessThan(80)
  await expect(sidebar.getByRole('link', { name: 'Activity' })).toBeVisible()
  await expectNoAxeViolations(page)

  // Rendered collapsed on the server, so the reload does not jump.
  const html = await (await page.request.get('/')).text()
  expect(html).toContain('md:grid-cols-[3.5rem_1fr]')
  // The server already renders it collapsed. Hotkeys work only once React has hydrated,
  // and `networkidle` does not guarantee that on a busy machine: the search dialog opening
  // on click does.
  await page.reload()
  await expect.poll(width).toBeLessThan(80)
  await expect(async () => {
    await sidebar.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Escape')

  await page.keyboard.press('ControlOrMeta+b')
  await expect.poll(width).toBeGreaterThan(200)
})
