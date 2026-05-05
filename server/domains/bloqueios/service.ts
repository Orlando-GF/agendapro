import type { Bloqueio } from '../sessoes/types'
import * as repository from './repository'

export async function criar(dados: {
  terapeuta_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  motivo?: string
}): Promise<Bloqueio> {
  return repository.create(dados)
}

export async function excluir(id: string): Promise<void> {
  return repository.remove(id)
}
