-- Índices de performance para queries frequentes

-- 1. Índice composto para agenda (data + hora_inicio)
CREATE INDEX IF NOT EXISTS idx_sessoes_data_hora ON public.sessoes(data, hora_inicio);

-- 2. Índice para filtro por terapeuta em sessões
CREATE INDEX IF NOT EXISTS idx_sessao_terapeutas_terapeuta ON public.sessao_terapeutas(terapeuta_id);

-- 3. Índice para filtro por sessão em sessão_terapeutas
CREATE INDEX IF NOT EXISTS idx_sessao_terapeutas_sessao ON public.sessao_terapeutas(sessao_id);

-- 4. Índice para status (usado em recepção para contagem/filtro)
CREATE INDEX IF NOT EXISTS idx_sessoes_status ON public.sessoes(status);

-- 5. Índice para data de bloqueios (usado na RPC listar_bloqueios_semana)
CREATE INDEX IF NOT EXISTS idx_bloqueios_data ON public.bloqueios(data);
