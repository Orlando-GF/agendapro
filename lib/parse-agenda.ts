import fs from 'fs'
import path from 'path'

export interface RawPaciente {
  nome: string
  codigo: string
  horario_padrao: string
  ativo: boolean
  telefone: string
  responsavel: string
  dias_semana: string[]
  profissionais: string[]
  em_avaliacao: boolean
  observacoes: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function isEmptyLine(cols: string[]): boolean {
  return cols.every(c => c === '')
}

function isColumnHeader(cols: string[]): boolean {
  // Cabeçalho de colunas tem primeira célula vazia e contém TELEFONE/RESPONSÁVEL
  return cols[0] === '' && cols.some(c => c.includes('TELEFONE')) && cols.some(c => c.includes('RESPONSÁVEL'))
}

function isBlockHeader(cols: string[]): boolean {
  if (cols.length === 0) return false
  const first = cols[0]
  // Tem parênteses indicando especialidade e não é horário
  return /\([^)]+\)/.test(first) && !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(first)
}

function isDataLine(cols: string[]): boolean {
  if (cols.length < 3) return false
  const first = cols[0]
  // Horário no formato HH:MM - HH:MM, ou vazio (mas com nome na coluna 2)
  const hasTime = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(first)
  const hasName = !!(cols[2] && cols[2].trim().length > 0)
  return hasTime && hasName
}

function extractProfessions(text: string): string[] {
  const matches = text.match(/\(([^)]+)\)/g)
  if (!matches) return []
  return matches.map(m => m.slice(1, -1).trim().toLowerCase())
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\(EM AVALIAÇÃO\)\s*/gi, '')
    .replace(/\s*\(\d\/\d\)\s*/g, '')
    .replace(/\s*\(conversar com [^)]+\)\s*/gi, '')
    .trim()
}

function extractObservations(name: string): string {
  const parts: string[] = []
  const avalMatch = name.match(/\(EM AVALIAÇÃO\)/i)
  if (avalMatch) parts.push('Em avaliação')
  const sessaoMatch = name.match(/\((\d\/\d)\)/)
  if (sessaoMatch) parts.push(`Sessão ${sessaoMatch[1]}`)
  const obsMatch = name.match(/\(conversar com [^)]+\)/i)
  if (obsMatch) parts.push(obsMatch[0].slice(1, -1))
  return parts.join('; ')
}

function normalizeForDedup(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDayFromFilename(filename: string): string {
  const map: Record<string, string> = {
    'segunda': 'Segunda-feira',
    'terca': 'Terça-feira',
    'terça': 'Terça-feira',
    'quarta': 'Quarta-feira',
    'quinta': 'Quinta-feira',
    'sexta': 'Sexta-feira',
  }
  // Remove acentos e caracteres estranhos para matching
  const normalized = filename
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')

  for (const key of Object.keys(map)) {
    if (normalized.includes(key)) return map[key]
  }
  return 'Desconhecido'
}

export function parseAllAgendas(dataDir = 'dados'): RawPaciente[] {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))
  const map = new Map<string, RawPaciente>()

  for (const file of files) {
    const diaSemana = extractDayFromFilename(file)
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)

    let currentProfessions: string[] = []

    for (const line of lines) {
      const cols = parseCSVLine(line)

      if (isEmptyLine(cols)) continue
      if (isColumnHeader(cols)) continue

      if (isBlockHeader(cols)) {
        currentProfessions = extractProfessions(cols[0])
        continue
      }

      if (isDataLine(cols)) {
        const rawNome = cols[2]
        const nome = normalizeName(rawNome)
        if (!nome) continue

        const dedupKey = normalizeForDedup(nome)
        const existing = map.get(dedupKey)

        const ativo = cols[3]?.toUpperCase() === 'TRUE'
        const emAvaliacao = /\(EM AVALIAÇÃO\)/i.test(rawNome)
        const observacoes = extractObservations(rawNome)

        if (existing) {
          // Merge
          if (!existing.dias_semana.includes(diaSemana)) {
            existing.dias_semana.push(diaSemana)
          }
          for (const prof of currentProfessions) {
            if (!existing.profissionais.includes(prof)) {
              existing.profissionais.push(prof)
            }
          }
          if (!existing.horario_padrao && cols[0]) {
            existing.horario_padrao = cols[0]
          }
          if (!existing.codigo && cols[1]) {
            existing.codigo = cols[1]
          }
          if (!existing.telefone && cols[4]) {
            existing.telefone = cols[4]
          }
          if (!existing.responsavel && cols[5]) {
            existing.responsavel = cols[5]
          }
          if (ativo) existing.ativo = true
          if (emAvaliacao) existing.em_avaliacao = true
          if (observacoes && !existing.observacoes.includes(observacoes)) {
            existing.observacoes = [existing.observacoes, observacoes].filter(Boolean).join('; ')
          }
        } else {
          map.set(dedupKey, {
            nome,
            codigo: cols[1] || '',
            horario_padrao: cols[0] || '',
            ativo,
            telefone: cols[4] || '',
            responsavel: cols[5] || '',
            dias_semana: [diaSemana],
            profissionais: [...currentProfessions],
            em_avaliacao: emAvaliacao,
            observacoes,
          })
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
}
