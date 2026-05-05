import { describe, it, expect } from 'vitest'
import { PatientSchema } from '@/server/domains/pacientes/schema'
import { TerapeutaSchema } from '@/server/domains/terapeutas/schema'
import { SessaoSchema } from '@/server/domains/sessoes/schema'

describe('PatientSchema', () => {
  it('aceita paciente válido', () => {
    const result = PatientSchema.safeParse({
      nome: 'JOÃO SILVA',
      codigo: 'P001',
      telefone: '(77) 99999-9999',
      ativo: true,
      em_avaliacao: false,
      status_tratamento: 'EM_TRATAMENTO',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = PatientSchema.safeParse({ nome: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('nome')
    }
  })

  it('rejeita nome muito longo', () => {
    const result = PatientSchema.safeParse({ nome: 'A'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('aplica defaults corretamente', () => {
    const result = PatientSchema.parse({ nome: 'MARIA' })
    expect(result.ativo).toBe(true)
    expect(result.em_avaliacao).toBe(false)
    expect(result.whatsapp_adicionado).toBe(false)
    expect(result.judicial).toBe(false)
    expect(result.status_tratamento).toBe('EM_TRATAMENTO')
  })
})

describe('TerapeutaSchema', () => {
  it('aceita terapeuta válido', () => {
    const result = TerapeutaSchema.safeParse({
      nome: 'DRA. ANA',
      especialidade_id: '123e4567-e89b-12d3-a456-426614174000',
      dias_trabalho: ['Segunda-feira', 'Terça-feira'],
      ativo: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = TerapeutaSchema.safeParse({ nome: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita especialidade_id inválido', () => {
    const result = TerapeutaSchema.safeParse({
      nome: 'DR. CARLOS',
      especialidade_id: 'invalid-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('SessaoSchema', () => {
  it('aceita sessão válida', () => {
    const result = SessaoSchema.safeParse({
      paciente_id: '123e4567-e89b-12d3-a456-426614174000',
      data: '2024-05-05',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      status: 'AGENDADO',
      tipo: 'SESSAO',
      terapeutas_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita sessão SEM paciente quando tipo é SESSAO', () => {
    const result = SessaoSchema.safeParse({
      data: '2024-05-05',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      status: 'AGENDADO',
      tipo: 'SESSAO',
      terapeutas_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    })
    expect(result.success).toBe(false)
  })

  it('aceita OFICINA sem paciente (com título)', () => {
    const result = SessaoSchema.safeParse({
      data: '2024-05-05',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      status: 'AGENDADO',
      tipo: 'OFICINA',
      titulo: 'Grupo de Pais',
      terapeutas_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita sem terapeutas', () => {
    const result = SessaoSchema.safeParse({
      paciente_id: '123e4567-e89b-12d3-a456-426614174000',
      data: '2024-05-05',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      status: 'AGENDADO',
      tipo: 'SESSAO',
      terapeutas_ids: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita data mal formatada', () => {
    const result = SessaoSchema.safeParse({
      paciente_id: '123e4567-e89b-12d3-a456-426614174000',
      data: '05-05-2024',
      hora_inicio: '08:00',
      hora_fim: '09:00',
      status: 'AGENDADO',
      tipo: 'SESSAO',
      terapeutas_ids: ['123e4567-e89b-12d3-a456-426614174001'],
    })
    expect(result.success).toBe(false)
  })
})
