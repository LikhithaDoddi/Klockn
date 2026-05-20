import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@klockn.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'testpassword123'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })

  test('switches between login and signup mode', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome back')).toBeVisible()

    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Join Klockn')).toBeVisible()
    await expect(page.getByPlaceholder('Alex Johnson')).toBeVisible()

    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('shows error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('bad@example.com')
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Incorrect email or password.')).toBeVisible({ timeout: 8000 })
  })

  test('shows error when signup fields are empty', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Create account' }).nth(1).click()
    await expect(page.getByText('Please enter your name.')).toBeVisible({ timeout: 5000 })
  })

  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})
