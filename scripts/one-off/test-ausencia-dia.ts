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

  // Buscar ID do Werik
  const { data: terapeuta } = await supabase
    .from('terapeutas')
    .select('id')
    .eq('nome', 'WERIK')
    .single()

  if (!terapeuta) {
    console.log('Werik nao encontrado')
    return
  }

  console.log('Werik ID:', terapeuta.id)
  console.log('Data:', dataISO)

  // Simular a funcao marcarAusenciaProfissionalDia
  const observacao = 'AUSÊNCIA DO PROFISSIONAL: Folga'

  // Busca todas as sessoes do dia onde o terapeuta participa
  const { data: stRows, error: stError } = await supabase
    .from('sessao_terapeutas')
    .select('sessao_id')
    .eq('terapeuta_id', terapeuta.id)

  if (stError) {
    console.error('Erro buscando st:', stError)
    return
  }

  const sessaoIds = stRows?.map(r => r.sessao_id) || []
  console.log('Total sessoes do Werik (todas as datas):', sessaoIds.length)

  // Filtra apenas sessoes da data
  const { data: sessoesDoDia, error: sError } = await supabase
    .from('sessoes')
    .select('id')
    .eq('data', dataISO)
    .in('id', sessaoIds)

  if (sError) {
    console.error('Erro buscando sessoes:', sError)
    return
  }

  const idsDoDia = sessoesDoDia?.map(s => s.id) || []
  console.log('Sessoes do Werik HOJE:', idsDoDia.length)

  if (idsDoDia.length === 0) {
    console.log('Nenhuma sessao hoje')
    return
  }

  // Atualiza
  const { error: updError } = await supabase
    .from('sessao_terapeutas')
    .update({ status: 'FALTA_PROFISSIONAL', observacoes: observacao })
    .eq('terapeuta_id', terapeuta.id)
    .in('sessao_id', idsDoDia)

  if (updError) {
    console.error('Erro update:', updError)
  } else {
    console.log('OK! Atualizadas:', idsDoDia.length)
  }

  // Verificar
  const { data: verif } = await supabase
    .from('sessoes')
    .select('id, hora_inicio, sessao_terapeutas!inner(terapeutas(nome), status)')
    .eq('data', dataISO)
    .eq('sessao_terapeutas.terapeuta_id', terapeuta.id)

  console.log('\nVerificacao:')
  for (const s of verif || []) {
    const st = (s as any).sessao_terapeutas?.[0]
    console.log(`  ${s.hora_inicio?.slice(0,5)}: ${st?.terapeutas?.nome} = ${st?.status}`)
  }
}

main().catch(console.error)
