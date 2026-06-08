import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast, ToastContainer, Modal, ConfirmDialog, Spinner } from '../../components/UI'
import { sendNotification } from '../../components/Notifications'
import * as XLSX from 'xlsx'
import { Plus, Users, Copy, Trash2, UserMinus, Upload, Hash } from 'lucide-react'

export default function BatchManagement() {
  const { profile } = useAuth()
  const toast       = useToast()
  const [batches,  setBatches]  = useState([])
  const [selected, setSelected] = useState(null)
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [form,     setForm]     = useState({ name:'', description:'' })
  const [showCreate,  setShowCreate]  = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(null)

  useEffect(() => { loadBatches() }, [])
  useEffect(() => { if (selected) loadMembers(selected.id) }, [selected])

  async function loadBatches() {
    setLoading(true)
    const { data } = await supabase.from('batches').select('*, batch_members(count)')
      .eq('teacher_id', profile.id).order('created_at', { ascending: false })
    setBatches(data || [])
    setLoading(false)
  }

  async function loadMembers(batchId) {
    const { data } = await supabase.from('batch_members')
      .select('*, profiles(id, name, email, roll_no)').eq('batch_id', batchId)
    setMembers(data || [])
  }

  async function createBatch() {
    if (!form.name.trim()) { toast.error('Batch name required.'); return }
    setCreating(true)
    const joinCode = Math.random().toString(36).substring(2,8).toUpperCase()
    const { error } = await supabase.from('batches').insert({
      name: form.name, description: form.description, teacher_id: profile.id, join_code: joinCode
    })
    if (error) { toast.error(error.message); setCreating(false); return }
    toast.success('Batch created!')
    setForm({ name:'', description:'' }); setShowCreate(false); loadBatches(); setCreating(false)
  }

  async function removeMember(batchId, studentId) {
    await supabase.from('batch_members').delete().eq('batch_id', batchId).eq('student_id', studentId)
    toast.success('Student removed from batch.')
    loadMembers(batchId)
  }

  async function deleteBatch(id) {
    await supabase.from('batches').delete().eq('id', id)
    toast.success('Batch deleted.'); setSelected(null); loadBatches()
  }

  async function importStudents(e) {
    const file = e.target.files[0]; if (!file || !selected) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type:'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        let added  = 0
        for (const row of rows) {
          const email = row.email || row.Email || row.EMAIL
          if (!email) continue
          const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single()
          if (!profile) continue
          const { error } = await supabase.from('batch_members').insert({ batch_id: selected.id, student_id: profile.id }).single()
          if (!error) {
            await sendNotification(profile.id, 'batch_joined', `Added to "${selected.name}"`, `Your teacher has added you to the batch "${selected.name}".`)
            added++
          }
        }
        toast.success(`${added} student(s) added to ${selected.name}.`)
        loadMembers(selected.id)
      } catch (err) { toast.error('Import failed. Check your Excel file format.') }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code)
    toast.success('Join code copied!')
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => deleteBatch(confirmDel)} title="Delete Batch"
        message="Delete this batch? Students will not be deleted, only removed from the batch."
        confirmLabel="Delete" danger />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Batch" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div><label className="label">Batch Name *</label>
            <input className="input" placeholder="e.g. TYCS-A, FY-Science-B" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus /></div>
          <div><label className="label">Description</label>
            <input className="input" placeholder="Optional description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
          <button onClick={createBatch} disabled={creating} className="btn-primary w-full justify-center">
            {creating ? <Spinner size="sm"/> : <Plus className="w-4 h-4"/>} Create Batch
          </button>
        </div>
      </Modal>

      <div className="flex items-center justify-between mb-8">
        <div><h1 className="page-title">Batch Management</h1><p className="text-slate-500 text-sm mt-1">Organise students into classes and batches</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4"/> New Batch</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Batch list */}
        <div className="lg:col-span-1">
          <h2 className="section-title">Your Batches ({batches.length})</h2>
          {loading ? <div className="flex justify-center py-10"><Spinner/></div> :
           batches.length === 0 ? (
            <div className="card text-center py-10">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-200"/><p className="text-slate-500 text-sm">No batches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map(b => (
                <div key={b.id} onClick={() => setSelected(b)}
                  className={`card cursor-pointer transition-all ${selected?.id===b.id?'border-brand-400 bg-brand-50/30':'hover:shadow-md'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.batch_members?.[0]?.count ?? 0} students</p>
                      <button onClick={e=>{e.stopPropagation();copyCode(b.join_code)}}
                        className="mt-1.5 text-xs font-mono bg-slate-100 hover:bg-brand-50 px-2 py-1 rounded-lg flex items-center gap-1 text-slate-600">
                        <Hash className="w-3 h-3"/>{b.join_code}
                      </button>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setConfirmDel(b.id)}} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 rounded-lg">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card text-center py-20">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-200"/>
              <p className="text-slate-500">Select a batch to view and manage its students</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">{selected.name} — {members.length} students</h2>
                <label className="btn-secondary text-sm cursor-pointer">
                  <Upload className="w-4 h-4"/> Import Excel
                  <input type="file" accept=".xlsx,.csv" className="hidden" onChange={importStudents}/>
                </label>
              </div>
              <div className="text-xs text-slate-400 mb-3">Excel format: one column named "email" with student email addresses</div>
              {members.length === 0 ? (
                <div className="card text-center py-10">
                  <p className="text-slate-500 text-sm">No students yet. Share code <strong className="font-mono">{selected.join_code}</strong> with students to join, or import via Excel.</p>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['#','Name','Email','Roll No.','Joined','Action'].map(h=>(
                          <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {members.map((m,i) => (
                        <tr key={m.student_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-400">{i+1}</td>
                          <td className="px-4 py-3 font-semibold">{m.profiles?.name||'—'}</td>
                          <td className="px-4 py-3 text-slate-500">{m.profiles?.email||'—'}</td>
                          <td className="px-4 py-3 text-slate-500">{m.profiles?.roll_no||'—'}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(m.joined_at).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <button onClick={()=>removeMember(selected.id,m.student_id)} className="btn-ghost text-xs text-red-500 py-1 px-2">
                              <UserMinus className="w-3 h-3"/> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
