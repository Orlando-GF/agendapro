# Backup AgendaPro

## Como configurar o backup automático

### 1. Obter a senha do banco
1. Acesse: https://supabase.com/dashboard/project/duzvqdrefyqqyuzfxeye/settings/database
2. Copie a **Database Password**

### 2. Configurar a senha no Windows
Abra o PowerShell e execute:
```powershell
[System.Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD', 'COLE_A_SENHA_AQUI', 'User')
```
**Feche e reabra o PowerShell** após executar.

### 3. Instalar pg_dump (se não tiver)
Baixe e instale o PostgreSQL client:
https://www.postgresql.org/download/windows/

Ou instale apenas o Supabase CLI:
https://supabase.com/docs/guides/cli/getting-started

### 4. Testar o backup
Execute o arquivo `backup-agenda.bat`.

O backup será salvo em:
```
C:\Users\%USERNAME%\Documents\Backups\AgendaPro\agendapro_backup_YYYY-MM-DD_HH-MM-SS.zip
```

### 5. Agendar backup automático (semanal)
1. Abra o **Agendador de Tarefas** do Windows (`taskschd.msc`)
2. Crie uma tarefa básica:
   - **Nome:** Backup AgendaPro
   - **Disparador:** Semanalmente (ex: toda segunda às 08:00)
   - **Ação:** Iniciar um programa
   - **Programa:** `powershell.exe`
   - **Argumentos:** `-ExecutionPolicy Bypass -File "C:\Users\%USERNAME%\Documents\Backups\AgendaPro\backup-agenda.ps1"`
3. Marque "Executar mesmo se o usuário não estiver logado"
4. Pronto! Seu banco fará backup automático toda semana.

### 6. Manutenção
- O script mantém apenas os **10 backups mais recentes** (automático)
- Os backups são compactados em `.zip` para economizar espaço
- Recomenda-se sincronizar a pasta com Google Drive, OneDrive ou Dropbox
