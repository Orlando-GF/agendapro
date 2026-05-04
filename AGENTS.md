<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase Setup

This project uses Supabase CLI for database management and `@supabase/ssr` for client/server connections.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — private service role key (server-only)

## Client Utilities

- `lib/supabase/client.ts` — Browser client (use in Client Components)
- `lib/supabase/server.ts` — Server client (use in Server Components/Actions)
- `lib/supabase/admin.ts` — Admin client with Service Role (bypasses RLS)

## Supabase CLI

### Login & Link
```bash
# One-time login (opens browser)
npx supabase login

# Link to remote project
npx supabase link --project-ref <project-ref>
```

### Useful Commands
```bash
# Generate TypeScript types from remote DB schema
npx supabase gen types typescript --linked --schema public > lib/database.types.ts

# Start local Supabase stack
npx supabase start

# Run database migrations
npx supabase db push

# Pull remote schema changes
npx supabase db pull

# Open Supabase Dashboard
npx supabase dashboard
```

## Agent Access

The agent (Kimi CLI) can read credentials from `.env.local` automatically.
When working with Supabase:
1. Prefer `lib/supabase/server.ts` for data fetching
2. Use `lib/supabase/admin.ts` only for admin operations or when RLS must be bypassed
3. Run `npx supabase gen types typescript --linked` after any schema changes

# Project Architecture

## Component Structure

**Rule: Everything comes from one component.**

The root component `app/components/CadastroTeacolhe.tsx` is the single high-level component that orchestrates the entire application. All state, logic, and sub-views live within it or its direct children.

```
app/components/
├── CadastroTeacolhe.tsx      ← Main orchestrator (sidebar + views + sidepanel)
├── Sidebar.tsx                ← Navigation menu
├── SidepanelContainer.tsx     ← Reusable slide-in panel shell
├── StatsCards.tsx             ← Dashboard stat cards
├── PacienteTable.tsx          ← Patient list table
├── PacienteForm.tsx           ← Patient form (inside sidepanel)
├── TerapeutasView.tsx         ← Therapist list table (shows dias_trabalho)
├── TerapeutaForm.tsx          ← Therapist form (inside sidepanel, edits dias_trabalho)
├── EspecialidadesView.tsx     ← Specialties cards
├── EspecialidadeForm.tsx      ← Specialty form (inside sidepanel)
├── HorariosView.tsx           ← Time slots table
├── HorarioForm.tsx            ← Time slot form (inside sidepanel)
├── CalendarioSemanal.tsx      ← Weekly calendar with drag-and-drop
├── SessoesView.tsx            ← List view of sessions
├── SessaoForm.tsx             ← Session form (inside sidepanel)
├── RecepcaoView.tsx           ← Reception view with date nav + therapist grouping toggle
├── ListaSessoesCelula.tsx     ← Sidepanel for cell sessions
├── FormInput.tsx              ← Text input form component
├── FormSelect.tsx             ← Select dropdown form component
├── FormCheckboxGroup.tsx      ← Checkbox group form component
├── ToastProvider.tsx          ← Toast context provider
└── ToastContainer.tsx         ← Toast notification container

app/hooks/
├── useToast.ts                ← Toast hook
├── usePacientes.ts            ← Patient data fetching + stats
├── useCrudList.ts             ← Generic CRUD hook (terapeutas, especialidades, horarios)
├── useAgenda.ts               ← Agenda sessions + blockings fetching
└── useRecepcao.ts             ← Reception day sessions fetching

lib/
├── date-helpers.ts            ← formatDateISO, formatDateBR, formatDateBRFromISO
└── status-helpers.ts          ← STATUS_COR, STATUS_CONFIG maps
```

## Server Actions

All data operations are in `app/actions.ts`:
- `listar/salvar/excluir` for each entity (patients, terapeutas, especialidades, horarios)
- `listarSessoes`, `salvarSessao`, `excluirSessao`, `atualizarStatusSessao`, `moverSessao`
- `listarBloqueios`, `criarBloqueio`, `excluirBloqueio`
- `contarPacientes()` — optimized single-RPC call

## Database Schema

- `patients` — patients with flags (avaliação, whatsapp, judicial)
- `terapeutas` — therapists with phone + specialty FK + `dias_trabalho text[]`
- `especialidades` — specialties (fonoaudiologia, neuropsicologia, etc.)
- `horarios` — fixed time slots with ordering
- `sessoes` — session/agenda entries (date, time, status, patient FK)
- `sessoes_terapeutas` — many-to-many relation between sessions and therapists
- `bloqueios` — manual time block entries (terapeuta_id, data, hora_inicio, hora_fim, motivo, dia_semana)

## Key Patterns

1. **Lazy loading by view**: CadastroTeacolhe only fetches data for the active view
2. **Reusable sidepanel**: SidepanelContainer provides the slide-in animation shell; forms inject their content
3. **No `as any` casts**: Removed all mass `as any` usage in favor of local TypeScript interfaces
4. **DRY CSS**: Animation keyframes live only in SidepanelContainer

## Business Rules

### Agenda — Automatic Blocking by Working Days
- When a **specific therapist** is selected in the agenda filter, days **outside** their `dias_trabalho` are shown as **BLOQUEADO** (gray cells) automatically.
- Drag-and-drop is blocked for these logically blocked cells.
- When filter is **"Todos"** (empty), **no blockings are shown** — neither automatic nor manual.
- Manual blockings (from `bloqueios` table) only appear when a specific therapist is filtered.

### Recepção — Views
- Default view is **"Por Horário"**: chronological list of all sessions of the day.
- Toggle to **"Por Terapeuta"**: sessions grouped into separate tables per therapist. A session with multiple therapists appears under each therapist's table.
- Date navigation: buttons to go to previous/next day. Default is today.

### Date Handling (CRITICAL)
**Never** use `d.toISOString().split('T')[0]` to format dates for display or DB queries.
`toISOString()` converts to UTC, which in Brazil (UTC-3) causes the date to shift forward by one day after 21:00 local time.

**Always** use local date components:
```ts
function formatDateISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
```

## Design System

### Border Radius
- **Padrão**: 8px (`rounded-lg` no Tailwind)
- **Exceções**: `rounded-full` apenas para badges, avatares e indicadores circulares
- **Proibido**: `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-md`, `rounded-sm` em qualquer elemento
