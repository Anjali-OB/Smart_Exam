import { Link } from 'react-router-dom'
import {
  GraduationCap, Zap, BarChart2, Shield, Clock, Brain,
  FileSpreadsheet, Users, CheckCircle, ArrowRight, Sparkles
} from 'lucide-react'

const features = [
  { icon: <Brain className="w-6 h-6" />,          color: 'bg-purple-100 text-purple-600', title: 'AI Question Generator',   desc: 'Generate perfect MCQs instantly with Google Gemini AI — just enter a topic.' },
  { icon: <BarChart2 className="w-6 h-6" />,       color: 'bg-blue-100 text-blue-600',    title: 'Smart Analytics',         desc: 'Deep insights on class performance, weak topics, and student progress over time.' },
  { icon: <Shield className="w-6 h-6" />,          color: 'bg-red-100 text-red-600',      title: 'Anti-Cheat System',       desc: 'Tab-switch detection, randomised questions, and activity monitoring built in.' },
  { icon: <FileSpreadsheet className="w-6 h-6" />, color: 'bg-emerald-100 text-emerald-600', title: 'Excel Export',         desc: 'Download complete gradebooks with scores, grades, and remarks instantly.' },
  { icon: <Clock className="w-6 h-6" />,           color: 'bg-amber-100 text-amber-600',  title: 'Timed Tests',             desc: 'Set custom durations per test. Auto-submit keeps everything fair and on schedule.' },
  { icon: <Users className="w-6 h-6" />,           color: 'bg-cyan-100 text-cyan-600',    title: 'Multi-Class Support',     desc: 'Create batches, assign tests per class, and manage multiple student groups easily.' },
]

const stats = [
  { value: 'Free', label: 'Forever', sub: 'No credit card needed' },
  { value: 'AI',   label: 'Powered',  sub: 'By Groq AI' },
  { value: '∞',    label: 'Students', sub: 'No limits' },
  { value: '4+',   label: 'Question Types', sub: 'MCQ, T/F, Short, Long' },
]

const steps = [
  { step: '01', title: 'Teacher signs up',  desc: 'Create your account in seconds, no credit card required.' },
  { step: '02', title: 'Create a test',     desc: 'Add questions manually or let AI generate them for you.' },
  { step: '03', title: 'Share with class',  desc: 'Students join using a class code and take the test.' },
  { step: '04', title: 'Get insights',      desc: 'View scores, AI feedback, and download Excel report.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Smart<span className="gradient-text">Exam</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"    className="btn-ghost text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-purple-900 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI-Powered Exam Platform for Educators</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
            Create Smarter Tests.<br />
            <span className="bg-gradient-to-r from-brand-300 to-purple-300 bg-clip-text text-transparent">
              Teach More Effectively.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            A free, AI-powered exam platform for teachers and students.
            Generate questions with AI, track performance, and download reports — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=teacher"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold text-lg hover:bg-brand-50 shadow-2xl hover:shadow-brand-500/25 transition-all active:scale-[.98]">
              👨‍🏫 I'm a Teacher <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register?role=student"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 border-2 border-white/30 text-white font-bold text-lg hover:bg-white/20 backdrop-blur-sm transition-all active:scale-[.98]">
              🎓 I'm a Student
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-white">{s.value}</div>
                <div className="text-sm font-bold text-brand-200">{s.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Everything you need to run <span className="gradient-text">great exams</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Packed with features that save teachers time and help students learn better.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="card-hover p-6 group">
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Up and running in <span className="gradient-text">4 simple steps</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="text-center relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-brand-200 to-brand-100" />
                )}
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-200">
                  {s.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-brand-600 to-purple-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Start for free today.</h2>
          <p className="text-brand-200 text-lg mb-8">No setup fees. No credit card. Just sign up and start creating tests in minutes.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-brand-700 font-bold text-lg hover:bg-brand-50 shadow-2xl transition-all active:scale-[.98]">
            Create Free Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 bg-slate-900 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold">SmartExam</span>
        </div>
        <p>Free AI-powered exam platform for educators.</p>
      </footer>
    </div>
  )
}
