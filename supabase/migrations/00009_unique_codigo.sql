-- Trocar regra de unicidade: nome -> codigo (prontuario)
-- Pacientes homonimos sao permitidos; codigo duplicado nao.

ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_nome_unique;

-- PostgreSQL permite multiplos NULLs em UNIQUE, entao pacientes sem prontuario nao conflitam
ALTER TABLE public.patients ADD CONSTRAINT patients_codigo_unique UNIQUE (codigo);
