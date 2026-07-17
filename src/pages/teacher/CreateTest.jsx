import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer, Modal, Spinner } from '../../components/UI'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles,
  CheckCircle, ArrowLeft, Save, Eye
} from 'lucide-react'
import { extractTextFromFile } from '../../utils/fileExtract'
import { generateQuestions, checkQuestionQuality, extractQuestionsFromDocument } from '../../lib/groq'

const QUESTION_TYPES = [
  { value:'mcq',       label:'Multiple Choice (MCQ)' },
  { value:'truefalse', label:'True / False' },
  { value:'short',     label:'Short Answer' },
  { value:'long',      label:'Long Answer' },
]

function newQuestion(order) {
  return {
    _id: Date.now() + Math.random(),
    type: 'mcq', question_text: '', marks: 1, order_num: order, explanation: '',
    options: [
      { _id: 1, option_text: '', is_correct: false },
      { _id: 2, option_text: '', is_correct: false },
      { _id: 3, option_text: '', is_correct: false },
      { _id: 4, option_text: '', is_correct: false },
    ]
  }
}

function tfQuestion(order) {
  return {
    _id: Date.now() + Math.random(),
    type: 'truefalse', question_text: '', marks: 1, order_num: order, explanation: '',
    options: [
      { _id: 1, option_text: 'True',  is_correct: true },
      { _id: 2, option_text: 'False', is_correct: false },
    ]
  }
}

export default function CreateTest() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const toast       = useToast()

  const [meta, setMeta] = useState({
    title:'', subject:'', description:'', duration:30,
    passing_marks:0, negative_marking:0,
    randomise_questions:false, randomise_options:false, instructions:''
  })
  const [questions,    setQuestions]    = useState([newQuestion(1)])
  const [saving,       setSaving]       = useState(false)
  const [collapsed,    setCollapsed]    = useState({})

  // AI modal state
  const [aiModal,   setAiModal]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForm,    setAiForm]    = useState({
    topic:'', subject:'', difficulty:'medium',
    typeCounts:{ mcq:15, truefalse:5, short:2, long:0 }
  })

  // File import modal state
  const [fileModal,    setFileModal]    = useState(false)
  const [fileLoading,  setFileLoading]  = useState(false)
  const [fileProgress, setFileProgress] = useState('')

  const setM = k => e => setMeta(m => ({
    ...m, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
  }))

  /* ── Add / remove / update questions ── */
  function addQuestion(type = 'mcq') {
    const q = type === 'truefalse' ? tfQuestion(questions.length + 1) : newQuestion(questions.length + 1)
    q.type = type
    setQuestions(prev => [...prev, q])
  }
  function removeQuestion(id) {
    setQuestions(prev => prev.filter(q => q._id !== id))
  }
  function updateQuestion(id, key, value) {
    setQuestions(prev => prev.map(q => q._id === id ? { ...q, [key]: value } : q))
  }
  function updateOption(qId, oId, key, value) {
    setQuestions(prev => prev.map(q => {
      if (q._id !== qId) return q
      if (key === 'is_correct' && value === true && q.type === 'mcq') {
        return { ...q, options: q.options.map(o => ({ ...o, is_correct: o._id === oId })) }
      }
      return { ...q, options: q.options.map(o => o._id === oId ? { ...o, [key]: value } : o) }
    }))
  }

  /* ── AI Generate ── */
  async function handleAIGenerate() {
    if (!aiForm.topic.trim()) { toast.error('Enter a topic first.'); return }
    const total = Object.values(aiForm.typeCounts || {}).reduce((a, b) => a + b, 0)
    if (total === 0) { toast.error('Set at least 1 question for any type.'); return }

    setAiLoading(true)
    try {
      const generated = await generateQuestions({
        topic:      aiForm.topic,
        subject:    aiForm.subject || aiForm.topic,
        difficulty: aiForm.difficulty,
        typeCounts: aiForm.typeCounts,
      })
      const mapped = generated.map((g, i) => ({
        _id:           Date.now() + i + Math.random(),
        type:          g.type || 'mcq',
        question_text: g.question_text || '',
        marks:         g.marks || 1,
        order_num:     questions.length + i + 1,
        explanation:   g.explanation || '',
        options: (g.type === 'mcq' || g.type === 'truefalse')
          ? g.options.map((o, j) => ({ _id: j+1, option_text: o.option_text, is_correct: o.is_correct }))
          : [
              { _id:1, option_text:'', is_correct:false },
              { _id:2, option_text:'', is_correct:false },
              { _id:3, option_text:'', is_correct:false },
              { _id:4, option_text:'', is_correct:false },
            ],
      }))
      setQuestions(prev => [...prev, ...mapped])
      setAiModal(false)
      toast.success(`${mapped.length} questions generated!`)
    } catch (err) {
      toast.error(err.message || 'AI generation failed.')
    }
    setAiLoading(false)
  }

  /* ── File Import ── */
  async function handleFileImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileLoading(true)
    setFileProgress('Reading file…')
    try {
      setFileProgress('Extracting text from document…')
      const text = await extractTextFromFile(file)
      if (text.length < 50) {
        toast.error('Document seems empty or could not be read.')
        setFileLoading(false)
        return
      }
      setFileProgress(`Extracted ${text.length} characters. Sending to AI…`)
      const generated = await extractQuestionsFromDocument(text)
      if (!generated.length) {
        toast.error('AI could not find any questions in this document.')
        setFileLoading(false)
        return
      }
      const mapped = generated.map((g, i) => ({
        _id:           Date.now() + i + Math.random(),
        type:          g.type || 'mcq',
        question_text: g.question_text || '',
        marks:         g.marks || 1,
        order_num:     questions.length + i + 1,
        explanation:   g.explanation || '',
        options: (g.type === 'mcq' || g.type === 'truefalse')
          ? g.options.map((o, j) => ({ _id: j+1, option_text: o.option_text, is_correct: o.is_correct }))
          : [
              { _id:1, option_text:'', is_correct:false },
              { _id:2, option_text:'', is_correct:false },
              { _id:3, option_text:'', is_correct:false },
              { _id:4, option_text:'', is_correct:false },
            ],
      }))
      setQuestions(prev => [...prev, ...mapped])
      setFileModal(false)
      toast.success(`✅ ${mapped.length} questions extracted from "${file.name}"!`)
    } catch (err) {
      toast.error(err.message || 'Failed to process file.')
    }
    setFileLoading(false)
    setFileProgress('')
    e.target.value = ''
  }

  /* ── Save test ── */
  async function handleSave(publish = false) {
    if (!meta.title.trim()) { toast.error('Test title is required.'); return }
    if (questions.length === 0) { toast.error('Add at least one question.'); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) { toast.error(`Q${i+1}: Question text is empty.`); return }
      if (q.type === 'mcq' || q.type === 'truefalse') {
        if (!q.options.some(o => o.is_correct)) { toast.error(`Q${i+1}: Mark at least one correct answer.`); return }
        if (q.options.some(o => !o.option_text.trim())) { toast.error(`Q${i+1}: All options must have text.`); return }
      }
    }
    setSaving(true)
    try {
      const totalMarks = questions.reduce((a, q) => a + Number(q.marks), 0)
      const joinCode   = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data: test, error: te } = await supabase.from('tests').insert({
        teacher_id:          profile.id,
        title:               meta.title,
        subject:             meta.subject,
        description:         meta.description,
        duration:            Number(meta.duration),
        total_marks:         totalMarks,
        passing_marks:       Number(meta.passing_marks),
        negative_marking:    Number(meta.negative_marking),
        randomise_questions: meta.randomise_questions,
        randomise_options:   meta.randomise_options,
        instructions:        meta.instructions,
        is_published:        publish,
        join_code:           joinCode,
      }).select().single()
      if (te) throw te

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: qRow, error: qe } = await supabase.from('questions').insert({
          test_id: test.id, type: q.type, question_text: q.question_text,
          marks: Number(q.marks), order_num: i+1, explanation: q.explanation,
        }).select().single()
        if (qe) throw qe
        if (q.type === 'mcq' || q.type === 'truefalse') {
          const optRows = q.options.map((o, j) => ({
            question_id: qRow.id, option_text: o.option_text,
            is_correct: o.is_correct, order_num: j+1,
          }))
          const { error: oe } = await supabase.from('options').insert(optRows)
          if (oe) throw oe
        }
      }
      toast.success(publish ? 'Test published!' : 'Test saved as draft.')
      navigate('/teacher')
    } catch (err) {
      toast.error(err.message || 'Failed to save test.')
    }
    setSaving(false)
  }

  const totalMarks = questions.reduce((a, q) => a + Number(q.marks || 1), 0)

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />

      {/* ── AI Modal ── */}
      <Modal open={aiModal} onClose={() => setAiModal(false)}
        title="✨ AI Question Generator" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="label">Topic / Chapter *</label>
            <input className="input" placeholder="e.g. Python loops, Newton's laws"
              value={aiForm.topic}
              onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
              autoFocus />
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="e.g. Computer Science, Physics"
              value={aiForm.subject}
              onChange={e => setAiForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={aiForm.difficulty}
              onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="label">Number of Questions per Type</label>
            <div className="space-y-2">
              {[
                { key:'mcq',       label:'Multiple Choice (MCQ)', emoji:'🔵' },
                { key:'truefalse', label:'True / False',          emoji:'✅' },
                { key:'short',     label:'Short Answer',          emoji:'✏️' },
                { key:'long',      label:'Long Answer',           emoji:'📝' },
              ].map(t => (
                <div key={t.key}
                  className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-700">{t.emoji} {t.label}</span>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setAiForm(f => ({
                        ...f, typeCounts: {
                          ...f.typeCounts,
                          [t.key]: Math.max(0, (f.typeCounts?.[t.key] || 0) - 1)
                        }
                      }))}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center">
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-slate-900">
                      {aiForm.typeCounts?.[t.key] || 0}
                    </span>
                    <button type="button"
                      onClick={() => setAiForm(f => ({
                        ...f, typeCounts: {
                          ...f.typeCounts,
                          [t.key]: (f.typeCounts?.[t.key] || 0) + 1
                        }
                      }))}
                      className="w-7 h-7 rounded-lg bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold flex items-center justify-center">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Total: {Object.values(aiForm.typeCounts || {}).reduce((a, b) => a + b, 0)} questions
            </p>
          </div>
          <button disabled={aiLoading} onClick={handleAIGenerate}
            className="btn-primary w-full justify-center">
            {aiLoading
              ? <><Spinner size="sm" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> Generate Questions</>}
          </button>
        </div>
      </Modal>

      {/* ── File Import Modal ── */}
      <Modal open={fileModal} onClose={() => !fileLoading && setFileModal(false)}
        title="📄 Import Questions from File" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Upload your PDF, DOCX, or DOC file</li>
              <li>System extracts all text from the document</li>
              <li>AI reads the text and finds / generates questions</li>
              <li>Questions are added to your test automatically</li>
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
  💡 Works best with: question papers, MCQ sheets, study notes, textbook chapters, Jupyter notebooks (.ipynb)
</div>

          {!fileLoading ? (
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
              <div className="text-4xl">📂</div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">Click to upload file</p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, DOC, TXT, IPYNB</p>
              </div>
              <input type="file" accept=".pdf,.docx,.doc,.txt,.ipynb"
                className="hidden" onChange={handleFileImport} />
            </label>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Processing…</p>
                <p className="text-sm text-slate-500 mt-1">{fileProgress}</p>
              </div>
              <p className="text-xs text-slate-400">This may take 15–30 seconds</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/teacher')} className="btn-ghost p-2 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">Create New Test</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {questions.length} questions · {totalMarks} total marks
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary">
            {saving ? <Spinner size="sm" /> : <Eye className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Publish Test'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left: Test settings ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h2 className="font-bold text-slate-900 mb-4">Test Details</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Python Chapter 1 Quiz"
                  value={meta.title} onChange={setM('title')} />
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="e.g. Computer Science"
                  value={meta.subject} onChange={setM('subject')} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="Optional instructions shown to students…"
                  value={meta.description} onChange={setM('description')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" className="input" min="1"
                    value={meta.duration} onChange={setM('duration')} />
                </div>
                <div>
                  <label className="label">Passing Marks</label>
                  <input type="number" className="input" min="0"
                    value={meta.passing_marks} onChange={setM('passing_marks')} />
                </div>
              </div>
              <div>
                <label className="label">Negative Marking (per wrong)</label>
                <input type="number" className="input" min="0" step="0.25"
                  value={meta.negative_marking} onChange={setM('negative_marking')} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-slate-900 mb-3">Anti-Cheat Settings</h2>
            <div className="space-y-3">
              {[
                { key:'randomise_questions', label:'Randomise question order' },
                { key:'randomise_options',   label:'Randomise option order'   },
              ].map(s => (
                <label key={s.key} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${meta[s.key] ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${meta[s.key] ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm text-slate-700">{s.label}</span>
                  <input type="checkbox" className="hidden"
                    checked={meta[s.key]} onChange={setM(s.key)} />
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-slate-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              {[
                { l:'Questions',  v: questions.length },
                { l:'Total Marks',v: totalMarks },
                { l:'Duration',   v: `${meta.duration} min` },
                { l:'MCQ',        v: questions.filter(q=>q.type==='mcq').length },
                { l:'True/False', v: questions.filter(q=>q.type==='truefalse').length },
                { l:'Short/Long', v: questions.filter(q=>['short','long'].includes(q.type)).length },
              ].map(r => (
                <div key={r.l} className="flex justify-between">
                  <span className="text-slate-500">{r.l}</span>
                  <span className="font-semibold">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Questions ── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Questions</h2>
            <div className="flex gap-2">
              <button onClick={() => setAiModal(true)} className="btn-secondary text-sm">
                <Sparkles className="w-4 h-4 text-purple-500" /> AI Generate
              </button>
              <button onClick={() => setFileModal(true)} className="btn-secondary text-sm">
                📄 Import File
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q._id} q={q} idx={idx}
                collapsed={!!collapsed[q._id]}
                onToggle={()  => setCollapsed(c => ({ ...c, [q._id]: !c[q._id] }))}
                onUpdate={(k,v) => updateQuestion(q._id, k, v)}
                onUpdateOption={(oId,k,v) => updateOption(q._id, oId, k, v)}
                onRemove={() => removeQuestion(q._id)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUESTION_TYPES.map(t => (
              <button key={t.value} onClick={() => addQuestion(t.value)}
                className="btn-ghost text-sm">
                <Plus className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

/* ── Question Card ── */
function QuestionCard({ q, idx, collapsed, onToggle, onUpdate, onUpdateOption, onRemove }) {
  return (
    <div className="card border-l-4 border-l-brand-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {idx + 1}
          </span>
          <span className="badge-slate text-xs capitalize">
            {q.type === 'truefalse' ? 'T/F' : q.type}
          </span>
          {q.question_text && (
            <p className="text-sm text-slate-600 truncate flex-1">{q.question_text}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggle} className="btn-ghost p-1.5 rounded-lg">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label text-xs">Question Text *</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Type your question here…"
              value={q.question_text}
              onChange={e => onUpdate('question_text', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Type</label>
              <select className="input text-sm" value={q.type}
                onChange={e => onUpdate('type', e.target.value)}>
                {QUESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Marks</label>
              <input type="number" className="input text-sm" min="0.5" step="0.5"
                value={q.marks} onChange={e => onUpdate('marks', e.target.value)} />
            </div>
          </div>

          {(q.type === 'mcq' || q.type === 'truefalse') && (
            <div>
              <label className="label text-xs">Options (click ✓ to mark correct answer)</label>
              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <div key={o._id} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                    o.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-xs font-bold flex items-center justify-center flex-shrink-0 text-slate-500">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      value={o.option_text}
                      disabled={q.type === 'truefalse'}
                      onChange={e => onUpdateOption(o._id, 'option_text', e.target.value)} />
                    <button
                      onClick={() => onUpdateOption(o._id, 'is_correct', true)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        o.is_correct
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-400 hover:bg-emerald-100'
                      }`}>
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label text-xs">Explanation (shown after submission)</label>
            <input className="input text-sm" placeholder="Brief explanation of the answer…"
              value={q.explanation}
              onChange={e => onUpdate('explanation', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}