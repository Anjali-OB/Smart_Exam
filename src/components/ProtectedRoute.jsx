import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './UI'
import Navbar from './Navbar'

export function ProtectedRoute({ role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  if (role && profile?.role !== role) {
    const dest = profile?.role==='teacher'?'/teacher':profile?.role==='admin'?'/admin':'/student'
    return <Navigate to={dest} replace />
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><Outlet /></main>
    </div>
  )
}

export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user && profile) {
    return <Navigate to={profile.role==='teacher'?'/teacher':profile.role==='admin'?'/admin':'/student'} replace />
  }
  return <Outlet />
}
