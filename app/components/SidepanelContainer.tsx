'use client'

import { ReactNode } from 'react'

interface Props {
  titulo: string
  children: ReactNode
  onFechar: () => void
}

export function SidepanelContainer({ titulo, children, onFechar }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 cursor-pointer" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar painel"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 text-xl"
          >
            ×
          </button>
        </div>
        {children}
      </div>
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </>
  )
}
