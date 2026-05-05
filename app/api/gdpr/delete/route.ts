import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { paciente_id } = body

  if (!paciente_id) {
    return NextResponse.json({ error: 'paciente_id é obrigatório' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verifica se o paciente existe
  const { data: paciente, error: errPaciente } = await supabase
    .from('patients')
    .select('id')
    .eq('id', paciente_id)
    .single()

  if (errPaciente || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // Anonimiza os dados pessoais do paciente (LGPD - direito ao esquecimento)
  const { error: errUpdate } = await supabase
    .from('patients')
    .update({
      nome: '[REMOVIDO]',
      codigo: null,
      telefone: null,
      responsavel: null,
      horario_padrao: null,
      observacoes: 'DADOS ANONIMIZADOS POR SOLICITAÇÃO LGPD',
      ativo: false,
      status_tratamento: 'DESISTIU',
      motivo_saida: 'SOLICITAÇÃO DE EXCLUSÃO (LGPD)',
      data_saida: new Date().toISOString().split('T')[0],
    })
    .eq('id', paciente_id)

  if (errUpdate) {
    return NextResponse.json({ error: errUpdate.message }, { status: 500 })
  }

  // Remove o vínculo paciente_id das sessões (mantém os registros anonimizados)
  const { error: errSessoes } = await supabase
    .from('sessoes')
    .update({ paciente_id: null })
    .eq('paciente_id', paciente_id)

  if (errSessoes) {
    return NextResponse.json({ error: errSessoes.message }, { status: 500 })
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: 'Dados pessoais anonimizados conforme solicitação LGPD',
    paciente_id,
    anonimizado_em: new Date().toISOString(),
  })
}
