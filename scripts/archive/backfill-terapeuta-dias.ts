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

function normalizeNome(nome: string): string {
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

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()

  const dataDir = 'dados'
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const terapeutaDias = new Map<string, Set<string>>()

  for (const file of files) {
    const diaSemana = extractDayFromFilename(file)
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)

    for (const line of lines) {
      const cols = parseCSVLine(line)
      const first = cols[0]
      if (/\([^)]+\)/.test(first) && !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(first)) {
        const matches = first.match(/([^,\-]+)\s*\(([^)]+)\)/g)
        if (matches) {
          for (const m of matches) {
            const nm = m.match(/^\s*([^()]+?)\s*\(/)
            if (nm) {
              const rawNome = nm[1].trim()
              if (rawNome.toLowerCase().includes('falta')) continue
              const nome = normalizeNome(rawNome)
              if (!terapeutaDias.has(nome)) terapeutaDias.set(nome, new Set())
              terapeutaDias.get(nome)!.add(diaSemana)
            }
          }
        }
      }
    }
  }

  // Atualizar no banco
  let atualizados = 0
  let naoEncontrados = 0

  for (const [nome, diasSet] of terapeutaDias) {
    const dias = Array.from(diasSet).sort()
    const { rowCount } = await client.query(
      'update public.terapeutas set dias_trabalho = $1 where lower(nome) = lower($2)',
      [dias, nome]
    )
    if (rowCount && rowCount > 0) {
      atualizados++
      console.log(`✅ ${nome}: ${dias.join(', ')}`)
    } else {
      naoEncontrados++
      console.log(`⚠️  Não encontrado: ${nome} (dias: ${dias.join(', ')})`)
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   Atualizados: ${atualizados}`)
  console.log(`   Não encontrados: ${naoEncontrados}`)

  await client.end()
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
