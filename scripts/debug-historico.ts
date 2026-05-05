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

  // Buscar um paciente que tem sessao hoje com WERIK
  const { data: sessoes } = await supabase
    .from('sessoes')
    .select('id, paciente_id, patients(nome), sessao_terapeutas!inner(terapeuta_id, terapeutas(nome), status)')
    .eq('data', dataISO)
    .eq('sessao_terapeutas.terapeutas.nome', 'WERIK')

  console.log('Sessoes com Werik:')
  for (const s of sessoes || []) {
    console.log('Paciente:', (s.patients as any)?.nome)
    console.log('Terapeutas:')
    for (const st of (s as any).sessao_terapeutas || []) {
      console.log(`  ${st.terapeutas?.nome}: ${st.status}`)
    }
  }
}

main().catch(console.error)
