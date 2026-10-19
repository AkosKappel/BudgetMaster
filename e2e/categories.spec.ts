import { expect, type Page, test } from '@playwright/test'

import { startDemo } from './helpers'

async function createCategory(page: Page, name: string) {
  await page.goto('/categories')
  await page.getByRole('button', { name: 'New category' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill(name)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create category' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()
}

test('an unused category is deleted, a used one is merged into another', async ({
  page,
}) => {
  await startDemo(page)
  await createCategory(page, 'E2E Typo')
  await page.getByRole('button', { name: 'E2E Typo' }).click()
  await page.getByRole('button', { name: 'Delete if unused' }).click()
  await expect(page.getByText('Category deleted')).toBeVisible()

  await createCategory(page, 'E2E Snacks')
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('3.10')
  await sheet.getByLabel('Paid to').fill('E2E Kiosk')
  await sheet.getByText('E2E Snacks', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/categories')
  await page.getByRole('button', { name: 'E2E Snacks' }).click()
  await page.getByRole('button', { name: 'Delete if unused' }).click()
  await expect(page.getByText(/is used by 1 transaction\./)).toBeVisible()
  await page
    .getByLabel('Merge into another category')
    .selectOption({ label: 'Groceries' })
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await expect(page.getByText('Merged into Groceries')).toBeVisible()

  await page.goto('/activity?q=E2E%20Kiosk')
  await expect(page.getByRole('button', { name: /E2E Kiosk/ })).toContainText(
    'Groceries',
  )
})
