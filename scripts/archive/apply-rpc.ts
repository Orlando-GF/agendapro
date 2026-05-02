import { Client } from 'pg'
import fs from 'fs'

const client = new Client({
  connectionString: 'postgresql://postgres:Brs30452328@db.duzvqdrefyqqyuzfxeye.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  const sql = fs.readFileSync('supabase/migrations/00003_add_rpc_contar.sql', 'utf-8')
  await client.query(sql)
  console.log('✅ RPC contar_pacientes_resumo criada')
  await client.end()
}

main()
