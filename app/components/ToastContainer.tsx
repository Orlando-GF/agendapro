'use client'

import { useContext } from 'react'
import { ToastContext, ToastType } from './ToastProvider'

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
}

export function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 w-80">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 animate-slide-in ${COLORS[toast.type]}`}
        >
          <span className="mt-0.5 text-sm font-bold w-5 h-5 flex items-center justify-center rounded-full bg-white/60">
            {ICONS[toast.type]}
          </span>
          <div className="flex-1 text-sm font-medium leading-snug">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none normal-case"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
