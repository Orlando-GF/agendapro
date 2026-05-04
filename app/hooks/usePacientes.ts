'use client'

import { useState, useEffect } from 'react'
import { listarPacientes, contarPacientes, Patient } from '../actions'

export function usePacientes(filtro: string, toastError: (msg: string) => void) {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, emAvaliacao: 0, judicial: 0, semWhatsapp: 0 })

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      listarPacientes(filtro || undefined)
        .then(setPacientes)
        .catch(err => toastError(err.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [filtro])

  useEffect(() => {
    contarPacientes().then(setStats).catch(err => toastError(err.message))
  }, [pacientes.length])

  const recarregar = async (filtroAtual?: string) => {
    const p = await listarPacientes(filtroAtual || undefined)
    setPacientes(p)
    const c = await contarPacientes()
    setStats(c)
  }

  return { pacientes, loading, stats, recarregar }
}
