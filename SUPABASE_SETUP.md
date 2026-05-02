# Configuração do Supabase

## Próximos passos para conectar ao seu projeto

### 1. Preencha as credenciais
Edite o arquivo `.env.local` na raiz do projeto e substitua pelos dados do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

> **Onde encontrar:** No dashboard do Supabase, vá em **Project Settings > API**.

### 2. Login no Supabase CLI
Rode no terminal:
```bash
npx supabase login
```
Isso abrirá o navegador para autenticar. Só precisa fazer uma vez.

### 3. Linkar o projeto
Descubra o `project ref` no dashboard (é a parte antes de `.supabase.co` na URL do projeto).

```bash
npx supabase link --project-ref abcdefghijklmnopqrst
```

### 4. Gerar tipos do banco (opcional mas recomendado)
```bash
npm run supabase:types
```
Isso cria `lib/database.types.ts` com a tipagem completa das suas tabelas.

---

## Comandos disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm run supabase:start` | Inicia o stack Supabase localmente (Docker) |
| `npm run supabase:stop` | Para o stack local |
| `npm run supabase:status` | Verifica status do stack local |
| `npm run supabase:types` | Gera tipos TypeScript do banco remoto |
| `npm run supabase:db-push` | Envia migrações locais para o remoto |
| `npm run supabase:db-pull` | Puxa schema remoto para local |

---

## Uso no código

### Client Component (Browser)
```tsx
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('tabela').select('*')
```

### Server Component / Server Action
```tsx
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('tabela').select('*')
```

### Admin / Bypass RLS
```tsx
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()
// Ignora Row Level Security — use com cuidado!
```
