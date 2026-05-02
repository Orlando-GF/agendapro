import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

// ========== CSV PARSING (reused from lib/parse-agenda.ts) ==========

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"') {
      if (inQuotes && next === '"') { current += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += char }
  }
  result.push(current.trim())
  return result
}

function isEmptyLine(cols: string[]): boolean {
  return cols.every(c => c === '')
}

function isColumnHeader(cols: string[]): boolean {
  return cols[0] === '' && cols.some(c => c.includes('TELEFONE')) && cols.some(c => c.includes('RESPONSÁVEL'))
}

function isBlockHeader(cols: string[]): boolean {
  if (cols.length === 0) return false
  const first = cols[0]
  return /\([^)]+\)/.test(first) && !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(first)
}

function isDataLine(cols: string[]): boolean {
  if (cols.length < 3) return false
  const first = cols[0]
  const hasTime = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(first)
  const hasName = !!(cols[2] && cols[2].trim().length > 0)
  return hasTime && hasName
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\(EM AVALIAÇÃO\)\s*/gi, '')
    .replace(/\s*\(\d\/\d\)\s*/g, '')
    .replace(/\s*\(conversar com [^)]+\)\s*/gi, '')
    .trim()
}

function normalizeForDedup(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDayFromFilename(filename: string): string {
  const map: Record<string, string> = {
    'segunda': 'Segunda-feira',
    'terca': 'Terça-feira',
    'terça': 'Terça-feira',
    'quarta': 'Quarta-feira',
    'quinta': 'Quinta-feira',
    'sexta': 'Sexta-feira',
  }
  const normalized = filename
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
  for (const key of Object.keys(map)) {
    if (normalized.includes(key)) return map[key]
  }
  return 'Desconhecido'
}

function extractTerapeutasFromHeader(header: string): string[] {
  const matches = header.match(/([^,\-]+?)\s*\(([^)]+)\)/g)
  if (!matches) return []
  const result: string[] = []
  for (const m of matches) {
    const nm = m.match(/^\s*([^()]+?)\s*\(/)
    if (nm) {
      const rawNome = nm[1].trim()
      if (!rawNome.toLowerCase().includes('falta')) {
        result.push(normalizeNomeTerapeuta(rawNome))
      }
    }
  }
  return result
}

function normalizeNomeTerapeuta(nome: string): string {
  return nome
    .toLowerCase()
    .replace(/^\s*priscila/i, 'Priscila')
    .replace(/^\s*ana maria/i, 'Ana Maria')
    .replace(/^\s*maria de fatima/i, 'Maria de Fátima')
    .replace(/^\s*mª fatima/i, 'Maria de Fátima')
    .replace(/^\s*lais/i, 'Laís')
    .replace(/^\s*laís/i, 'Laís')
    .replace(/^\s*monica/i, 'Mônica')
    .replace(/^\s*bruno/i, 'Bruno')
    .replace(/^\s*geovani/i, 'Geovani')
    .replace(/^\s*werik/i, 'Werik')
    .replace(/^\s*elquiara/i, 'Elquiara')
    .replace(/^\s*nady/i, 'Nady')
    .replace(/^\s*silvana/i, 'Silvana')
    .replace(/^\s*marilia/i, 'Marília')
    .replace(/^\s*jamille/i, 'Jamille')
    .replace(/^\s*halina/i, 'Halina')
    .replace(/^\s*maritania/i, 'Maritânia')
    .replace(/^\s*eliana/i, 'Eliana')
    .replace(/^\s*debora/i, 'Débora')
    .replace(/^\s*dalia/i, 'Dália')
    .replace(/^\s*julia/i, 'Jully')
    .replace(/^\s*jully/i, 'Jully')
    .replace(/^\s*mikaele/i, 'Mikaele')
    .trim()
}

// ========== DATE CALCULATION ==========

const DIA_MAP: Record<string, number> = {
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
}

function getProximas4Semanas(): Date[] {
  const hoje = new Date()
  const segunda = new Date(hoje)
  const diaSemana = segunda.getDay()
  const diff = segunda.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1)
  segunda.setDate(diff)
  segunda.setHours(0, 0, 0, 0)

  const datas: Date[] = []
  for (let semana = 0; semana < 4; semana++) {
    for (let dia = 0; dia < 5; dia++) {
      const d = new Date(segunda)
      d.setDate(segunda.getDate() + semana * 7 + dia)
      datas.push(d)
    }
  }
  return datas
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ========== MAIN ==========

interface PacienteAgenda {
  nome: string
  horario: string
  dia: string
  terapeutas: string[]
}

async function main() {
  await client.connect()
  console.log('🚀 Conectado ao banco')

  // Buscar pacientes e terapeutas do banco
  const { rows: pacientesRows } = await client.query('SELECT id, nome FROM public.patients')
  const { rows: terapeutasRows } = await client.query('SELECT id, nome FROM public.terapeutas')

  const pacienteMap = new Map<string, string>() // dedupKey -> id
  const pacienteNomeMap = new Map<string, string>() // lower nome -> id
  for (const p of pacientesRows) {
    pacienteMap.set(normalizeForDedup(p.nome), p.id)
    pacienteNomeMap.set(p.nome.toLowerCase(), p.id)
  }

  const terapeutaMap = new Map<string, string>()
  for (const t of terapeutasRows) {
    terapeutaMap.set(normalizeNomeTerapeuta(t.nome).toLowerCase(), t.id)
    terapeutaMap.set(t.nome.toLowerCase(), t.id)
  }

  // Parsear CSVs
  const dataDir = 'dados'
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const agendas: PacienteAgenda[] = []

  for (const file of files) {
    const diaSemana = extractDayFromFilename(file)
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)

    let currentTerapeutas: string[] = []

    for (const line of lines) {
      const cols = parseCSVLine(line)
      if (isEmptyLine(cols)) continue
      if (isColumnHeader(cols)) continue

      if (isBlockHeader(cols)) {
        currentTerapeutas = extractTerapeutasFromHeader(cols[0])
        continue
      }

      if (isDataLine(cols)) {
        const rawNome = cols[2]
        const nome = normalizeName(rawNome)
        if (!nome) continue

        agendas.push({
          nome,
          horario: cols[0],
          dia: diaSemana,
          terapeutas: [...currentTerapeutas],
        })
      }
    }
  }

  console.log(`📄 ${agendas.length} registros parseados dos CSVs`)

  // Agrupar por paciente (nome dedup) -> lista de (dia, horario, terapeutas)
  const pacienteAgendas = new Map<string, { dia: string; horario: string; terapeutas: string[] }[]>()
  for (const a of agendas) {
    const key = normalizeForDedup(a.nome)
    if (!pacienteAgendas.has(key)) pacienteAgendas.set(key, [])
    pacienteAgendas.get(key)!.push({ dia: a.dia, horario: a.horario, terapeutas: a.terapeutas })
  }

  console.log(`👤 ${pacienteAgendas.size} pacientes únicos`)

  const todasDatas = getProximas4Semanas()
  const diaParaDatas = new Map<number, Date[]>()
  for (const d of todasDatas) {
    const diaNum = d.getDay()
    if (!diaParaDatas.has(diaNum)) diaParaDatas.set(diaNum, [])
    diaParaDatas.get(diaNum)!.push(d)
  }

  const sessoesInseridas: { paciente_id: string; data: string; hora_inicio: string; hora_fim: string }[] = []
  const sessoesMap = new Map<string, string>() // key -> sessao_id

  let pacientesEncontrados = 0
  let pacientesNaoEncontrados = 0
  let sessoesCriadas = 0

  for (const [nomeKey, items] of pacienteAgendas) {
    const pacienteId = pacienteMap.get(nomeKey)
    if (!pacienteId) {
      console.log(`⚠️ Paciente não encontrado: "${nomeKey}"`)
      pacientesNaoEncontrados++
      continue
    }
    pacientesEncontrados++

    for (const item of items) {
      const diaNum = DIA_MAP[item.dia]
      if (!diaNum) {
        console.log(`⚠️ Dia desconhecido: ${item.dia}`)
        continue
      }
      const datasDoDia = diaParaDatas.get(diaNum) || []
      const [hora_inicio, hora_fim] = item.horario.split(/\s*-\s*/).map(s => s.trim())

      for (const dataObj of datasDoDia) {
        const dataStr = formatDateISO(dataObj)
        const chave = `${pacienteId}|${dataStr}|${hora_inicio}|${hora_fim}`
        if (!sessoesMap.has(chave)) {
          sessoesInseridas.push({
            paciente_id: pacienteId,
            data: dataStr,
            hora_inicio,
            hora_fim,
          })
          sessoesMap.set(chave, '') // placeholder
        }
      }
    }
  }

  console.log(`📊 Sessões a inserir: ${sessoesInseridas.length}`)

  // Inserir sessões em batch
  if (sessoesInseridas.length > 0) {
    const values = sessoesInseridas.map((s, i) =>
      `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, 'AGENDADO')`
    ).join(', ')
    const params = sessoesInseridas.flatMap(s => [s.paciente_id, s.data, s.hora_inicio, s.hora_fim])

    const insertSql = `
      INSERT INTO public.sessoes (paciente_id, data, hora_inicio, hora_fim, status)
      VALUES ${values}
      ON CONFLICT DO NOTHING
      RETURNING id, paciente_id, data, hora_inicio, hora_fim
    `
    const { rows: insertedRows } = await client.query(insertSql, params)
    sessoesCriadas = insertedRows.length

    // Construir mapa de chave -> sessao_id
    for (const row of insertedRows) {
      const chave = `${row.paciente_id}|${formatDateISO(new Date(row.data))}|${row.hora_inicio.slice(0,5)}|${row.hora_fim.slice(0,5)}`
      sessoesMap.set(chave, row.id)
    }

    console.log(`✅ Sessões criadas: ${sessoesCriadas}`)
  }

  // Inserir vínculos sessao_terapeutas
  let vinculosCriados = 0
  const vinculosBatch: { sessao_id: string; terapeuta_id: string }[] = []

  for (const [nomeKey, items] of pacienteAgendas) {
    const pacienteId = pacienteMap.get(nomeKey)
    if (!pacienteId) continue

    for (const item of items) {
      const diaNum = DIA_MAP[item.dia]
      if (!diaNum) continue
      const datasDoDia = diaParaDatas.get(diaNum) || []
      const partesHorario = item.horario.split(/\s*-\s*/).map(s => s.trim())
      const hora_inicio = partesHorario[0]
      const hora_fim = partesHorario[1]
      if (!hora_inicio || !hora_fim) continue

      for (const dataObj of datasDoDia) {
        const dataStr = formatDateISO(dataObj)
        const chave = `${pacienteId}|${dataStr}|${hora_inicio}|${hora_fim}`
        const sessaoId = sessoesMap.get(chave)
        if (!sessaoId) continue

        for (const tnome of item.terapeutas) {
          const terapeutaId = terapeutaMap.get(tnome.toLowerCase())
          if (terapeutaId) {
            vinculosBatch.push({ sessao_id: sessaoId, terapeuta_id: terapeutaId })
          } else {
            console.log(`⚠️ Terapeuta não encontrado: "${tnome}"`)
          }
        }
      }
    }
  }

  if (vinculosBatch.length > 0) {
    const values = vinculosBatch.map((v, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')
    const params = vinculosBatch.flatMap(v => [v.sessao_id, v.terapeuta_id])

    const insertVinculos = `
      INSERT INTO public.sessao_terapeutas (sessao_id, terapeuta_id)
      VALUES ${values}
      ON CONFLICT DO NOTHING
    `
    const { rowCount } = await client.query(insertVinculos, params)
    vinculosCriados = rowCount || 0
    console.log(`✅ Vínculos criados: ${vinculosCriados}`)
  }

  console.log(`\n📈 RESUMO:`)
  console.log(`   Pacientes encontrados: ${pacientesEncontrados}`)
  console.log(`   Pacientes não encontrados: ${pacientesNaoEncontrados}`)
  console.log(`   Sessões criadas: ${sessoesCriadas}`)
  console.log(`   Vínculos criados: ${vinculosCriados}`)

  await client.end()
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
