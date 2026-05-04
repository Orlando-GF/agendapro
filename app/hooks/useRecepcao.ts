'use client'

import { useState, useEffect } from 'react'
import { listarSessoes, listarAusencias, Sessao, Ausencia } from '../actions'
import { formatDateISO } from '@/lib/date-helpers'

export function useRecepcao(dataRecepcao: Date, viewAtiva: string, toastError: (msg: string) => void) {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (viewAtiva !== 'recepcao') return
    setLoading(true)
    let cancelled = false
    const dia = formatDateISO(dataRecepcao)
    Promise.all([
      listarSessoes(dia, dia),
      listarAusencias(),
    ])
      .then(([sessoesData, ausenciasData]) => {
        if (!cancelled) {
          setSessoes(sessoesData)
          setAusencias(ausenciasData)
        }
      })
      .catch(err => { if (!cancelled) toastError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [viewAtiva, dataRecepcao])

  const recarregar = async () => {
    const dia = formatDateISO(dataRecepcao)
    const [sessoesData, ausenciasData] = await Promise.all([
      listarSessoes(dia, dia),
      listarAusencias(),
    ])
    setSessoes(sessoesData)
    setAusencias(ausenciasData)
  }

  return { sessoes, ausencias, loading, recarregar }
}
