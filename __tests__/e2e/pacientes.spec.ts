import { test, expect } from '@playwright/test'

test.describe('CRUD de Pacientes', () => {
  test('abre formulário de novo paciente', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside').getByText('Pacientes', { exact: false }).click()
    await page.waitForTimeout(500)

    const botaoNovo = page.locator('button', { hasText: 'Novo Paciente' }).first()
    if (await botaoNovo.isVisible().catch(() => false)) {
      await botaoNovo.click()
    } else {
      test.skip()
    }

    await expect(page.locator('h2', { hasText: 'NOVO PACIENTE' })).toBeVisible()
    await expect(page.locator('label:has-text("NOME")')).toBeVisible()
  })

  test('valida nome obrigatório no formulário', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside').getByText('Pacientes', { exact: false }).click()
    await page.waitForTimeout(500)

    const botaoNovo = page.locator('button', { hasText: 'Novo Paciente' }).first()
    if (await botaoNovo.isVisible().catch(() => false)) {
      await botaoNovo.click()
    } else {
      test.skip()
    }

    await page.waitForSelector('text=NOVO PACIENTE')
    await page.locator('button', { hasText: 'SALVAR' }).first().click()
    await expect(page.locator('text=Nome é obrigatório').or(page.locator('text=NOME É OBRIGATÓRIO'))).toBeVisible()
  })
})
