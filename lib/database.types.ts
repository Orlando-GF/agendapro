export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      horarios: {
        Row: {
          id: string
          hora_inicio: string
          hora_fim: string
          ordem: number
          created_at?: string
        }
        Insert: Omit<Database['public']['Tables']['horarios']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['horarios']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['horarios']['Row']>
      }
      especialidades: {
        Row: {
          id: string
          nome: string
          created_at?: string
        }
        Insert: Omit<Database['public']['Tables']['especialidades']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['especialidades']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['especialidades']['Row']>
      }
      terapeutas: {
        Row: {
          id: string
          nome: string
          telefone?: string
          especialidade_id?: string
          dias_trabalho?: string[]
          created_at?: string
        }
        Insert: Omit<Database['public']['Tables']['terapeutas']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['terapeutas']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['terapeutas']['Row']>
      }
      patients: {
        Row: {
          id: string
          nome: string
          codigo?: string
          telefone?: string
          responsavel?: string
          horario_padrao?: string
          ativo?: boolean
          em_avaliacao?: boolean
          whatsapp_adicionado?: boolean
          judicial?: boolean
          observacoes?: string
          created_at?: string
          updated_at?: string
        }
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['patients']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['patients']['Row']>
      }
      sessoes: {
        Row: {
          id: string
          paciente_id: string
          data: string
          hora_inicio: string
          hora_fim: string
          status: string
          observacoes?: string
          created_at?: string
          updated_at?: string
        }
        Insert: Omit<Database['public']['Tables']['sessoes']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['sessoes']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['sessoes']['Row']>
      }
      sessao_terapeutas: {
        Row: {
          sessao_id: string
          terapeuta_id: string
        }
        Insert: Database['public']['Tables']['sessao_terapeutas']['Row']
        Update: Database['public']['Tables']['sessao_terapeutas']['Row']
      }
      bloqueios: {
        Row: {
          id: string
          terapeuta_id: string
          data: string
          hora_inicio: string
          hora_fim: string
          motivo?: string
          created_at?: string
        }
        Insert: Omit<Database['public']['Tables']['bloqueios']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['bloqueios']['Row'], 'id'>>
        Update: Partial<Database['public']['Tables']['bloqueios']['Row']>
      }
    }
    Views: {
    }
    Functions: {
      contar_pacientes_resumo: {
        Returns: Array<{
          total: number
          em_avaliacao: number
          judicial: number
          sem_whatsapp: number
        }>
      }
      salvar_paciente_completo: {
        Args: {
          p_paciente: Json
        }
        Returns: Json
      }
      salvar_sessao_completa: {
        Args: {
          p_sessao: Json
          p_terapeutas_ids: string[]
        }
        Returns: Json
      }
      listar_sessoes_completas: {
        Args: {
          p_data_inicio: string
          p_data_fim: string
        }
        Returns: Array<{
          id: string
          paciente_id: string
          paciente_nome: string
          data: string
          hora_inicio: string
          hora_fim: string
          status: string
          observacoes: string
          terapeutas: Json
        }>
      }
      listar_bloqueios_semana: {
        Args: {
          p_data_inicio: string
          p_data_fim: string
        }
        Returns: Array<{
          id: string
          terapeuta_id: string
          data: string
          hora_inicio: string
          hora_fim: string
          motivo: string
        }>
      }
    }
  }
}
