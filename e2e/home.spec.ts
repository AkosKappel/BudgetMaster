import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('the home budget card moves between budget months', async ({ page }) => {
  await startDemo(page)
  const nav = page.getByRole('navigation', { name: 'Budget month' })
  await expect(nav).toContainText('This month')
  await expect(
    page.getByRole('heading', { name: 'Needs attention' }),
  ).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Next month' })).toBeDisabled()

  await nav.getByRole('button', { name: 'Previous month' }).click()
  await expect(page).toHaveURL(/month=-1/)
  await expect(nav).toContainText(/ to /)
  await expect(
    page.getByRole('heading', { name: 'Needs attention' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Over budget by|Under budget by|Spent/,
    }),
  ).toBeVisible()

  await nav.getByRole('button', { name: 'Next month' }).click()
  await expect(nav).toContainText('This month')
})
