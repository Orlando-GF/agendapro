'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listarPacientesPaginado, contarPacientes, Patient } from '../actions'

export function usePacientes(filtro: string, page: number = 1, limit: number = 50, statusTratamento?: string) {
  const queryClient = useQueryClient()

  const pacientesQuery = useQuery({
    queryKey: ['pacientes', 'list', filtro, page, limit, statusTratamento],
    queryFn: () => listarPacientesPaginado(page, limit, filtro || undefined, statusTratamento),
    staleTime: 30_000,
  })

  const statsQuery = useQuery({
    queryKey: ['pacientes', 'stats'],
    queryFn: () => contarPacientes(),
    staleTime: 60_000,
  })

  const recarregar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pacientes', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['pacientes', 'stats'] }),
    ])
  }

  return {
    pacientes: pacientesQuery.data?.data ?? [],
    total: pacientesQuery.data?.total ?? 0,
    hasMore: pacientesQuery.data?.hasMore ?? false,
    loading: pacientesQuery.isLoading,
    stats: statsQuery.data ?? { total: 0, emAvaliacao: 0, judicial: 0, semWhatsapp: 0, comLaudo: 0 },
    recarregar,
    page,
  }
}
