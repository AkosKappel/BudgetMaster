import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('a tag can be created, used in quick add and deleted', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/tags')
  await page.getByRole('button', { name: 'New tag' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill('Holiday 2027')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create tag' })
    .click()
  await expect(page.getByText('Tag created')).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: 'Holiday 2027' })
  await expect(row).toContainText('0 transactions')

  await page
    .getByRole('button', { name: 'Add transaction' })
    .filter({ visible: true })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('45')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByText('Holiday 2027', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()
  await expect(row).toContainText('1 transaction')

  await row.getByRole('button', { name: 'Edit Holiday 2027' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete tag' })
    .click()
  await expect(page.getByText('Tag deleted')).toBeVisible()
  await expect(row).toHaveCount(0)
})
