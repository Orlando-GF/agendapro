export const STATUS_COR: Record<string, string> = {
  AGENDADO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PRESENTE: 'bg-green-100 text-green-800 border-green-300',
  FALTA: 'bg-red-100 text-red-800 border-red-300',
  FALTA_JUSTIFICADA: 'bg-orange-100 text-orange-800 border-orange-300',
  ATESTADO: 'bg-purple-100 text-purple-800 border-purple-300',
  ATESTADO_PROFISSIONAL: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  FALTA_PROFISSIONAL: 'bg-pink-100 text-pink-800 border-pink-300',
  AUSENCIA_PROFISSIONAL: 'bg-teal-100 text-teal-800 border-teal-300',
  CANCELADO: 'bg-gray-100 text-gray-500 border-gray-300',
  REPOSTO: 'bg-cyan-100 text-cyan-800 border-cyan-300',
}

export const STATUS_CONFIG: Record<string, { label: string; cor: string; hover: string }> = {
  AGENDADO: { label: 'AGENDAR', cor: 'bg-yellow-50 text-yellow-700 border-yellow-200', hover: 'hover:bg-yellow-100' },
  PRESENTE: { label: 'PRESENTE', cor: 'bg-green-50 text-green-700 border-green-200', hover: 'hover:bg-green-100' },
  FALTA: { label: 'FALTA', cor: 'bg-red-50 text-red-700 border-red-200', hover: 'hover:bg-red-100' },
  FALTA_JUSTIFICADA: { label: 'FALTA JUSTIFICADA', cor: 'bg-orange-50 text-orange-700 border-orange-200', hover: 'hover:bg-orange-100' },
  ATESTADO: { label: 'ATESTADO', cor: 'bg-purple-50 text-purple-700 border-purple-200', hover: 'hover:bg-purple-100' },
  ATESTADO_PROFISSIONAL: { label: 'ATESTADO PROFISSIONAL', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200', hover: 'hover:bg-indigo-100' },
  FALTA_PROFISSIONAL: { label: 'FALTA PROFISSIONAL', cor: 'bg-pink-50 text-pink-700 border-pink-200', hover: 'hover:bg-pink-100' },
  AUSENCIA_PROFISSIONAL: { label: 'AUSÊNCIA PROFISSIONAL', cor: 'bg-teal-50 text-teal-700 border-teal-200', hover: 'hover:bg-teal-100' },
  CANCELADO: { label: 'CANCELAR', cor: 'bg-gray-100 text-gray-500 border-gray-300 line-through', hover: 'hover:bg-gray-200' },
}

export const STATUS_TERAPETA_CONFIG: Record<string, { label: string; cor: string }> = {
  AGENDADO: { label: 'AGENDADO', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PRESENTE: { label: 'PRESENTE', cor: 'bg-green-100 text-green-700 border-green-200' },
  FALTA_PROFISSIONAL: { label: 'FP', cor: 'bg-pink-100 text-pink-700 border-pink-200' },
  ATESTADO_PROFISSIONAL: { label: 'AP', cor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
}

/**
 * Extrai o motivo da ausência do texto de observações.
 * Formato esperado: "AUSÊNCIA DO PROFISSIONAL: Folga"
 */
export function extrairMotivoAusencia(observacoes?: string | null): string | null {
  if (!observacoes) return null
  const idx = observacoes.indexOf(':')
  if (idx === -1) return null
  const motivo = observacoes.slice(idx + 1).trim()
  return motivo ? motivo.toUpperCase() : null
}
