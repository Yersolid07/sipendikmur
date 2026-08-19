'use client'

import { useState } from 'react'
import { Profile, Event } from '@/types/database'
import AdminEventTab from '../admin/AdminEventTab' 
import KategoriTab from './KategoriTab'
import UsersTab from './UsersTab'
import SettingsTab from './SettingsTab'
import { Trophy, ClipboardList, Users, Settings } from 'lucide-react'

interface Props {
  profile: Profile
  events: Event[]
  usersList: Profile[]
}

export default function SuperadminDashboard({ profile, events, usersList }: Props) {
  const [activeTab, setActiveTab] = useState<'events' | 'kategori' | 'users' | 'settings'>('events')
  const activeEvent = events.find((e) => e.status === 'aktif')

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
        <div className="flex flex-col items-end">
          <span className="text-sm text-[var(--color-text-muted)]">Event Aktif:</span>
          {activeEvent ? (
            <span className="badge badge-success mt-1">{activeEvent.nama}</span>
          ) : (
            <span className="badge badge-error mt-1">Tidak ada event aktif</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        {([
          { id: 'events', label: 'Event & Lomba', icon: <Trophy className="w-5 h-5" /> },
          profile.role === 'superadmin' && { id: 'kategori', label: 'Kategori (Scoring)', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'users', label: 'Manajemen Akun', icon: <Users className="w-5 h-5" /> },
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
            <AdminEventTab events={events} />
          </div>
        )}

        {activeTab === 'kategori' && (
          <div className="panel">
            <KategoriTab activeEvent={activeEvent} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="panel">
            <UsersTab usersList={usersList} events={events} currentUser={profile} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="panel">
            <SettingsTab />
          </div>
        )}
      </div>
    </div>
  )
}
