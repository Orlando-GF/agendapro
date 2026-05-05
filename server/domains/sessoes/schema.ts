import { z } from 'zod'

export const SessaoSchema = z.object({
  id: z.string().uuid().optional(),
  paciente_id: z.string().uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  status: z.enum([
    'AGENDADO', 'PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA',
    'ATESTADO', 'ATESTADO_PROFISSIONAL', 'FALTA_PROFISSIONAL',
    'CANCELADO', 'REPOSTO'
  ]),
  tipo: z.enum(['SESSAO', 'OFICINA', 'REUNIAO', 'OUTRO']).default('SESSAO'),
  titulo: z.string().max(200).optional().nullable(),
  recorrente: z.boolean().optional().default(false),
  observacoes: z.string().optional().nullable(),
  terapeutas_ids: z.array(z.string().uuid()).min(1, 'Pelo menos 1 terapeuta é obrigatório'),
}).refine((data) => {
  if (data.tipo === 'SESSAO') {
    return !!data.paciente_id
  }
  return !!data.titulo?.trim()
}, {
  message: 'Paciente é obrigatório para sessões / Título é obrigatório para outros tipos',
  path: ['paciente_id'],
})

export type SessaoInput = z.input<typeof SessaoSchema>
export type SessaoOutput = z.infer<typeof SessaoSchema>
