import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { gradeFor, remarksFor, formatTime } from './excel'

export function downloadResultPDF(sub, test, answers) {
  const doc  = new jsPDF()
  const pct  = sub.percentage ?? 0
  const grade= gradeFor(pct)
  const W    = doc.internal.pageSize.getWidth()

  // Header gradient bar
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('SmartExam', 14, 11)
  doc.setFontSize(11); doc.setFont('helvetica','normal')
  doc.text('Result Card', 14, 19)
  doc.text(new Date().toLocaleDateString('en-IN'), W-14, 19, { align:'right' })

  // Score hero
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(36); doc.setFont('helvetica','bold')
  doc.text(`${pct}%`, W/2, 52, { align:'center' })
  doc.setFontSize(13); doc.setFont('helvetica','normal')
  doc.setTextColor(100,100,100)
  doc.text(`${sub.score} / ${test?.total_marks || sub.total_marks} marks  |  Grade: ${grade}`, W/2, 60, { align:'center' })

  // Details table
  autoTable(doc, {
    startY: 68,
    head: [['Field','Details']],
    body: [
      ['Student Name', sub.profiles?.name || sub.student_name || '—'],
      ['Roll No.',      sub.profiles?.roll_no || '—'],
      ['Test',         test?.title || '—'],
      ['Subject',      test?.subject || '—'],
      ['Score',        `${sub.score} / ${test?.total_marks || 0}`],
      ['Percentage',   `${pct}%`],
      ['Grade',        grade],
      ['Time Taken',   sub.time_taken ? formatTime(sub.time_taken) : '—'],
      ['Submitted',    sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('en-IN') : '—'],
      ['Remarks',      remarksFor(pct)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [99,102,241] },
    alternateRowStyles: { fillColor: [248,250,252] },
    columnStyles: { 0: { fontStyle:'bold', cellWidth:50 } },
  })

  // Answer review (if provided)
  if (answers?.length) {
    doc.addPage()
    doc.setFontSize(14); doc.setFont('helvetica','bold')
    doc.setTextColor(30,30,30)
    doc.text('Answer Review', 14, 20)
    autoTable(doc, {
      startY: 26,
      head: [['Q','Question','Your Answer','Correct','✓']],
      body: answers.map((a,i) => {
        const q  = a.questions
        const opt= q?.options?.find(o => o.id === a.selected_option_id)
        const cor= q?.options?.find(o => o.is_correct)
        return [
          i+1,
          (q?.question_text||'').slice(0,60),
          opt?.option_text || a.text_answer?.slice(0,30) || '—',
          cor?.option_text || '—',
          a.is_correct ? '✓' : '✗',
        ]
      }),
      styles: { fontSize: 9, overflow:'linebreak' },
      headStyles: { fillColor: [99,102,241] },
      columnStyles: { 0:{cellWidth:10}, 4:{cellWidth:10} },
      didParseCell(data) {
        if (data.column.index === 4) {
          data.cell.styles.textColor = data.cell.raw === '✓' ? [22,163,74] : [220,38,38]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  doc.save(`${test?.title?.replace(/\s+/g,'_') || 'Result'}_${sub.profiles?.name||'Student'}.pdf`)
}

export function downloadClassReportPDF(submissions, test, aiReport='') {
  const doc = new jsPDF()
  const W   = doc.internal.pageSize.getWidth()

  doc.setFillColor(99,102,241)
  doc.rect(0,0,W,28,'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('SmartExam — Class Report', 14, 11)
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text(new Date().toLocaleDateString('en-IN'), W-14, 19, { align:'right' })

  const scores = submissions.map(s => s.percentage||0)
  const avg    = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : 0
  const pass   = submissions.filter(s=>(s.percentage||0)>=60).length

  autoTable(doc, {
    startY: 34,
    head: [['Metric','Value']],
    body: [
      ['Test Title',        test?.title||'—'],
      ['Subject',           test?.subject||'—'],
      ['Total Students',    submissions.length],
      ['Class Average',     `${avg}%`],
      ['Highest Score',     `${scores.length?Math.max(...scores):0}%`],
      ['Lowest Score',      `${scores.length?Math.min(...scores):100}%`],
      ['Pass Rate (≥60%)',  `${pass}/${submissions.length} (${submissions.length?Math.round(pass/submissions.length*100):0}%)`],
      ['Grade A (≥90%)',    submissions.filter(s=>(s.percentage||0)>=90).length],
      ['Grade B (75-89%)',  submissions.filter(s=>{const p=s.percentage||0;return p>=75&&p<90}).length],
      ['Grade C (60-74%)',  submissions.filter(s=>{const p=s.percentage||0;return p>=60&&p<75}).length],
      ['Grade F (<60%)',    submissions.filter(s=>(s.percentage||0)<60).length],
    ],
    styles: { fontSize:10 },
    headStyles: { fillColor:[99,102,241] },
    columnStyles: { 0:{ fontStyle:'bold', cellWidth:70 } },
  })

  if (aiReport) {
    const y = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30)
    doc.text('AI Analysis', 14, y)
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60)
    const lines = doc.splitTextToSize(aiReport, W-28)
    doc.text(lines, 14, y+7)
  }

  const nextY = (doc.lastAutoTable?.finalY||100) + (aiReport ? 40 : 15)
  autoTable(doc, {
    startY: nextY,
    head: [['#','Student','Roll','Score','%','Grade','Time','Remarks']],
    body: submissions.map((s,i)=>[
      i+1,
      s.profiles?.name||'—',
      s.profiles?.roll_no||'—',
      `${s.score||0}/${test?.total_marks||0}`,
      `${s.percentage||0}%`,
      gradeFor(s.percentage),
      s.time_taken?formatTime(s.time_taken):'—',
      remarksFor(s.percentage),
    ]),
    styles:{ fontSize:8, overflow:'linebreak' },
    headStyles:{ fillColor:[99,102,241] },
    columnStyles:{ 7:{cellWidth:50} },
  })

  doc.save(`${test?.title?.replace(/\s+/g,'_')||'Class'}_Report.pdf`)
}
