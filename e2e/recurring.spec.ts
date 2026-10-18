import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

// The same day of the month, `months` back (clamped like the app does).
function monthsAgo(months: number) {
  const now = new Date()
  const target = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() - months, 1),
  )
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(now.getDate(), lastDay))
  return target.toISOString().slice(0, 10)
}

test('a recurring payment records what is due, once, and can be paused', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/recurring')
  await expect(page.getByRole('heading', { name: 'Recurring' })).toBeVisible()
  // The demo comes with salary, rent and subscriptions.
  await expect(page.getByRole('listitem').first()).toBeVisible()

  await page.getByRole('button', { name: 'New', exact: true }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel(/Amount in/).fill('30')
  await sheet.getByLabel('Category').selectOption({ label: 'Health' })
  await sheet.getByLabel(/Paid to/).fill('E2E Gym')
  await sheet.getByLabel('First payment').fill(monthsAgo(2))
  await expect(sheet.getByText(/Every month on the/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Create recurring payment' }).click()
  await expect(page.getByText('Recurring payment created')).toBeVisible()

  const gym = page.getByRole('button', { name: /E2E Gym/ })
  await expect(gym).toContainText(/Next/)

  // Two months back, one month back and today.
  await page.goto('/activity?q=E2E%20Gym')
  await expect(page.getByRole('button', { name: /E2E Gym/ })).toHaveCount(3)
  await page.reload()
  await expect(page.getByRole('button', { name: /E2E Gym/ })).toHaveCount(3)

  await page.goto('/recurring')
  await gym.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Paused', { exact: true })).toBeVisible()
  await expect(gym).toContainText('Paused')
})
