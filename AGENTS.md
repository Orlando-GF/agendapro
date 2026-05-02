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
├── TerapeutasView.tsx         ← Therapist list table
├── TerapeutaForm.tsx          ← Therapist form (inside sidepanel)
├── EspecialidadesView.tsx     ← Specialties cards
├── EspecialidadeForm.tsx      ← Specialty form (inside sidepanel)
├── HorariosView.tsx           ← Time slots table
└── HorarioForm.tsx            ← Time slot form (inside sidepanel)
```

## Server Actions

All data operations are in `app/actions.ts`:
- `listar/salvar/excluir` for each entity (patients, terapeutas, especialidades, horarios)
- `contarPacientes()` — optimized single-RPC call

## Database Schema

- `patients` — patients with flags (avaliação, whatsapp, judicial)
- `terapeutas` — therapists with phone + specialty FK
- `especialidades` — specialties (fonoaudiologia, neuropsicologia, etc.)
- `horarios` — fixed time slots with ordering

## Key Patterns

1. **Lazy loading by view**: CadastroTeacolhe only fetches data for the active view
2. **Reusable sidepanel**: SidepanelContainer provides the slide-in animation shell; forms inject their content
3. **No `as any` casts**: Removed all mass `as any` usage in favor of local TypeScript interfaces
4. **DRY CSS**: Animation keyframes live only in SidepanelContainer

## Design System

### Border Radius
- **Padrão**: 8px (`rounded-lg` no Tailwind)
- **Exceções**: `rounded-full` apenas para badges, avatares e indicadores circulares
- **Proibido**: `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-md`, `rounded-sm` em qualquer elemento
