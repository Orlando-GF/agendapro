import { PatientSchema } from './schema'
import type { PatientInput } from './schema'
import type { Patient } from './types'
import * as repository from './repository'

function normalizeInput(input: PatientInput): Omit<Patient, 'id' | 'created_at' | 'updated_at'> {
  const toUpper = (val?: string | null) => (val ? val.toUpperCase() : null)

  return {
    nome: input.nome.toUpperCase(),
    codigo: toUpper(input.codigo),
    telefone: toUpper(input.telefone),
    responsavel: toUpper(input.responsavel),
    horario_padrao: toUpper(input.horario_padrao),
    ativo: input.ativo ?? true,
    em_avaliacao: input.em_avaliacao ?? false,
    whatsapp_adicionado: input.whatsapp_adicionado ?? false,
    judicial: input.judicial ?? false,
    observacoes: toUpper(input.observacoes),
    status_tratamento: input.status_tratamento ?? 'EM_TRATAMENTO',
    motivo_saida: toUpper(input.motivo_saida),
    data_saida: input.data_saida || null,
  }
}

export async function listar(filtro?: string): Promise<Patient[]> {
  return repository.findAll(filtro)
}

export async function salvar(input: PatientInput & { id?: string }): Promise<Patient> {
  const parsed = PatientSchema.parse(input)
  const normalized = normalizeInput(parsed)
  return repository.upsert({ id: input.id, ...normalized } as Patient)
}

export async function excluir(id: string): Promise<void> {
  return repository.remove(id)
}

export async function contar(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number }> {
  return repository.countResumo()
}
