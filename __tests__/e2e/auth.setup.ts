import { test as setup, expect } from '@playwright/test'

const authFile = '__tests__/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('admin@exemplo.com').fill('orlando@cer.com')
  await page.getByPlaceholder('••••••••').fill('123456')
  await page.getByRole('button', { name: 'ENTRAR' }).click()

  // Espera redirecionamento para a home
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: 'AgendaPro' })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
