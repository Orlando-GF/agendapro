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
  paciente_codigo?: string | null
  paciente_em_avaliacao?: boolean | null
  terapeutas?: { nome: string }[]
}

function abreviarNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 2) return nome
  return `${partes[0]} ${partes[1]}`
}

function formatarLinhaSessao(s: SessaoWhatsApp): string {
  const nomeCompleto = s.tipo !== 'SESSAO' ? (s.titulo || s.tipo || '') : (s.paciente_nome || 'Sem nome')
  const nome = abreviarNome(nomeCompleto)
  const prontuario = s.paciente_codigo || '-'
  const hora = `${s.hora_inicio.slice(0, 5)}`
  return `${hora} — ${prontuario} — ${nome}`
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

export function formatarAgendaWhatsApp(
  sessoes: SessaoWhatsApp[],
  titulo: string,
  horarios?: { hora_inicio: string; hora_fim: string }[]
): string {
  // Filtra só sessões reais (não horários vazios)
  const sessoesReais = sessoes.filter(s => s.tipo === 'SESSAO')
  if (sessoesReais.length === 0) {
    return `${titulo}\n\nNenhum atendimento.`
  }

  const ordenadas = [...sessoesReais].sort((a, b) => {
    const da = a.data + '|' + a.hora_inicio
    const db = b.data + '|' + b.hora_inicio
    return da.localeCompare(db)
  })

  // Agrupa por equipe (conjunto de terapeutas)
  const mapa = new Map<string, SessaoWhatsApp[]>()
  for (const s of ordenadas) {
    const ts = (s.terapeutas || []).map(t => t.nome).sort()
    const chave = ts.length > 0 ? ts.join(' + ') : 'SEM TERAPEUTA'
    const lista = mapa.get(chave) || []
    lista.push(s)
    mapa.set(chave, lista)
  }

  // Se tiver horários, preenche os vazios para cada equipe
  if (horarios && horarios.length > 0) {
    for (const [equipe, lista] of mapa) {
      const dataRef = lista[0]?.data || ''
      const terapeutas = equipe !== 'SEM TERAPEUTA'
        ? equipe.split(' + ').map(n => ({ nome: n }))
        : []
      // Horários já ocupados por esta equipe
      const ocupados = new Set(lista.map(s => `${s.hora_inicio.slice(0, 5)}|${s.hora_fim.slice(0, 5)}`))
      for (const h of horarios) {
        const timeKey = `${h.hora_inicio.slice(0, 5)}|${h.hora_fim.slice(0, 5)}`
        if (!ocupados.has(timeKey)) {
          lista.push({
            data: dataRef,
            hora_inicio: h.hora_inicio,
            hora_fim: h.hora_fim,
            status: 'AGENDADO',
            tipo: 'VAZIO',
            terapeutas,
          })
        }
      }
      // Reordena por hora
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }
  }

  // Ordena equipes alfabeticamente
  const equipesOrdenadas = Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b))

  let resultado = `📅 *${titulo}*\n`

  for (const equipe of equipesOrdenadas) {
    const terapeutasFmt = equipe.split(' + ').map(n => abreviarNome(n)).join(' + ')
    resultado += `\n*${terapeutasFmt.toUpperCase()}*\n`
    const lista = mapa.get(equipe)!
    let ultimaData = ''

    for (const s of lista) {
      if (s.data !== ultimaData) {
        const d = new Date(s.data + 'T00:00:00')
        const diaSemana = DIAS_SEMANA[d.getDay()]
        const dataFmt = formatDateBRFromISO(s.data)
        resultado += `▫️ ${diaSemana}, ${dataFmt}\n`
        ultimaData = s.data
      }
      resultado += `${formatarLinhaSessao(s)}\n`
    }
    resultado += `\n`
  }

  return resultado
}
