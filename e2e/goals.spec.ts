import { expect, test } from '@playwright/test'

import { expectNoAxeViolations, startDemo } from './helpers'

test('a savings goal follows its wallet and says what a month needs', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/goals')
  await page.getByRole('button', { name: 'New goal' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('Laptop')
  await dialog.getByLabel('Saved in').selectOption({ label: 'Savings (EUR)' })
  // Far above the demo's savings, so the goal is not reached yet.
  await dialog.getByLabel(/Target in/).fill('1000000')
  const nextYear = new Date().getFullYear() + 1
  await dialog.getByLabel(/Reach it by/).fill(`${nextYear}-12-31`)
  await expectNoAxeViolations(page)
  await dialog.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByText('Goal created')).toBeVisible()

  const card = page.getByRole('article').filter({ hasText: 'Laptop' })
  await expect(card.getByText('In Savings')).toBeVisible()
  await expect(card.getByText(/a month to reach it by 31 Dec/)).toBeVisible()
  await expectNoAxeViolations(page)

  await card.getByRole('button', { name: 'Edit Laptop' }).click()
  await dialog.getByRole('button', { name: 'Delete goal' }).click()
  await expect(page.getByText(/No goals yet/)).toBeVisible()
})
