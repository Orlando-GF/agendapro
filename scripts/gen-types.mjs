import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function genTypes() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/openapi+json'
    }
  })

  if (!res.ok) {
    console.error('Erro ao buscar schema:', res.status, await res.text())
    process.exit(1)
  }

  const schema = await res.json()
  const definitions = schema.definitions || {}

  let ts = `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\n\n`
  ts += `export interface Database {\n  public: {\n    Tables: {\n`

  for (const [name, def] of Object.entries(definitions)) {
    const properties = def.properties || {}
    const required = def.required || []

    ts += `      ${name}: {\n`
    ts += `        Row: {\n`
    for (const [col, info] of Object.entries(properties)) {
      const type = openapiToTs(info)
      const optional = required.includes(col) ? '' : '?'
      ts += `          ${col}${optional}: ${type}\n`
    }
    ts += `        }\n`
    ts += `        Insert: Omit<Database['public']['Tables']['${name}']['Row'], 'id'> & Partial<Pick<Database['public']['Tables']['${name}']['Row'], 'id'>>\n`
    ts += `        Update: Partial<Database['public']['Tables']['${name}']['Row']>\n`
    ts += `      }\n`
  }

  ts += `    }\n`
  ts += `    Views: {\n    }\n`
  ts += `    Functions: {\n    }\n`
  ts += `  }\n`
  ts += `}\n`

  await fs.promises.writeFile('lib/database.types.ts', ts)
  console.log('✅ Tipos gerados em lib/database.types.ts')
  console.log(`   Tabelas encontradas: ${Object.keys(definitions).length}`)
}

function openapiToTs(info) {
  if (info.type === 'string' && info.format === 'uuid') return 'string'
  if (info.type === 'string' && info.format === 'date-time') return 'string'
  if (info.type === 'string') return 'string'
  if (info.type === 'integer' || info.type === 'number') return 'number'
  if (info.type === 'boolean') return 'boolean'
  if (info.type === 'array') return `${openapiToTs(info.items)}[]`
  if (info.type === 'object') return 'Json'
  if (info.$ref) return 'Json'
  return 'unknown'
}

import fs from 'fs'
genTypes()
