import { z } from 'zod'

export const GrupoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  dia_semana: z.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  ativo: z.boolean().optional().default(true),
  observacoes: z.string().optional().nullable(),
  terapeutas_ids: z.array(z.string().uuid()).min(1, 'Pelo menos 1 terapeuta é obrigatório'),
})

export const GrupoParticipanteSchema = z.object({
  id: z.string().uuid().optional(),
  grupo_id: z.string().uuid(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  telefone: z.string().max(50).optional().nullable(),
  prontuario_referencia: z.string().max(100).optional().nullable(),
  ativo: z.boolean().optional().default(true),
})

export const GrupoPresencaSchema = z.object({
  id: z.string().uuid().optional(),
  grupo_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  participante_id: z.string().uuid().optional().nullable(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  telefone: z.string().max(50).optional().nullable(),
  prontuario_referencia: z.string().max(100).optional().nullable(),
  presente: z.boolean().optional().default(true),
  ordem_chegada: z.number().int().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

export type GrupoInput = z.input<typeof GrupoSchema>
export type GrupoParticipanteInput = z.input<typeof GrupoParticipanteSchema>
export type GrupoPresencaInput = z.input<typeof GrupoPresencaSchema>
