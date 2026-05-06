export interface Patient {
  id: string
  nome: string
  codigo?: string | null
  telefone?: string | null
  responsavel?: string | null
  horario_padrao?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
  laudo?: boolean | null
  observacoes?: string | null
  status_tratamento?: 'EM_TRATAMENTO' | 'ALTA' | 'DESISTIU' | 'MUDANCA' | null
  motivo_saida?: string | null
  data_saida?: string | null
  created_at?: string | null
  updated_at?: string | null
}
