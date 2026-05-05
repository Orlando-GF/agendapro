export interface SessaoTerapeuta {
  id: string
  nome: string
  especialidade_nome?: string | null
  ativo?: boolean | null
  status?: string | null
}

export interface Sessao {
  id: string
  paciente_id?: string | null
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  tipo?: string | null
  titulo?: string | null
  recorrente?: boolean | null
  observacoes?: string | null
  paciente_nome?: string | null
  paciente_codigo?: string | null
  paciente_em_avaliacao?: boolean | null
  terapeutas?: SessaoTerapeuta[]
  created_at?: string | null
  updated_at?: string | null
}

export interface Bloqueio {
  id: string
  terapeuta_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  motivo?: string | null
  dia_semana?: number | null
  created_at?: string | null
}

export interface Ausencia {
  id: string
  terapeuta_id: string
  data_inicio: string
  data_fim: string
  motivo?: string | null
  created_at?: string | null
}
