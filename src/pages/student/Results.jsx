import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateStudentFeedback } from '../../lib/groq'
import { gradeFor, formatTime } from '../../utils/excel'
import { downloadResultPDF } from '../../utils/pdf'
import { Spinner } from '../../components/UI'
import {
  Home, Brain, CheckCircle, XCircle, Minus,
  Clock, Download, Share2
} from 'lucide-react'

const GRADE_META = {
  A: { emoji:'🏆', label:'Excellent!',   bg:'from-emerald-400 to-emerald-600', badge:'bg-emerald-500' },
  B: { emoji:'🎉', label:'Great Work!',  bg:'from-blue-400 to-blue-600',       badge:'bg-blue-500'   },
  C: { emoji:'👍', label:'Good Effort!', bg:'from-amber-400 to-amber-600',     badge:'bg-amber-500'  },
  F: { emoji:'📚', label:'Keep Going!',  bg:'from-red-400 to-red-600',         badge:'bg-red-500'    },
}

export default function Results() {
  const { id }      = useParams()
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [sub,        setSub]        = useState(null)
  const [test,       setTest]       = useState(null)
  const [review,     setReview]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [aiFeedback, setAiFeedback] = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [tab,        setTab]        = useState('summary')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)

    // Load submission
    const { data: s } = await supabase
      .from('submissions').select('*, tests(*)').eq('id', id).single()
    if (!s || s.student_id !== profile.id) { navigate('/student'); return }
    setSub(s)
    setTest(s.tests)

    // Load answers — include teacher_graded field
    const { data: ans } = await supabase
      .from('answers')
      .select(`
        id,
        selected_option_id,
        text_answer,
        match_answer,
        is_correct,
        marks_awarded,
        teacher_graded,
        questions (
          id,
          question_text,
          type,
          marks,
          explanation,
          image_url,
          code_snippet,
          options ( id, option_text, is_correct )
        )
      `)
      .eq('submission_id', id)
    setReview(ans || [])
    setLoading(false)
  }

  async function getAIFeedback() {
    setAiLoading(true)
    try {
      const wrongTopics = review
        .filter(a => !a.is_correct && a.questions?.type !== 'short' && a.questions?.type !== 'long')
        .map(a => a.questions?.question_text?.slice(0, 40) || '')
        .filter(Boolean)
      const fb = await generateStudentFeedback({
        studentName: profile.name, testTitle: test?.title,
        score: sub.score, total: sub.total_marks, wrongTopics,
      })
      setAiFeedback(fb)
    } catch {
      setAiFeedback('AI feedback unavailable. Make sure your API key is set.')
    }
    setAiLoading(false)
  }

  function shareResult() {
    const text = `I scored ${sub.percentage}% (${sub.score}/${sub.total_marks}) in "${test?.title}" — Grade ${gradeFor(sub.percentage)} 🎓`
    if (navigator.share) navigator.share({ title: 'My Exam Result', text })
    else { navigator.clipboard?.writeText(text); alert('Result copied to clipboard!') }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
  if (!sub) return null

  const grade = gradeFor(sub.percentage)
  const meta  = GRADE_META[grade]

  // Count stats correctly
  const correct  = review.filter(a => a.is_correct).length
  const skipped  = review.filter(a => !a.selected_option_id && !a.text_answer).length
  const wrong    = review.filter(a => {
    const isSubj = a.questions?.type === 'short' || a.questions?.type === 'long'
    return !a.is_correct && !isSubj && (a.selected_option_id || a.text_answer)
  }).length

  // Pending = subjective questions NOT yet graded by teacher
  const pendingAnswers = review.filter(a => {
    const isSubj = a.questions?.type === 'short' || a.questions?.type === 'long'
    return isSubj && !a.teacher_graded
  })
  const pendingCount = pendingAnswers.length

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">

      {/* Hero score card */}
      <div className={`rounded-3xl bg-gradient-to-br ${meta.bg} text-white p-8 mb-6 text-center shadow-2xl`}>
        <div className="text-5xl mb-3">{meta.emoji}</div>
        <h1 className="text-3xl font-black mb-1">{meta.label}</h1>
        <p className="text-white/80 mb-6">{test?.title}</p>
        <div className="text-7xl font-black tracking-tight mb-2">{sub.percentage ?? 0}%</div>
        <p className="text-white/80 text-lg">{sub.score} / {sub.total_marks} marks</p>
        {pendingCount > 0 && (
          <p className="text-white/70 text-sm mt-2">
            ⏳ {pendingCount} answer{pendingCount > 1 ? 's' : ''} pending teacher review — score may increase
          </p>
        )}
        <div className={`inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full ${meta.badge} bg-opacity-30 font-bold`}>
          Grade {grade}
        </div>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => downloadResultPDF(sub, test, review)}
            className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors font-medium">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button
            onClick={shareResult}
            className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors font-medium">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon:<CheckCircle className="w-5 h-5 text-emerald-500"/>, label:'Correct',  val:correct,  bg:'bg-emerald-50' },
          { icon:<XCircle     className="w-5 h-5 text-red-500"/>,     label:'Wrong',    val:wrong,    bg:'bg-red-50'     },
          { icon:<Minus       className="w-5 h-5 text-slate-400"/>,   label:'Skipped',  val:skipped,  bg:'bg-slate-50'   },
          { icon:<Clock       className="w-5 h-5 text-amber-500"/>,   label:'Time',     val:sub.time_taken ? formatTime(sub.time_taken) : '—', bg:'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`card ${s.bg} text-center`}>
            <div className="flex justify-center mb-1">{s.icon}</div>
            <div className="font-black text-slate-900 text-lg">{s.val}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending review notice — only show if teacher hasn't graded yet */}
      {pendingCount > 0 && (
        <div className="card bg-amber-50 border-amber-200 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-bold text-amber-800">
                {pendingCount} answer{pendingCount > 1 ? 's' : ''} pending teacher review
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your short/long answers will be graded by your teacher. Score may increase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All graded notice */}
      {pendingCount === 0 && review.some(a => a.questions?.type === 'short' || a.questions?.type === 'long') && (
        <div className="card bg-emerald-50 border-emerald-200 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <p className="font-bold text-emerald-800">All answers have been graded by your teacher ✅</p>
          </div>
        </div>
      )}

      {/* Remarks */}
      <div className="card bg-slate-50 mb-6">
        <p className="text-slate-700 text-sm font-medium text-center">{sub.remarks}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {[
          { k:'summary',  l:'Answer Review' },
          { k:'feedback', l:'✨ AI Feedback' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.k
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Answer Review */}
      {tab === 'summary' && (
        <div className="space-y-4 mb-8">
          {review.map((ans, i) => {
            const q            = ans.questions
            const isSubjective = q?.type === 'short' || q?.type === 'long'
            const isGraded     = ans.teacher_graded === true  // ← use teacher_graded flag
            const ok           = ans.is_correct
            const chosenOpt    = q?.options?.find(o => o.id === ans.selected_option_id)
            const correctOpt   = q?.options?.find(o => o.is_correct)
            const isSkipped    = !ans.selected_option_id && !ans.text_answer

            // Border color logic
            const borderColor =
              isSubjective && !isGraded ? 'border-l-amber-400' :
              isSubjective && isGraded  ? 'border-l-emerald-400' :
              ok                        ? 'border-l-emerald-400' :
              isSkipped                 ? 'border-l-slate-300' :
                                          'border-l-red-400'

            // Status icon / badge
            const statusBadge = isSubjective ? (
              isGraded ? (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-semibold flex-shrink-0 whitespace-nowrap">
                  ✓ Graded
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium flex-shrink-0 whitespace-nowrap">
                  ⏳ Pending Review
                </span>
              )
            ) : ok ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : isSkipped ? (
              <Minus className="w-5 h-5 text-slate-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )

            return (
              <div key={ans.id} className={`card border-l-4 ${borderColor}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed flex-1">
                    {q?.question_text}
                  </p>
                  {statusBadge}
                </div>

                {/* Image */}
                {q?.image_url && (
                  <img src={q.image_url} className="w-40 h-24 object-contain rounded-lg mb-2 ml-10" alt=""/>
                )}

                {/* Code snippet */}
                {q?.code_snippet && (
                  <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs font-mono ml-10 mb-2 overflow-x-auto">
                    {q.code_snippet}
                  </pre>
                )}

                {/* MCQ / T/F answer */}
                {(q?.type === 'mcq' || q?.type === 'truefalse') && (
                  <div className="ml-10 space-y-1.5">
                    {!ok && !isSkipped && chosenOpt && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-xs font-semibold w-24">Your answer:</span>
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-lg text-xs">{chosenOpt.option_text}</span>
                      </div>
                    )}
                    {!ok && correctOpt && (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 text-xs font-semibold w-24">Correct:</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs">{correctOpt.option_text}</span>
                      </div>
                    )}
                    {ok && (
                      <p className="text-xs text-emerald-600 font-medium">✓ {chosenOpt?.option_text}</p>
                    )}
                  </div>
                )}

                {/* Short / Long answer */}
                {isSubjective && (
                  <div className="ml-10 mt-2 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Your answer:</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {ans.text_answer || <span className="italic text-slate-400">No answer given</span>}
                    </p>
                    {/* Show marks if graded */}
                    {isGraded && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className={`text-xs font-semibold ${Number(ans.marks_awarded) > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {Number(ans.marks_awarded) > 0
                            ? `✓ Marks awarded: ${ans.marks_awarded} / ${q?.marks}`
                            : `Marks awarded: 0 / ${q?.marks}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Code answer */}
                {q?.type === 'code' && ans.text_answer && (
                  <div className="ml-10 mt-1 bg-slate-900 text-green-400 rounded-xl p-3 text-xs font-mono">
                    {ans.text_answer}
                  </div>
                )}

                {/* Explanation */}
                {q?.explanation && !isSubjective && (
                  <div className="ml-10 mt-2 text-xs text-brand-700 bg-brand-50 rounded-xl p-2">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* AI Feedback */}
      {tab === 'feedback' && (
        <div className="card mb-8">
          {!aiFeedback && !aiLoading && (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 mx-auto mb-3 text-brand-300" />
              <h3 className="font-bold text-slate-900 mb-2">Get Personalised AI Feedback</h3>
              <p className="text-slate-500 text-sm mb-6">
                Get specific study tips based on your performance.
              </p>
              <button onClick={getAIFeedback} className="btn-primary mx-auto">
                <Brain className="w-4 h-4" /> Generate Feedback
              </button>
            </div>
          )}
          {aiLoading && (
            <div className="text-center py-8">
              <Spinner size="lg" className="mx-auto mb-3" />
              <p className="text-slate-500 text-sm">AI is analysing your performance…</p>
            </div>
          )}
          {aiFeedback && (
            <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-brand-600" />
                <span className="font-bold text-brand-800">Your Personalised Feedback</span>
              </div>
              <p className="text-slate-700 leading-relaxed">{aiFeedback}</p>
              <button onClick={getAIFeedback} className="btn-ghost text-xs mt-3">↺ Regenerate</button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center pb-8">
        <button onClick={() => navigate('/student')} className="btn-secondary">
          <Home className="w-4 h-4" /> Dashboard
        </button>
        <button onClick={() => navigate('/student/leaderboard')} className="btn-ghost">
          🏆 Leaderboard
        </button>
      </div>
    </div>
  )
}