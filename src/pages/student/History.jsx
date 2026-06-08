import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { gradeFor, gradeColor } from '../../utils/excel'
import { Spinner } from '../../components/UI'
import { BookOpen, TrendingUp } from 'lucide-react'

export default function History() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [subs,    setSubs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('submissions')
      .select('*, tests(title, subject, total_marks)')
      .eq('student_id', profile.id).eq('status','submitted')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setSubs(data||[]); setLoading(false) })
  }, [])

  const avg = subs.length ? Math.round(subs.reduce((a,s)=>a+(s.percentage||0),0)/subs.length) : 0

  return (
    <>
      <div className="mb-8">
        <h1 className="page-title">My Results</h1>
        <p className="text-slate-500 mt-1">Your complete test history</p>
      </div>

      {subs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { emoji:'📝', label:'Tests Taken',  val: subs.length },
            { emoji:'⭐', label:'Average Score', val: `${avg}%` },
            { emoji:'🏆', label:'Best Score',    val: `${subs.length?Math.max(...subs.map(s=>s.percentage||0)):0}%` },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xl font-black text-slate-900">{s.val}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : subs.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500">No tests completed yet.<br/>Go to your dashboard to find available tests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => {
            const grade = gradeFor(sub.percentage)
            return (
              <div key={sub.id} className="card-hover" onClick={() => navigate(`/student/results/${sub.id}`)}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0
                    ${grade==='A'?'bg-emerald-500':grade==='B'?'bg-blue-500':grade==='C'?'bg-amber-500':'bg-red-500'}`}>
                    {grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{sub.tests?.title || 'Test'}</p>
                    <p className="text-xs text-slate-500">{sub.tests?.subject} · {sub.submitted_at?new Date(sub.submitted_at).toLocaleDateString('en-IN'):''}</p>
                    <div className="mt-1.5 progress-bar w-40">
                      <div className="progress-fill" style={{width:`${sub.percentage||0}%`}}/>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-slate-900 text-lg">{sub.percentage??0}%</div>
                    <div className="text-xs text-slate-500">{sub.score}/{sub.tests?.total_marks}</div>
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
