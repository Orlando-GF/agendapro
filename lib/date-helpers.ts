export function formatDateISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function formatDateBR(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

export function formatDateBRFromISO(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-')
  return `${dia}/${mes}/${ano}`
}

const STATUS_EMOJI: Record<string, string> = {
  AGENDADO: '🟡',
  PRESENTE: '🟢',
  FALTA: '🔴',
  FALTA_JUSTIFICADA: '🟠',
  ATESTADO: '🟣',
  ATESTADO_PROFISSIONAL: '🔵',
  FALTA_PROFISSIONAL: '💗',
  CANCELADO: '⚪',
  REPOSTO: '🩵',
}

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

export interface SessaoWhatsApp {
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  tipo?: string | null
  titulo?: string | null
  paciente_nome?: string
  terapeutas?: { nome: string }[]
}

function formatarLinhaSessao(s: SessaoWhatsApp): string {
  const emoji = STATUS_EMOJI[s.status] || '⚪'
  const statusFmt = s.status.replace(/_/g, ' ')
  const nome = s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : (s.paciente_nome || 'Sem nome')
  const hora = `${s.hora_inicio.slice(0, 5)} — ${s.hora_fim.slice(0, 5)}`
  return `${emoji} ${hora} — ${nome} (${statusFmt})`
}

function formatarListaPorDia(sessoes: SessaoWhatsApp[], titulo: string): string {
  let ultimaData = ''
  let resultado = `📅 *${titulo}*\n`

  for (const s of sessoes) {
    if (s.data !== ultimaData) {
      const d = new Date(s.data + 'T00:00:00')
      const diaSemana = DIAS_SEMANA[d.getDay()]
      const dataFmt = formatDateBRFromISO(s.data)
      resultado += `\n*${diaSemana} — ${dataFmt}*\n`
      ultimaData = s.data
    }
    resultado += `${formatarLinhaSessao(s)}\n`
  }

  return resultado
}

export function formatarAgendaWhatsApp(sessoes: SessaoWhatsApp[], titulo: string): string {
  if (sessoes.length === 0) {
    return `${titulo}\n\nNenhum atendimento.`
  }

  const ordenadas = [...sessoes].sort((a, b) => {
    const da = a.data + '|' + a.hora_inicio
    const db = b.data + '|' + b.hora_inicio
    return da.localeCompare(db)
  })

  // Verifica se há terapeutas para agrupar
  const temTerapeutas = ordenadas.some(s => (s.terapeutas || []).length > 0)
  if (!temTerapeutas) {
    return formatarListaPorDia(ordenadas, titulo)
  }

  // Agrupa sessões por terapeuta
  const mapa = new Map<string, SessaoWhatsApp[]>()
  for (const s of ordenadas) {
    const ts = s.terapeutas || []
    if (ts.length === 0) {
      const chave = 'SEM TERAPEUTA'
      const lista = mapa.get(chave) || []
      lista.push(s)
      mapa.set(chave, lista)
    } else {
      for (const t of ts) {
        const chave = t.nome
        const lista = mapa.get(chave) || []
        lista.push(s)
        mapa.set(chave, lista)
      }
    }
  }

  // Ordena terapeutas alfabeticamente
  const terapeutasOrdenados = Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b))

  let resultado = `📅 *${titulo}*\n`

  for (const nomeTerapeuta of terapeutasOrdenados) {
    resultado += `\n*${nomeTerapeuta.toUpperCase()}*\n`
    const lista = mapa.get(nomeTerapeuta)!
    let ultimaData = ''

    for (const s of lista) {
      if (s.data !== ultimaData) {
        const d = new Date(s.data + 'T00:00:00')
        const diaSemana = DIAS_SEMANA[d.getDay()]
        const dataFmt = formatDateBRFromISO(s.data)
        resultado += `_${diaSemana} — ${dataFmt}_\n`
        ultimaData = s.data
      }
      resultado += `${formatarLinhaSessao(s)}\n`
    }
  }

  return resultado
}
