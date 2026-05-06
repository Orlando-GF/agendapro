import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pacienteId = searchParams.get('paciente_id')

  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id é obrigatório' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Busca dados do paciente
  const { data: paciente, error: errPaciente } = await supabase
    .from('patients')
    .select('*')
    .eq('id', pacienteId)
    .single()

  if (errPaciente || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // Busca sessões do paciente
  const { data: sessoes, error: errSessoes } = await supabase
    .from('sessoes')
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, recorrente, observacoes, created_at, updated_at')
    .eq('paciente_id', pacienteId)
    .order('data', { ascending: false })

  if (errSessoes) {
    return NextResponse.json({ error: errSessoes.message }, { status: 500 })
  }

  // Busca terapeutas relacionados às sessões
  const sessaoIds = (sessoes || []).map(s => s.id)
  let terapeutasPorSessao: Record<string, any[]> = {}

  if (sessaoIds.length > 0) {
    const { data: stRows } = await supabase
      .from('sessao_terapeutas')
      .select('sessao_id, terapeuta_id, status, terapeutas(id, nome)')
      .in('sessao_id', sessaoIds)

    for (const row of stRows || []) {
      const sid = row.sessao_id as string
      if (!terapeutasPorSessao[sid]) terapeutasPorSessao[sid] = []
      terapeutasPorSessao[sid].push(row)
    }
  }

  const exportacao = {
    dados_pessoais: {
      id: paciente.id,
      nome: paciente.nome,
      codigo: paciente.codigo,
      telefone: paciente.telefone,
      responsavel: paciente.responsavel,

      ativo: paciente.ativo,
      em_avaliacao: paciente.em_avaliacao,
      whatsapp_adicionado: paciente.whatsapp_adicionado,
      judicial: paciente.judicial,
      observacoes: paciente.observacoes,
      status_tratamento: paciente.status_tratamento,
      motivo_saida: paciente.motivo_saida,
      data_saida: paciente.data_saida,
      created_at: paciente.created_at,
      updated_at: paciente.updated_at,
    },
    sessoes: (sessoes || []).map(s => ({
      ...s,
      terapeutas: terapeutasPorSessao[s.id] || [],
    })),
    exportado_em: new Date().toISOString(),
  }

  return NextResponse.json(exportacao)
}
