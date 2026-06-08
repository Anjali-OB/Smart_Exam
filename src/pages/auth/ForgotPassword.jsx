import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { GraduationCap, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { Spinner } from '../../components/UI'

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [fieldErr,setFieldErr]= useState('')

  function validate() {
    if (!email.trim())        { setFieldErr('Email is required.'); return false }
    if (!isValidEmail(email)) { setFieldErr('Enter a valid email address (e.g. name@college.edu).'); return false }
    setFieldErr('')
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )
    if (err) setError('Could not send reset email. Please check the address and try again.')
    else setSent(true)
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

        {sent ? (
          <div className="card text-center py-10">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600"/>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-1">We sent a password reset link to:</p>
            <p className="font-semibold text-slate-900 mb-6">{email}</p>
            <p className="text-xs text-slate-400 mb-6">
              Didn't receive it? Check your spam folder.<br/>
              The link expires in 1 hour.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/login" className="btn-primary">Back to Sign In</Link>
              <button onClick={() => setSent(false)} className="btn-ghost">Try again</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <Link to="/login" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4"/> Back to login
            </Link>
            <h1 className="text-2xl font-black text-slate-900 mb-1">Reset password</h1>
            <p className="text-slate-500 text-sm mb-6">
              Enter your registered email and we'll send you a secure reset link.
            </p>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input type="email" className={`input ${fieldErr?'border-red-400':''}`}
                  placeholder="you@college.edu"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErr(''); setError('') }}
                  autoFocus />
                {fieldErr && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/>{fieldErr}
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
                {loading?<Spinner size="sm"/>:<Mail className="w-4 h-4"/>}
                {loading?'Sending…':'Send Reset Link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}