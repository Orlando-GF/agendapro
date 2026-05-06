'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { recepcaoDia, listarAusencias, listarBloqueios, Sessao, Ausencia, Bloqueio } from '../actions'
import { formatDateISO } from '@/lib/date-helpers'
import { useRealtime } from './useRealtime'

export function useRecepcao(dataAtual: Date, viewAtiva: string, _toastError?: (msg: string) => void) {
  const queryClient = useQueryClient()
  const dataISO = formatDateISO(dataAtual)

  const enabled = viewAtiva === 'recepcao'

  const sessoesQuery = useQuery({
    queryKey: ['recepcao', 'sessoes', dataISO],
    queryFn: () => recepcaoDia(dataISO),
    enabled,
    staleTime: 15_000,
  })

  const ausenciasQuery = useQuery({
    queryKey: ['recepcao', 'ausencias', dataISO],
    queryFn: () => listarAusencias(dataISO, dataISO),
    enabled,
    staleTime: 60_000,
  })

  const bloqueiosQuery = useQuery({
    queryKey: ['recepcao', 'bloqueios', dataISO],
    queryFn: () => listarBloqueios(dataISO, dataISO),
    enabled,
    staleTime: 30_000,
  })

  const loading = sessoesQuery.isLoading || ausenciasQuery.isLoading || bloqueiosQuery.isLoading

  const recarregarTudo = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['recepcao', 'sessoes', dataISO], type: 'active' })
    queryClient.refetchQueries({ queryKey: ['recepcao', 'ausencias', dataISO], type: 'active' })
    queryClient.refetchQueries({ queryKey: ['recepcao', 'bloqueios', dataISO], type: 'active' })
    queryClient.invalidateQueries({ queryKey: ['agenda'] })
    queryClient.invalidateQueries({ queryKey: ['relatorios'] })
  }, [queryClient, dataISO])

  useRealtime({ table: 'sessoes', onChange: recarregarTudo })
  useRealtime({ table: 'sessao_terapeutas', onChange: recarregarTudo })
  useRealtime({ table: 'ausencias', onChange: recarregarTudo })
  useRealtime({ table: 'bloqueios', onChange: recarregarTudo })

  const recarregar = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['recepcao', 'sessoes', dataISO], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['recepcao', 'ausencias', dataISO], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['recepcao', 'bloqueios', dataISO], type: 'active' }),
    ])
  }

  return {
    sessoes: sessoesQuery.data ?? [],
    ausencias: ausenciasQuery.data ?? [],
    bloqueios: bloqueiosQuery.data ?? [],

    loading,
    recarregar,
  }
}
