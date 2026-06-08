import * as XLSX from 'xlsx'

export function exportSubmissionsToExcel(submissions, testTitle) {
  if (!submissions?.length) { alert('No data to export.'); return }

  /* ── Sheet 1: All results ── */
  const headers = [
    'No.', 'Student Name', 'Roll / ID', 'Submitted At',
    'Score', 'Total Marks', 'Percentage', 'Grade',
    'Time Taken', 'Remarks'
  ]
  const rows = submissions.map((s, i) => [
    i + 1,
    s.profiles?.name || s.student_name || '—',
    s.profiles?.roll_no || '—',
    s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-IN') : '—',
    s.score ?? 0,
    s.total_marks ?? 0,
    s.percentage ? `${s.percentage}%` : '0%',
    s.grade || gradeFor(s.percentage),
    s.time_taken ? formatTime(s.time_taken) : '—',
    s.remarks || remarksFor(s.percentage),
  ])

  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws1['!cols'] = [
    {wch:5},{wch:22},{wch:14},{wch:20},
    {wch:8},{wch:12},{wch:12},{wch:7},
    {wch:12},{wch:40}
  ]

  /* ── Bold header row ── */
  headers.forEach((_, i) => {
    const cell = ws1[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'EEF2FF' } } }
  })

  /* ── Sheet 2: Summary ── */
  const scores = submissions.map(s => s.percentage ?? 0)
  const avg    = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
  const pass   = submissions.filter(s => (s.percentage ?? 0) >= 60).length

  const summaryData = [
    ['Metric', 'Value'],
    ['Test', testTitle],
    ['Total Students', submissions.length],
    ['Average Score', `${avg}%`],
    ['Highest Score', `${Math.max(...scores)}%`],
    ['Lowest Score',  `${Math.min(...scores)}%`],
    ['Pass Rate (≥60%)', `${pass}/${submissions.length} (${Math.round(pass/submissions.length*100)}%)`],
    ['Grade A (≥90%)',   submissions.filter(s => (s.percentage ?? 0) >= 90).length],
    ['Grade B (75-89%)', submissions.filter(s => { const p = s.percentage ?? 0; return p >= 75 && p < 90 }).length],
    ['Grade C (60-74%)', submissions.filter(s => { const p = s.percentage ?? 0; return p >= 60 && p < 75 }).length],
    ['Grade F (<60%)',   submissions.filter(s => (s.percentage ?? 0) < 60).length],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
  ws2['!cols'] = [{ wch: 25 }, { wch: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Student Results')
  XLSX.utils.book_append_sheet(wb, ws2, 'Class Summary')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${testTitle.replace(/\s+/g, '_')}_Results_${date}.xlsx`)
}

export function gradeFor(pct) {
  const p = pct ?? 0
  return p >= 90 ? 'A' : p >= 75 ? 'B' : p >= 60 ? 'C' : 'F'
}

export function remarksFor(pct) {
  const p = pct ?? 0
  if (p >= 90) return 'Excellent — outstanding performance!'
  if (p >= 75) return 'Good — strong concept understanding.'
  if (p >= 60) return 'Satisfactory — review weaker topics.'
  if (p >= 40) return 'Below average — needs more practice.'
  return 'Poor — requires immediate attention.'
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export function gradeColor(grade) {
  return {
    A: 'badge-green', B: 'badge-blue',
    C: 'badge-amber', F: 'badge-red',
  }[grade] || 'badge-slate'
}
