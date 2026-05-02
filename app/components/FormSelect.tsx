'use client'

import { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  erro?: string
}

export function FormSelect({ label, erro, className = '', children, ...props }: Props) {
  const base = 'w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 transition-colors bg-white'
  const estado = erro
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-blue-500'

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select className={`${base} ${estado} ${className}`} {...props}>
        {children}
      </select>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  )
}
