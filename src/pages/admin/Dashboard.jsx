import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/UI'
import { Users, BookOpen, BarChart2, Shield } from 'lucide-react'

export default function AdminDashboard() {
  const [stats,    setStats]    = useState({ teachers:0, students:0, tests:0, submissions:0 })
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('overview')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ count:teachers }, { count:students }, { count:tests }, { count:submissions }, { data:allUsers }] = await Promise.all([
      supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','teacher'),
      supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','student'),
      supabase.from('tests').select('*',{count:'exact',head:true}),
      supabase.from('submissions').select('*',{count:'exact',head:true}).eq('status','submitted'),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}).limit(50),
    ])
    setStats({ teachers:teachers||0, students:students||0, tests:tests||0, submissions:submissions||0 })
    setUsers(allUsers||[])
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg"/></div>

  return (
    <>
      <div className="mb-8">
        <h1 className="page-title">Admin Dashboard 🛡️</h1>
        <p className="text-slate-500 mt-1">Platform-wide overview and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon:'👨‍🏫', label:'Teachers',    val:stats.teachers,    color:'bg-blue-50 text-blue-600' },
          { icon:'🎓',  label:'Students',    val:stats.students,    color:'bg-purple-50 text-purple-600' },
          { icon:'📝',  label:'Tests',       val:stats.tests,       color:'bg-emerald-50 text-emerald-600' },
          { icon:'📊',  label:'Submissions', val:stats.submissions, color:'bg-amber-50 text-amber-600' },
        ].map(s=>(
          <div key={s.label} className="card">
            <div className={`w-11 h-11 rounded-2xl ${s.color} flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.val}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {[{key:'overview',label:'All Users'},{key:'teachers',label:'Teachers'},{key:'students',label:'Students'}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab===t.key?'border-brand-600 text-brand-700':'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['#','Name','Email','Role','Roll No.','Joined'].map(h=>(
              <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.filter(u=>tab==='overview'||u.role===tab.slice(0,-1)).map((u,i)=>(
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400">{i+1}</td>
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={u.role==='teacher'?'badge-purple':u.role==='admin'?'badge-red':'badge-blue'}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.roll_no||'—'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
