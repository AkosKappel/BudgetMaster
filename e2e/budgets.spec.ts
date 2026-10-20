import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('a budget with rollover adds last month’s leftover', async ({ page }) => {
  await startDemo(page)
  await page.goto('/budgets')
  // The demo Pets budget (50.00) is never spent on, so last month's 50.00 carries over.
  const pets = page.getByRole('button', { name: /^Pets/ })
  await expect(pets).toContainText('Includes €50.00 left over from last month')
  await expect(pets).toContainText('€100.00 left')

  await pets.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByLabel(/Carry over what is left/)).toBeChecked()
  await expect(sheet.getByLabel('Monthly limit')).toHaveValue('50.00')
  await sheet.getByLabel(/Carry over what is left/).uncheck()
  await sheet.getByRole('button', { name: 'Save budget' }).click()
  await expect(pets).toContainText('€50.00 left')
  await expect(pets).not.toContainText('left over from last month')
})

test('budgets say how much of the income has no job yet', async ({ page }) => {
  await startDemo(page)
  await page.goto('/budgets?month=-1')
  await expect(
    page.getByText(/came in, .* is in category budgets/),
  ).toBeVisible()
})
