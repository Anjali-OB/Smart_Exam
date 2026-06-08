import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateClassReport, detectWeakTopics, predictPerformance } from '../../lib/gemini'
import { exportSubmissionsToExcel, gradeFor } from '../../utils/excel'
import { downloadClassReportPDF } from '../../utils/pdf'
import { useToast, ToastContainer, Spinner } from '../../components/UI'
import { ScoreBarChart, ScoreLineChart, GradePieChart, QuestionDifficultyBar } from '../../components/Charts'
import { Download, Brain, TrendingUp, AlertTriangle, FileText } from 'lucide-react'

export default function Analytics() {
  const { profile } = useAuth()
  const toast       = useToast()
  const [tests,      setTests]      = useState([])
  const [selected,   setSelected]   = useState(null)
  const [subs,       setSubs]       = useState([])
  const [questions,  setQuestions]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [aiReport,   setAiReport]   = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [weakTopics, setWeakTopics] = useState(null)
  const [atRisk,     setAtRisk]     = useState([])
  const [tab,        setTab]        = useState('overview')

  useEffect(() => { loadTests() }, [])
  useEffect(() => { if (selected) loadTestData(selected.id) }, [selected])

  async function loadTests() {
    setLoading(true)
    const { data } = await supabase.from('tests').select('id,title,subject,total_marks,created_at')
      .eq('teacher_id', profile.id).order('created_at', { ascending:false })
    setTests(data||[])
    if (data?.[0]) setSelected(data[0])
    setLoading(false)
  }

  async function loadTestData(testId) {
    const [{ data: subsData }, { data: qsData }] = await Promise.all([
      supabase.from('submissions').select('*, profiles(name,email,roll_no)').eq('test_id',testId).eq('status','submitted'),
      supabase.from('questions').select('id,question_text,marks,difficulty').eq('test_id',testId).order('order_num'),
    ])
    setSubs(subsData||[])
    setQuestions(qsData||[])
    setAtRisk((subsData||[]).filter(s=>(s.percentage||0)<40).map(s=>s.profiles?.name||'Unknown'))
    setAiReport(''); setWeakTopics(null)
  }

  async function runAIReport() {
    if (!subs.length) { toast.info('No submissions yet.'); return }
    setAiLoading(true)
    try {
      const tots   = subs.map(s=>s.percentage||0)
      const avg    = Math.round(tots.reduce((a,b)=>a+b,0)/tots.length)
      const top    = [...subs].sort((a,b)=>(b.percentage||0)-(a.percentage||0)).slice(0,3).map(s=>s.profiles?.name||'?')
      const report = await generateClassReport({
        testTitle: selected?.title, subject: selected?.subject,
        stats: { avg:`${avg}%`, total:subs.length, pass:subs.filter(s=>(s.percentage||0)>=60).length },
        topStudents: top, atRisk,
      })
      setAiReport(report)
      toast.success('AI report generated!')
    } catch(err) { toast.error(err.message||'AI failed. Check Gemini key.') }
    setAiLoading(false)
  }

  async function runWeakTopicDetector() {
    if (!subs.length||!questions.length) { toast.info('Need submissions and questions.'); return }
    setAiLoading(true)
    try {
      const wrongQs = []
      for (const q of questions.slice(0,15)) {
        const { data:ans } = await supabase.from('answers').select('is_correct').eq('question_id',q.id)
        const pct = ans?.length ? Math.round((ans.filter(a=>a.is_correct).length/ans.length)*100) : 0
        if (pct < 50) wrongQs.push(q.question_text.slice(0,60))
      }
      if (!wrongQs.length) { toast.info('No weak topics found — class did well!'); setAiLoading(false); return }
      const result = await detectWeakTopics({ testTitle:selected?.title, subject:selected?.subject, wrongQuestions:wrongQs })
      setWeakTopics(result)
    } catch(err) { toast.error(err.message||'AI failed.') }
    setAiLoading(false)
  }

  // Chart data
  const scores     = subs.map(s=>s.percentage||0)
  const avg        = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0
  const pass       = subs.filter(s=>(s.percentage||0)>=60).length
  const gradeData  = [
    { name:'A', value:subs.filter(s=>gradeFor(s.percentage)==='A').length },
    { name:'B', value:subs.filter(s=>gradeFor(s.percentage)==='B').length },
    { name:'C', value:subs.filter(s=>gradeFor(s.percentage)==='C').length },
    { name:'F', value:subs.filter(s=>gradeFor(s.percentage)==='F').length },
  ].filter(d=>d.value>0)
  const barData    = [...subs].sort((a,b)=>(b.percentage||0)-(a.percentage||0)).slice(0,15)
    .map(s=>({ name:(s.profiles?.name||'?').split(' ')[0], score:s.percentage||0 }))
  const allTestsData = tests.map(t=>({ test:t.title.slice(0,12), avg:0 })) // placeholder

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove}/>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div><h1 className="page-title">Analytics</h1><p className="text-slate-500 mt-1">Deep insights for your tests</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>exportSubmissionsToExcel(subs,selected?.title||'Test')} className="btn-ghost text-sm">
            <Download className="w-4 h-4"/> Excel
          </button>
          <button onClick={()=>downloadClassReportPDF(subs,selected,aiReport)} className="btn-ghost text-sm">
            <FileText className="w-4 h-4"/> PDF Report
          </button>
        </div>
      </div>

      {/* Test selector */}
      <div className="card mb-6">
        <label className="label">Select Test to Analyse</label>
        <select className="input max-w-sm !mb-0" value={selected?.id||''} onChange={e=>setSelected(tests.find(t=>t.id===e.target.value))}>
          {tests.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg"/></div> : !subs.length ? (
        <div className="card text-center py-16"><p className="text-slate-500">No submissions for this test yet.</p></div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { e:'📊', l:'Submissions',  v:subs.length },
              { e:'⭐', l:'Class Average',v:`${avg}%` },
              { e:'✅', l:'Pass Rate',     v:`${subs.length?Math.round(pass/subs.length*100):0}%` },
              { e:'🚨', l:'At-Risk (<40%)',v:atRisk.length },
            ].map(s=>(
              <div key={s.l} className="card">
                <div className="text-2xl mb-2">{s.e}</div>
                <div className="text-2xl font-black text-slate-900">{s.v}</div>
                <div className="text-sm text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
            {[
              {k:'overview',l:'Overview'},{k:'students',l:'Students'},{k:'questions',l:'Questions'},
              {k:'ai',l:'✨ AI Insights'}
            ].map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${tab===t.k?'border-brand-600 text-brand-700':'border-transparent text-slate-500'}`}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab==='overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold text-slate-900 mb-4">Score Distribution</h3>
                <ScoreBarChart data={barData} xKey="name" yKey="score"/>
              </div>
              <div className="card">
                <h3 className="font-bold text-slate-900 mb-4">Grade Distribution</h3>
                <GradePieChart data={gradeData}/>
              </div>
              {atRisk.length>0 && (
                <div className="card border-red-100 bg-red-50 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500"/>
                    <h3 className="font-bold text-red-800">At-Risk Students (scored below 40%)</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {atRisk.map(name=><span key={name} className="badge-red">{name}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Students tab */}
          {tab==='students' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>{['#','Name','Roll','Score','%','Grade','Time','Tab Switches'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...subs].sort((a,b)=>(b.percentage||0)-(a.percentage||0)).map((s,i)=>{
                    const g=gradeFor(s.percentage)
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 ${(s.percentage||0)<40?'bg-red-50/30':''}`}>
                        <td className="px-4 py-3 text-slate-400">{i+1}</td>
                        <td className="px-4 py-3 font-semibold">{s.profiles?.name||'—'}</td>
                        <td className="px-4 py-3 text-slate-500">{s.profiles?.roll_no||'—'}</td>
                        <td className="px-4 py-3 font-bold">{s.score||0}/{selected?.total_marks||0}</td>
                        <td className="px-4 py-3 font-bold">{s.percentage||0}%</td>
                        <td className="px-4 py-3"><span className={`badge ${g==='A'?'badge-green':g==='B'?'badge-blue':g==='C'?'badge-amber':'badge-red'}`}>{g}</span></td>
                        <td className="px-4 py-3 text-slate-500">{s.time_taken?`${Math.floor(s.time_taken/60)}m ${s.time_taken%60}s`:'—'}</td>
                        <td className="px-4 py-3">
                          {s.tab_switches>0?<span className="badge-red">{s.tab_switches}x</span>:<span className="badge-green">0</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Questions tab */}
          {tab==='questions' && <QuestionDifficultyAnalysis questions={questions} submissions={subs}/>}

          {/* AI Insights tab */}
          {tab==='ai' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">📋 AI Class Report</h3>
                  <button onClick={runAIReport} disabled={aiLoading} className="btn-primary text-sm">
                    {aiLoading?<><Spinner size="sm"/> Working…</>:<><Brain className="w-4 h-4"/> Generate Report</>}
                  </button>
                </div>
                {aiReport ? (
                  <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-brand-600"/><span className="font-bold text-brand-800">AI Generated Report</span></div>
                    <p className="text-slate-700 leading-relaxed">{aiReport}</p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    <Brain className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">Click "Generate Report" for an AI-written class performance summary.</p>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">🎯 Weak Topic Detector</h3>
                  <button onClick={runWeakTopicDetector} disabled={aiLoading} className="btn-secondary text-sm">
                    <TrendingUp className="w-4 h-4"/> Detect Weak Topics
                  </button>
                </div>
                {weakTopics ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Weak Topics Found:</p>
                      <div className="flex flex-wrap gap-2">
                        {weakTopics.weak_topics?.map(t=><span key={t} className="badge-red">{t}</span>)}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1">Recommendation</p>
                      <p className="text-sm text-amber-700">{weakTopics.recommendation}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Click "Detect Weak Topics" to find areas where students need more practice.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function QuestionDifficultyAnalysis({ questions, submissions }) {
  const [qStats, setQStats] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (questions.length && submissions.length) load() }, [questions, submissions])

  async function load() {
    setLoading(true)
    const stats = await Promise.all(questions.slice(0,20).map(async (q,i) => {
      const { data:ans } = await supabase.from('answers').select('is_correct').eq('question_id',q.id)
      const correct = (ans||[]).filter(a=>a.is_correct).length
      const total   = (ans||[]).length
      return { name:`Q${i+1}`, pct:total?Math.round(correct/total*100):0, correct, total }
    }))
    setQStats(stats); setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner/></div>
  return (
    <div className="card">
      <h3 className="font-bold text-slate-900 mb-1">Question-wise Difficulty (% students got correct)</h3>
      <p className="text-xs text-slate-500 mb-4">🟢 ≥70% = Easy · 🟡 40-69% = Medium · 🔴 &lt;40% = Hard</p>
      <QuestionDifficultyBar data={qStats}/>
    </div>
  )
}
