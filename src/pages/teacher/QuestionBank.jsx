import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer, Modal, ConfirmDialog, Spinner } from '../../components/UI'
import { generateQuestions } from '../../lib/gemini'
import { BookMarked, Plus, Trash2, Filter, Sparkles } from 'lucide-react'

export default function QuestionBank() {
  const { profile } = useAuth()
  const toast       = useToast()
  const [questions,  setQuestions]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState({ subject:'', type:'', difficulty:'' })
  const [aiModal,    setAiModal]    = useState(false)
  const [aiForm,     setAiForm]     = useState({ topic:'', subject:'', count:5, difficulty:'medium' })
  const [aiLoading,  setAiLoading]  = useState(false)
  const [delId,      setDelId]      = useState(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('question_bank').select('*').eq('teacher_id', profile.id).order('created_at',{ascending:false})
    if (filter.subject)    q = q.ilike('subject', `%${filter.subject}%`)
    if (filter.type)       q = q.eq('type', filter.type)
    if (filter.difficulty) q = q.eq('difficulty', filter.difficulty)
    const { data } = await q
    setQuestions(data || [])
    setLoading(false)
  }

  async function generateAndSave() {
    if (!aiForm.topic.trim()) { toast.error('Enter a topic first.'); return }
    setAiLoading(true)
    try {
      const generated = await generateQuestions({ topic:aiForm.topic, subject:aiForm.subject||aiForm.topic, count:Number(aiForm.count), difficulty:aiForm.difficulty })
      const rows = generated.map(g => ({
        teacher_id:    profile.id,
        subject:       aiForm.subject || aiForm.topic,
        topic:         aiForm.topic,
        type:          'mcq',
        question_text: g.question_text,
        marks:         g.marks || 1,
        difficulty:    aiForm.difficulty,
        explanation:   g.explanation || '',
        options:       JSON.stringify(g.options),
      }))
      const { error } = await supabase.from('question_bank').insert(rows)
      if (error) throw error
      toast.success(`${rows.length} questions saved to bank!`)
      setAiModal(false); load()
    } catch(err) { toast.error(err.message || 'AI generation failed.') }
    setAiLoading(false)
  }

  async function deleteQuestion(id) {
    await supabase.from('question_bank').delete().eq('id', id)
    toast.success('Question deleted.'); load()
  }

  const diffColors = { easy:'badge-green', medium:'badge-amber', hard:'badge-red' }

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove}/>
      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={()=>deleteQuestion(delId)}
        title="Delete Question" message="Remove this question from the bank?" confirmLabel="Delete" danger/>
      <Modal open={aiModal} onClose={()=>setAiModal(false)} title="✨ AI Generate & Save to Bank" maxWidth="max-w-md">
        <div className="space-y-4">
          <div><label className="label">Topic *</label>
            <input className="input" placeholder="e.g. Python loops" value={aiForm.topic} onChange={e=>setAiForm(f=>({...f,topic:e.target.value}))} autoFocus/></div>
          <div><label className="label">Subject</label>
            <input className="input" placeholder="e.g. Computer Science" value={aiForm.subject} onChange={e=>setAiForm(f=>({...f,subject:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Count</label>
              <select className="input" value={aiForm.count} onChange={e=>setAiForm(f=>({...f,count:e.target.value}))}>
                {[3,5,10,15,20].map(n=><option key={n}>{n}</option>)}
              </select></div>
            <div><label className="label">Difficulty</label>
              <select className="input" value={aiForm.difficulty} onChange={e=>setAiForm(f=>({...f,difficulty:e.target.value}))}>
                {['easy','medium','hard','mixed'].map(d=><option key={d}>{d}</option>)}
              </select></div>
          </div>
          <button onClick={generateAndSave} disabled={aiLoading} className="btn-primary w-full justify-center">
            {aiLoading?<><Spinner size="sm"/> Generating…</>:<><Sparkles className="w-4 h-4"/> Generate & Save</>}
          </button>
        </div>
      </Modal>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Question Bank</h1><p className="text-slate-500 text-sm mt-1">{questions.length} saved questions</p></div>
        <button onClick={()=>setAiModal(true)} className="btn-primary"><Sparkles className="w-4 h-4"/> AI Generate</button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0"/>
          <input className="input flex-1 min-w-[140px] !mb-0" placeholder="Filter by subject…" value={filter.subject} onChange={e=>setFilter(f=>({...f,subject:e.target.value}))}/>
          <select className="input w-36 !mb-0" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
            <option value="">All types</option>
            {['mcq','truefalse','short','long'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input w-36 !mb-0" value={filter.difficulty} onChange={e=>setFilter(f=>({...f,difficulty:e.target.value}))}>
            <option value="">All difficulty</option>
            {['easy','medium','hard'].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg"/></div> :
       questions.length === 0 ? (
        <div className="card text-center py-16">
          <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-200"/>
          <p className="font-semibold text-slate-700 mb-1">Question bank is empty</p>
          <p className="text-slate-500 text-sm mb-4">Use AI to generate and save questions here for reuse.</p>
          <button onClick={()=>setAiModal(true)} className="btn-primary mx-auto"><Sparkles className="w-4 h-4"/> Generate Questions</button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q,i) => (
            <div key={q.id} className="card">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">{q.question_text}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {q.subject && <span className="badge-slate">{q.subject}</span>}
                    {q.topic   && <span className="badge-blue">{q.topic}</span>}
                    <span className="badge-slate capitalize">{q.type}</span>
                    <span className={diffColors[q.difficulty]||'badge-slate'}>{q.difficulty}</span>
                    <span className="badge-slate">{q.marks} mark{q.marks!==1?'s':''}</span>
                  </div>
                  {q.options && (() => {
                    try {
                      const opts = typeof q.options==='string'?JSON.parse(q.options):q.options
                      return <div className="mt-2 flex flex-wrap gap-1">{opts.map((o,j)=>(
                        <span key={j} className={`text-xs px-2 py-0.5 rounded-lg ${o.is_correct?'bg-emerald-100 text-emerald-700 font-semibold':'bg-slate-100 text-slate-500'}`}>
                          {String.fromCharCode(65+j)}. {o.option_text}
                        </span>
                      ))}</div>
                    } catch { return null }
                  })()}
                </div>
                <button onClick={()=>setDelId(q.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 rounded-lg flex-shrink-0">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
