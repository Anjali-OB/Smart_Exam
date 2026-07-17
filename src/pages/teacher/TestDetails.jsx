import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast, ToastContainer, Spinner } from '../../components/UI'
import { exportSubmissionsToExcel, gradeFor, remarksFor, formatTime } from '../../utils/excel'
import { downloadClassReportPDF } from '../../utils/pdf'
import { analyseClassPerformance, detectWeakTopics } from '../../lib/groq'
import {
  ArrowLeft, Download, RefreshCw, Brain,
  Users, TrendingUp, Award, BarChart2,
  FileText, AlertTriangle, CheckCircle
} from 'lucide-react'

export default function TestDetails() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()

  const [test,        setTest]        = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [questions,   setQuestions]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [aiReport,    setAiReport]    = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [weakTopics,  setWeakTopics]  = useState(null)
  const [tab,         setTab]         = useState('results')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: subs }, { data: qs }] = await Promise.all([
      supabase.from('tests').select('*').eq('id', id).single(),
      supabase.from('submissions')
        .select('*, profiles(name, email, roll_no)')
        .eq('test_id', id).eq('status', 'submitted')
        .order('submitted_at', { ascending: false }),
      supabase.from('questions').select('*, options(*)')
        .eq('test_id', id).order('order_num'),
    ])
    setTest(t)
    setSubmissions(subs || [])
    setQuestions(qs || [])
    setLoading(false)
  }

  async function runAIAnalysis() {
    if (!submissions.length) { toast.info('No submissions yet.'); return }
    setAiLoading(true)
    try {
      const questionStats = await Promise.all(
        questions.slice(0,10).map(async (q,i) => {
          const { data: answers } = await supabase.from('answers').select('is_correct').eq('question_id', q.id)
          const correct = (answers||[]).filter(a=>a.is_correct).length
          const total   = (answers||[]).length
          return { num:i+1, text:q.question_text.slice(0,60), correct, total, pct:total?Math.round(correct/total*100):0 }
        })
      )
      const avgScore = submissions.reduce((a,s)=>a+(s.percentage||0),0) / submissions.length
      const analysis = await analyseClassPerformance({
        testTitle:test.title, avgScore:Math.round(avgScore),
        totalMarks:test.total_marks||100, questionStats
      })
      setAiReport(analysis); toast.success('AI analysis complete!')
    } catch(err) { toast.error(err.message||'AI failed.') }
    setAiLoading(false)
  }

  async function runWeakTopics() {
    if (!questions.length) { toast.info('No questions found.'); return }
    setAiLoading(true)
    try {
      const wrongQs = []
      for (const q of questions.slice(0,15)) {
        const { data: ans } = await supabase.from('answers').select('is_correct').eq('question_id',q.id)
        const pct = ans?.length ? Math.round((ans.filter(a=>a.is_correct).length/ans.length)*100) : 0
        if (pct < 50) wrongQs.push(q.question_text.slice(0,60))
      }
      if (!wrongQs.length) { toast.info('No weak topics!'); setAiLoading(false); return }
      const result = await detectWeakTopics({ testTitle:test?.title, subject:test?.subject, wrongQuestions:wrongQs })
      setWeakTopics(result); toast.success('Done!')
    } catch(err) { toast.error(err.message||'AI failed.') }
    setAiLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg"/></div>
  if (!test)   return <div className="text-center py-20 text-slate-500">Test not found.</div>

  const scores    = submissions.map(s=>s.percentage||0)
  const avg       = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0
  const highest   = scores.length ? Math.max(...scores) : 0
  const passCount = submissions.filter(s=>(s.percentage||0)>=60).length
  const gradeDist = { A:0, B:0, C:0, F:0 }
  submissions.forEach(s => { gradeDist[gradeFor(s.percentage)]++ })

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove}/>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate('/teacher')} className="btn-ghost p-2 rounded-xl">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <h1 className="page-title">{test.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{test.subject} · {submissions.length} submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="btn-ghost text-sm"><RefreshCw className="w-4 h-4"/> Refresh</button>
          <button onClick={()=>exportSubmissionsToExcel(submissions,test.title)} className="btn-ghost text-sm">
            <Download className="w-4 h-4"/> Excel
          </button>
          <button onClick={()=>downloadClassReportPDF(submissions,test,aiReport)} className="btn-ghost text-sm">
            <FileText className="w-4 h-4"/> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon:<Users className="w-5 h-5"/>,      bg:'bg-blue-100 text-blue-600',      label:'Submitted',    val:submissions.length },
          { icon:<TrendingUp className="w-5 h-5"/>, bg:'bg-emerald-100 text-emerald-600', label:'Class Avg',    val:`${avg}%` },
          { icon:<Award className="w-5 h-5"/>,      bg:'bg-amber-100 text-amber-600',    label:'Highest',      val:`${highest}%` },
          { icon:<BarChart2 className="w-5 h-5"/>,  bg:'bg-purple-100 text-purple-600',  label:'Pass Rate',    val:`${submissions.length?Math.round(passCount/submissions.length*100):0}%` },
        ].map(s=>(
          <div key={s.label} className="card">
            <div className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.val}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {[
          {key:'results',    label:'Student Results'},
          {key:'subjective', label:'✏️ Grade Answers'},
          {key:'stats',      label:'Grade Stats'},
          {key:'ai',         label:'✨ AI Analysis'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab===t.key?'border-brand-600 text-brand-700':'border-transparent text-slate-500 hover:text-slate-800'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab==='results' && (
        submissions.length===0 ? (
          <div className="card text-center py-16"><div className="text-4xl mb-3">📭</div><p className="text-slate-500">No submissions yet.</p></div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['#','Student','Roll','Submitted','Score','%','Grade','Time','Tab Switches','Remarks'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map((s,i)=>{
                    const grade=gradeFor(s.percentage)
                    const hasPending=questions.some(q=>q.type==='short'||q.type==='long')
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400">{i+1}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{s.profiles?.name||'—'}</td>
                        <td className="px-4 py-3 text-slate-500">{s.profiles?.roll_no||'—'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {s.submitted_at?new Date(s.submitted_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}):'—'}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {s.score??0}/{test.total_marks}
                          {hasPending&&<span className="ml-1 text-amber-500 text-xs">⏳</span>}
                        </td>
                        <td className="px-4 py-3 font-bold">{s.percentage??0}%</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${grade==='A'?'badge-green':grade==='B'?'badge-blue':grade==='C'?'badge-amber':'badge-red'}`}>{grade}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.time_taken?formatTime(s.time_taken):'—'}</td>
                        <td className="px-4 py-3">
                          {s.tab_switches>0?<span className="badge-red">{s.tab_switches}x</span>:<span className="badge-green">0</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">{s.remarks||remarksFor(s.percentage)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab==='subjective' && (
        <SubjectiveGrading testId={id} submissions={submissions} questions={questions} onRefresh={load} toast={toast}/>
      )}

      {tab==='stats' && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Grade Distribution</h3>
            {Object.entries(gradeDist).map(([g,n])=>{
              const pct=submissions.length?Math.round(n/submissions.length*100):0
              return (
                <div key={g} className="flex items-center gap-3 mb-3">
                  <span className={`w-8 text-center font-black text-sm badge ${g==='A'?'badge-green':g==='B'?'badge-blue':g==='C'?'badge-amber':'badge-red'}`}>{g}</span>
                  <div className="flex-1 progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                  <span className="text-sm font-semibold w-16 text-right">{n} ({pct}%)</span>
                </div>
              )
            })}
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Score Summary</h3>
            <div className="space-y-3">
              {[
                {label:'Class Average', val:`${avg}%`},
                {label:'Highest Score', val:`${highest}%`},
                {label:'Lowest Score',  val:`${scores.length?Math.min(...scores):0}%`},
                {label:'Passed (≥60%)', val:`${passCount}/${submissions.length}`},
                {label:'Failed (<60%)', val:`${submissions.length-passCount}/${submissions.length}`},
                {label:'Total Marks',   val:test.total_marks},
              ].map(r=>(
                <div key={r.label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-600">{r.label}</span>
                  <span className="font-bold text-slate-900">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==='ai' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">📋 AI Class Analysis</h3>
              <button onClick={runAIAnalysis} disabled={aiLoading} className="btn-primary text-sm">
                {aiLoading?<><Spinner size="sm"/> Working…</>:<><Brain className="w-4 h-4"/> Run Analysis</>}
              </button>
            </div>
            {aiReport?(
              <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-brand-600"/><span className="font-bold text-brand-800">AI Insights</span></div>
                <p className="text-slate-700 leading-relaxed">{aiReport}</p>
              </div>
            ):(
              <div className="text-center py-10 text-slate-400">
                <Brain className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Click "Run Analysis" for AI-powered insights.</p>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">🎯 Weak Topic Detector</h3>
              <button onClick={runWeakTopics} disabled={aiLoading} className="btn-secondary text-sm">
                <TrendingUp className="w-4 h-4"/> Detect
              </button>
            </div>
            {weakTopics?(
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">{weakTopics.weak_topics?.map(t=><span key={t} className="badge-red">{t}</span>)}</div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Recommendation</p>
                  <p className="text-sm text-amber-700">{weakTopics.recommendation}</p>
                </div>
              </div>
            ):(
              <p className="text-sm text-slate-400 text-center py-6">Click "Detect" to find weak areas.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ════════════════════════════════════════════════
   SUBJECTIVE GRADING
   ════════════════════════════════════════════════ */
function SubjectiveGrading({ testId, submissions, questions, onRefresh, toast }) {
  const [answers, setAnswers] = useState([])
  const [grades,  setGrades]  = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const subjectiveQs = questions.filter(q => q.type==='short' || q.type==='long')

  useEffect(() => {
    if (subjectiveQs.length && submissions.length) loadAnswers()
    else setLoading(false)
  }, [questions, submissions])

  async function loadAnswers() {
    setLoading(true)
    const all = []
    for (const sub of submissions) {
      for (const q of subjectiveQs) {
        const { data, error } = await supabase
          .from('answers')
          .select('id, text_answer, marks_awarded, is_correct, teacher_graded')
          .eq('submission_id', sub.id)
          .eq('question_id', q.id)
        if (error) { console.error('loadAnswers error:', error); continue }
        const ans = data?.[0] || null
        all.push({
          answerId:     ans?.id || null,
          studentName:  sub.profiles?.name || '—',
          rollNo:       sub.profiles?.roll_no || '—',
          submissionId: sub.id,
          questionId:   q.id,
          questionText: q.question_text,
          maxMarks:     Number(q.marks) || 1,
          textAnswer:   ans?.text_answer || '',
          marksAwarded: Number(ans?.marks_awarded) || 0,
          // teacher_graded = true means teacher has explicitly saved a grade
          isGraded:     ans?.teacher_graded === true,
        })
      }
    }
    setAnswers(all)
    setLoading(false)
  }

  async function saveAllGrades() {
    const entries = Object.entries(grades)
    if (!entries.length) { toast.warning('No changes to save.'); return }

    setSaving(true)
    let saved = 0, failed = 0

    for (const [answerId, rawMarks] of entries) {
      const ans     = answers.find(a => a.answerId === answerId)
      if (!ans || !answerId) { failed++; continue }

      const awarded = Math.min(Math.max(0, Number(rawMarks) || 0), ans.maxMarks)
      const isCorr  = awarded > 0

      // Step 1: Update the answer row — mark as teacher_graded=true always
      const { error: ansErr } = await supabase
        .from('answers')
        .update({
          marks_awarded:  awarded,
          is_correct:     isCorr,
          teacher_graded: true,      // ← key flag: teacher has reviewed this
        })
        .eq('id', answerId)

      if (ansErr) {
        console.error('Answer update failed:', ansErr)
        failed++
        continue
      }

      // Step 2: Recalculate student's total score
      const { data: allAns, error: allErr } = await supabase
        .from('answers')
        .select('marks_awarded')
        .eq('submission_id', ans.submissionId)

      if (allErr) { failed++; continue }

      const newScore = (allAns || []).reduce((acc, a) => acc + (Number(a.marks_awarded) || 0), 0)

      // Step 3: Get total_marks
      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select('total_marks')
        .eq('id', ans.submissionId)
        .single()

      if (subErr) { failed++; continue }

      const totalMarks = Number(subData?.total_marks) || 1
      const newPct     = Math.min(100, Math.round((newScore / totalMarks) * 100))
      const newGrade   = gradeFor(newPct)
      const newRemarks = remarksFor(newPct)

      // Step 4: Update submission scores
      const { error: subUpdateErr } = await supabase
        .from('submissions')
        .update({ score: newScore, percentage: newPct, grade: newGrade, remarks: newRemarks })
        .eq('id', ans.submissionId)

      if (subUpdateErr) {
        console.error('Submission update failed:', subUpdateErr)
        failed++
        continue
      }

      saved++
    }

    setSaving(false)

    if (failed > 0 && saved === 0) {
      toast.error(`All saves failed (${failed} errors). Did you run the SQL fix in Supabase?`)
    } else if (failed > 0) {
      toast.warning(`Saved ${saved}, failed ${failed}. Check console.`)
    } else {
      toast.success(`✅ ${saved} grade${saved!==1?'s':''} saved! Student scores updated.`)
    }

    setGrades({})
    await loadAnswers()
    onRefresh()
  }

  if (subjectiveQs.length === 0) return (
    <div className="card text-center py-12">
      <div className="text-4xl mb-3">📝</div>
      <p className="font-semibold text-slate-700 mb-1">No subjective questions</p>
      <p className="text-slate-500 text-sm">This test has no short/long answer questions.</p>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size="lg"/>
      <p className="text-slate-500 text-sm">Loading student answers…</p>
    </div>
  )

  if (!answers.length) return (
    <div className="card text-center py-12">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-slate-500">No students have submitted yet.</p>
    </div>
  )

  const pendingCount = answers.filter(a => !a.isGraded).length
  const gradedCount  = answers.filter(a => a.isGraded).length
  const changesCount = Object.keys(grades).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Grade Short / Long Answers</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {answers.length} total · <span className="text-emerald-600 font-medium">{gradedCount} graded</span> · <span className="text-amber-600 font-medium">{pendingCount} pending</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAnswers} className="btn-ghost text-sm">
            <RefreshCw className="w-4 h-4"/> Refresh
          </button>
          <button
            onClick={saveAllGrades}
            disabled={saving || changesCount === 0}
            className={`btn-primary text-sm ${changesCount===0?'opacity-50 cursor-not-allowed':''}`}>
            {saving
              ? <><Spinner size="sm"/> Saving…</>
              : <>💾 Save {changesCount>0?changesCount+' ':''}Grade{changesCount!==1?'s':''}</>}
          </button>
        </div>
      </div>

      {/* Notices */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-amber-800">{pendingCount} answer{pendingCount!==1?'s':''} waiting for your grades</p>
            <p className="text-xs text-amber-700 mt-0.5">Enter marks and click Save Grades. Scores update automatically.</p>
          </div>
        </div>
      )}
      {pendingCount===0 && gradedCount>0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0"/>
          <p className="text-sm font-bold text-emerald-800">All answers graded! ✅</p>
        </div>
      )}

      {/* Answer cards */}
      <div className="space-y-4">
        {answers.map((a) => {
          const currentMark = grades[a.answerId] !== undefined ? Number(grades[a.answerId]) : a.marksAwarded
          const hasChanged  = grades[a.answerId] !== undefined
          const pct         = a.maxMarks > 0 ? Math.round((currentMark/a.maxMarks)*100) : 0

          return (
            <div key={`${a.submissionId}-${a.questionId}`}
              className={`card border-l-4 transition-all ${
                hasChanged   ? 'border-l-blue-400 bg-blue-50/30' :
                a.isGraded   ? 'border-l-emerald-400' :
                a.textAnswer ? 'border-l-amber-400' :
                'border-l-slate-200'
              }`}>

              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-slate-900">{a.studentName}</span>
                    {a.rollNo!=='—' && <span className="badge-slate text-xs">{a.rollNo}</span>}
                    {hasChanged
                      ? <span className="badge-blue text-xs">⚡ Unsaved</span>
                      : a.isGraded
                        ? <span className="badge-green text-xs">✓ Graded — {a.marksAwarded}/{a.maxMarks} marks</span>
                        : a.textAnswer
                          ? <span className="badge-amber text-xs">⏳ Needs grading</span>
                          : <span className="badge-slate text-xs">No answer</span>}
                  </div>
                  <p className="text-xs font-semibold text-slate-500">Q: {a.questionText}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <label className="text-xs text-slate-500 font-medium">Marks / {a.maxMarks}</label>
                  <input
                    type="number" min="0" max={a.maxMarks} step="0.5"
                    value={grades[a.answerId] !== undefined ? grades[a.answerId] : a.marksAwarded}
                    onChange={e => setGrades(prev => ({...prev, [a.answerId]: e.target.value}))}
                    disabled={!a.answerId}
                    className="w-24 px-3 py-2 text-center font-bold text-lg border-2 rounded-xl outline-none
                      border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100
                      disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-colors"
                  />
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct>=75?'bg-emerald-500':pct>=40?'bg-amber-400':'bg-red-400'}`}
                      style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-xs text-slate-400">{pct}%</span>
                </div>
              </div>

              {a.textAnswer ? (
                <div className="bg-white border border-slate-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student's Answer:</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.textAnswer}</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-slate-400 italic">Student did not answer this question</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {changesCount > 0 && (
        <div className="mt-6 flex justify-end">
          <button onClick={saveAllGrades} disabled={saving} className="btn-primary">
            {saving?<><Spinner size="sm"/> Saving…</>:<>💾 Save All {changesCount} Grade{changesCount!==1?'s':''}</>}
          </button>
        </div>
      )}
    </div>
  )
}