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

test('a deleted transaction can be restored from recent changes', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('7.70')
  await sheet.getByLabel('Paid to').fill('Restore Bakery')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=Restore%20Bakery')
  await page.getByRole('button', { name: /Restore Bakery/ }).click()
  await page.getByRole('button', { name: 'Delete transaction' }).click()
  // The server deletes it once the undo toast closes.
  await expect(page.getByText('Transaction deleted')).toBeVisible()
  await expect(page.getByText('Transaction deleted')).toBeHidden({
    timeout: 15_000,
  })

  await page.goto('/spaces')
  await page.getByRole('link', { name: /Personal/ }).click()
  const changes = page.getByRole('region', { name: 'Recent changes' })
  await expect(changes).toContainText('You deleted Restore Bakery, €7.70')
  await changes.getByRole('button', { name: 'Restore' }).first().click()
  await expect(page.getByText('Transaction restored')).toBeVisible()
  await expect(changes).toContainText('You added Restore Bakery, €7.70')

  await page.goto('/activity?q=Restore%20Bakery')
  await expect(
    page.getByRole('button', { name: /Restore Bakery/ }),
  ).toContainText('Groceries')
})

test('the latest change to a transaction can be undone from recent changes', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('5')
  await sheet.getByLabel('Paid to').fill('Undo Cafe')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=Undo%20Cafe')
  await page.getByRole('button', { name: /Undo Cafe/ }).click()
  await page.getByRole('dialog').getByLabel('Amount').fill('9')
  await page.getByRole('dialog').getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense updated')).toBeVisible()

  await page.goto('/spaces')
  await page.getByRole('link', { name: /Personal/ }).click()
  const changes = page.getByRole('region', { name: 'Recent changes' })
  await expect(changes).toContainText('You changed Undo Cafe: €5.00 → €9.00')
  await changes.getByRole('button', { name: 'Undo' }).first().click()
  await expect(page.getByText('Change undone')).toBeVisible()
  await expect(changes).toContainText('You changed Undo Cafe: €9.00 → €5.00')

  await page.goto('/activity?q=Undo%20Cafe')
  await expect(page.getByRole('button', { name: /Undo Cafe/ })).toContainText(
    '−€5.00',
  )
})
