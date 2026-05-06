-- ============================================
-- MIGRATION 00036: Restringir acesso anonimo
-- ============================================
-- Remove o role 'anon' das policies RLS existentes.
-- A partir desta migration, apenas usuarios autenticados (authenticated)
-- e o service_role tem acesso as tabelas.

-- patients
DROP POLICY IF EXISTS "Allow all" ON public.patients;
CREATE POLICY "Allow all" ON public.patients
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- especialidades
DROP POLICY IF EXISTS "Allow all especialidades" ON public.especialidades;
CREATE POLICY "Allow all especialidades" ON public.especialidades
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- horarios
DROP POLICY IF EXISTS "Allow all horarios" ON public.horarios;
CREATE POLICY "Allow all horarios" ON public.horarios
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- terapeutas
DROP POLICY IF EXISTS "Allow all terapeutas" ON public.terapeutas;
CREATE POLICY "Allow all terapeutas" ON public.terapeutas
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- sessoes
DROP POLICY IF EXISTS "Allow all sessoes" ON public.sessoes;
CREATE POLICY "Allow all sessoes" ON public.sessoes
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- sessao_terapeutas
DROP POLICY IF EXISTS "Allow all sessao_terapeutas" ON public.sessao_terapeutas;
CREATE POLICY "Allow all sessao_terapeutas" ON public.sessao_terapeutas
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- bloqueios
DROP POLICY IF EXISTS "Allow all bloqueios" ON public.bloqueios;
CREATE POLICY "Allow all bloqueios" ON public.bloqueios
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

-- ausencias (as policies originais nao tinham 'anon', mas garantimos o target correto)
DROP POLICY IF EXISTS "Allow read" ON public.ausencias;
DROP POLICY IF EXISTS "Allow write" ON public.ausencias;
CREATE POLICY "Allow read" ON public.ausencias
  FOR SELECT TO authenticated, service_role
  USING (true);
CREATE POLICY "Allow write" ON public.ausencias
  FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);
