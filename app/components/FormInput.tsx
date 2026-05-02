'use client'

import { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  erro?: string
}

export function FormInput({ label, erro, className = '', ...props }: Props) {
  const base = 'w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 transition-colors'
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
      <input className={`${base} ${estado} ${className}`} {...props} />
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  )
}
