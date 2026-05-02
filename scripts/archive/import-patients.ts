import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { parseAllAgendas } from '../lib/parse-agenda'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const pacientes = parseAllAgendas()
  console.log(`📊 Total de pacientes extraídos dos CSVs: ${pacientes.length}`)

  let inseridos = 0
  let duplicados = 0
  let erros = 0

  for (const p of pacientes) {
    const { error } = await (supabase as any)
      .from('patients')
      .insert({
        nome: p.nome,
        codigo: p.codigo || null,
        telefone: p.telefone || null,
        responsavel: p.responsavel || null,
        horario_padrao: p.horario_padrao || null,
        dias_semana: p.dias_semana,
        profissionais: p.profissionais,
        ativo: p.ativo,
        em_avaliacao: p.em_avaliacao,
        observacoes: p.observacoes || null,
      })

    if (error) {
      if (error.message.includes('duplicate key') || error.code === '23505') {
        duplicados++
      } else {
        console.error(`❌ Erro em "${p.nome}":`, error.message)
        erros++
      }
    } else {
      inseridos++
    }
  }

  console.log('\n✅ Importação finalizada!')
  console.log(`   Inseridos: ${inseridos}`)
  console.log(`   Duplicados (ignorados): ${duplicados}`)
  console.log(`   Erros: ${erros}`)
}

main()
