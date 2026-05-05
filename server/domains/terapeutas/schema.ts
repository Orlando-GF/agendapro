import { z } from 'zod'

export const TerapeutaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  telefone: z.string().max(50).optional().nullable(),
  especialidade_id: z.string().uuid().optional().nullable(),
  dias_trabalho: z.array(z.string()).optional().default([]),
  ativo: z.boolean().optional().default(true),
})

export type TerapeutaInput = z.input<typeof TerapeutaSchema>
export type TerapeutaOutput = z.infer<typeof TerapeutaSchema>
