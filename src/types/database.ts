export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nama: string
          email: string
          role: 'superadmin' | 'op_regis' | 'op_sesi' | 'ip' | 'juri'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nama: string
          email: string
          role: 'superadmin' | 'op_regis' | 'op_sesi' | 'ip' | 'juri'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama?: string
          email?: string
          role?: 'superadmin' | 'op_regis' | 'op_sesi' | 'ip' | 'juri'
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          logo_url: string | null
          nama_penyelenggara: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          logo_url?: string | null
          nama_penyelenggara?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          nama_penyelenggara?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          nama: string
          deskripsi: string | null
          tanggal: string | null
          lokasi: string | null
          status: 'aktif' | 'selesai' | 'draft'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nama: string
          deskripsi?: string | null
          tanggal?: string | null
          lokasi?: string | null
          status?: 'aktif' | 'selesai' | 'draft'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama?: string
          deskripsi?: string | null
          tanggal?: string | null
          lokasi?: string | null
          status?: 'aktif' | 'selesai' | 'draft'
          updated_at?: string
        }
        Relationships: []
      }
      kategori: {
        Row: {
          id: string
          event_id: string
          nama: string
          jenis_lomba: 'perorangan' | 'beregu'
          deskripsi: string | null
          urutan: number
          maks_interpretasi: number | null
          maks_artikulasi: number | null
          maks_penghayatan: number | null
          maks_penampilan: number | null
          maks_kekompakan: number | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          nama: string
          jenis_lomba?: 'perorangan' | 'beregu'
          deskripsi?: string | null
          urutan?: number
          maks_interpretasi?: number | null
          maks_artikulasi?: number | null
          maks_penghayatan?: number | null
          maks_penampilan?: number | null
          maks_kekompakan?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          nama?: string
          jenis_lomba?: 'perorangan' | 'beregu'
          deskripsi?: string | null
          urutan?: number
          maks_interpretasi?: number | null
          maks_artikulasi?: number | null
          maks_penghayatan?: number | null
          maks_penampilan?: number | null
          maks_kekompakan?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'kategori_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      peserta: {
        Row: {
          id: string
          event_id: string
          kategori_id: string
          nama: string
          asal_jemaat: string
          nomor_undian: number | null
          mazmur_bacaan: string | null
          is_checked_in: boolean
          status: 'menunggu' | 'bersiap' | 'tampil' | 'dinilai' | 'selesai'
          potongan_nilai: number
          keterangan_potongan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          kategori_id: string
          nama: string
          asal_jemaat: string
          nomor_undian?: number | null
          mazmur_bacaan?: string | null
          is_checked_in?: boolean
          status?: 'menunggu' | 'bersiap' | 'tampil' | 'dinilai' | 'selesai'
          potongan_nilai?: number
          keterangan_potongan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          kategori_id?: string
          nama?: string
          asal_jemaat?: string
          nomor_undian?: number | null
          mazmur_bacaan?: string | null
          is_checked_in?: boolean
          status?: 'menunggu' | 'bersiap' | 'tampil' | 'dinilai' | 'selesai'
          potongan_nilai?: number
          keterangan_potongan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'peserta_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'peserta_kategori_id_fkey'
            columns: ['kategori_id']
            isOneToOne: false
            referencedRelation: 'kategori'
            referencedColumns: ['id']
          }
        ]
      }
      sesi: {
        Row: {
          id: string
          event_id: string
          kategori_id: string
          peserta_aktif_id: string | null
          nama_sesi: string | null
          status: 'menunggu' | 'berjalan' | 'jeda' | 'selesai'
          pengumuman: string | null
          nilai_dikunci: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          kategori_id: string
          peserta_aktif_id?: string | null
          nama_sesi?: string | null
          status?: 'menunggu' | 'berjalan' | 'jeda' | 'selesai'
          pengumuman?: string | null
          nilai_dikunci?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          kategori_id?: string
          peserta_aktif_id?: string | null
          nama_sesi?: string | null
          status?: 'menunggu' | 'berjalan' | 'jeda' | 'selesai'
          pengumuman?: string | null
          nilai_dikunci?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sesi_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sesi_peserta_aktif_id_fkey'
            columns: ['peserta_aktif_id']
            isOneToOne: false
            referencedRelation: 'peserta'
            referencedColumns: ['id']
          }
        ]
      }
      penilaian: {
        Row: {
          id: string
          sesi_id: string
          peserta_id: string
          juri_id: string
          interpretasi: number | null
          artikulasi: number | null
          penghayatan: number | null
          penampilan: number | null
          kekompakan: number | null
          total: number
          catatan: string | null
          is_submitted: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sesi_id: string
          peserta_id: string
          juri_id: string
          interpretasi?: number | null
          artikulasi?: number | null
          penghayatan?: number | null
          penampilan?: number | null
          kekompakan?: number | null
          total?: number
          catatan?: string | null
          is_submitted?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sesi_id?: string
          peserta_id?: string
          juri_id?: string
          interpretasi?: number | null
          artikulasi?: number | null
          penghayatan?: number | null
          penampilan?: number | null
          kekompakan?: number | null
          total?: number
          catatan?: string | null
          is_submitted?: boolean
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'penilaian_sesi_id_fkey'
            columns: ['sesi_id']
            isOneToOne: false
            referencedRelation: 'sesi'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'penilaian_peserta_id_fkey'
            columns: ['peserta_id']
            isOneToOne: false
            referencedRelation: 'peserta'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'penilaian_juri_id_fkey'
            columns: ['juri_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      var_requests: {
        Row: {
          id: string
          penilaian_id: string | null
          peserta_id: string
          requested_by: string
          requested_role: 'juri' | 'ip'
          alasan: string
          lokasi_teks: string | null
          approved_by_juri_1: boolean
          approved_by_juri_2: boolean
          approved_by_juri_3: boolean
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          penilaian_id?: string | null
          peserta_id: string
          requested_by: string
          requested_role: 'juri' | 'ip'
          alasan: string
          lokasi_teks?: string | null
          approved_by_juri_1?: boolean
          approved_by_juri_2?: boolean
          approved_by_juri_3?: boolean
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          penilaian_id?: string | null
          peserta_id?: string
          requested_by?: string
          requested_role?: 'juri' | 'ip'
          alasan?: string
          lokasi_teks?: string | null
          approved_by_juri_1?: boolean
          approved_by_juri_2?: boolean
          approved_by_juri_3?: boolean
          status?: 'pending' | 'approved' | 'rejected'
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'var_requests_penilaian_id_fkey'
            columns: ['penilaian_id']
            isOneToOne: false
            referencedRelation: 'penilaian'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'var_requests_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'var_requests_peserta_id_fkey'
            columns: ['peserta_id']
            isOneToOne: false
            referencedRelation: 'peserta'
            referencedColumns: ['id']
          }
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      v_rekap_penilaian: {
        Row: {
          peserta_id: string
          nama_peserta: string
          asal_jemaat: string
          nomor_undian: number | null
          mazmur_bacaan: string | null
          potongan_nilai: number
          is_checked_in: boolean
          kategori: string
          kategori_id: string
          jenis_lomba: 'perorangan' | 'beregu'
          event_nama: string
          event_id: string
          jumlah_juri_menilai: number
          avg_interpretasi: number | null
          avg_artikulasi: number | null
          avg_penghayatan: number | null
          avg_penampilan: number | null
          avg_kekompakan: number | null
          avg_total: number | null
          nilai_akhir: number | null
          ranking: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Shorthand types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Kategori = Database['public']['Tables']['kategori']['Row']
export type Peserta = Database['public']['Tables']['peserta']['Row']
export type Sesi = Database['public']['Tables']['sesi']['Row']
export type Penilaian = Database['public']['Tables']['penilaian']['Row']
export type VarRequest = Database['public']['Tables']['var_requests']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type RekapPenilaian = Database['public']['Views']['v_rekap_penilaian']['Row']
