import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { GraduationCap, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { Spinner } from '../components/UI'

/* ── helpers ── */
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

let loginAttempts = 0
let lockUntil    = 0

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [form,     setForm]     = useState({ email:'', password:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error,    setError]    = useState('')
  const [fieldErr, setFieldErr] = useState({})

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setFieldErr(f => ({ ...f, [k]: '' }))
    setError('')
  }

  /* ── Validate ── */
  function validate() {
    const errs = {}
    if (!form.email.trim())         errs.email = 'Email is required.'
    else if (!isValidEmail(form.email)) errs.email = 'Enter a valid email address (e.g. name@college.edu).'
    if (!form.password)             errs.password = 'Password is required.'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Email / Password login ── */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    // Rate limiting
    if (Date.now() < lockUntil) {
      const secs = Math.ceil((lockUntil - Date.now()) / 1000)
      setError(`Too many failed attempts. Try again in ${secs}s.`)
      return
    }

    setLoading(true); setError('')
    try {
      await signIn({ email: form.email.trim().toLowerCase(), password: form.password })
      loginAttempts = 0
    } catch (err) {
      loginAttempts++
      if (loginAttempts >= 5) {
        lockUntil = Date.now() + 60_000
        loginAttempts = 0
        setError('Too many failed attempts. Account locked for 60 seconds.')
      } else {
        const msg = err.message || ''
        if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('credentials')) {
          setError('Incorrect email or password. Please try again.')
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          setError('Please verify your email before signing in. Check your inbox.')
        } else {
          setError('Sign in failed. Please try again.')
        }
      }
    }
    setLoading(false)
  }

  /* ── Google login ── */
  async function handleGoogle() {
    setGLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) throw error
    } catch (err) {
      setError('Google sign-in failed. Make sure it is enabled in Supabase.')
      setGLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 p-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <GraduationCap className="w-6 h-6 text-white"/>
          </div>
          <span className="text-xl font-black">SmartExam</span>
        </Link>
        <div>
          <h2 className="text-4xl font-black leading-tight mb-4">Welcome back 👋</h2>
          <p className="text-brand-200 text-lg leading-relaxed">Your tests, results and AI insights are waiting.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['🧠 AI Questions','📊 Smart Analytics','📥 Excel Export','🛡️ Anti-Cheat'].map(f=>(
            <div key={f} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-sm font-medium">{f}</div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white"/>
            </div>
            <span className="font-bold text-lg text-slate-900">SmartExam</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-1">Sign in</h1>
          <p className="text-slate-500 mb-6">Enter your credentials to continue</p>

          {/* Google Sign In */}
          <button onClick={handleGoogle} disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-all mb-4 disabled:opacity-50">
            {gLoading ? <Spinner size="sm"/> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {gLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200"/>
            <span className="text-xs text-slate-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-slate-200"/>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className={`input ${fieldErr.email?'border-red-400':''}`}
                placeholder="you@college.edu"
                value={form.email} onChange={set('email')} autoFocus />
              {fieldErr.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPass?'text':'password'} className={`input pr-12 ${fieldErr.password?'border-red-400':''}`}
                  placeholder="••••••••"
                  value={form.password} onChange={set('password')} />
                <button type="button" onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              {fieldErr.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.password}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading?<Spinner size="sm"/>:<LogIn className="w-4 h-4"/>}
              {loading?'Signing in…':'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}