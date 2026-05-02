'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Sessao, Horario, Bloqueio } from '../actions'
import { ListaSessoesCelula } from './ListaSessoesCelula'

const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA']

interface Props {
  sessoes: Sessao[]
  horarios: Horario[]
  bloqueios: Bloqueio[]
  terapeutaFiltro: string
  semanaAtual: Date
  onMudarSemana: (d: Date) => void
  onNovaSessao: (data: string, horaInicio: string, horaFim: string) => void
  onEditarSessao: (s: Sessao) => void
  onBloquear: (data: string, horaInicio: string, horaFim: string) => void
  onDesbloquear: (id: string) => void
  onMoverSessao: (
    sessaoOrigem: Sessao,
    destino: { data: string; horaInicio: string; horaFim: string },
    sessaoDestino?: Sessao
  ) => Promise<void>
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateBR(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-')
  return `${dia}/${mes}/${ano}`
}

function getSemana(d: Date): Date[] {
  const semana: Date[] = []
  const diaSemana = d.getDay()
  const diff = d.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1)
  const segunda = new Date(d)
  segunda.setDate(diff)
  segunda.setHours(0, 0, 0, 0)
  for (let i = 0; i < 5; i++) {
    const dia = new Date(segunda)
    dia.setDate(segunda.getDate() + i)
    semana.push(dia)
  }
  return semana
}

function corPredominante(sessoes: Sessao[]): string {
  if (sessoes.length === 0) return ''
  const prioridade = ['CANCELADO', 'FALTA_PROFISSIONAL', 'ATESTADO_PROFISSIONAL', 'ATESTADO', 'FALTA_JUSTIFICADA', 'FALTA', 'PRESENTE', 'AGENDADO']
  for (const status of prioridade) {
    if (sessoes.some(s => s.status === status)) return status
  }
  return sessoes[0].status
}

const STATUS_COR = {
  AGENDADO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PRESENTE: 'bg-green-100 text-green-800 border-green-300',
  FALTA: 'bg-red-100 text-red-800 border-red-300',
  FALTA_JUSTIFICADA: 'bg-orange-100 text-orange-800 border-orange-300',
  ATESTADO: 'bg-purple-100 text-purple-800 border-purple-300',
  ATESTADO_PROFISSIONAL: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  FALTA_PROFISSIONAL: 'bg-pink-100 text-pink-800 border-pink-300',
  CANCELADO: 'bg-gray-100 text-gray-500 border-gray-300',
  REPOSTO: 'bg-cyan-100 text-cyan-800 border-cyan-300',
}

// ========== DnD Components ==========

function DroppableCell({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <td
      ref={setNodeRef as any}
      className={`${className || ''} ${isOver ? 'bg-blue-50' : ''}`}
    >
      {children}
    </td>
  )
}

function DraggableSessao({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <button
      ref={setNodeRef as any}
      {...listeners}
      {...attributes}
      className={`${className || ''} ${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing`}
    >
      {children}
    </button>
  )
}

export function CalendarioSemanal({
  sessoes,
  horarios,
  bloqueios,
  terapeutaFiltro,
  semanaAtual,
  onMudarSemana,
  onNovaSessao,
  onEditarSessao,
  onBloquear,
  onDesbloquear,
  onMoverSessao,
}: Props) {
  const [celulaSelecionada, setCelulaSelecionada] = useState<{
    data: string
    horaInicio: string
    horaFim: string
    sessoes: Sessao[]
  } | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const semana = useMemo(() => getSemana(new Date(semanaAtual)), [semanaAtual])
  const datasISO = semana.map(formatDateISO)

  const sessoesPorCelula = useMemo(() => {
    const map = new Map<string, Sessao[]>()
    for (const s of sessoes) {
      const key = `${s.data}|${s.hora_inicio.slice(0, 5)}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [sessoes])

  const bloqueiosPorCelula = useMemo(() => {
    const map = new Map<string, Bloqueio>()
    for (const b of bloqueios) {
      if (terapeutaFiltro && b.terapeuta_id !== terapeutaFiltro) continue
      const key = `${b.data}|${b.hora_inicio.slice(0, 5)}`
      map.set(key, b)
    }
    return map
  }, [bloqueios, terapeutaFiltro])

  const sessaoById = useMemo(() => {
    const map = new Map<string, Sessao>()
    for (const s of sessoes) map.set(s.id, s)
    return map
  }, [sessoes])

  const activeSessao = activeDragId ? sessaoById.get(activeDragId) || null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    if (!over) return

    const sessaoOrigem = sessaoById.get(active.id as string)
    if (!sessaoOrigem) return

    const cellId = over.id as string
    const [destData, destHoraInicio, destHoraFim] = cellId.split('|')
    if (!destData || !destHoraInicio || !destHoraFim) return

    // Se soltou no mesmo lugar, não faz nada
    if (
      sessaoOrigem.data === destData &&
      sessaoOrigem.hora_inicio.slice(0, 5) === destHoraInicio
    ) {
      return
    }

    const destKey = `${destData}|${destHoraInicio}`
    const bloqueio = bloqueiosPorCelula.get(destKey)
    if (bloqueio) {
      // Recusa silenciosa — o pai pode mostrar toast se quiser
      return
    }

    const destLista = sessoesPorCelula.get(destKey) || []

    if (destLista.length === 0) {
      // Move simples
      await onMoverSessao(sessaoOrigem, {
        data: destData,
        horaInicio: destHoraInicio,
        horaFim: destHoraFim,
      })
    } else if (destLista.length === 1) {
      // Swap
      await onMoverSessao(
        sessaoOrigem,
        { data: destData, horaInicio: destHoraInicio, horaFim: destHoraFim },
        destLista[0]
      )
    } else {
      // Múltiplas sessões no destino — recusa
      return
    }
  }

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex items-center justify-between bg-white rounded-lg border px-4 py-3">
        <button
          onClick={() => {
            const d = new Date(semanaAtual)
            d.setDate(d.getDate() - 7)
            onMudarSemana(d)
          }}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
        >
          ← SEMANA ANTERIOR
        </button>
        <div className="text-sm font-semibold text-gray-900">
          {formatDateBR(datasISO[0])} A {formatDateBR(datasISO[4])}
        </div>
        <button
          onClick={() => {
            const d = new Date(semanaAtual)
            d.setDate(d.getDate() + 7)
            onMudarSemana(d)
          }}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
        >
          PRÓXIMA SEMANA →
        </button>
      </div>

      {/* Grade */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 w-24">HORÁRIO</th>
                  {DIAS.map((dia, i) => (
                    <th key={dia} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[140px]">
                      <div>{dia}</div>
                      <div className="text-xs font-normal text-gray-500">{formatDateBR(datasISO[i])}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {horarios.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">
                      {h.hora_inicio} - {h.hora_fim}
                    </td>
                    {DIAS.map((dia, i) => {
                      const dataISO = datasISO[i]
                      const cellKey = `${dataISO}|${h.hora_inicio}|${h.hora_fim}`
                      const key = `${dataISO}|${h.hora_inicio}`
                      const lista = sessoesPorCelula.get(key) || []
                      const bloqueio = bloqueiosPorCelula.get(key)
                      const qtd = lista.length
                      const pred = corPredominante(lista)
                      const cor = STATUS_COR[pred as keyof typeof STATUS_COR] || 'bg-gray-50 text-gray-600 border-gray-200'

                      if (bloqueio) {
                        return (
                          <td key={dia} className="px-2 py-2 align-top">
                            <button
                              onClick={() => onDesbloquear(bloqueio.id)}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors hover:shadow-sm bg-gray-800 text-white border-gray-800 text-center"
                              title={bloqueio.motivo || 'BLOQUEADO'}
                            >
                              BLOQUEADO
                            </button>
                          </td>
                        )
                      }

                      const cellContent = qtd === 0 ? (
                        <div className="relative">
                          <button
                            onClick={() => onNovaSessao(dataISO, h.hora_inicio, h.hora_fim)}
                            className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600 text-xs transition-colors flex items-center justify-center"
                          >
                            + AGENDAR
                          </button>
                          {terapeutaFiltro && (
                            <button
                              onClick={() => onBloquear(dataISO, h.hora_inicio, h.hora_fim)}
                              className="absolute top-0 right-0 -mt-1 -mr-1 w-5 h-5 rounded-full bg-gray-600 text-white text-[10px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              title="BLOQUEAR"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (lista.length === 1) {
                              onEditarSessao(lista[0])
                            } else {
                              setCelulaSelecionada({ data: dataISO, horaInicio: h.hora_inicio, horaFim: h.hora_fim, sessoes: lista })
                            }
                          }}
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs transition-colors hover:shadow-sm ${cor} ${lista.length === 1 ? 'text-left' : 'font-bold text-center'}`}
                        >
                          {lista.length === 1 ? (
                            <>
                              <div className="font-bold truncate">{lista[0].paciente_nome}</div>
                              <div className="text-[10px] opacity-70 truncate">
                                {(lista[0].terapeutas || []).map(t => t.nome.split(' ')[0]).join(', ')}
                              </div>
                            </>
                          ) : (
                            <>{qtd} PAC{qtd > 1 ? 'S' : ''}</>
                          )}
                        </button>
                      )

                      // Se há exatamente 1 sessão, torna draggable
                      const wrappedContent =
                        qtd === 1 ? (
                          <DraggableSessao id={lista[0].id} className="w-full">
                            {cellContent}
                          </DraggableSessao>
                        ) : (
                          cellContent
                        )

                      return (
                        <DroppableCell key={dia} id={cellKey} className="px-2 py-2 align-top">
                          {wrappedContent}
                        </DroppableCell>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeSessao ? (
            <div className="rounded-lg border px-3 py-2 text-xs shadow-lg bg-white opacity-90 pointer-events-none">
              <div className="font-bold truncate">{activeSessao.paciente_nome}</div>
              <div className="text-[10px] text-gray-500 truncate">
                {(activeSessao.terapeutas || []).map(t => t.nome.split(' ')[0]).join(', ')}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Sidepanel de lista de sessões da célula */}
      {celulaSelecionada && (
        <ListaSessoesCelula
          data={celulaSelecionada.data}
          horaInicio={celulaSelecionada.horaInicio}
          horaFim={celulaSelecionada.horaFim}
          sessoes={celulaSelecionada.sessoes}
          onEditar={s => { setCelulaSelecionada(null); onEditarSessao(s) }}
          onNova={(d, hi, hf) => { setCelulaSelecionada(null); onNovaSessao(d, hi, hf) }}
          onFechar={() => setCelulaSelecionada(null)}
        />
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> AGENDADO</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> PRESENTE</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> FALTA</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" /> FALTA JUSTIFICADA</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> ATESTADO</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300" /> ATESTADO PROFISSIONAL</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-100 border border-pink-300" /> FALTA PROFISSIONAL</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> CANCELADO</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-100 border border-cyan-300" /> REPOSTO</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-800 border border-gray-800" /> BLOQUEADO</span>
      </div>
    </div>
  )
}
