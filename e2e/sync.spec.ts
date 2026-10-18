import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('a change in one tab shows up in another, and offline is announced', async ({
  page,
  context,
}) => {
  await startDemo(page)
  const other = await context.newPage()
  await other.goto('/categories')
  await expect(other.getByRole('heading', { name: 'Categories' })).toBeVisible()

  await page.goto('/categories')
  await page.getByRole('button', { name: 'New category' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill('Synced')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create category' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()
  await expect(other.getByRole('button', { name: 'Synced' })).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByText(/You are offline/)).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText(/You are offline/)).toHaveCount(0)
})
