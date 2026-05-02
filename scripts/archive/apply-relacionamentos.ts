import { Client } from 'pg'
import fs from 'fs'

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  const sql = fs.readFileSync('supabase/migrations/00004_paciente_relacionamentos.sql', 'utf-8')
  await client.query(sql)
  console.log('✅ Relacionamentos aplicados: horario_id + paciente_terapeutas')
  await client.end()
}

main()
