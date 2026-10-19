import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('an expense paid by one member shows who owes whom, and can be settled', async ({
  page,
  browser,
}) => {
  await startDemo(page)
  await page.goto('/spaces')
  await page.getByRole('button', { name: 'New space' }).click()
  await page.getByLabel('Name').fill('E2E Split')
  await page.getByRole('button', { name: 'Create space' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'E2E Split' }),
  ).toBeVisible()
  const email = `split-${Date.now()}@example.com`
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Create invite link' }).click()
  const link = await page.getByLabel('Invite link').inputValue()

  // The flatmate signs up and joins.
  const other = await browser.newContext()
  const flatmate = await other.newPage()
  await flatmate.goto('/sign-up')
  await flatmate.getByLabel('Name').fill('Flatmate')
  await flatmate.getByLabel('Email').fill(email)
  await flatmate
    .getByLabel('Password', { exact: true })
    .fill('a-long-password-1')
  await flatmate.getByRole('button', { name: /create account/i }).click()
  await expect(flatmate.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await flatmate.goto(new URL(link).pathname)
  await flatmate.getByRole('button', { name: 'Join E2E Split' }).click()
  await expect(flatmate).not.toHaveURL(/\/invite\//)
  await other.close()

  // The owner adds a wallet and an expense they paid themselves.
  await page.goto('/wallets')
  await page.getByRole('button', { name: 'New wallet' }).click()
  const walletSheet = page.getByRole('dialog')
  await walletSheet.getByLabel('Name').fill('Out of pocket')
  await walletSheet.getByRole('button', { name: 'Create wallet' }).click()
  await expect(page.getByText('Wallet created')).toBeVisible()

  await page
    .getByRole('button', { name: 'Add transaction' })
    .filter({ visible: true })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('80')
  await sheet.getByLabel('Paid to').fill('Hardware store')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByLabel('Paid by').selectOption({ label: 'Demo user (you)' })
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/spaces')
  await page.getByRole('link', { name: /E2E Split/ }).click()
  const balances = page.getByRole('region', { name: 'Balances' })
  await expect(balances).toContainText('gets back €40.00')
  await expect(balances).toContainText('Flatmate pays you €40.00')
  await balances.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Payment recorded')).toBeVisible()
  await expect(balances).not.toContainText('owes')
  await expect(balances).toContainText('Flatmate paid you €40.00')
})
