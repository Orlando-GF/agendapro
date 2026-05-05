# Script de backup do AgendaPro
# Salva o banco PostgreSQL completo em arquivo .sql + .zip
# 
# COMO USAR:
# 1. Instale o pg_dump (vem com PostgreSQL ou use o instalador do Supabase CLI)
# 2. Defina a senha do banco como variável de ambiente:
#    [System.Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD', 'SUA_SENHA_AQUI', 'User')
#    (Reinicie o PowerShell após definir)
# 3. Execute: .\backup-agenda.ps1
# 4. Opcional: agende no Agendador de Tarefas do Windows para rodar semanalmente

param(
    [string]$PastaDestino = "$env:USERPROFILE\Documents\Backups\AgendaPro",
    [int]$ManterUltimos = 10
)

$ErrorActionPreference = "Stop"

# Configurações do projeto (lidas do .env.local se disponível)
$ProjectRef = "duzvqdrefyqqyuzfxeye"
$DbHost = "db.$ProjectRef.supabase.co"
$DbPort = 5432
$DbUser = "postgres"
$DbName = "postgres"

# Senha do banco (obrigatória)
$DbPassword = $env:SUPABASE_DB_PASSWORD
if (-not $DbPassword) {
    Write-Host "ERRO: Variável de ambiente SUPABASE_DB_PASSWORD não definida." -ForegroundColor Red
    Write-Host "Instruções:" -ForegroundColor Yellow
    Write-Host "1. Abra o Supabase Dashboard: https://supabase.com/dashboard/project/$ProjectRef/settings/database"
    Write-Host "2. Copie a senha do banco (Database Password)"
    Write-Host "3. Execute no PowerShell:" -ForegroundColor Cyan
    Write-Host "   [System.Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD', 'SUA_SENHA_AQUI', 'User')" -ForegroundColor Cyan
    Write-Host "4. Feche e reabra o PowerShell"
    exit 1
}

# Garante que a pasta existe
if (-not (Test-Path $PastaDestino)) {
    New-Item -ItemType Directory -Path $PastaDestino -Force | Out-Null
}

# Nome do arquivo com timestamp
$DataAtual = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$NomeBase = "agendapro_backup_$DataAtual"
$ArquivoSql = Join-Path $PastaDestino "$NomeBase.sql"
$ArquivoZip = Join-Path $PastaDestino "$NomeBase.zip"

Write-Host "Iniciando backup do AgendaPro..." -ForegroundColor Cyan
Write-Host "Destino: $ArquivoSql" -ForegroundColor Gray

# Verifica se pg_dump está disponível
$PgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $PgDump) {
    # Tenta encontrar no PATH comum do PostgreSQL
    $CaminhosPossiveis = @(
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    foreach ($caminho in $CaminhosPossiveis) {
        if (Test-Path $caminho) {
            $PgDump = $caminho
            break
        }
    }
}

if (-not $PgDump) {
    Write-Host "ERRO: pg_dump não encontrado." -ForegroundColor Red
    Write-Host "Instale o PostgreSQL client ou o Supabase CLI." -ForegroundColor Yellow
    Write-Host "Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Executa o pg_dump
$Env:PGPASSWORD = $DbPassword
& $PgDump `
    --host=$DbHost `
    --port=$DbPort `
    --username=$DbUser `
    --dbname=$DbName `
    --clean `
    --if-exists `
    --create `
    --verbose `
    --file="$ArquivoSql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: pg_dump falhou com código $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# Compacta o arquivo SQL
Write-Host "Compactando backup..." -ForegroundColor Cyan
Compress-Archive -Path $ArquivoSql -DestinationPath $ArquivoZip -Force

# Remove o SQL original (mantém só o zip)
Remove-Item $ArquivoSql -Force

# Limpa backups antigos (mantém apenas os N mais recentes)
$Backups = Get-ChildItem $PastaDestino -Filter "agendapro_backup_*.zip" | Sort-Object CreationTime -Descending
if ($Backups.Count -gt $ManterUltimos) {
    $BackupsParaExcluir = $Backups | Select-Object -Skip $ManterUltimos
    foreach ($backup in $BackupsParaExcluir) {
        Write-Host "Removendo backup antigo: $($backup.Name)" -ForegroundColor DarkGray
        Remove-Item $backup.FullName -Force
    }
}

Write-Host "Backup concluído com sucesso!" -ForegroundColor Green
Write-Host "Arquivo: $ArquivoZip" -ForegroundColor Green
Write-Host "Tamanho: $([math]::Round((Get-Item $ArquivoZip).Length / 1MB, 2)) MB" -ForegroundColor Green
