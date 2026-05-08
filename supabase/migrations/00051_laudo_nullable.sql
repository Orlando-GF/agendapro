-- Migration 00046: Permite NULL em patients.laudo para representar "não verificado"
-- Estados: true = tem laudo, false = não tem laudo, null = não verificado

ALTER TABLE public.patients ALTER COLUMN laudo DROP NOT NULL;
