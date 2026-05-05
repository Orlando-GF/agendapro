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
import { Sessao, Horario, Bloqueio, Ausencia } from '../actions'
import { ListaSessoesCelula } from './ListaSessoesCelula'
import { formatDateISO, formatDateBRFromISO, formatarAgendaWhatsApp } from '@/lib/date-helpers'
import { exportarExcel } from '@/lib/export-utils'
import { STATUS_COR } from '@/lib/status-helpers'
import { useToast } from '../hooks/useToast'

const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA']

function normalizarDiaBanco(dia: string): string {
  const map: Record<string, string> = {
    'segunda-feira': 'SEGUNDA',
    'terça-feira': 'TERÇA',
    'terca-feira': 'TERÇA',
    'quarta-feira': 'QUARTA',
    'quinta-feira': 'QUINTA',
    'sexta-feira': 'SEXTA',
  }
  return map[dia.toLowerCase().trim()] || dia.toUpperCase()
}

interface Props {
  sessoes: Sessao[]
  horarios: Horario[]
  bloqueios: Bloqueio[]
  ausencias?: Ausencia[]
  terapeutaFiltro: string
  diasTrabalho?: string[] | null
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
      ref={setNodeRef as React.Ref<HTMLTableCellElement>}
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
    <div
      ref={setNodeRef as React.Ref<HTMLDivElement>}
      {...listeners}
      {...attributes}
      className={`${className || ''} ${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing`}
    >
      {children}
    </div>
  )
}

export function CalendarioSemanal({
  sessoes,
  horarios,
  bloqueios,
  ausencias,
  terapeutaFiltro,
  diasTrabalho,
  semanaAtual,
  onMudarSemana,
  onNovaSessao,
  onEditarSessao,
  onBloquear,
  onDesbloquear,
  onMoverSessao,
}: Props) {
  const { success, error } = useToast()
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
    if (!terapeutaFiltro) return map
    for (const b of bloqueios) {
      if (b.terapeuta_id !== terapeutaFiltro) continue
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

  const diasTrabalhoSet = useMemo(() => {
    if (!diasTrabalho || diasTrabalho.length === 0) return new Set<string>()
    return new Set(diasTrabalho.map(normalizarDiaBanco))
  }, [diasTrabalho])

  function estaBloqueadoLogicamente(dia: string): boolean {
    if (!terapeutaFiltro) return false
    if (diasTrabalhoSet.size === 0) return false
    return !diasTrabalhoSet.has(dia)
  }

  function buscarAusencia(dataISO: string): Ausencia | undefined {
    if (!terapeutaFiltro || !ausencias) return undefined
    return ausencias.find(a => {
      if (a.terapeuta_id !== terapeutaFiltro) return false
      const inicio = a.data_inicio
      const fim = a.data_fim
      return dataISO >= inicio && dataISO <= fim
    })
  }

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

    // Verifica bloqueio lógico por dias de trabalho
    const diaSemanaDest = new Date(destData + 'T00:00:00').getDay()
    const diaIndex = diaSemanaDest === 0 ? 4 : diaSemanaDest - 1
    if (diaIndex >= 0 && diaIndex < DIAS.length && estaBloqueadoLogicamente(DIAS[diaIndex])) {
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
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case print-hidden"
        >
          ← SEMANA ANTERIOR
        </button>
        <div className="text-sm font-semibold text-gray-900">
          {formatDateBRFromISO(datasISO[0])} A {formatDateBRFromISO(datasISO[4])}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const texto = formatarAgendaWhatsApp(sessoes, `AGENDA DA SEMANA — ${formatDateBRFromISO(datasISO[0])} A ${formatDateBRFromISO(datasISO[4])}`)
              navigator.clipboard.writeText(texto).then(() => success('AGENDA COPIADA PARA O WHATSAPP')).catch(() => error('ERRO AO COPIAR'))
            }}
            className="px-3 py-1.5 rounded-lg border border-green-500 bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm normal-case print-hidden"
          >
            📋 WHATSAPP
          </button>
          <button
            onClick={() => {
              const lista = terapeutaFiltro
                ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro))
                : sessoes

              if (lista.length === 0) {
                alert('Nenhuma sessão para imprimir.')
                return
              }

              const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

              const ordenadas = [...lista].sort((a, b) => {
                const da = a.data + '|' + a.hora_inicio
                const db = b.data + '|' + b.hora_inicio
                return da.localeCompare(db)
              })

              const linhas = ordenadas.map(s => {
                const d = new Date(s.data + 'T00:00:00')
                const diaSemana = DIAS_SEMANA[d.getDay()]
                const dataFmt = formatDateBRFromISO(s.data)
                const nome = s.tipo === 'VAZIO'
                  ? '<span style="color:#999;font-style:italic;">— HORÁRIO VAGO —</span>'
                  : (s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : (s.paciente_nome || 'Sem nome'))
                const terapeutas = (s.terapeutas || []).map(t => t.nome).join(', ')
                return '<tr>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;"><strong>' + diaSemana + '</strong><br><span style="font-size:8px;color:#666;">' + dataFmt + '</span></td>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + s.hora_inicio.slice(0, 5) + ' — ' + s.hora_fim.slice(0, 5) + '</td>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;">' + nome + (s.recorrente ? ' ↻' : '') + '</td>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-family:monospace;font-size:8px;">' + (s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : '') + '</td>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:8px;">' + terapeutas + '</td>' +
                  '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + (s.paciente_em_avaliacao ? 'EM AVALIAÇÃO' : s.status.replace(/_/g, ' ')) + '</td>' +
                  '</tr>'
              }).join('')

              const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>AGENDA DA SEMANA</title>' +
                '<style>' +
                '@page { margin: 8mm; }' +
                'body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; margin: 0; padding: 16px; background: white; color: black; }' +
                'h1 { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 12px; text-transform: uppercase; }' +
                'table { width: 100%; border-collapse: collapse; }' +
                'th { text-align: left; padding: 4px 6px; border-bottom: 2px solid black; font-size: 9px; text-transform: uppercase; }' +
                'td { vertical-align: top; }' +
                'tr { page-break-inside: avoid; }' +
                '.footer { margin-top: 24px; font-size: 8px; color: #666; text-align: center; }' +
                '</style></head><body>' +
                '<h1>AGENDA DA SEMANA — ' + formatDateBRFromISO(datasISO[0]) + ' A ' + formatDateBRFromISO(datasISO[4]) + '</h1>' +
                '<table><thead><tr><th>DIA</th><th>HORÁRIO</th><th>PACIENTE</th><th>PRONTUÁRIO</th><th>TERAPEUTAS</th><th>STATUS</th></tr></thead>' +
                '<tbody>' + linhas + '</tbody></table>' +
                '<div class="footer">AGENDAPRO — TEACOLHE</div>' +
                '<script>window.onload = function() { window.print(); }; window.onafterprint = function() { window.close(); };</script>' +
                '</body></html>'

              const win = window.open('', '_blank')
              if (win) {
                win.document.write(html)
                win.document.close()
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case print-hidden"
          >
            🖨️ IMPRIMIR
          </button>
          <button
            onClick={() => {
              const lista = (terapeutaFiltro ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro)) : sessoes)
                .sort((a, b) => (a.data + '|' + a.hora_inicio).localeCompare(b.data + '|' + b.hora_inicio))
              const colunas = [
                { key: 'data' as const, header: 'DATA' },
                { key: 'hora_inicio' as const, header: 'INÍCIO' },
                { key: 'hora_fim' as const, header: 'FIM' },
                { key: 'paciente_nome' as const, header: 'PACIENTE' },
                { key: 'paciente_codigo' as const, header: 'PRONTUÁRIO' },
                { key: 'status' as const, header: 'STATUS' },
              ]
              exportarExcel(lista, colunas, `AGENDA_${formatDateISO(semanaAtual)}`)
            }}
            className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm normal-case print-hidden"
          >
            📊 EXCEL
          </button>
          <button
            onClick={() => {
              const d = new Date(semanaAtual)
              d.setDate(d.getDate() + 7)
              onMudarSemana(d)
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case print-hidden"
          >
            PRÓXIMA SEMANA →
          </button>
        </div>
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
                      <div className="text-xs font-normal text-gray-500">{formatDateBRFromISO(datasISO[i])}</div>
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
                      const qtd = lista.filter(s => s.tipo === 'SESSAO').length
                      const listaSessoes = lista.filter(s => s.tipo === 'SESSAO')
                      const pred = terapeutaFiltro
                        ? (listaSessoes.map(s => {
                            const t = (s.terapeutas || []).find(t => t.id === terapeutaFiltro)
                            return t?.status || s.status
                          })[0] || '')
                        : corPredominante(listaSessoes)
                      const cor = terapeutaFiltro
                        ? (STATUS_COR[pred as keyof typeof STATUS_COR] || 'bg-gray-50 text-gray-600 border-gray-200')
                        : (qtd > 0 ? 'bg-white text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-600 border-gray-200')
                      const ausencia = buscarAusencia(dataISO)
                      const bloqueadoLogicamente = estaBloqueadoLogicamente(dia)

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

                      if (ausencia) {
                        return (
                          <td key={dia} className="px-2 py-2 align-top">
                            <div
                              className="w-full rounded-lg border px-2 py-1.5 text-xs font-bold bg-orange-700 text-white border-orange-700 text-center"
                              title={ausencia.motivo}
                            >
                              {ausencia.motivo}
                            </div>
                          </td>
                        )
                      }

                      if (bloqueadoLogicamente) {
                        return (
                          <td key={dia} className="px-2 py-2 align-top">
                            <div className="w-full rounded-lg border px-2 py-1.5 text-xs font-bold bg-gray-800 text-white border-gray-800 text-center">
                              BLOQUEADO
                            </div>
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
                              className="absolute top-0 right-0 -mt-1 -mr-1 w-5 h-5 rounded-full bg-gray-600 text-white text-[10px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity print-hidden"
                              title="BLOQUEAR"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
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
                                <div className="font-bold truncate">
                                  {lista[0].recorrente ? '↻ ' : ''}
                                  {lista[0].tipo !== 'SESSAO' ? (lista[0].titulo || lista[0].tipo) : lista[0].paciente_nome}
                                </div>
                                <div className="text-[10px] opacity-70 truncate">
                                  {(lista[0].terapeutas || []).map(t => t.nome.split(' ')[0] + (t.ativo === false ? '*' : '')).join(', ')}
                                </div>
                              </>
                            ) : (
                              <>{qtd} ATIV{qtd > 1 ? 'S' : ''}</>
                            )}
                          </button>
                        </div>
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
              <div className="font-bold truncate">
                {activeSessao.recorrente ? '↻ ' : ''}
                {activeSessao.tipo !== 'SESSAO' ? (activeSessao.titulo || activeSessao.tipo) : activeSessao.paciente_nome}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {(activeSessao.terapeutas || []).map(t => t.nome.split(' ')[0] + (t.ativo === false ? '*' : '')).join(', ')}
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
