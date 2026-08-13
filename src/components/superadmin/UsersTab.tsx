'use client'

import { useState } from 'react'
import { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

export default function UsersTab({ usersList: initialUsers }: { usersList: Profile[] }) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'superadmin' | 'op_regis' | 'op_sesi' | 'ip' | 'juri'>('juri')
  const [password, setPassword] = useState('')
  
  const supabase = createClient()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('nama')
    if (data) setUsers(data as Profile[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    // Call API to create user using service role
    const res = await fetch('/api/admin/create-juri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, password, role }), // Modified to accept role
    })

    const data = await res.json()
    if (res.ok) {
      showToast('success', 'User berhasil dibuat!')
      setShowForm(false)
      setNama(''); setEmail(''); setPassword(''); setRole('juri');
      loadUsers()
    } else {
      showToast('error', data.error || 'Gagal membuat user')
    }
    setIsSaving(false)
  }

  async function handleToggleStatus(user: Profile) {
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active } as any).eq('id', user.id)
    if (!error) loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-display font-semibold text-white">Manajemen Akun</h3>
          <p className="text-xs text-slate-400">Total {users.length} akun terdaftar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Batal' : '+ Tambah Akun'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-5 animate-fade-in-up grid sm:grid-cols-2 gap-4">
          <div><label className="form-label">Nama</label><input required value={nama} onChange={e => setNama(e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="form-input" /></div>
          <div>
            <label className="form-label">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="form-input bg-slate-900 border-slate-700">
              <option value="superadmin">Super Admin</option>
              <option value="ip">Inspektur Pertandingan</option>
              <option value="op_sesi">Operator Sesi</option>
              <option value="op_regis">Operator Registrasi</option>
              <option value="juri">Juri</option>
            </select>
          </div>
          <div><label className="form-label">Password</label><input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="form-input" /></div>
          <div className="sm:col-span-2 text-right">
            <button disabled={isSaving} className="btn-primary">{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="p-4">Nama</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/30">
                <td className="p-4 font-medium text-white">{u.nama}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <span className={`badge ${
                    u.role === 'superadmin' ? 'badge-error' :
                    u.role === 'ip' ? 'badge-warning' :
                    u.role === 'op_sesi' ? 'badge-success' :
                    u.role === 'op_regis' ? 'badge-info' : 'badge-gold'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleToggleStatus(u)} className={`text-xs hover:underline ${u.is_active ? 'text-red-400' : 'text-green-400'}`}>
                    {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
