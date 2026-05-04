'use client'

import { useState, useEffect } from 'react'
import { listarSessoes, listarBloqueios, listarAusencias, Sessao, Bloqueio, Ausencia } from '../actions'
import { formatDateISO } from '@/lib/date-helpers'



function getSemanaFim(segunda: Date): Date {
  const sexta = new Date(segunda)
  sexta.setDate(segunda.getDate() + 4)
  return sexta
}

export function useAgenda(semanaAtual: Date, viewAtiva: string, toastError: (msg: string) => void) {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (viewAtiva !== 'agenda') return
    setLoading(true)
    let cancelled = false
    const inicio = formatDateISO(semanaAtual)
    const fim = formatDateISO(getSemanaFim(semanaAtual))
    listarSessoes(inicio, fim)
      .then(data => { if (!cancelled) setSessoes(data) })
      .catch(err => { if (!cancelled) toastError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    listarAusencias()
      .then(data => { if (!cancelled) setAusencias(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [viewAtiva, semanaAtual])

  useEffect(() => {
    if (viewAtiva !== 'agenda') return
    let cancelled = false
    const inicio = formatDateISO(semanaAtual)
    const fim = formatDateISO(getSemanaFim(semanaAtual))
    listarBloqueios(inicio, fim)
      .then(data => { if (!cancelled) setBloqueios(data) })
      .catch(err => { if (!cancelled) toastError(err.message) })
    listarAusencias()
      .then(data => { if (!cancelled) setAusencias(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [viewAtiva, semanaAtual])

  const recarregar = async () => {
    const inicio = formatDateISO(semanaAtual)
    const fim = formatDateISO(getSemanaFim(semanaAtual))
    setSessoes(await listarSessoes(inicio, fim))
    setBloqueios(await listarBloqueios(inicio, fim))
    setAusencias(await listarAusencias())
  }

  return { sessoes, bloqueios, ausencias, loading, recarregar }
}
