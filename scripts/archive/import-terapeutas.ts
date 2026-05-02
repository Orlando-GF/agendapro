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

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()

  // Buscar especialidades existentes
  const { rows: esps } = await client.query('select id, nome from public.especialidades')
  const espMap = new Map(esps.map(e => [e.nome, e.id]))

  const dataDir = 'dados'
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const terapeutas = new Map<string, { nome: string; especialidade: string }>()

  for (const file of files) {
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
            const ep = m.match(/\(([^)]+)\)/)
            if (nm && ep) {
              const rawNome = nm[1].trim()
              const rawEsp = ep[1].trim().toLowerCase()
              if (rawNome.toLowerCase().includes('falta')) continue
              const nome = normalizeNome(rawNome)
              terapeutas.set(nome.toLowerCase(), { nome, especialidade: rawEsp })
            }
          }
        }
      }
    }
  }

  let inseridos = 0
  let duplicados = 0

  for (const t of terapeutas.values()) {
    const espId = espMap.get(t.especialidade)
    try {
      await client.query(
        'insert into public.terapeutas (nome, especialidade_id, telefone) values ($1, $2, $3)',
        [t.nome, espId, null]
      )
      inseridos++
    } catch (err: any) {
      if (err.message.includes('duplicate')) duplicados++
      else console.error('Erro em', t.nome, err.message)
    }
  }

  console.log(`✅ Terapeutas importados: ${inseridos}`)
  console.log(`   Duplicados ignorados: ${duplicados}`)
  console.log(`   Total únicos extraídos: ${terapeutas.size}`)

  await client.end()
}

main()
