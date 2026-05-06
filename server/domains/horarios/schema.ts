import { z } from 'zod'

export const HorarioSchema = z.object({
  id: z.string().uuid().optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  ordem: z.number().int().min(1, 'Ordem deve ser maior que 0'),
}).refine((data) => data.hora_inicio < data.hora_fim, {
  message: 'Hora de início deve ser anterior à hora de fim',
  path: ['hora_fim'],
})

export type HorarioInput = z.input<typeof HorarioSchema>
export type HorarioOutput = z.infer<typeof HorarioSchema>
