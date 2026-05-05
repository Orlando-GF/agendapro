import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key)

async function main() {
  const hoje = new Date()
  const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`

  const { data: sessoes } = await supabase
    .rpc('recepcao_dia', { p_data: dataISO })

  console.log('Data:', dataISO)
  console.log('Total sessoes:', sessoes?.length)

  for (const s of sessoes || []) {
    const terapeutas = s.terapeutas || []
    const werik = terapeutas.find((t: any) => t.nome === 'WERIK')
    if (werik) {
      console.log(`\n${s.hora_inicio?.slice(0,5)} | ${s.paciente_nome || s.tipo}`)
      console.log('  WERIK status:', werik.status)
      console.log('  WERIK observacoes:', werik.observacoes)
    }
  }
}

main().catch(console.error)
