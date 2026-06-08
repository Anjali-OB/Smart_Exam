import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer, ConfirmDialog, Spinner } from '../../components/UI'
import {
  Plus, BookOpen, Users, Clock, ToggleLeft, ToggleRight,
  Trash2, Eye, BarChart2, Copy, CheckCircle, XCircle, Calendar
} from 'lucide-react'

export default function TeacherDashboard() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const toast        = useToast()
  const [tests,   setTests]   = useState([])
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState({ totalTests:0, totalStudents:0, totalSubmissions:0, avgScore:0 })
  const [deleting, setDeleting] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => { loadTests() }, [])

  async function loadTests() {
  setLoading(true)
  try {
    const { data, error } = await supabase
      .from('tests')
      .select(`
        id, title, subject, description, duration,
        total_marks, is_published, join_code, created_at,
        questions(count)
      `)
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading tests:', error)
      setLoading(false)
      return
    }

    // Load submission counts separately
    const testsWithSubs = await Promise.all((data || []).map(async (test) => {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id)
        .eq('status', 'submitted')
      return { ...test, submissionCount: count || 0 }
    }))

    setTests(testsWithSubs)
    computeStats(testsWithSubs)
  } catch (err) {
    console.error('Unexpected error:', err)
  }
  setLoading(false)
}

  function computeStats(data) {
  const totalSubmissions = data.reduce((a, t) => a + (t.submissionCount || 0), 0)
  setStats({
    totalTests:       data.length,
    totalStudents:    totalSubmissions,
    totalSubmissions: totalSubmissions,
    avgScore:         0,
  })
}

  async function togglePublish(test) {
    const { error } = await supabase
      .from('tests').update({ is_published: !test.is_published }).eq('id', test.id)
    if (error) { toast.error('Failed to update test status.'); return }
    toast.success(test.is_published ? 'Test unpublished.' : 'Test published! Students can now take it.')
    loadTests()
  }

  async function deleteTest() {
    if (!deleting) return
    const { error } = await supabase.from('tests').delete().eq('id', deleting.id)
    if (error) { toast.error('Failed to delete test.'); return }
    toast.success('Test deleted.')
    setDeleting(null)
    loadTests()
  }

  function copyJoinCode(code) {
    navigator.clipboard?.writeText(code)
    toast.success('Class code copied!')
  }

  const statCards = [
    { icon:'📝', label:'Total Tests',       value: stats.totalTests,       color:'bg-brand-50 text-brand-600' },
    { icon:'👥', label:'Students Reached',  value: stats.totalStudents,    color:'bg-purple-50 text-purple-600' },
    { icon:'📊', label:'Total Submissions', value: stats.totalSubmissions, color:'bg-emerald-50 text-emerald-600' },
    { icon:'⭐', label:'Avg Score',          value: `${stats.avgScore}%`,   color:'bg-amber-50 text-amber-600' },
  ]

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
      <ConfirmDialog
        open={confirmDel} onClose={() => { setConfirmDel(false); setDeleting(null) }}
        onConfirm={deleteTest} title="Delete Test"
        message={`Are you sure you want to delete "${deleting?.title}"? All submissions will be lost.`}
        confirmLabel="Delete" danger
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Dashboard 👋</h1>
          <p className="text-slate-500 mt-1">Welcome back, <strong>{profile?.name}</strong></p>
        </div>
        <Link to="/teacher/create-test" className="btn-primary">
          <Plus className="w-4 h-4" /> Create New Test
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="card">
            <div className={`w-11 h-11 rounded-2xl ${s.color} flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tests list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">Your Tests</h2>
        {tests.length > 0 && (
          <Link to="/teacher/analytics" className="btn-ghost text-sm">
            <BarChart2 className="w-4 h-4" /> View Analytics
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-bold text-slate-900 mb-2">No tests yet</h3>
          <p className="text-slate-500 mb-6">Create your first test and share it with your students.</p>
          <Link to="/teacher/create-test" className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Create First Test
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const qCount   = test.questions?.[0]?.count ?? 0
            const subCount = test.submissionCount ?? 0
            return (
              <div key={test.id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{test.title}</h3>
                      <span className={test.is_published ? 'badge-green' : 'badge-slate'}>
                        {test.is_published ? '🟢 Published' : '⚪ Draft'}
                      </span>
                    </div>
                    {test.subject && <p className="text-sm text-slate-500 mb-2">{test.subject}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {qCount} questions</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {subCount} submissions</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration} min</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                        {new Date(test.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    {test.join_code && (
                      <button onClick={() => copyJoinCode(test.join_code)}
                        className="mt-2 flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1.5 rounded-lg transition-colors font-mono">
                        <Copy className="w-3 h-3" /> Code: <strong>{test.join_code}</strong>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button onClick={() => navigate(`/teacher/test/${test.id}`)} className="btn-ghost text-sm">
                      <Eye className="w-4 h-4" /> Results
                    </button>
                    <button onClick={() => togglePublish(test)}
                      className={`btn-ghost text-sm ${test.is_published ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {test.is_published
                        ? <><ToggleRight className="w-4 h-4" /> Unpublish</>
                        : <><ToggleLeft className="w-4 h-4" /> Publish</>}
                    </button>
                    <button onClick={() => { setDeleting(test); setConfirmDel(true) }}
                      className="btn-ghost text-sm text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
