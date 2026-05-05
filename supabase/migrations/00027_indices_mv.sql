-- Índices otimizados para performance single-user
-- Custo: $0 (executado no PostgreSQL existente)

-- Índice parcial para pacientes ativos (99% das consultas)
CREATE INDEX IF NOT EXISTS idx_patients_ativo_true ON patients(nome) WHERE ativo = true;

-- Índice composto para agenda semanal (query mais frequente)
CREATE INDEX IF NOT EXISTS idx_sessoes_agenda ON sessoes(data, hora_inicio)
  INCLUDE (paciente_id, tipo, status, recorrente)
  WHERE tipo = 'SESSAO';

-- Índice para recorrências (evita seq scan em geração de sessões)
CREATE INDEX IF NOT EXISTS idx_sessoes_recorrente_data ON sessoes(recorrente, data)
  WHERE recorrente = true;

-- Extensão necessária para índice GIN de busca textual
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca textual em pacientes (busca por nome instantânea)
CREATE INDEX IF NOT EXISTS idx_patients_nome_gin ON patients USING gin(nome gin_trgm_ops);

-- Materialized View: agenda da semana atual + próximas 2 semanas
-- Refresh via trigger ou manual após mutações em sessoes
DROP MATERIALIZED VIEW IF EXISTS mv_agenda_semana;

CREATE MATERIALIZED VIEW mv_agenda_semana AS
SELECT
  s.id,
  s.data,
  s.hora_inicio,
  s.hora_fim,
  s.status,
  s.tipo,
  s.titulo,
  s.recorrente,
  p.nome AS paciente_nome,
  p.codigo AS paciente_codigo,
  p.em_avaliacao AS paciente_em_avaliacao,
  jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'nome', t.nome,
      'ativo', t.ativo,
      'status', st.status,
      'especialidade_nome', e.nome
    ) ORDER BY t.nome
  ) AS terapeutas
FROM sessoes s
LEFT JOIN patients p ON p.id = s.paciente_id
LEFT JOIN sessao_terapeutas st ON st.sessao_id = s.id
LEFT JOIN terapeutas t ON t.id = st.terapeuta_id
LEFT JOIN especialidades e ON e.id = t.especialidade_id
WHERE s.data BETWEEN (CURRENT_DATE - INTERVAL '7 days') AND (CURRENT_DATE + INTERVAL '14 days')
GROUP BY s.id, p.id;

CREATE UNIQUE INDEX idx_mv_agenda_semana_id ON mv_agenda_semana(id);
CREATE INDEX idx_mv_agenda_semana_data ON mv_agenda_semana(data, hora_inicio);

-- Função para refresh da MV (pode ser chamada por trigger ou app)
CREATE OR REPLACE FUNCTION refresh_mv_agenda_semana()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agenda_semana;
END;
$$;
