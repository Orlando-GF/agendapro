'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { agendaSemana, listarBloqueios, listarAusencias, Sessao, Bloqueio, Ausencia } from '../actions'
import { formatDateISO } from '@/lib/date-helpers'
import { useRealtime } from './useRealtime'

function getSemanaFim(segunda: Date): Date {
  const sexta = new Date(segunda)
  sexta.setDate(segunda.getDate() + 4)
  return sexta
}

export function useAgenda(semanaAtual: Date, viewAtiva: string, _toastError?: (msg: string) => void) {
  const queryClient = useQueryClient()
  const inicio = formatDateISO(semanaAtual)
  const fim = formatDateISO(getSemanaFim(semanaAtual))

  const enabled = viewAtiva === 'agenda'

  const sessoesQuery = useQuery({
    queryKey: ['agenda', 'sessoes', inicio, fim],
    queryFn: () => agendaSemana(inicio, fim),
    enabled,
    staleTime: 30_000,
  })

  const bloqueiosQuery = useQuery({
    queryKey: ['agenda', 'bloqueios', inicio, fim],
    queryFn: () => listarBloqueios(inicio, fim),
    enabled,
    staleTime: 30_000,
  })

  const ausenciasQuery = useQuery({
    queryKey: ['agenda', 'ausencias'],
    queryFn: () => listarAusencias(),
    enabled,
    staleTime: 60_000,
  })

  const loading = sessoesQuery.isLoading || bloqueiosQuery.isLoading || ausenciasQuery.isLoading

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda', 'sessoes', inicio, fim] })
    queryClient.invalidateQueries({ queryKey: ['agenda', 'bloqueios', inicio, fim] })
    queryClient.invalidateQueries({ queryKey: ['agenda', 'ausencias'] })
    queryClient.invalidateQueries({ queryKey: ['recepcao'] })
  }

  useRealtime({ table: 'sessoes', onChange: invalidateAll })
  useRealtime({ table: 'sessao_terapeutas', onChange: invalidateAll })
  useRealtime({ table: 'bloqueios', onChange: invalidateAll })
  useRealtime({ table: 'ausencias', onChange: invalidateAll })

  const recarregar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['agenda', 'sessoes', inicio, fim] }),
      queryClient.invalidateQueries({ queryKey: ['agenda', 'bloqueios', inicio, fim] }),
      queryClient.invalidateQueries({ queryKey: ['agenda', 'ausencias'] }),
    ])
  }

  return {
    sessoes: sessoesQuery.data ?? [],
    bloqueios: bloqueiosQuery.data ?? [],
    ausencias: ausenciasQuery.data ?? [],
    loading,
    recarregar,
  }
}
