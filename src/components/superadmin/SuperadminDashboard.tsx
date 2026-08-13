'use client'

import { useState } from 'react'
import { Profile, Event } from '@/types/database'
import AdminEventTab from '../admin/AdminEventTab' 
import KategoriTab from './KategoriTab'
import UsersTab from './UsersTab'
import SettingsTab from './SettingsTab'

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
      <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Superadmin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">God mode. Kelola semua aspek sistem BUMOTIK.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-slate-400">Event Aktif:</span>
          {activeEvent ? (
            <span className="badge badge-success mt-1">{activeEvent.nama}</span>
          ) : (
            <span className="badge badge-error mt-1">Tidak ada event aktif</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
        {[
          { id: 'events', label: 'Event & Lomba', icon: '🏆' },
          { id: 'kategori', label: 'Kategori (Scoring)', icon: '📋' },
          { id: 'users', label: 'Manajemen Akun', icon: '👥' },
          { id: 'settings', label: 'Pengaturan Global', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Manajemen Event</h2>
            <AdminEventTab events={events} />
          </div>
        )}

        {activeTab === 'kategori' && (
          <div className="glass-card p-6">
            <KategoriTab activeEvent={activeEvent} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-card p-6">
            <UsersTab usersList={usersList} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-card p-6">
            <SettingsTab />
          </div>
        )}
      </div>
    </div>
  )
}
