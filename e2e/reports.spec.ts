import { expect, test } from '@playwright/test'

import { expectNoAxeViolations, startDemo } from './helpers'

test('cash flow shows a year of months that open in activity', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/reports')
  await expect(page.getByText(/complete months you earned/)).toBeVisible()
  const cashFlow = page.getByRole('region', { name: 'Income and spending' })
  await cashFlow.getByText('Show as table').click()
  const rows = cashFlow.locator('tbody tr')
  await expect(rows).toHaveCount(12)
  await rows.first().getByRole('link').click()
  await expect(page).toHaveURL(/\/activity\?.*from=\d{4}-\d{2}-\d{2}.*to=/)
  await expect(page.getByRole('button', { name: /Filters/ })).toContainText('2')
})

test('net worth today matches the wallet balances, and the calendar is filled', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/wallets')
  await expect(page.getByRole('heading', { name: 'Wallets' })).toBeVisible()
  const amounts = await page
    .getByRole('main')
    .getByRole('listitem')
    .allInnerTexts()
  // Euro wallets only: net worth counts the space currency (archived wallets hold 0 here).
  const cents = amounts
    .map((text) => /([−-]?)€([\d,]+\.\d{2})/.exec(text))
    .filter((m) => m !== null)
    .reduce(
      (sum, [, sign, value]) =>
        sum +
        (sign ? -1 : 1) * Math.round(Number(value.replaceAll(',', '')) * 100),
      0,
    )
  const expected = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)

  await page.goto('/reports')
  await expect(
    page
      .getByRole('region', { name: 'Net worth' })
      .getByText(`${expected} today`),
  ).toBeVisible()
  await expect(
    page.getByText(/days without spending in the last 27 weeks/),
  ).toBeVisible()
})

test('money flow and category trends describe last month', async ({ page }) => {
  await startDemo(page)
  await page.goto('/reports')
  const flow = page.getByRole('region', { name: "Last month's money flow" })
  await expect(flow.getByText(/came in and .* went out/)).toBeVisible()
  await flow.getByText('Show as table').click()
  await expect(flow.locator('tbody tr').first()).toBeVisible()
  const trends = page.getByRole('region', { name: 'Spending by category' })
  await expect(trends.getByRole('listitem').first()).toBeVisible()
})

test('the forecast lists the known payments of the next 90 days', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/reports')
  const forecast = page.getByRole('region', { name: 'Next 90 days' })
  await expect(
    forecast.getByText(
      /(Tightest on|Never lower than|Below zero from) .* Ends at/,
    ),
  ).toBeVisible()
  await forecast.getByText('Show payments').click()
  await expect(
    forecast.getByRole('row', { name: /Acme Corp/ }).first(),
  ).toBeVisible()
})

test('the monthly report sums up last month and goes back a month', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/reports')
  await page.getByRole('link', { name: 'Monthly report' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: /Monthly report/ }),
  ).toBeVisible()
  await expect(page.getByText(/You kept .* % of your income/)).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Top categories' }).locator('tbody tr'),
  ).not.toHaveCount(0)
  await page.getByRole('link', { name: 'Previous month' }).click()
  await expect(page).toHaveURL(/month=-2/)
  await expectNoAxeViolations(page)
})
