/* ── Spinner ──────────────────────────────────────── */
export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={`${sz} border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin ${className}`} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-500 text-sm font-medium">Loading…</p>
      </div>
    </div>
  )
}

/* ── Toast ────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X, Info } from 'lucide-react'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error:   <XCircle    className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  info:    <Info        className="w-5 h-5 text-blue-500" />,
}
const bg = {
  success: 'border-emerald-100 bg-emerald-50',
  error:   'border-red-100 bg-red-50',
  warning: 'border-amber-100 bg-amber-50',
  info:    'border-blue-100 bg-blue-50',
}

export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg max-w-sm animate-slide-up ${bg[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium text-slate-700 flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, remove }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(t => <Toast key={t.id} {...t} onClose={() => remove(t.id)} />)}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState([])
  const add = (message, type = 'info') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }])
  const remove = id => setToasts(prev => prev.filter(t => t.id !== id))
  return {
    toasts, remove,
    success: msg => add(msg, 'success'),
    error:   msg => add(msg, 'error'),
    warning: msg => add(msg, 'warning'),
    info:    msg => add(msg, 'info'),
  }
}

/* ── Modal ────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-slide-up max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ── Confirm Dialog ───────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
