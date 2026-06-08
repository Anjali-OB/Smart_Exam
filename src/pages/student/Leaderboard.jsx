import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/UI'
import { Trophy, Medal } from 'lucide-react'

export default function Leaderboard() {
  const { profile } = useAuth()
  const [tests,   setTests]   = useState([])
  const [testId,  setTestId]  = useState('')
  const [board,   setBoard]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('tests').select('id,title').eq('is_published',true).order('created_at',{ascending:false})
      .then(({data})=>{ setTests(data||[]); if(data?.[0]) setTestId(data[0].id) })
  }, [])

  useEffect(() => { if (testId) loadBoard() }, [testId])

  async function loadBoard() {
    setLoading(true)
    const { data } = await supabase.from('submissions')
      .select('score,percentage,time_taken,profiles(name)')
      .eq('test_id', testId).eq('status','submitted')
      .order('percentage',{ascending:false}).order('time_taken',{ascending:true})
      .limit(20)
    setBoard(data||[])
    setLoading(false)
  }

  const medalColors = ['text-amber-400','text-slate-400','text-amber-600']
  const medalEmoji  = ['🥇','🥈','🥉']

  return (
    <>
      <div className="mb-8"><h1 className="page-title">🏆 Leaderboard</h1><p className="text-slate-500 mt-1">Top performers by test</p></div>
      <div className="mb-6">
        <label className="label">Select Test</label>
        <select className="input max-w-sm" value={testId} onChange={e=>setTestId(e.target.value)}>
          {tests.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> :
       board.length === 0 ? (
        <div className="card text-center py-16">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-200"/>
          <p className="text-slate-500">No submissions yet for this test.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {board.map((s,i)=>{
            const isMe = s.profiles?.name === profile?.name
            return (
              <div key={i} className={`card flex items-center gap-4 transition-all ${isMe?'border-brand-300 bg-brand-50/30':'hover:shadow-md'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${i<3?'bg-amber-50':isMe?'bg-brand-100':'bg-slate-100'}`}>
                  {i < 3 ? medalEmoji[i] : <span className="text-slate-500 text-sm">{i+1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${isMe?'text-brand-700':'text-slate-900'}`}>
                    {s.profiles?.name||'—'} {isMe&&<span className="text-xs">(You)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{s.time_taken?`${Math.floor(s.time_taken/60)}m ${s.time_taken%60}s`:'—'}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${i===0?'text-amber-500':isMe?'text-brand-600':'text-slate-900'}`}>{s.percentage??0}%</div>
                  <div className="text-xs text-slate-400">{s.score} pts</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
