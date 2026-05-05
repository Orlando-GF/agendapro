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

  console.log('Data:', dataISO)

  // 1. Buscar sessoes do dia com terapeutas
  const { data: sessoes, error } = await supabase
    .rpc('recepcao_dia', { p_data: dataISO })

  if (error) {
    console.error('Erro RPC:', error)
    return
  }

  console.log('\nSessoes do dia:', sessoes?.length)
  for (const s of sessoes || []) {
    console.log(`  ${s.hora_inicio?.slice(0,5)}-${s.hora_fim?.slice(0,5)} | ${s.paciente_nome || s.tipo} | terapeutas:`,
      (s.terapeutas || []).map((t: any) => `${t.nome}(${t.status})`).join(', ')
    )
  }

  // 2. Buscar historico de um paciente que tem sessao hoje
  if (sessoes && sessoes.length > 0) {
    const sessaoComPaciente = sessoes.find((s: any) => s.paciente_id)
    if (sessaoComPaciente) {
      const { data: hist } = await supabase
        .from('sessoes')
        .select('id, data, hora_inicio, status, patients(nome), sessao_terapeutas(terapeutas(nome), status)')
        .eq('paciente_id', sessaoComPaciente.paciente_id)
        .eq('data', dataISO)

      console.log('\nHistorico do paciente:', sessaoComPaciente.paciente_nome)
      for (const h of hist || []) {
        console.log('  sessao:', h.id)
        console.log('  terapeutas:', (h.sessao_terapeutas || []).map((st: any) => `${st.terapeutas?.nome}(${st.status})`).join(', '))
      }
    }
  }
}

main().catch(console.error)
