import { expect, test } from '@playwright/test'

import { expectNoAxeViolations, startDemo } from './helpers'

test('an invite to a shared space is emailed and shown as a link', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/spaces')
  await page.getByRole('button', { name: 'New space' }).click()
  await page.getByLabel('Name').fill('E2E Flat')
  await page.getByRole('button', { name: 'Create space' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'E2E Flat' }),
  ).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill('flatmate@example.com')
  await expect(page.getByLabel('Email the invite to them')).toBeChecked()
  await page.getByRole('button', { name: 'Create invite link' }).click()
  await expect(page.getByText(/Emailed to flatmate@example.com/)).toBeVisible()
  await expect(page.getByLabel('Invite link')).toHaveValue(/\/invite\//)
  await expect(
    page.getByRole('region', { name: 'Recent changes' }),
  ).toContainText('Nothing yet')
  await expectNoAxeViolations(page)
})
