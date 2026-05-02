import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

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

interface PacienteCSV {
  nomeNormalizado: string
  horario: string
  codigo: string
  whatsapp: boolean
  terapeutasNomes: string[]
  dias: string[]
}

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()

  // Buscar horários do banco
  const { rows: horariosRows } = await client.query('SELECT id, label FROM public.horarios')
  const horarioMap = new Map(horariosRows.map(h => [h.label, h.id]))

  // Buscar terapeutas do banco (nome normalizado -> id)
  const { rows: terapeutasRows } = await client.query('SELECT id, nome FROM public.terapeutas')
  const terapeutaMap = new Map<string, string>()
  for (const t of terapeutasRows) {
    terapeutaMap.set(normalizeNomeTerapeuta(t.nome).toLowerCase(), t.id)
    terapeutaMap.set(t.nome.toLowerCase(), t.id)
  }

  const dataDir = 'dados'
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const pacientes = new Map<string, PacienteCSV>()

  for (const file of files) {
    const diaSemana = extractDayFromFilename(file)
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)

    let currentTerapeutas: string[] = []

    for (const line of lines) {
      const cols = parseCSVLine(line)

      // Pular cabeçalho de colunas
      if (cols[0] === '' && cols.some(c => c.includes('TELEFONE'))) continue

      if (isBlockHeader(cols)) {
        // Extrair nomes dos terapeutas do cabeçalho
        const matches = cols[0].match(/([^,\-]+?)\s*\(([^)]+)\)/g)
        currentTerapeutas = []
        if (matches) {
          for (const m of matches) {
            const nm = m.match(/^\s*([^()]+?)\s*\(/)
            if (nm) {
              const rawNome = nm[1].trim()
              if (!rawNome.toLowerCase().includes('falta')) {
                currentTerapeutas.push(normalizeNomeTerapeuta(rawNome))
              }
            }
          }
        }
        continue
      }

      if (isDataLine(cols)) {
        const rawNome = cols[2]
        const nome = normalizeName(rawNome)
        if (!nome) continue
        const dedupKey = normalizeForDedup(nome)

        const horario = cols[0] || ''
        const codigo = cols[1] || ''
        const whatsapp = cols[3]?.toUpperCase() === 'TRUE'

        const existing = pacientes.get(dedupKey)
        if (existing) {
          if (!existing.dias.includes(diaSemana)) existing.dias.push(diaSemana)
          for (const tnome of currentTerapeutas) {
            if (!existing.terapeutasNomes.includes(tnome)) existing.terapeutasNomes.push(tnome)
          }
          if (!existing.horario && horario) existing.horario = horario
          if (!existing.codigo && codigo) existing.codigo = codigo
          if (whatsapp) existing.whatsapp = true
        } else {
          pacientes.set(dedupKey, {
            nomeNormalizado: nome,
            horario,
            codigo,
            whatsapp,
            terapeutasNomes: [...currentTerapeutas],
            dias: [diaSemana],
          })
        }
      }
    }
  }

  let atualizados = 0
  let vinculosCriados = 0

  for (const p of pacientes.values()) {
    const horarioParts = p.horario.split(/\s*-\s*/)
    const horario_inicio = horarioParts[0]?.trim() || null
    const horario_fim = horarioParts[1]?.trim() || null
    const horario_id = horarioMap.get(p.horario) || null

    const { rowCount } = await client.query(
      `UPDATE public.patients
       SET horario_inicio = $1,
           horario_fim = $2,
           horario_id = $3,
           horario_padrao = $4,
           ativo = true,
           whatsapp_adicionado = $5,
           dias_semana = $6
       WHERE lower(nome) = lower($7)`,
      [horario_inicio, horario_fim, horario_id, p.horario, p.whatsapp, p.dias, p.nomeNormalizado]
    )

    if (rowCount && rowCount > 0) {
      atualizados++

      const { rows: pacienteRows } = await client.query(
        'SELECT id FROM public.patients WHERE lower(nome) = lower($1)',
        [p.nomeNormalizado]
      )

      if (pacienteRows.length > 0) {
        const pacienteId = pacienteRows[0].id

        for (const tnome of p.terapeutasNomes) {
          const terapeutaId = terapeutaMap.get(tnome.toLowerCase())
          if (terapeutaId) {
            try {
              await client.query(
                'INSERT INTO public.paciente_terapeutas (paciente_id, terapeuta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [pacienteId, terapeutaId]
              )
              vinculosCriados++
            } catch {
              // ignorar duplicados
            }
          } else {
            console.log(`⚠️ Terapeuta não encontrado: "${tnome}" (paciente: ${p.nomeNormalizado})`)
          }
        }
      }
    } else {
      console.log(`⚠️ Paciente não encontrado: ${p.nomeNormalizado}`)
    }
  }

  console.log(`\n✅ Pacientes atualizados: ${atualizados}`)
  console.log(`   Vínculos criados: ${vinculosCriados}`)

  await client.end()
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
