'use client'

import { useState, useEffect } from 'react'

interface CrudActions<T> {
  listar: () => Promise<T[]>
}

export function useCrudList<T>(
  viewAtiva: string,
  viewEsperada: string,
  actions: CrudActions<T>,
  toastError: (msg: string) => void,
  initialItems: T[] = []
) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (viewAtiva !== viewEsperada) return
    setLoading(true)
    let cancelled = false
    actions.listar()
      .then(data => { if (!cancelled) setItems(data) })
      .catch(err => { if (!cancelled) toastError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [viewAtiva])

  const recarregar = async () => {
    setItems(await actions.listar())
  }

  return { items, loading, setItems, recarregar }
}
