import { z } from 'zod'

export const PlantaoSchema = z.object({
  id: z.string().uuid().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  titulo: z.string().max(200).optional().default('ATENDIMENTO PSIQUIÁTRICO'),
  observacoes: z.string().optional().nullable(),
  terapeutas_ids: z.array(z.string().uuid()).min(1, 'Pelo menos 1 terapeuta é obrigatório'),
})

export const PlantaoParticipanteSchema = z.object({
  id: z.string().uuid().optional(),
  plantao_id: z.string().uuid(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  telefone: z.string().max(50).optional().nullable(),
  prontuario_referencia: z.string().max(100).optional().nullable(),
  ordem_chegada: z.number().int().optional().default(0),
  presente: z.boolean().optional().default(true),
  observacoes: z.string().optional().nullable(),
})

export type PlantaoInput = z.input<typeof PlantaoSchema>
export type PlantaoParticipanteInput = z.input<typeof PlantaoParticipanteSchema>
