export interface Terapeuta {
  id: string
  nome: string
  telefone?: string | null
  especialidade_id?: string | null
  especialidade_nome?: string | null
  dias_trabalho?: string[] | null
  ativo?: boolean | null
  created_at?: string | null
}
