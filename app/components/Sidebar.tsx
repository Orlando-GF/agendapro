'use client'

interface Props {
  viewAtiva: string
  onMudarView: (view: string) => void
}

const items = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'recepcao', label: 'Recepção' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'terapeutas', label: 'Terapeutas' },
  { id: 'especialidades', label: 'Especialidades' },
  { id: 'horarios', label: 'Horários' },
]

export function Sidebar({ viewAtiva, onMudarView }: Props) {
  return (
    <aside className="w-64 bg-white border-r flex flex-col h-screen sticky top-0 uppercase">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-blue-700">AgendaPro</h2>
        <p className="text-xs text-gray-500 mt-1">Sistema TEACOLHE</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onMudarView(item.id)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors uppercase ${
              viewAtiva === item.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t text-xs text-gray-400">v0.2.0</div>
    </aside>
  )
}
