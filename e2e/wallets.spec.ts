import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('a new account adds its first wallet and records an expense', async ({
  page,
}) => {
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('New User')
  await page.getByLabel('Email').fill(`wallet-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('a-long-password-1')
  await page.getByRole('button', { name: /create account/i }).click()

  await page.getByRole('link', { name: 'Add wallet' }).click()
  await page.getByRole('button', { name: 'New wallet' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Name').fill('Bank')
  await sheet.getByLabel('Starting balance').fill('250')
  await sheet.getByRole('button', { name: 'Create wallet' }).click()
  await expect(page.getByText('Wallet created')).toBeVisible()
  await expect(page.getByRole('button', { name: /Bank/ })).toContainText(
    '€250.00',
  )

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wallets' })).toBeVisible()
  await expect(page.getByText('€250.00')).toBeVisible()
  await page
    .getByRole('button', { name: 'Add transaction' })
    .filter({ visible: true })
    .first()
    .click()
  await page.getByRole('dialog').getByLabel('Amount').fill('20')
  await page.getByRole('dialog').getByText('Groceries', { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()
  await expect(page.getByText('€230.00')).toBeVisible()
})

test('a wallet with transactions keeps its currency and can be archived', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/wallets')
  await page.getByRole('button', { name: /^Cash Cash/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByLabel('Currency')).toBeDisabled()
  await sheet.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText('Wallet archived')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wallets' })).toBeVisible()
  await expect(page.getByText('€611.21')).toHaveCount(0)

  await page.goto('/wallets')
  await page.getByText(/^Archived/).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: /^Cash/ })
    .getByRole('button', { name: 'Restore' })
    .click()
  await expect(page.getByText('Wallet restored')).toBeVisible()
})
