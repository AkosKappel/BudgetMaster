import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('cash flow shows a year of months that open in activity', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/reports')
  await expect(page.getByText(/complete months you earned/)).toBeVisible()
  await page.getByText('Show as table').click()
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(12)
  await rows.first().getByRole('link').click()
  await expect(page).toHaveURL(/\/activity\?.*from=\d{4}-\d{2}-\d{2}.*to=/)
  await expect(page.getByRole('button', { name: /Filters/ })).toContainText('2')
})
