import { test, expect } from '@playwright/test'

test.describe('Página Inicial', () => {
  test('carrega a aplicação e mostra a sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'AgendaPro' })).toBeVisible()
    await expect(page.locator('aside button').filter({ hasText: 'Agenda' })).toBeVisible()
    await expect(page.locator('aside button').filter({ hasText: 'Pacientes' })).toBeVisible()
  })

  test('navega para a view de Pacientes', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside button').filter({ hasText: 'Pacientes' }).click()
    await expect(page.locator('th:has-text("NOME")').or(page.locator('text=NENHUM PACIENTE ENCONTRADO'))).toBeVisible()
  })

  test('navega para a view de Agenda', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside button').filter({ hasText: 'Agenda' }).click()
    await expect(page.locator('th:has-text("HORÁRIO")')).toBeVisible()
  })

  test('navega para a view de Recepção', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside button').filter({ hasText: 'Recepção' }).click()
    await expect(page.locator('text=AGENDA DO DIA').or(page.locator('text=Carregando...'))).toBeVisible()
  })
})
