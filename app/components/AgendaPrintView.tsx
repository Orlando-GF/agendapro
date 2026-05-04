'use client'

import { FC } from 'react'

interface SessaoPrint {
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  tipo?: string | null
  titulo?: string | null
  paciente_nome?: string
  paciente_codigo?: string | null
  recorrente?: boolean | null
  terapeutas?: { nome: string }[]
}

interface Props {
  titulo: string
  sessoes: SessaoPrint[]
}

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

function formatDateBRFromISO(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-')
  return `${dia}/${mes}/${ano}`
}

export const AgendaPrintView: FC<Props> = ({ titulo, sessoes }) => {
  const ordenadas = [...sessoes].sort((a, b) => {
    const da = a.data + '|' + a.hora_inicio
    const db = b.data + '|' + b.hora_inicio
    return da.localeCompare(db)
  })

  let ultimaData = ''

  return (
    <div className="p-4 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', lineHeight: '1.3' }}>
      <h1 className="text-base font-bold mb-3 text-center uppercase">{titulo}</h1>

      {ordenadas.length === 0 ? (
        <p className="text-center text-gray-600">Nenhum atendimento.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-3 uppercase">Dia</th>
              <th className="text-left py-2 px-3 uppercase">Horário</th>
              <th className="text-left py-2 px-3 uppercase">Paciente</th>
              <th className="text-left py-2 px-3 uppercase">Prontuário</th>
              <th className="text-left py-2 px-3 uppercase">Terapeutas</th>
              <th className="text-left py-2 px-3 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((s, idx) => {
              const mostrarData = s.data !== ultimaData
              if (mostrarData) ultimaData = s.data

              const d = new Date(s.data + 'T00:00:00')
              const diaSemana = DIAS_SEMANA[d.getDay()]
              const dataFmt = formatDateBRFromISO(s.data)
              const nome = s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : (s.paciente_nome || 'Sem nome')
              const terapeutas = (s.terapeutas || []).map(t => t.nome).join(', ')

              return (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-2 px-3 whitespace-nowrap align-top">
                    {mostrarData ? (
                      <>
                        <div className="font-bold">{diaSemana}</div>
                        <div className="text-xs text-gray-600">{dataFmt}</div>
                      </>
                    ) : null}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap align-top">
                    {s.hora_inicio.slice(0, 5)} — {s.hora_fim.slice(0, 5)}
                  </td>
                  <td className="py-2 px-3 align-top">
                    {nome}
                    {s.recorrente ? ' ↻' : ''}
                  </td>
                  <td className="py-2 px-3 align-top font-mono text-xs">{s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : ''}</td>
                  <td className="py-2 px-3 align-top text-xs">{terapeutas}</td>
                  <td className="py-2 px-3 whitespace-nowrap align-top">{s.status.replace(/_/g, ' ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="mt-8 text-xs text-gray-500 text-center">
        AGENDAPRO — TEACOLHE
      </div>
    </div>
  )
}
