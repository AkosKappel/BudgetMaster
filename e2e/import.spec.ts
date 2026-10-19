import { expect, type Page, test } from '@playwright/test'

import { startDemo } from './helpers'

const today = new Date()
const day = (offset: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - offset)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

// A semicolon export with day-first dates, decimal commas and a totals line.
const csv = [
  'Datum;Popis;Suma',
  `${day(3)};E2E Billa;-23,45`,
  `${day(2)};E2E Refund;20,00`,
  `${day(1)};"E2E Shop; Main St";-9,90`,
  'Spolu;;-13,35',
].join('\n')

async function upload(page: Page) {
  await page.goto('/import')
  await page.getByLabel('CSV file').setInputFiles({
    name: 'statement.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })
  await expect(page.getByText('3 of 4 rows readable')).toBeVisible()
  await expect(page.getByLabel('Date format')).toHaveValue('DD.MM.YYYY')
  await page.getByRole('button', { name: 'Review 3 rows' }).click()
}

test('a bank CSV is reviewed, imported, and recognised the second time', async ({
  page,
}) => {
  await startDemo(page)
  await upload(page)

  const button = page.getByRole('button', {
    name: /^Import \d+ transactions?$/,
  })
  await expect(button).toBeDisabled()
  await page
    .getByLabel(/Category for E2E Billa/)
    .selectOption({ label: 'Groceries' })
  await page
    .getByLabel(/Category for E2E Refund/)
    .selectOption({ label: 'Refunds' })
  await page
    .getByLabel(/Category for E2E Shop/)
    .selectOption({ label: 'Shopping' })
  await expect(button).toHaveText('Import 3 transactions')
  await button.click()
  await expect(page.getByText('3 transactions imported')).toBeVisible()
  await expect(page).toHaveURL(/\/activity/)

  await page.goto('/activity?q=E2E')
  await expect(
    page.getByRole('button', { name: /E2E Shop; Main St/ }),
  ).toContainText('−€9.90')

  // The same file again: the layout is remembered, and every row is already there,
  // so nothing is selected.
  await upload(page)
  await expect(page.getByText(/Same layout as your last import/)).toBeVisible()
  await expect(page.getByText('Possible duplicate')).toHaveCount(3)
  await expect(
    page.getByRole('button', { name: 'Import 0 transactions' }),
  ).toBeDisabled()

  // Undo takes the whole import back out.
  await page.getByRole('button', { name: 'Undo import: statement.csv' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Undo import' })
    .click()
  await expect(page.getByText(/Import undone, 3 transactions/)).toBeVisible()
  await page.goto('/activity?q=E2E')
  await expect(page.getByText('No transactions match')).toBeVisible()
})
