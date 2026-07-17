import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { gradeFor, remarksFor } from '../../utils/excel'
import { ConfirmDialog, Spinner } from '../../components/UI'
import { getSmartHint } from '../../lib/groq'
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight,
  CheckCircle, Flag, Send, Maximize, Minimize, Lightbulb, X
} from 'lucide-react'

export default function TakeTest() {
  const { id }      = useParams()
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [test,       setTest]       = useState(null)
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [flagged,    setFlagged]    = useState({})
  const [current,    setCurrent]    = useState(0)
  const [timeLeft,   setTimeLeft]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [tabWarns,   setTabWarns]   = useState(0)
  const [subId,      setSubId]      = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hint,       setHint]       = useState('')
  const [hintLoad,   setHintLoad]   = useState(false)
  const [qTimes,     setQTimes]     = useState({})

  const startTime  = useRef(Date.now())
  const qStartTime = useRef(Date.now())
  const containerRef = useRef(null)

  useEffect(() => {
    load()
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('contextmenu', preventDefault)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('contextmenu', preventDefault)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [id])

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    const t = setInterval(() => setTimeLeft(n => n - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const onVisibilityChange = () => { if (document.hidden) setTabWarns(n => n + 1) }
  const preventDefault     = e => e.preventDefault()
  const onKeyDown = e => {
    if ((e.ctrlKey || e.metaKey) && ['c','v','x','a','u'].includes(e.key.toLowerCase()))
      e.preventDefault()
  }
  const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

  async function load() {
    setLoading(true)
    const { data: existing } = await supabase
      .from('submissions').select('id,status')
      .eq('test_id', id).eq('student_id', profile.id).single()

    if (existing?.status === 'submitted') {
      navigate(`/student/results/${existing.id}`, { replace: true })
      return
    }

    const [{ data: t }, { data: qs }] = await Promise.all([
      supabase.from('tests').select('*').eq('id', id).eq('is_published', true).single(),
      supabase.from('questions').select('*, options(*)').eq('test_id', id).order('order_num'),
    ])
    if (!t) { navigate('/student'); return }

    let orderedQs = qs || []
    if (t.randomise_questions) orderedQs = [...orderedQs].sort(() => Math.random() - .5)
    if (t.randomise_options)   orderedQs = orderedQs.map(q => ({ ...q, options: [...(q.options||[])].sort(() => Math.random() - .5) }))

    let ip = ''
    try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip } catch {}

    let sid = existing?.id
    if (!sid) {
      const { data: sub } = await supabase.from('submissions').insert({
        test_id: id, student_id: profile.id, status: 'in_progress',
        total_marks: t.total_marks, ip_address: ip,
      }).select('id').single()
      sid = sub?.id
    } else {
      const { data: savedAnswers } = await supabase.from('answers')
        .select('question_id, selected_option_id, text_answer').eq('submission_id', sid)
      if (savedAnswers?.length) {
        const restored = {}
        savedAnswers.forEach(a => {
          restored[a.question_id] = { optionId: a.selected_option_id, textAnswer: a.text_answer }
        })
        setAnswers(restored)
      }
    }

    setSubId(sid)
    setTest(t)
    setQuestions(orderedQs)
    setTimeLeft(t.duration * 60)
    startTime.current   = Date.now()
    qStartTime.current  = Date.now()
    setLoading(false)

    try { await (containerRef.current || document.documentElement).requestFullscreen() } catch {}
  }

  function trackQTime(nextIdx) {
    const elapsed = Math.round((Date.now() - qStartTime.current) / 1000)
    const qId     = questions[current]?.id
    if (qId) setQTimes(prev => ({ ...prev, [qId]: (prev[qId] || 0) + elapsed }))
    qStartTime.current = Date.now()
    setCurrent(nextIdx)
    setHint('')
  }

  function selectOption(qId, optId) {
    setAnswers(prev => ({ ...prev, [qId]: { optionId: optId } }))
  }
  function setTextAnswer(qId, text) {
    setAnswers(prev => ({ ...prev, [qId]: { textAnswer: text } }))
  }
  function toggleFlag(qId) {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }))
  }

  async function fetchHint() {
    const q = questions[current]; if (!q) return
    setHintLoad(true)
    try {
      const h = await getSmartHint({ question: q.question_text, options: q.options?.map(o => o.option_text) })
      setHint(h)
    } catch { setHint('Hint unavailable. Check Groq API key.') }
    setHintLoad(false)
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try { await (containerRef.current || document.documentElement).requestFullscreen() } catch {}
    } else {
      try { await document.exitFullscreen() } catch {}
    }
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const finalQTimes = { ...qTimes }
      const lastQId = questions[current]?.id
      if (lastQId) finalQTimes[lastQId] = (finalQTimes[lastQId] || 0) + Math.round((Date.now() - qStartTime.current) / 1000)

      const elapsed = Math.round((Date.now() - startTime.current) / 1000)
      let score = 0
      const answerRows = []

      for (const q of questions) {
        const ans = answers[q.id] || {}
        let isCorrect = false
        let marksAwarded = 0

        if (q.type === 'mcq' || q.type === 'truefalse') {
          const correctOpt = q.options.find(o => o.is_correct)
          isCorrect    = ans.optionId === correctOpt?.id
          marksAwarded = isCorrect
            ? q.marks
            : Math.max(0, -(test.negative_marking || 0))
        } else if (q.type === 'fillblank') {
          const correctOpt = q.options?.[0]
          isCorrect    = correctOpt && ans.textAnswer?.toLowerCase().trim() === correctOpt.option_text?.toLowerCase().trim()
          marksAwarded = isCorrect ? q.marks : 0
        } else {
          // short / long — NEVER auto-mark as correct, needs teacher review
          isCorrect    = false
          marksAwarded = 0
        }

        score += marksAwarded
        answerRows.push({
          submission_id:      subId,
          question_id:        q.id,
          selected_option_id: ans.optionId  || null,
          text_answer:        ans.textAnswer || null,
          is_correct:         isCorrect,
          marks_awarded:      marksAwarded,
        })
      }

      const percentage = test.total_marks > 0
        ? Math.round(score / test.total_marks * 100) : 0

      await supabase.from('answers').delete().eq('submission_id', subId)
      if (answerRows.length) await supabase.from('answers').insert(answerRows)

      await supabase.from('submissions').update({
        status:       'submitted',
        score,
        percentage,
        grade:        gradeFor(percentage),
        remarks:      remarksFor(percentage),
        time_taken:   elapsed,
        submitted_at: new Date().toISOString(),
        tab_switches: tabWarns,
        question_times: finalQTimes,
      }).eq('id', subId)

      if (document.fullscreenElement) { try { await document.exitFullscreen() } catch {} }
      navigate(`/student/results/${subId}`, { replace: true })
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }, [answers, questions, test, subId, submitting, tabWarns, qTimes, current])

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  const answered = Object.keys(answers).length
  const progress = questions.length ? Math.round(answered / questions.length * 100) : 0
  const warn5min = timeLeft !== null && timeLeft <= 300
  const q = questions[current]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-500">Loading test…</p>
      </div>
    </div>
  )
  if (!test || !q) return null

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50" style={{ userSelect:'none' }}>
      <ConfirmDialog
        open={submitOpen} onClose={() => setSubmitOpen(false)}
        onConfirm={() => handleSubmit()}
        title="Submit Test?"
        message={`Answered: ${answered}/${questions.length}. ${questions.length - answered > 0 ? `${questions.length - answered} question(s) unanswered.` : 'All questions answered!'} Submit now?`}
        confirmLabel="Yes, Submit"
      />

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate text-sm">{test.title}</p>
            <p className="text-xs text-slate-500">{answered}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-black text-sm flex-shrink-0 ${
            warn5min ? 'bg-red-50 text-red-600 timer-warning' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock className="w-4 h-4" />
            {timeLeft !== null ? fmt(timeLeft) : '--:--'}
          </div>
          <button onClick={toggleFullscreen} className="btn-ghost p-2 rounded-xl hidden sm:flex">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={() => setSubmitOpen(true)} disabled={submitting}
            className="btn-success text-sm flex-shrink-0">
            {submitting ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">{submitting ? 'Submitting…' : 'Submit Test'}</span>
          </button>
        </div>
        <div className="progress-bar rounded-none h-1">
          <div className="progress-fill rounded-none" style={{ width:`${progress}%` }} />
        </div>
      </div>

      {/* Tab warning */}
      {tabWarns > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>⚠️ Tab switch detected ({tabWarns} time{tabWarns > 1 ? 's' : ''}). This is reported to your teacher.</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
        {/* Question area */}
        <div className="flex-1 min-w-0">
          <div className="card mb-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 font-black flex items-center justify-center flex-shrink-0">
                  {current + 1}
                </span>
                <span className="badge-slate text-xs capitalize">
                  {q.type === 'truefalse' ? 'True/False' : q.type}
                </span>
                <span className="text-xs text-slate-500">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                {(q.type === 'short' || q.type === 'long') && (
                  <span className="badge-amber text-xs">Teacher graded</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={fetchHint} disabled={hintLoad}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                  {hintLoad ? <Spinner size="sm" /> : <Lightbulb className="w-3.5 h-3.5" />} Hint
                </button>
                <button onClick={() => toggleFlag(q.id)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    flagged[q.id]
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-amber-50'
                  }`}>
                  <Flag className="w-3.5 h-3.5" />
                  {flagged[q.id] ? 'Flagged' : 'Flag'}
                </button>
              </div>
            </div>

            {/* Hint */}
            {hint && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 flex-1">{hint}</p>
                <button onClick={() => setHint('')} className="text-amber-400 hover:text-amber-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {q.image_url && (
              <img src={q.image_url} alt="Question" className="rounded-xl mb-4 max-h-48 object-contain" />
            )}
            {q.code_snippet && (
              <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-sm font-mono overflow-x-auto mb-4 leading-relaxed">
                {q.code_snippet}
              </pre>
            )}

            <p className="text-base font-medium text-slate-900 leading-relaxed mb-5">{q.question_text}</p>

            {/* MCQ / True-False */}
            {(q.type === 'mcq' || q.type === 'truefalse') && (
              <div className="space-y-3">
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id]?.optionId === opt.id
                  return (
                    <button key={opt.id} onClick={() => selectOption(q.id, opt.id)}
                      className={`w-full text-left transition-all ${sel ? 'option-selected' : 'option-default'}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        sel ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className={`text-sm leading-relaxed ${sel ? 'text-brand-900 font-medium' : 'text-slate-700'}`}>
                        {opt.option_text}
                      </span>
                      {sel && <CheckCircle className="w-4 h-4 text-brand-500 ml-auto flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Short answer */}
            {q.type === 'short' && (
              <div>
                <p className="text-xs text-amber-600 font-medium mb-2">
                  ⏳ This answer will be reviewed and graded by your teacher.
                </p>
                <input className="input" placeholder="Type your answer here…"
                  value={answers[q.id]?.textAnswer || ''}
                  onChange={e => setTextAnswer(q.id, e.target.value)} />
              </div>
            )}

            {/* Long answer */}
            {q.type === 'long' && (
              <div>
                <p className="text-xs text-amber-600 font-medium mb-2">
                  ⏳ This answer will be reviewed and graded by your teacher.
                </p>
                <textarea className="input resize-none" rows={6}
                  placeholder="Type your detailed answer here…"
                  value={answers[q.id]?.textAnswer || ''}
                  onChange={e => setTextAnswer(q.id, e.target.value)} />
              </div>
            )}

            {/* Fill in blank */}
            {q.type === 'fillblank' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Type the correct word or phrase:</p>
                <input className="input" placeholder="Your answer…"
                  value={answers[q.id]?.textAnswer || ''}
                  onChange={e => setTextAnswer(q.id, e.target.value)} />
              </div>
            )}

            {/* Code answer */}
            {q.type === 'code' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Write your code solution:</p>
                <textarea
                  className="input resize-none font-mono text-sm bg-slate-900 text-green-400 border-slate-700"
                  rows={8} placeholder="# Write your code here…"
                  value={answers[q.id]?.textAnswer || ''}
                  onChange={e => setTextAnswer(q.id, e.target.value)}
                  style={{ caretColor:'#4ade80' }} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => trackQTime(Math.max(0, current - 1))}
              disabled={current === 0} className="btn-ghost disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-slate-500">{current + 1} / {questions.length}</span>
            <button onClick={() => trackQTime(Math.min(questions.length - 1, current + 1))}
              disabled={current === questions.length - 1} className="btn-ghost disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question grid panel */}
        <div className="w-52 flex-shrink-0 hidden lg:block">
          <div className="card sticky top-20">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Questions</h3>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((sq, i) => {
                const ans = !!answers[sq.id]
                const cur = i === current
                const fl  = !!flagged[sq.id]
                return (
                  <button key={sq.id} onClick={() => trackQTime(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      cur ? 'bg-brand-600 text-white shadow-md'
                        : fl  ? 'bg-amber-400 text-white'
                        : ans ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
              {[
                ['bg-emerald-500', 'Answered'],
                ['bg-amber-400',   'Flagged'],
                ['bg-slate-100 border', 'Not answered'],
                ['bg-brand-600', 'Current'],
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${c}`} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 mb-3">
              <div className="flex justify-between mb-1">
                <span>Progress</span>
                <span className="font-bold text-slate-700">{answered}/{questions.length}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${progress}%` }} />
              </div>
            </div>
            <button onClick={() => setSubmitOpen(true)} className="btn-success w-full justify-center text-sm">
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}