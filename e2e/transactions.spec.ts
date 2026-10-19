import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('quick add saves an expense that shows up in activity', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  // A receipt added up in the field.
  await sheet.getByLabel('Amount').fill('10+2.34')
  await expect(sheet.getByText('= €12.34')).toBeVisible()
  await sheet.getByLabel('Paid to').fill('E2E Bakery')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=E2E%20Bakery')
  await expect(page.getByRole('button', { name: /E2E Bakery/ })).toContainText(
    '−€12.34',
  )
})

test('activity filters come from the URL', async ({ page }) => {
  await startDemo(page)
  await page.goto('/activity?type=income')
  await expect(page.getByRole('button', { name: /Filters/ })).toContainText('1')
  // Every amount shown is income, so none has a minus sign.
  const amounts = page.locator('main section li').getByText(/[€$]/)
  await expect(amounts.first()).toBeVisible()
  await expect(page.locator('main section li', { hasText: '−' })).toHaveCount(0)
})
