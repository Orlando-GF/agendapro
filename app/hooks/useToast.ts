'use client'

import { useContext, useCallback } from 'react'
import { ToastContext, ToastType } from '../components/ToastProvider'

export function useToast() {
  const { addToast } = useContext(ToastContext)

  const toast = useCallback(
    (type: ToastType, message: string) => {
      addToast(type, message)
    },
    [addToast]
  )

  return {
    success: (message: string) => toast('success', message),
    error: (message: string) => toast('error', message),
    info: (message: string) => toast('info', message),
    warning: (message: string) => toast('warning', message),
  }
}
