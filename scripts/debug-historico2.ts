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

  // Testar com a sintaxe EXATA do listarHistoricoPaciente
  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, patients(nome, em_avaliacao), sessao_terapeutas(terapeutas(nome), status)')
    .eq('data', dataISO)
    .order('hora_inicio')

  if (error) {
    console.error('Erro:', error)
    return
  }

  console.log('Total de sessoes:', rows?.length)
  
  // Mostrar apenas sessoes com Werik
  for (const row of rows || []) {
    const sts = (row as any).sessao_terapeutas || []
    const temWerik = sts.some((st: any) => st.terapeutas?.nome === 'WERIK')
    if (temWerik) {
      console.log(`\n${row.hora_inicio?.slice(0,5)} | ${(row as any).patients?.nome || row.tipo}`)
      for (const st of sts) {
        console.log(`  ${st.terapeutas?.nome}: ${st.status}`)
      }
    }
  }
}

main().catch(console.error)
