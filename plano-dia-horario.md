# Plano: Concatenar Dia da Semana com Horário

## 1. Diagnóstico da Situação Atual

### 1.1 Dados no Banco
- **Total de pacientes:** 125
- **Pacientes com 1 dia:** 112
- **Pacientes com 2 dias:** 12
- **Pacientes com 3 dias:** 1 (MIGUEL RIBEIRO MOURA)

### 1.2 Problema Arquitetural Crítico
A modelagem atual armazena **apenas UM horário por paciente** (`patients.horario_id`, `patients.horario_inicio`, `patients.horario_fim`). Isso funciona para os 112 pacientes de 1 dia, mas está **errado para 11 dos 13 pacientes multi-dia**.

### 1.3 Dados Perdidos na Importação
O script `parseAllAgendas.ts` (linhas 170-171) tem um bug de merge:
```typescript
if (!existing.horario_padrao && cols[0]) {
  existing.horario_padrao = cols[0]
}
```
O horário é gravado apenas na **primeira ocorrência** do paciente. O horário dos dias subsequentes é **silenciosamente descartado**.

### 1.4 Evidência dos CSVs
Dos 13 pacientes multi-dia, **11 têm horários diferentes por dia** nos CSVs originais:

| Paciente | Dia 1 + Horário | Dia 2 + Horário | Dia 3 + Horário |
|---|---|---|---|
| SOPHIA EMMAUELY | Quarta 21:20-21:50 | Segunda 18:50-19:20 | — |
| ÍCARO HENRIQUE | Quinta 21:20-21:50 | Sexta 18:15-18:45 | — |
| VICTOR GABRIEL | Segunda 19:25-19:55 | Terça 18:15-18:45 | — |
| MIGUEL RIBEIRO | Quarta 21:20-21:50 | Quinta 21:20-21:50 | Terça 20:10-20:40 |
| HENRIQUE SOUZA | Quarta 21:20-21:50 | Segunda 20:45-21:15 | — |
| SOPHIA REIS | Quarta 20:45-21:15 | Segunda 19:25-19:55 | — |
| DAVI LUCCA | Quinta 20:45-21:15 | Segunda 18:50-19:20 | — |
| ICARO ARAÚJO | Quinta 19:25-19:55 | Sexta 18:50-19:20 | — |
| DAVI MIGUEL | Quinta 20:10-20:40 | Terça 19:25-19:55 | — |
| BRENO MENDES | Sexta 19:25-19:55 | Terça 20:45-21:15 | — |
| GILBERTO FERREIRA | Sexta 21:20-21:50 | Terça 19:25-19:55 | — |

Apenas **2 pacientes** têm o mesmo horário em todos os dias: PIERRE ALVES VINHAGA e HENRY MURDOC MACEDO.

### 1.5 Impacto
- A coluna "Horário" na tabela mostra um único horário, que pode estar correto para um dia e errado para outro.
- Não é possível editar horários diferentes por dia no formulário atual.
- A informação real da agenda está distorcida no banco.

---

## 2. Solução Arquitetural

### 2.1 Nova Tabela: `paciente_horarios`
```sql
CREATE TABLE paciente_horarios (
  id SERIAL PRIMARY KEY,
  paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  UNIQUE (paciente_id, dia_semana)
);
```
Cada paciente pode ter **N registros**, um para cada dia da semana, com horário próprio.

### 2.2 Alterações no Schema `patients`
Remover colunas obsoletas (ou mantê-las temporariamente para compatibilidade):
- `horario_id` (FK para `horarios`) — perde sentido, pois cada dia pode ter horário diferente
- `horario_inicio` — migra para a nova tabela
- `horario_fim` — migra para a nova tabela
- `dias_semana` — pode ser mantido como cache denormalizado ou removido (os dias estarão na nova tabela)

A tabela `horarios` (com `hora_inicio`, `hora_fim`, `ordem`) pode continuar existindo como **catálogo de faixas horárias**, mas o vínculo com o paciente passa a ser indireto, via `paciente_horarios`.

### 2.3 Recuperação de Dados
Como os horários originais dos 11 pacientes foram perdidos na importação, precisamos **re-parsear os 5 CSVs** para extrair os horários corretos por dia, e fazer um **backfill** na nova tabela.

---

## 3. Implementação

### 3.1 Migração do Banco (SQL)
1. Criar `paciente_horarios`.
2. Script de backfill: iterar todos os pacientes, inserir um registro por dia em `dias_semana` usando o `horario_inicio`/`horario_fim` atual.
3. Script de correção: para os 13 pacientes multi-dia, re-parsear os CSVs e inserir os horários CORRETOS por dia (substituindo os registros do passo 2).
4. Atualizar a RPC `salvar_paciente_completo` para receber `dias_horarios` como JSONB e fazer INSERT/UPDATE na nova tabela.
5. (Opcional) Dropar colunas `horario_id`, `horario_inicio`, `horario_fim` de `patients`.

### 3.2 Backend (TypeScript)
1. Atualizar `database.types.ts` com a nova tabela.
2. Atualizar `listarPacientes` para fazer JOIN com `paciente_horarios`.
3. Atualizar `salvarPaciente` (Server Action) para receber e passar `diasHorarios` para a RPC.
4. Remover dependência de `horario_id` nas queries.

### 3.3 Frontend
1. **PacienteForm**: substituir o dropdown único de "Horário" por uma lista de dias (calculados automaticamente pela interseção dos terapeutas), onde cada dia tem seu próprio dropdown de horário.
2. **PacienteTable**: substituir as colunas "Dias" e "Horário" por uma única coluna "Agenda" mostrando cada dia com seu horário (ex: "Seg 18:15-18:45", "Ter 19:25-19:55").
3. **CadastroTeacolhe**: passar `diasHorarios` como parte do estado do paciente.

---

## 4. Fluxo do Formulário (Novo)
1. Usuário seleciona terapeutas.
2. Dias da semana são calculados automaticamente (interseção dos `dias_trabalho`).
3. Para **cada dia resultante**, aparece um dropdown de horário (vindo da tabela `horarios`).
4. O usuário pode escolhor horários diferentes para cada dia.
5. Ao salvar, envia `diasHorarios: [{ dia: 'Segunda-feira', hora_inicio: '18:15', hora_fim: '18:45' }, ...]`.

---

## 5. Alternativas Consideradas

| Opção | Prós | Contras |
|---|---|---|
| **A) Tabela separada (recomendada)** | Normalizada, flexível, representa a realidade | Mais complexa, requer migração |
| **B) Manter 1 horário, forçar igualdade** | Simples, zero mudanças | Perde dados reais da agenda, 11 pacientes ficam com horário errado em pelo menos 1 dia |
| **C) Array de strings `dias_horarios text[]`** | Rápido de implementar | Não normalizado, difícil consultar/ordenar, não valida formato |

A Opção A é a única que resolve o problema real sem perda de dados.

---

## 6. Resumo do Trabalho
- **1 migração SQL** (nova tabela + backfill + RPC atualizada)
- **1 script de recuperação** (re-parse dos 5 CSVs para os 13 pacientes multi-dia)
- **Tipos TypeScript** atualizados
- **2 Server Actions** atualizadas (`listarPacientes`, `salvarPaciente`)
- **2 componentes React** alterados (`PacienteForm`, `PacienteTable`)
- Testes manuais nos pacientes multi-dia
