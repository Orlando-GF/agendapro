'use client'

import { useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Users,
  Stethoscope,
  Layers,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HeartPulse,
} from 'lucide-react'

interface Props {
  viewAtiva: string
  onMudarView: (view: string) => void
}

const items = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'recepcao', label: 'Recepção', icon: ClipboardList },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'terapeutas', label: 'Terapeutas', icon: Stethoscope },
  { id: 'especialidades', label: 'Especialidades', icon: Layers },
  { id: 'horarios', label: 'Horários', icon: Clock },
  { id: 'grupos', label: 'Grupos', icon: BookOpen },
  { id: 'plantoes', label: 'Plantões', icon: HeartPulse },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar({ viewAtiva, onMudarView }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`bg-white border-r flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`border-b flex items-center ${collapsed ? 'p-3 justify-center' : 'p-6'}`}>
        {!collapsed && (
          <div className="flex-1">
            <h2 className="text-xl font-bold text-blue-700">AgendaPro</h2>
            <p className="text-xs text-gray-500 mt-1">Sistema TEACOLHE</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={`flex-1 space-y-1 ${collapsed ? 'p-2' : 'p-4'}`}>
        {items.map(item => {
          const Icon = item.icon
          const ativo = viewAtiva === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMudarView(item.id)}
              title={item.label}
              className={`w-full rounded-lg text-sm font-medium transition-colors uppercase flex items-center ${
                collapsed ? 'justify-center px-2 py-2.5' : 'text-left px-4 py-2.5'
              } ${
                ativo
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                size={collapsed ? 20 : 18}
                strokeWidth={ativo ? 2.5 : 2}
                className={collapsed ? '' : 'mr-3'}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className={`border-t text-xs text-gray-400 ${collapsed ? 'p-2 text-center' : 'p-4'}`}>
        {collapsed ? 'v0.2' : 'v0.2.0'}
      </div>
    </aside>
  )
}
