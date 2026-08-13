'use client'

import { useState } from 'react'
import { Profile, Event } from '@/types/database'
import AdminMonitorTab from './AdminMonitorTab'
import AdminRekapTab from './AdminRekapTab'

interface Props {
  profile: Profile
  events: Event[]
  juriList: Profile[]
}

const TABS = [
  { id: 'monitor', label: '📊 Monitor Live', desc: 'Pantau nilai real-time' },
  { id: 'rekap', label: '🏆 Rekap Final', desc: 'Lihat hasil akhir sementara' },
]

export default function AdminDashboard({ profile, events, juriList }: Props) {
  const [activeTab, setActiveTab] = useState('monitor')
  const activeEvent = events.find((e) => e.status === 'aktif') ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gold-gradient">
            Panel Inspektur
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {profile.role === 'superadmin' ? 'Administrator' : 'Inspektur Pertandingan'} — {profile.nama}
          </p>
        </div>
        <div className="text-right">
          {activeEvent ? (
            <span className="badge badge-success">
              ● {activeEvent.nama}
            </span>
          ) : (
            <span className="badge badge-warning">Tidak ada event aktif</span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Event Aktif"
          value={activeEvent ? 1 : 0}
          icon="📅"
          color="amber"
        />
        <StatCard
          label="Total Juri"
          value={juriList.length}
          icon="⚖️"
          color="blue"
        />
        <StatCard
          label="Total Event"
          value={events.length}
          icon="📋"
          color="purple"
        />
        <StatCard
          label="Role"
          value={profile.role === 'superadmin' ? 'Admin' : 'IP'}
          icon="🛡️"
          color="green"
          isText
        />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="tab-list min-w-max md:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'monitor' && (
          <AdminMonitorTab activeEvent={activeEvent} juriList={juriList} />
        )}
        {activeTab === 'rekap' && (
          <AdminRekapTab activeEvent={activeEvent} />
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
  isText = false,
}: {
  label: string
  value: number | string
  icon: string
  color: 'amber' | 'blue' | 'purple' | 'green'
  isText?: boolean
}) {
  const colorMap = {
    amber: 'rgba(201,168,76,0.15)',
    blue: 'rgba(59,130,246,0.15)',
    purple: 'rgba(168,85,247,0.15)',
    green: 'rgba(34,197,94,0.15)',
  }
  const textMap = {
    amber: '#e2c97e',
    blue: '#93c5fd',
    purple: '#d8b4fe',
    green: '#86efac',
  }

  return (
    <div
      className="glass-card p-4 text-center"
      style={{ background: colorMap[color] }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className="font-display font-bold mb-1"
        style={{ fontSize: isText ? '1rem' : '1.5rem', color: textMap[color] }}
      >
        {value}
      </div>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}
