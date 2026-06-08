import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { GraduationCap, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { Spinner } from '../../components/UI'

function checkPassword(p) {
  return {
    length:    p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number:    /[0-9]/.test(p),
  }
}
function passwordStrength(p) {
  const n = Object.values(checkPassword(p)).filter(Boolean).length
  if (n <= 1) return { label:'Weak',   color:'bg-red-400',    width:'25%'  }
  if (n === 2) return { label:'Fair',   color:'bg-amber-400',  width:'50%'  }
  if (n === 3) return { label:'Good',   color:'bg-blue-400',   width:'75%'  }
  return            { label:'Strong', color:'bg-emerald-500', width:'100%' }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [fieldErr, setFieldErr] = useState({})
  const [done,     setDone]     = useState(false)

  const pwChecks   = checkPassword(password)
  const pwStrength = passwordStrength(password)

  function validate() {
    const errs = {}
    if (!password)
      errs.password = 'Password is required.'
    else if (password.length < 8)
      errs.password = 'Password must be at least 8 characters.'
    else if (!pwChecks.uppercase)
      errs.password = 'Must contain at least one uppercase letter.'
    else if (!pwChecks.number)
      errs.password = 'Must contain at least one number.'
    if (!confirm)
      errs.confirm = 'Please confirm your password.'
    else if (password !== confirm)
      errs.confirm = 'Passwords do not match.'
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError('Failed to update password. The reset link may have expired. Please request a new one.')
    } else {
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white"/>
          </div>
          <span className="font-bold text-lg text-slate-900">SmartExam</span>
        </div>

        {done ? (
          <div className="card text-center py-10">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600"/>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Password updated!</h2>
            <p className="text-slate-500 text-sm">Redirecting to login in 3 seconds…</p>
          </div>
        ) : (
          <div className="card">
            <h1 className="text-2xl font-black text-slate-900 mb-1">Set new password</h1>
            <p className="text-slate-500 text-sm mb-6">Choose a strong new password for your account.</p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={show?'text':'password'}
                    className={`input pr-12 ${fieldErr.password?'border-red-400':''}`}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErr(f=>({...f,password:''})) }}/>
                  <button type="button" onClick={()=>setShow(v=>!v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {fieldErr.password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/>{fieldErr.password}
                  </p>
                )}
                {password.length > 0 && (
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

              <div>
                <label className="label">Confirm Password</label>
                <input type="password"
                  className={`input ${fieldErr.confirm?'border-red-400':''}`}
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setFieldErr(f=>({...f,confirm:''})) }}/>
                {fieldErr.confirm && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/>{fieldErr.confirm}
                  </p>
                )}
                {confirm && password===confirm && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3"/> Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading?<><Spinner size="sm"/> Updating…</>:'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}