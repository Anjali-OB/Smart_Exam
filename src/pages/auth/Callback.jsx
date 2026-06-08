import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { FullPageSpinner } from '../../components/UI'

export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handle() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) { navigate('/login'); return }

      const user = session.user

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles').select('id, role').eq('id', user.id).single()

      if (!profile) {
        // New Google user — create profile
        // Check if role was passed in URL params
        const params  = new URLSearchParams(window.location.search)
        const role    = params.get('role') || 'student'
        const name    = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

        await supabase.from('profiles').insert({
          id:    user.id,
          name,
          email: user.email,
          role,
        })
        navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true })
      } else {
        navigate(profile.role === 'teacher' ? '/teacher' : profile.role === 'admin' ? '/admin' : '/student', { replace: true })
      }
    }
    handle()
  }, [])

  return <FullPageSpinner />
}