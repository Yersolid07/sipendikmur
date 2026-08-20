'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ActivityLog } from '@/types/database'
import { Activity, Clock, User, Filter, AlertCircle, PlayCircle, UserPlus, CheckCircle2 } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('id')

interface Props {
  eventId?: string // If null, means superadmin viewing all events
}

export default function AdminLogTab({ eventId }: Props) {
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadLogs()

    // Realtime subscription
    let query = supabase.channel('activity_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: eventId ? `event_id=eq.${eventId}` : undefined
      }, (payload) => {
        // Fetch the user data for the new log
        fetchUserForLog(payload.new as ActivityLog)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(query)
    }
  }, [eventId])

  async function fetchUserForLog(log: ActivityLog) {
    const { data: userData } = await supabase.from('profiles').select('nama, role').eq('id', log.user_id).single()
    const logWithUser = { ...log, profiles: userData }
    setLogs(prev => [logWithUser, ...prev])
  }

  async function loadLogs() {
    setIsLoading(true)
    let query = supabase
      .from('activity_logs')
      .select('*, profiles(nama, role)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data } = await query
    if (data) setLogs(data)
    setIsLoading(false)
  }

  const getIconForAction = (action: string, entityType: string) => {
    if (entityType === 'peserta') return <UserPlus className="w-5 h-5 text-blue-500" />
    if (entityType === 'penilaian') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    if (entityType === 'sesi') return <PlayCircle className="w-5 h-5 text-purple-500" />
    if (entityType === 'var_requests') return <AlertCircle className="w-5 h-5 text-amber-500" />
    return <Activity className="w-5 h-5 text-slate-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[var(--color-text)] flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" /> 
            Log Aktivitas Sistem
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Merekam seluruh aktivitas pengguna {eventId ? 'pada event ini' : 'pada semua event'} secara real-time.
          </p>
        </div>
        <button onClick={loadLogs} className="btn-secondary text-sm">
          <Filter className="w-4 h-4 mr-2 inline" /> Muat Ulang
        </button>
      </div>

      <div className="panel p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-[var(--color-text-muted)] animate-pulse">
            Memuat riwayat aktivitas...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-[var(--color-text-muted)]">
            Belum ada aktivitas terekam.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex gap-4">
                <div className="mt-1">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {getIconForAction(log.action, log.entity_type)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[var(--color-text)] text-sm sm:text-base font-medium leading-relaxed">
                    {log.action}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {dayjs(log.created_at).format('DD MMM YYYY, HH:mm:ss')} ({dayjs(log.created_at).fromNow()})
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {log.profiles?.nama || 'Sistem'} <span className="opacity-60">({log.profiles?.role || 'System'})</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
