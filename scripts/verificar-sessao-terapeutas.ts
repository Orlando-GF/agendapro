import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('Faltam variáveis de ambiente')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  // 1. Verificar colunas da tabela
  const { data: cols, error: colsErr } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'sessao_terapeutas')
    .eq('table_schema', 'public')
    .order('ordinal_position')

  console.log('Colunas de sessao_terapeutas:')
  if (colsErr) console.error(colsErr)
  else console.log(cols?.map(c => c.column_name).join(', '))

  // 2. Buscar um registro para testar update
  const { data: regs, error: regsErr } = await supabase
    .from('sessao_terapeutas')
    .select('sessao_id, terapeuta_id, status, observacoes')
    .limit(3)

  console.log('\nRegistros:')
  if (regsErr) console.error(regsErr)
  else console.log(JSON.stringify(regs, null, 2))

  // 3. Tentar fazer um update de teste no primeiro registro
  if (regs && regs.length > 0) {
    const r = regs[0]
    console.log('\nTentando update no registro:', r.sessao_id, r.terapeuta_id)
    const { error: updErr } = await supabase
      .from('sessao_terapeutas')
      .update({ status: 'FALTA_PROFISSIONAL', observacoes: 'TESTE: folga' })
      .eq('sessao_id', r.sessao_id)
      .eq('terapeuta_id', r.terapeuta_id)

    console.log('Update teste:')
    if (updErr) console.error('ERRO:', updErr)
    else console.log('OK! Update funcionou.')

    // Reverter
    await supabase
      .from('sessao_terapeutas')
      .update({ status: r.status, observacoes: r.observacoes })
      .eq('sessao_id', r.sessao_id)
      .eq('terapeuta_id', r.terapeuta_id)
    console.log('Revertido.')
  }
}

main().catch(console.error)
