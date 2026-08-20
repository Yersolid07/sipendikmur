'use client'

import { useState } from 'react'
import { Profile, Event } from '@/types/database'
import AdminEventTab from '../admin/AdminEventTab' 
import KategoriTab from './KategoriTab'
import UsersTab from './UsersTab'
import SettingsTab from './SettingsTab'
import KontrolLombaTab from './KontrolLombaTab'
import RekapLiveBoardTab from './RekapLiveBoardTab'
import AdminLogTab from '../admin/AdminLogTab'
import { Trophy, ClipboardList, Users, Settings, MonitorPlay, BarChart2, Activity } from 'lucide-react'

interface Props {
  profile: Profile
  events: Event[]
  usersList: Profile[]
}

export default function SuperadminDashboard({ profile, events, usersList }: Props) {
  const [activeTab, setActiveTab] = useState<'kontrol' | 'rekap-live' | 'events' | 'kategori' | 'users' | 'settings' | 'logs'>('kontrol')
  
  // By default, select the subadmin's assigned event OR the first active event (or just the first event if none active)
  const defaultEventId = profile.role === 'subadmin' 
    ? events[0]?.id 
    : (events.find((e) => e.status === 'aktif')?.id || events[0]?.id)
    
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(defaultEventId)
  const activeEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">
            {profile.role === 'subadmin' ? 'Panel Sub-Admin' : 'Superadmin Panel'}
          </h1>
          <p className="panel-subtext">
            {profile.role === 'subadmin'
              ? 'Admin Event. Kelola penjurian event yang ditugaskan kepada Anda.'
              : 'God mode. Kelola semua aspek sistem penjurian.'}
          </p>
          {profile.role === 'subadmin' && (
            <span className="mt-2 inline-block bg-rose-100 text-rose-700 border border-rose-200 text-xs px-3 py-1 rounded-full font-semibold">
              🔒 Akses terbatas: 1 Event
            </span>
          )}
        </div>
        <div className="flex flex-col items-start md:items-end w-full md:w-auto">
          <span className="text-sm text-[var(--color-text-muted)] mb-1">
            {profile.role === 'superadmin' ? 'Konteks Event:' : 'Event Anda:'}
          </span>
          {profile.role === 'superadmin' ? (
            <select 
              value={selectedEventId || ''} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="form-input py-1.5 text-sm w-full md:w-64 bg-white font-medium border-[var(--color-amber-dark)]"
            >
              {events.length === 0 && <option value="" disabled>Belum ada event</option>}
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.nama} {ev.status === 'aktif' ? '(Aktif)' : ev.status === 'selesai' ? '(Selesai)' : '(Draft)'}
                </option>
              ))}
            </select>
          ) : (
            activeEvent ? (
              <span className="badge badge-success mt-1">{activeEvent.nama}</span>
            ) : (
              <span className="badge badge-error mt-1">Tidak ada event aktif</span>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container flex overflow-x-auto whitespace-nowrap scrollbar-hide py-2">
        {([
          { id: 'kontrol', label: 'Kontrol Lomba', icon: <MonitorPlay className="w-5 h-5" /> },
          { id: 'rekap-live', label: 'Rekap & Live Board', icon: <BarChart2 className="w-5 h-5" /> },
          { id: 'events', label: 'Event & Lomba', icon: <Trophy className="w-5 h-5" /> },
          { id: 'kategori', label: 'Kategori (Scoring)', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'users', label: 'Manajemen Akun', icon: <Users className="w-5 h-5" /> },
          { id: 'logs', label: 'Activity Logs', icon: <Activity className="w-5 h-5" /> },
          profile.role === 'superadmin' && { id: 'settings', label: 'Pengaturan Global', icon: <Settings className="w-5 h-5" /> },
        ].filter(Boolean) as { id: string; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`tab-btn ${
              activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'events' && (
          <div className="panel">
            <h2 className="panel-header">Manajemen Event</h2>
            <AdminEventTab events={events} role={profile.role} />
          </div>
        )}

        {activeTab === 'kategori' && (
          <div className="panel">
            <KategoriTab activeEvent={activeEvent} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="panel">
            <UsersTab usersList={usersList} events={events} currentUser={profile} selectedEventId={selectedEventId} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="panel">
            <SettingsTab />
          </div>
        )}
        
        {activeTab === 'kontrol' && activeEvent && (
          <KontrolLombaTab activeEvent={activeEvent} />
        )}
        
        {activeTab === 'rekap-live' && activeEvent && (
          <RekapLiveBoardTab activeEvent={activeEvent} />
        )}

        {activeTab === 'logs' && (
          <div className="panel">
            <AdminLogTab eventId={profile.role === 'subadmin' ? activeEvent?.id : selectedEventId} />
          </div>
        )}
      </div>
    </div>
  )
}
