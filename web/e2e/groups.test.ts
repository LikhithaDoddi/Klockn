import { test, expect, Page } from '@playwright/test'

// Shared login helper
async function loginAsTestUser(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(process.env.TEST_EMAIL ?? 'test@klockn.com')
  await page.getByPlaceholder('••••••••').fill(process.env.TEST_PASSWORD ?? 'testpassword123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 })
  if (page.url().includes('/onboarding')) {
    await page.goto('/dashboard')
  }
}

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('dashboard shows groups list or empty state', async ({ page }) => {
    await expect(page.getByText('Your groups')).toBeVisible()
    const hasGroups = await page.locator('button').filter({ hasText: /(member|members)/ }).count()
    if (hasGroups === 0) {
      await expect(page.getByText('No groups yet')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Create your first group' })).toBeVisible()
    }
  })

  test('can navigate to create group page', async ({ page }) => {
    await page.getByRole('link', { name: 'New group' }).click()
    await expect(page).toHaveURL(/\/groups\/create/)
    await expect(page.getByText('New group')).toBeVisible()
    await expect(page.getByPlaceholder(/e\.g\. Weekend crew/)).toBeVisible()
  })

  test('create group form validates empty name', async ({ page }) => {
    await page.goto('/dashboard/groups/create')
    const createBtn = page.getByRole('button', { name: 'Create group' })
    await expect(createBtn).toBeDisabled()
  })

  test('can create a new group', async ({ page }) => {
    await page.goto('/dashboard/groups/create')
    const uniqueName = `Test Group ${Date.now()}`
    await page.getByPlaceholder(/e\.g\. Weekend crew/).fill(uniqueName)
    await page.getByRole('button', { name: 'Create group' }).click()
    await expect(page).toHaveURL(/\/dashboard\/groups\/[a-z0-9-]+$/, { timeout: 8000 })
    await expect(page.getByText(uniqueName)).toBeVisible()
  })

  test('group detail page shows members section and invite form', async ({ page }) => {
    // Create a group first
    await page.goto('/dashboard/groups/create')
    await page.getByPlaceholder(/e\.g\. Weekend crew/).fill(`E2E Group ${Date.now()}`)
    await page.getByRole('button', { name: 'Create group' }).click()
    await page.waitForURL(/\/dashboard\/groups\/[a-z0-9-]+$/)

    await expect(page.getByText('Invite someone')).toBeVisible()
    await expect(page.getByPlaceholder('friend@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeVisible()
    await expect(page.getByText('Members')).toBeVisible()
    await expect(page.getByText("This week's availability")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask AI' })).toBeVisible()
  })

  test('invite button is disabled when email is empty', async ({ page }) => {
    await page.goto('/dashboard/groups/create')
    await page.getByPlaceholder(/e\.g\. Weekend crew/).fill(`E2E Group ${Date.now()}`)
    await page.getByRole('button', { name: 'Create group' }).click()
    await page.waitForURL(/\/dashboard\/groups\/[a-z0-9-]+$/)

    await expect(page.getByRole('button', { name: 'Send invite' })).toBeDisabled()
  })

  test('delete group button is visible and prompts confirmation', async ({ page }) => {
    await page.goto('/dashboard/groups/create')
    await page.getByPlaceholder(/e\.g\. Weekend crew/).fill(`Delete Test ${Date.now()}`)
    await page.getByRole('button', { name: 'Create group' }).click()
    await page.waitForURL(/\/dashboard\/groups\/[a-z0-9-]+$/)

    // Set up dialog handler to dismiss
    page.on('dialog', (dialog) => dialog.dismiss())
    await expect(page.getByRole('button', { name: 'Delete group' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete group' }).click()
    // Dialog was dismissed — we should still be on the group page
    await expect(page).toHaveURL(/\/dashboard\/groups\/[a-z0-9-]+$/)
  })
})
