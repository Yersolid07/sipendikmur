'use client'

import { useState, useEffect, useCallback } from 'react'
import { Profile, Event } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Pencil, ShieldAlert, ShieldCheck, UserCheck, UserX, UserPlus, X, Eye, EyeOff, Trash2 } from 'lucide-react'

export default function UsersTab({ usersList: initialUsers, events, currentUser, selectedEventId }: { usersList: Profile[], events: Event[], currentUser: Profile, selectedEventId?: string }) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'superadmin' | 'subadmin' | 'op_regis' | 'op_sesi' | 'ip' | 'juri'>('juri')
  const [eventId, setEventId] = useState<string>('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isJuriPenilai, setIsJuriPenilai] = useState(true)
  
  const supabase = createClient()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const loadUsers = useCallback(async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (currentUser.role === 'subadmin') {
      query = query.neq('role', 'superadmin').neq('role', 'subadmin').eq('event_id', currentUser.event_id)
    } else if (currentUser.role === 'superadmin' && selectedEventId) {
      query = query.or(`role.eq.superadmin,event_id.eq.${selectedEventId}`)
    }
    const { data } = await query
    if (data) setUsers(data as Profile[])
  }, [supabase, currentUser])

  useEffect(() => {
    loadUsers()

    // Auto-refresh fallback every 3 seconds
    const intervalId = setInterval(() => {
      loadUsers()
    }, 3000)

    const channel = supabase.channel('realtime_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadUsers()
      })
      .subscribe()

    return () => {
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [loadUsers, supabase])

  function resetForm() {
    setShowForm(false)
    setEditId(null)
    setNama('')
    setEmail('')
    setPassword('')
    setRole('juri')
    setEventId('')
    setIsJuriPenilai(true)
  }

  function handleEdit(user: Profile) {
    setEditId(user.id)
    setNama(user.nama)
    setEmail(user.email)
    setRole(user.role as any)
    setEventId(user.event_id || '')
    setIsJuriPenilai(user.is_juri_penilai ?? true)
    setPassword('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const targetEventId = currentUser.role === 'subadmin' ? currentUser.event_id : (eventId || null)
    
    // Validasi Juri Penilai Maksimal 3
    if (role === 'juri' && targetEventId) {
      const { data: activeJuries } = await supabase.from('profiles')
        .select('id, is_juri_penilai')
        .eq('event_id', targetEventId)
        .eq('role', 'juri')
        .eq('is_active', true)
        
      let activeCount = activeJuries?.filter(j => j.is_juri_penilai).length || 0
      
      if (editId) {
        const existingJuri = activeJuries?.find(j => j.id === editId)
        if (existingJuri?.is_juri_penilai && !isJuriPenilai) {
          activeCount -= 1
        } else if (!existingJuri?.is_juri_penilai && isJuriPenilai) {
          activeCount += 1
        }
      } else {
        if (isJuriPenilai) activeCount += 1
      }
      
      if (isJuriPenilai && activeCount > 3) {
        alert('Maksimal hanya 3 juri yang bisa aktif menilai untuk event ini. Harap nonaktifkan juri penilai lain terlebih dahulu.')
        return
      }
      
      if (isJuriPenilai && activeCount < 3) {
        alert(`Perhatian: Saat ini baru ada ${activeCount} juri yang aktif menilai untuk event ini. Pastikan Anda melengkapi total 3 juri penilai.`)
      }
    }

    if (!confirm('Apakah Anda yakin ingin menyimpan data pengguna ini?')) return
    setIsSaving(true)

    if (editId) {
      // Update existing profile (nama, role, event_id, is_juri_penilai)
      const { error } = await supabase.from('profiles').update({ 
        nama, 
        role,
        event_id: currentUser.role === 'subadmin' ? currentUser.event_id : (eventId || null),
        is_juri_penilai: role === 'juri' ? isJuriPenilai : true
      }).eq('id', editId)
      if (error) {
        showToast('error', 'Gagal memperbarui data akun: ' + error.message)
      } else {
        showToast('success', 'Akun berhasil diperbarui!')
        resetForm()
      }
    } else {
      // Call API to create user using service role
      const payload = {
        nama,
        email,
        password,
        role,
        event_id: currentUser.role === 'subadmin' ? currentUser.event_id : (eventId || null),
        is_juri_penilai: role === 'juri' ? isJuriPenilai : true
      }
      const res = await fetch('/api/admin/create-juri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', 'User berhasil dibuat!')
        resetForm()
      } else {
        showToast('error', data.error || 'Gagal membuat user')
      }
    }
    setIsSaving(false)
  }

  async function handleToggleStatus(user: Profile) {
    // Validasi saat mengaktifkan juri
    if (user.role === 'juri' && !user.is_active && user.is_juri_penilai && user.event_id) {
      const { data: activeJuries } = await supabase.from('profiles')
        .select('id')
        .eq('event_id', user.event_id)
        .eq('role', 'juri')
        .eq('is_active', true)
        .eq('is_juri_penilai', true)
      
      if ((activeJuries?.length || 0) >= 3) {
        alert('Maksimal hanya 3 juri yang bisa aktif menilai untuk event ini. Nonaktifkan juri penilai lain terlebih dahulu sebelum mengaktifkan juri ini.')
        return
      }
    }

    if (!confirm(`Apakah Anda yakin ingin mengubah status pengguna ini menjadi ${user.is_active ? 'Nonaktif' : 'Aktif'}?`)) return
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active } as any).eq('id', user.id)
    if (error) showToast('error', 'Gagal mengubah status: ' + error.message)
  }

  async function handleDeleteUser(user: Profile) {
    if (!confirm(`PERINGATAN KRUSIAL: Apakah Anda yakin ingin menghapus akun ${user.nama} secara permanen? Data yang terkait dengan akun ini juga mungkin akan terhapus atau kehilangan referensi (termasuk nilai yang sudah diinput jika ini adalah Juri). Aksi ini tidak dapat dibatalkan!`)) return
    
    // Call the delete API endpoint
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Akun berhasil dihapus secara permanen!')
        // Users list will update automatically via realtime subscription
      } else {
        showToast('error', data.error || 'Gagal menghapus akun')
      }
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan sistem saat menghapus akun')
    }
  }

  const roleStyles: Record<string, string> = {
    superadmin: 'bg-red-100 text-red-700 border-red-200',
    subadmin: 'bg-rose-100 text-rose-700 border-rose-200',
    ip: 'bg-orange-100 text-orange-700 border-orange-200',
    op_sesi: 'bg-green-100 text-green-700 border-green-200',
    op_regis: 'bg-blue-100 text-blue-700 border-blue-200',
    juri: 'bg-amber-100 text-amber-700 border-amber-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-display font-semibold text-[var(--color-text)] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--color-amber-dark)]" /> Manajemen Akun (RBAC)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Total {users.length} akun terdaftar · Real-time Sync Aktif
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Tambah Akun
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="panel border-t-4 border-t-[var(--color-amber)] animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
              {editId ? <Pencil className="w-5 h-5 text-blue-500" /> : <UserPlus className="w-5 h-5 text-green-500" />}
              {editId ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
            </h4>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="form-label text-sm">Nama Lengkap *</label>
              <input required value={nama} onChange={e => setNama(e.target.value)} className="form-input" placeholder="Masukkan nama" />
            </div>
            <div>
              <label className="form-label text-sm">Email *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={!!editId} className={`form-input ${editId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} placeholder="nama@email.com" />
              {editId && <p className="text-[10px] text-orange-600 mt-1">*Email tidak dapat diubah setelah akun dibuat.</p>}
            </div>
            <div>
              <label className="form-label text-sm">Role (Hak Akses) *</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} className="form-input cursor-pointer bg-white">
                {currentUser.role === 'superadmin' && (
                  <>
                    <option value="superadmin">Super Admin (Akses Penuh)</option>
                    <option value="subadmin">Sub Admin (Khusus 1 Event)</option>
                  </>
                )}
                <option value="ip">Inspektur Pertandingan (Monitor & Kunci Nilai)</option>
                <option value="op_sesi">Operator Sesi (Kendali Stage)</option>
                <option value="op_regis">Operator Registrasi (Check-in)</option>
                <option value="juri">Juri (Input Nilai)</option>
              </select>
            </div>
            {role !== 'superadmin' && currentUser.role === 'superadmin' && (
              <div>
                <label className="form-label text-sm">Pilih Event (Wajib) *</label>
                <select value={eventId} onChange={e => setEventId(e.target.value)} required className="form-input cursor-pointer bg-white">
                  <option value="" disabled>-- Pilih Event --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nama}</option>
                  ))}
                </select>
              </div>
            )}
            {role === 'juri' && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-8">
                    <input 
                      type="checkbox" 
                      checked={isJuriPenilai} 
                      onChange={e => setIsJuriPenilai(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Aktif Menilai</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Jika tidak dicentang, juri ini tidak akan muncul di layar monitor dan rekap nilai.
                  </p>
                </div>
            )}
            <div>
              <label className="form-label text-sm">Password {!editId && '*'}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required={!editId} minLength={8} value={password} onChange={e => setPassword(e.target.value)} disabled={!!editId} className={`form-input pr-10 ${editId ? 'bg-gray-100 text-gray-500 cursor-not-allowed placeholder:text-gray-400' : ''}`} placeholder={editId ? 'Gunakan fitur reset password jika lupa' : 'Minimal 8 karakter'} />
                {!editId && (
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            
            <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-dark)]">
              <button type="button" onClick={resetForm} className="btn-secondary">Batal</button>
              <button type="submit" disabled={isSaving} className="btn-primary min-w-[120px]">
                {isSaving ? <span className="spinner" /> : (editId ? 'Simpan Perubahan' : 'Buat Akun')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="panel p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="table-container w-full">
            <thead className="table-header bg-[var(--color-cream-2)]">
              <tr>
                <th className="font-semibold text-gray-600">Nama Lengkap</th>
                <th className="font-semibold text-gray-600">Email</th>
                <th className="font-semibold text-gray-600">Role</th>
                <th className="font-semibold text-gray-600">Status</th>
                <th className="text-right font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-dark)]">
              {users.map((u) => (
                <tr key={u.id} className="table-row hover:bg-[var(--color-cream-1)] transition-colors">
                  <td className="font-medium text-[var(--color-text)]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs uppercase">
                        {u.nama.substring(0, 2)}
                      </div>
                      {u.nama}
                    </div>
                  </td>
                  <td className="text-slate-600">{u.email}</td>
                  <td>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleStyles[u.role] || roleStyles.juri}`}>
                      {u.role.toUpperCase().replace('_', ' ')}
                    </span>
                    {u.role === 'juri' && !u.is_juri_penilai && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500 border border-gray-200">
                        Tidak Menilai
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {u.is_active ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => {
                        handleEdit(u)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Akun">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {currentUser.id !== u.id && (
                        <>
                          <button onClick={() => handleToggleStatus(u)} className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border ${
                            u.is_active 
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50' 
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`} title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{u.is_active ? 'Suspend' : 'Aktifkan'}</span>
                          </button>
                          
                          <button onClick={() => handleDeleteUser(u)} className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-colors" title="Hapus Akun Permanen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && (
        <div className={`toast toast-${toast.type} flex items-center gap-2`}>
          {toast.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
