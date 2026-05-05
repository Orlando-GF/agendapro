import { z } from 'zod'

export const PatientSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  codigo: z.string().max(50).optional().nullable(),
  telefone: z.string().max(50).optional().nullable(),
  responsavel: z.string().max(200).optional().nullable(),
  horario_padrao: z.string().max(50).optional().nullable(),
  ativo: z.boolean().optional().default(true),
  em_avaliacao: z.boolean().optional().default(false),
  whatsapp_adicionado: z.boolean().optional().default(false),
  judicial: z.boolean().optional().default(false),
  observacoes: z.string().optional().nullable(),
  status_tratamento: z.enum(['EM_TRATAMENTO', 'ALTA', 'DESISTIU', 'MUDANCA']).optional().default('EM_TRATAMENTO'),
  motivo_saida: z.string().optional().nullable(),
  data_saida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export type PatientInput = z.input<typeof PatientSchema>
export type PatientOutput = z.infer<typeof PatientSchema>
