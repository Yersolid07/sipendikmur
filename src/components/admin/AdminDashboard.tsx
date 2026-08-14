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
      <div className="flex items-start justify-between panel">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--color-text)]">
            Panel Inspektur
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            {profile.role === 'superadmin' ? 'Administrator' : 'Inspektur Pertandingan'} — {profile.nama}
          </p>
        </div>
        <div className="text-right">
          {activeEvent ? (
            <span className="badge badge-success">
              ● {activeEvent.nama}
            </span>
          ) : (
            <span className="badge badge-error">Tidak ada event aktif</span>
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
      <div className="tab-container">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${
              activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'monitor' && (
          <AdminMonitorTab activeEvent={activeEvent} juriList={juriList} profile={profile} />
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
    amber: 'rgba(201,133,44,0.1)',
    blue: 'rgba(37,99,235,0.1)',
    purple: 'rgba(147,51,234,0.1)',
    green: 'rgba(22,163,74,0.1)',
  }
  const textMap = {
    amber: 'var(--color-amber-dark)',
    blue: '#1e40af',
    purple: '#6b21a8',
    green: '#166534',
  }

  return (
    <div
      className="panel p-4 text-center border-none"
      style={{ background: colorMap[color] }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className="font-display font-bold mb-1"
        style={{ fontSize: isText ? '1rem' : '1.5rem', color: textMap[color] }}
      >
        {value}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  )
}
