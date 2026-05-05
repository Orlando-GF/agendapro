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

  console.log('=== AUDITORIA ===\n')
  console.log('Data:', dataISO)

  // 1. Verificar se a RPC retorna observacoes
  console.log('\n--- 1. RPC recepcao_dia ---')
  const { data: rpcData } = await supabase.rpc('recepcao_dia', { p_data: dataISO })
  const sessaoComWerik = rpcData?.find((s: any) => (s.terapeutas || []).some((t: any) => t.nome === 'WERIK'))
  if (sessaoComWerik) {
    const werik = sessaoComWerik.terapeutas.find((t: any) => t.nome === 'WERIK')
    console.log('WERIK status:', werik.status)
    console.log('WERIK observacoes:', werik.observacoes)
    console.log('WERIK tem observacoes?', 'observacoes' in werik)
  } else {
    console.log('Nenhuma sessao com Werik')
  }

  // 2. Verificar listarHistoricoPaciente
  console.log('\n--- 2. listarHistoricoPaciente ---')
  if (sessaoComWerik?.paciente_id) {
    const { data: histRows } = await supabase
      .from('sessoes')
      .select('id, data, sessao_terapeutas(terapeutas(nome), status, observacoes)')
      .eq('paciente_id', sessaoComWerik.paciente_id)
      .eq('data', dataISO)
      .single()

    if (histRows) {
      const sts = (histRows as any).sessao_terapeutas || []
      const werikSt = sts.find((st: any) => st.terapeutas?.nome === 'WERIK')
      console.log('WERIK status:', werikSt?.status)
      console.log('WERIK observacoes:', werikSt?.observacoes)
    }
  }

  // 3. Verificar se a tabela sessao_terapeutas tem a coluna
  console.log('\n--- 3. Schema sessao_terapeutas ---')
  const { data: cols } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'sessao_terapeutas')
    .eq('table_schema', 'public')

  console.log('Colunas:', cols?.map((c: any) => c.column_name).join(', '))

  // 4. Verificar registros direto na tabela
  console.log('\n--- 4. Registros direto na tabela ---')
  const { data: werikId } = await supabase.from('terapeutas').select('id').eq('nome', 'WERIK').single()
  if (werikId) {
    const { data: sts } = await supabase
      .from('sessao_terapeutas')
      .select('sessao_id, status, observacoes')
      .eq('terapeuta_id', werikId.id)
      .limit(3)
    console.log('Registros:', JSON.stringify(sts, null, 2))
  }
}

main().catch(console.error)
