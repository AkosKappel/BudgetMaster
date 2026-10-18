import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

const day = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('rules fill quick add and the import, and the import can create them', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/rules')
  await page.getByLabel('Payee contains').fill('E2E Coffee')
  await page
    .getByLabel('Category')
    .selectOption({ label: 'Restaurants & cafés' })
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('Rule saved')).toBeVisible()
  await expect(
    page.getByRole('listitem').filter({ hasText: '"e2e coffee"' }),
  ).toBeVisible()

  // Quick add: typing a matching payee picks the category.
  await page
    .getByRole('button', { name: 'Add transaction' })
    .filter({ visible: true })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Paid to').fill('E2E Coffee Bar 12')
  await expect(
    sheet.getByRole('radio', { name: 'Restaurants & cafés' }),
  ).toBeChecked()
  await page.keyboard.press('Escape')

  // Import: the rule suggests the category; a different pick for another payee is remembered.
  await page.goto('/import')
  await page.getByLabel('CSV file').setInputFiles({
    name: 'statement.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `Date,Description,Amount\n${day()},E2E Coffee Bar 99,-3.50\n${day()},E2E Gadgets,-49.00\n`,
    ),
  })
  await page.getByRole('button', { name: 'Review 2 rows' }).click()
  await expect(
    page.getByLabel(/Category for E2E Coffee Bar 99/).locator('option:checked'),
  ).toHaveText('Restaurants & cafés')
  await page
    .getByLabel(/Category for E2E Gadgets/)
    .selectOption({ label: 'Shopping' })
  await expect(page.getByLabel(/Remember the category I chose/)).toBeChecked()
  await page.getByRole('button', { name: 'Import 2 transactions' }).click()
  await expect(page.getByText('2 transactions imported')).toBeVisible()

  await page.goto('/rules')
  const learned = page
    .getByRole('listitem')
    .filter({ hasText: '"e2e gadgets"' })
  await expect(learned).toContainText('Shopping')
  await learned.getByRole('button', { name: /Delete the rule/ }).click()
  await expect(page.getByText('Rule deleted')).toBeVisible()
  await expect(learned).toHaveCount(0)
})
