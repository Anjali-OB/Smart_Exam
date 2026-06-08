import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, LayoutDashboard, BookOpen, BarChart2, Users, BookMarked, LogOut, Menu, X, ChevronDown, Shield } from 'lucide-react'
import NotificationBell from './Notifications'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [mob,  setMob]  = useState(false)
  const [umenu,setUmenu]= useState(false)
  const isActive = path => location.pathname === path || location.pathname.startsWith(path+'/')

  const teacherLinks = [
    { to:'/teacher',                icon:<LayoutDashboard className="w-4 h-4"/>, label:'Dashboard' },
    { to:'/teacher/analytics',      icon:<BarChart2 className="w-4 h-4"/>,       label:'Analytics'  },
    { to:'/teacher/batches',        icon:<Users className="w-4 h-4"/>,           label:'Batches'    },
    { to:'/teacher/question-bank',  icon:<BookMarked className="w-4 h-4"/>,      label:'Question Bank'},
  ]
  const studentLinks = [
    { to:'/student',            icon:<LayoutDashboard className="w-4 h-4"/>, label:'Dashboard' },
    { to:'/student/history',    icon:<BookOpen className="w-4 h-4"/>,        label:'My Results' },
    { to:'/student/leaderboard',icon:<span className="text-sm">🏆</span>,    label:'Leaderboard'},
  ]
  const adminLinks = [
    { to:'/admin', icon:<Shield className="w-4 h-4"/>, label:'Admin Panel' },
  ]

  const links = profile?.role==='teacher' ? teacherLinks : profile?.role==='admin' ? adminLinks : studentLinks

  async function handleSignOut() { await signOut(); navigate('/') }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={profile?.role==='teacher'?'/teacher':profile?.role==='admin'?'/admin':'/student'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white"/>
            </div>
            <span className="font-bold text-lg text-slate-900">Smart<span className="gradient-text">Exam</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(l=>(
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive(l.to)?'bg-brand-50 text-brand-700':'text-slate-600 hover:bg-slate-100'}`}>
                {l.icon}{l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell/>
            <span className={`hidden sm:inline-flex ${profile?.role==='teacher'?'badge-purple':profile?.role==='admin'?'badge-red':'badge-blue'}`}>
              {profile?.role==='teacher'?'👨‍🏫 Teacher':profile?.role==='admin'?'🛡️ Admin':'🎓 Student'}
            </span>
            <div className="relative">
              <button onClick={()=>setUmenu(v=>!v)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {profile?.name?.[0]?.toUpperCase()||'U'}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-slate-700 max-w-[100px] truncate">{profile?.name}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${umenu?'rotate-180':''}`}/>
              </button>
              {umenu&&(
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-fade-in z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{profile?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                  </div>
                  <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4"/> Sign Out
                  </button>
                </div>
              )}
            </div>
            <button className="md:hidden p-2 rounded-xl hover:bg-slate-100" onClick={()=>setMob(v=>!v)}>
              {mob?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>
      </div>
      {mob&&(
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
          {links.map(l=>(
            <Link key={l.to} to={l.to} onClick={()=>setMob(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${isActive(l.to)?'bg-brand-50 text-brand-700':'text-slate-700 hover:bg-slate-100'}`}>
              {l.icon}{l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
