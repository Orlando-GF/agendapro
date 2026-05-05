import { TerapeutaSchema } from './schema'
import type { TerapeutaInput } from './schema'
import type { Terapeuta } from './types'
import * as repository from './repository'

function normalizeInput(input: TerapeutaInput): Partial<Terapeuta> {
  return {
    nome: input.nome.toUpperCase(),
    telefone: input.telefone ? input.telefone.toUpperCase() : null,
    especialidade_id: input.especialidade_id || null,
    dias_trabalho: input.dias_trabalho ?? [],
    ativo: input.ativo ?? true,
  }
}

export async function listar(): Promise<Terapeuta[]> {
  return repository.findAll()
}

export async function salvar(input: TerapeutaInput & { id?: string }): Promise<Terapeuta> {
  const parsed = TerapeutaSchema.parse(input)
  const normalized = normalizeInput(parsed)
  return repository.upsert({ id: input.id, ...normalized })
}

export async function excluir(id: string): Promise<void> {
  return repository.remove(id)
}
