import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100)
}

export function exportarExcel<T extends Record<string, any>>(
  dados: T[],
  colunas: { key: keyof T; header: string }[],
  nomeArquivo: string
) {
  const rows = dados.map(item =>
    colunas.reduce((acc, col) => {
      acc[col.header] = item[col.key] ?? ''
      return acc
    }, {} as Record<string, any>)
  )

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, `${sanitizeFileName(nomeArquivo)}.xlsx`)
}

export function exportarPDF<T extends Record<string, any>>(
  titulo: string,
  dados: T[],
  colunas: { key: keyof T; header: string }[],
  nomeArquivo: string
) {
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text(titulo, 14, 20)

  const head = [colunas.map(c => c.header)]
  const body = dados.map(item => colunas.map(c => String(item[c.key] ?? '')))

  autoTable(doc, {
    head,
    body,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  doc.save(`${sanitizeFileName(nomeArquivo)}.pdf`)
}
