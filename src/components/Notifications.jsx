import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
  const { profile }     = useAuth()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    if (!profile) return
    loadNotifs()
    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${profile.id}` },
        payload => setNotifs(prev => [payload.new, ...prev])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadNotifs() {
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unread = notifs.filter(n => !n.is_read).length

  const iconFor = type => ({
    test_assigned:  '📝', results_ready: '🏆', reminder: '⏰', batch_joined: '👥', info: 'ℹ️'
  })[type] || '🔔'

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in z-50 max-h-[420px] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-slate-900">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="btn-ghost text-xs py-1 px-2">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />No notifications yet
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-brand-50/50' : ''}`}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to send a notification
export async function sendNotification(userId, type, title, message = '', link = '') {
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, message, link })
  } catch {}
}
