import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { FullPageSpinner } from './components/UI'

import Landing        from './pages/Landing'
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword  from './pages/auth/ResetPassword'
import Callback       from './pages/auth/Callback'

import TeacherDashboard from './pages/teacher/Dashboard'
import CreateTest       from './pages/teacher/CreateTest'
import TestDetails      from './pages/teacher/TestDetails'
import Analytics        from './pages/teacher/Analytics'
import BatchManagement  from './pages/teacher/BatchManagement'
import QuestionBank     from './pages/teacher/QuestionBank'

import StudentDashboard from './pages/student/Dashboard'
import TakeTest         from './pages/student/TakeTest'
import Results          from './pages/student/Results'
import History          from './pages/student/History'
import Leaderboard      from './pages/student/Leaderboard'

import AdminDashboard   from './pages/admin/Dashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"                element={<Landing />} />
          <Route path="/auth/callback"   element={<Callback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Auth only */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute role="teacher" />}>
            <Route path="/teacher"               element={<TeacherDashboard />} />
            <Route path="/teacher/create-test"   element={<CreateTest />} />
            <Route path="/teacher/test/:id"      element={<TestDetails />} />
            <Route path="/teacher/analytics"     element={<Analytics />} />
            <Route path="/teacher/batches"       element={<BatchManagement />} />
            <Route path="/teacher/question-bank" element={<QuestionBank />} />
          </Route>

          {/* Student */}
          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student"             element={<StudentDashboard />} />
            <Route path="/student/history"     element={<History />} />
            <Route path="/student/results/:id" element={<Results />} />
            <Route path="/student/leaderboard" element={<Leaderboard />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Take test — fullscreen, own layout */}
          <Route path="/student/test/:id" element={<TakeTestWrapper />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function TakeTestWrapper() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return <TakeTest />
}