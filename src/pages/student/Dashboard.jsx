import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer, Modal, Spinner } from '../../components/UI'
import { gradeFor, gradeColor } from '../../utils/excel'
import { BookOpen, Clock, Play, Hash, Trophy, TrendingUp, CheckCircle } from 'lucide-react'

export default function StudentDashboard() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const toast        = useToast()
  const [available,    setAvailable]    = useState([])
  const [submissions,  setSubmissions]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [joinModal,    setJoinModal]    = useState(false)
  const [joinCode,     setJoinCode]     = useState('')
  const [joining,      setJoining]      = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // Load published tests
    const { data: tests } = await supabase
      .from('tests')
      .select('*, questions(count)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    // Load student's own submissions
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, tests(title, subject, total_marks)')
      .eq('student_id', profile.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })

    const submittedIds = new Set((subs || []).map(s => s.test_id))
    setAvailable((tests || []).filter(t => !submittedIds.has(t.id)))
    setSubmissions(subs || [])
    setLoading(false)
  }

  async function joinByCode() {
    if (!joinCode.trim()) return
    setJoining(true)
    const { data: test } = await supabase
      .from('tests')
      .select('*')
      .eq('join_code', joinCode.trim().toUpperCase())
      .eq('is_published', true)
      .single()
    setJoining(false)
    if (!test) { toast.error('Invalid code or test not published.'); return }
    const already = submissions.find(s => s.test_id === test.id)
    if (already) { toast.warning('You have already submitted this test.'); return }
    setJoinModal(false)
    navigate(`/student/test/${test.id}`)
  }

  const avgScore = submissions.length
    ? Math.round(submissions.reduce((a, s) => a + (s.percentage || 0), 0) / submissions.length)
    : 0
  const bestGrade = submissions.length
    ? ['A','B','C','F'].find(g => submissions.some(s => gradeFor(s.percentage) === g)) || 'F'
    : '—'

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />

      {/* Join code modal */}
      <Modal open={joinModal} onClose={() => setJoinModal(false)} title="Enter Class Code" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">Ask your teacher for the class/test code and enter it below.</p>
          <input className="input text-center font-mono text-xl tracking-widest uppercase" maxLength={8}
            placeholder="ABC123" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinByCode()}
          />
          <button onClick={joinByCode} disabled={joining} className="btn-primary w-full justify-center">
            {joining ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
            {joining ? 'Finding test…' : 'Start Test'}
          </button>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">My Dashboard 🎓</h1>
          <p className="text-slate-500 mt-1">Welcome, <strong>{profile?.name}</strong></p>
        </div>
        <button onClick={() => setJoinModal(true)} className="btn-primary">
          <Hash className="w-4 h-4" /> Join by Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon:'📝', label:'Tests Taken',   val: submissions.length, color:'bg-brand-50 text-brand-600' },
          { icon:'⭐', label:'Avg Score',      val: `${avgScore}%`,     color:'bg-purple-50 text-purple-600' },
          { icon:'🏆', label:'Best Grade',     val: bestGrade,          color:'bg-amber-50 text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`w-10 h-10 rounded-2xl ${s.color} flex items-center justify-center text-xl mb-2 mx-auto`}>{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Available tests */}
          <div>
            <h2 className="section-title">Available Tests ({available.length})</h2>
            {available.length === 0 ? (
              <div className="card text-center py-10">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm">No new tests available.<br/>Ask your teacher or use a class code.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {available.map(test => (
                  <div key={test.id} className="card-hover" onClick={() => navigate(`/student/test/${test.id}`)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{test.title}</h3>
                        {test.subject && <p className="text-xs text-slate-500 mt-0.5">{test.subject}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{test.questions?.[0]?.count ?? 0} questions</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration} min</span>
                        </div>
                      </div>
                      <div className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                        <Play className="w-3 h-3" /> Start
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent results */}
          <div>
            <h2 className="section-title">Recent Results</h2>
            {submissions.length === 0 ? (
              <div className="card text-center py-10">
                <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm">No results yet.<br/>Take a test to see your scores here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.slice(0, 6).map(sub => {
                  const grade = gradeFor(sub.percentage)
                  return (
                    <div key={sub.id} className="card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/student/results/${sub.id}`)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{sub.tests?.title || 'Test'}</p>
                          <p className="text-xs text-slate-500">{sub.tests?.subject} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-IN') : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-black text-slate-900">{sub.percentage ?? 0}%</div>
                            <div className="text-xs text-slate-500">{sub.score}/{sub.tests?.total_marks}</div>
                          </div>
                          <span className={`${gradeColor(grade)} text-sm`}>{grade}</span>
                        </div>
                      </div>
                      <div className="mt-2 progress-bar">
                        <div className="progress-fill" style={{ width: `${sub.percentage ?? 0}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
