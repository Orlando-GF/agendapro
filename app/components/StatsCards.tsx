'use client'

interface Props {
  total: number
  emAvaliacao: number
  judicial: number
  semWhatsapp: number
  comLaudo: number
}

export function StatsCards({ total, emAvaliacao, judicial, semWhatsapp, comLaudo }: Props) {
  const cards = [
    { label: 'Total de Pacientes', value: total, color: 'bg-blue-100 text-blue-800' },
    { label: 'Em Avaliação', value: emAvaliacao, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Judicial', value: judicial, color: 'bg-red-100 text-red-800' },
    { label: 'Laudo', value: comLaudo, color: 'bg-purple-100 text-purple-800' },
    { label: 'Sem WhatsApp', value: semWhatsapp, color: 'bg-gray-100 text-gray-800' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg p-4 ${c.color}`}>
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-sm font-medium opacity-80">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
