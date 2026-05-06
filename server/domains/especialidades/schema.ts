import { z } from 'zod'

export const EspecialidadeSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
})

export type EspecialidadeInput = z.input<typeof EspecialidadeSchema>
export type EspecialidadeOutput = z.infer<typeof EspecialidadeSchema>
