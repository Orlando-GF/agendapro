'use client'

import { useState, useRef, useEffect } from 'react'

interface Item {
  id: string
  label: string
  subtitle?: string
}

interface Props {
  label: string
  placeholder?: string
  items: Item[]
  value: string
  onChange: (id: string) => void
  erro?: string
}

export function SearchableSelect({ label, placeholder = 'BUSCAR...', items, value, onChange, erro }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selecionado = items.find(i => i.id === value)

  const filtrados = items.filter(i => {
    const q = busca.toLowerCase()
    return i.label.toLowerCase().includes(q) || (i.subtitle || '').toLowerCase().includes(q)
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className={`w-full text-left rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 bg-white ${
          erro ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        }`}
      >
        {selecionado ? (
          <span className="text-gray-900">{selecionado.label}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 flex flex-col">
          <input
            autoFocus
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="DIGITE PARA BUSCAR..."
            className="w-full px-3 py-2 border-b border-gray-200 rounded-t-lg focus:outline-none text-sm"
          />
          <div className="overflow-y-auto flex-1">
            {filtrados.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">NENHUM RESULTADO</div>
            )}
            {filtrados.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id); setBusca(''); setAberto(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                  value === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <div>{item.label}</div>
                {item.subtitle && <div className="text-[10px] text-gray-500">{item.subtitle}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
