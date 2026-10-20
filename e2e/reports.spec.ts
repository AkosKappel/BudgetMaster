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

test('net worth today adds up the wallets, other currencies converted', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/wallets')
  await expect(page.getByRole('heading', { name: 'Wallets' })).toBeVisible()
  const amounts = await page
    .getByRole('main')
    .getByRole('listitem')
    .allInnerTexts()
  // Archived wallets hold 0 here.
  const total = (symbol: string) =>
    amounts
      .map((text) =>
        new RegExp(`([−-]?)\\${symbol}([\\d,]+\\.\\d{2})`).exec(text),
      )
      .filter((m) => m !== null)
      .reduce(
        (sum, [, sign, value]) =>
          sum +
          (sign ? -1 : 1) * Math.round(Number(value.replaceAll(',', '')) * 100),
        0,
      )
  const euros = total('€')
  const dollars = total('$')

  await page.goto('/reports')
  const netWorth = page.getByRole('region', { name: 'Net worth' })
  const text = await netWorth.locator('figcaption').innerText()
  const [, sign, value] = /([−-]?)€([\d,]+\.\d{2}) today/.exec(text) ?? []
  const cents =
    (sign ? -1 : 1) * Math.round(Number(value.replaceAll(',', '')) * 100)
  // The dollar wallet counts at the ECB rate of the day, so only its range is known; without
  // rates (no network) it is left out.
  const low = euros + Math.min(dollars * 0.5, dollars * 1.5)
  const high = euros + Math.max(dollars * 0.5, dollars * 1.5)
  expect(cents === euros || (cents >= low && cents <= high)).toBe(true)
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

test('prices you pay compare regular payees with a year ago', async ({
  page,
}) => {
  await startDemo(page)
  await page.goto('/reports')
  const prices = page.getByRole('region', { name: 'Prices you pay' })
  await expect(prices.getByText(/regular payees/)).toBeVisible()
  await expect(
    prices.getByRole('listitem').filter({ hasText: 'Netflix' }),
  ).toContainText('→')
})

test('year in review sums up the year and switches years', async ({ page }) => {
  await startDemo(page)
  await page.goto('/year-in-review')
  await expect(page.getByText('Days without spending')).toBeVisible()
  const lastYear = String(new Date().getFullYear() - 1)
  await page.getByLabel('Year').selectOption(lastYear)
  await expect(page).toHaveURL(new RegExp(`year=${lastYear}`))
  await expect(
    page.getByRole('heading', { level: 1, name: `${lastYear} in money` }),
  ).toBeVisible()
})
