import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { GraduationCap, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { Spinner } from '../components/UI'

/* ── Validators ── */
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}
function checkPassword(p) {
  return {
    length:    p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number:    /[0-9]/.test(p),
  }
}
function passwordStrength(p) {
  const c = checkPassword(p)
  const n = Object.values(c).filter(Boolean).length
  if (n <= 1) return { label:'Weak',   color:'bg-red-400',   width:'25%' }
  if (n === 2) return { label:'Fair',   color:'bg-amber-400', width:'50%' }
  if (n === 3) return { label:'Good',   color:'bg-blue-400',  width:'75%' }
  return           { label:'Strong', color:'bg-emerald-500',width:'100%' }
}

export default function Register() {
  const { signUp }   = useAuth()
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const defaultRole  = params.get('role') || 'student'

  const [form,     setForm]     = useState({ name:'', email:'', password:'', confirm:'', role:defaultRole, rollNo:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error,    setError]    = useState('')
  const [fieldErr, setFieldErr] = useState({})

  const set = k => e => {
    setForm(f => ({...f, [k]: e.target.value}))
    setFieldErr(f => ({...f, [k]: ''}))
    setError('')
  }

  const pwChecks  = checkPassword(form.password)
  const pwStrength = passwordStrength(form.password)

  /* ── Validate ── */
  function validate() {
    const errs = {}

    if (!form.name.trim())
      errs.name = 'Full name is required.'
    else if (form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters.'
    else if (!/^[a-zA-Z\s.'-]+$/.test(form.name.trim()))
      errs.name = 'Name should only contain letters and spaces.'

    if (!form.email.trim())
      errs.email = 'Email is required.'
    else if (!isValidEmail(form.email))
      errs.email = 'Enter a valid email address (e.g. name@college.edu).'

    if (!form.password)
      errs.password = 'Password is required.'
    else if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.'
    else if (!pwChecks.uppercase)
      errs.password = 'Password must contain at least one uppercase letter.'
    else if (!pwChecks.number)
      errs.password = 'Password must contain at least one number.'

    if (!form.confirm)
      errs.confirm = 'Please confirm your password.'
    else if (form.password !== form.confirm)
      errs.confirm = 'Passwords do not match.'

    if (form.role === 'student' && form.rollNo && form.rollNo.trim().length < 2)
      errs.rollNo = 'Roll number must be at least 2 characters.'

    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Email/Password register ── */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setError('')
    try {
      await signUp({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        rollNo: form.rollNo.trim() || null,
      })
      navigate(form.role === 'teacher' ? '/teacher' : '/student', { replace: true })
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('This email is already registered. Please sign in instead.')
      } else if (msg.toLowerCase().includes('invalid email')) {
        setFieldErr(f => ({...f, email: 'This email address is not valid.'}))
      } else {
        setError('Registration failed. Please try again.')
      }
    }
    setLoading(false)
  }

  /* ── Google register ── */
  async function handleGoogle() {
    setGLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { role: form.role }
        }
      })
      if (error) throw error
    } catch (err) {
      setError('Google sign-in failed. Make sure it is enabled in Supabase.')
      setGLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-purple-600 via-brand-700 to-brand-800 p-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white"/>
          </div>
          <span className="text-xl font-black">SmartExam</span>
        </Link>
        <div>
          <h2 className="text-4xl font-black leading-tight mb-4">Join SmartExam 🎓</h2>
          <p className="text-purple-200 text-lg">Free forever. No credit card. No limits.</p>
        </div>
        <div className="space-y-3">
          {['Create unlimited tests','AI-powered question generation','Real-time analytics & Excel export','Student performance tracking'].map(t=>(
            <div key={t} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-medium">
              <span className="text-green-300">✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white"/>
            </div>
            <span className="font-bold text-lg">SmartExam</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 mb-6">Free forever — no credit card needed</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              {val:'teacher', emoji:'👨‍🏫', label:'Teacher',  sub:'Create & manage tests'},
              {val:'student', emoji:'🎓',  label:'Student',  sub:'Take tests & view results'},
            ].map(r=>(
              <button key={r.val} type="button" onClick={()=>setForm(f=>({...f,role:r.val}))}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  form.role===r.val ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'
                }`}>
                <div className="text-2xl mb-1">{r.emoji}</div>
                <div className="font-bold text-sm text-slate-900">{r.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.sub}</div>
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-all mb-4 disabled:opacity-50">
            {gLoading ? <Spinner size="sm"/> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {gLoading ? 'Redirecting…' : `Continue with Google as ${form.role==='teacher'?'Teacher':'Student'}`}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200"/>
            <span className="text-xs text-slate-400 font-medium">or register with email</span>
            <div className="flex-1 h-px bg-slate-200"/>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full name */}
            <div>
              <label className="label">Full Name</label>
              <input type="text" className={`input ${fieldErr.name?'border-red-400':''}`}
                placeholder="Your full name"
                value={form.name} onChange={set('name')} autoFocus />
              {fieldErr.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <input type="email" className={`input ${fieldErr.email?'border-red-400':''}`}
                placeholder="you@college.edu"
                value={form.email} onChange={set('email')} />
              {fieldErr.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.email}</p>}
              {form.email && !fieldErr.email && isValidEmail(form.email) && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Valid email</p>
              )}
            </div>

            {/* Roll number (students only) */}
            {form.role === 'student' && (
              <div>
                <label className="label">Roll Number / Student ID <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className={`input ${fieldErr.rollNo?'border-red-400':''}`}
                  placeholder="e.g. 2024CS001"
                  value={form.rollNo} onChange={set('rollNo')} />
                {fieldErr.rollNo && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.rollNo}</p>}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass?'text':'password'} className={`input pr-12 ${fieldErr.password?'border-red-400':''}`}
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} />
                <button type="button" onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              {fieldErr.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.password}</p>}

              {/* Password strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Strength</span>
                    <span className={`font-semibold ${
                      pwStrength.label==='Weak'?'text-red-500':
                      pwStrength.label==='Fair'?'text-amber-500':
                      pwStrength.label==='Good'?'text-blue-500':'text-emerald-600'
                    }`}>{pwStrength.label}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pwStrength.color}`} style={{width:pwStrength.width}}/>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[
                      {k:'length',    l:'8+ characters'},
                      {k:'uppercase', l:'Uppercase letter'},
                      {k:'lowercase', l:'Lowercase letter'},
                      {k:'number',    l:'Number'},
                    ].map(c=>(
                      <div key={c.k} className={`flex items-center gap-1 text-xs ${pwChecks[c.k]?'text-emerald-600':'text-slate-400'}`}>
                        {pwChecks[c.k]
                          ? <CheckCircle className="w-3 h-3"/>
                          : <div className="w-3 h-3 rounded-full border border-slate-300"/>}
                        {c.l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className={`input ${fieldErr.confirm?'border-red-400':''}`}
                placeholder="Repeat your password"
                value={form.confirm} onChange={set('confirm')} />
              {fieldErr.confirm && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{fieldErr.confirm}</p>}
              {form.confirm && form.password === form.confirm && form.confirm.length > 0 && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Passwords match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading?<Spinner size="sm"/>:<UserPlus className="w-4 h-4"/>}
              {loading?'Creating account…':'Create Free Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-3 leading-relaxed">
            By creating an account you agree to our terms of service.<br/>
            Your data is stored securely via Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}