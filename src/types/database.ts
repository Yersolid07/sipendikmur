// src/types/database.ts
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
          role: 'admin' | 'juri' | 'inspektur'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nama: string
          email: string
          role?: 'admin' | 'juri' | 'inspektur'
          is_active?: boolean
        }
        Update: {
          nama?: string
          email?: string
          role?: 'admin' | 'juri' | 'inspektur'
          is_active?: boolean
        }
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
          nama: string
          deskripsi?: string | null
          tanggal?: string | null
          lokasi?: string | null
          status?: 'aktif' | 'selesai' | 'draft'
        }
        Update: {
          nama?: string
          deskripsi?: string | null
          tanggal?: string | null
          lokasi?: string | null
          status?: 'aktif' | 'selesai' | 'draft'
        }
      }
      kategori: {
        Row: {
          id: string
          event_id: string
          nama: string
          deskripsi: string | null
          urutan: number
          maks_interpretasi: number
          maks_artikulasi: number
          maks_penghayatan: number
          maks_penampilan: number
          created_at: string
        }
        Insert: {
          event_id: string
          nama: string
          deskripsi?: string | null
          urutan?: number
          maks_interpretasi?: number
          maks_artikulasi?: number
          maks_penghayatan?: number
          maks_penampilan?: number
        }
        Update: {
          nama?: string
          deskripsi?: string | null
          urutan?: number
          maks_interpretasi?: number
          maks_artikulasi?: number
          maks_penghayatan?: number
          maks_penampilan?: number
        }
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
          status: 'menunggu' | 'tampil' | 'selesai'
          potongan_nilai: number
          keterangan_potongan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          event_id: string
          kategori_id: string
          nama: string
          asal_jemaat: string
          nomor_undian?: number | null
          mazmur_bacaan?: string | null
          status?: 'menunggu' | 'tampil' | 'selesai'
          potongan_nilai?: number
          keterangan_potongan?: string | null
        }
        Update: {
          nama?: string
          asal_jemaat?: string
          nomor_undian?: number | null
          mazmur_bacaan?: string | null
          status?: 'menunggu' | 'tampil' | 'selesai'
          potongan_nilai?: number
          keterangan_potongan?: string | null
        }
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
          event_id: string
          kategori_id: string
          peserta_aktif_id?: string | null
          nama_sesi?: string | null
          status?: 'menunggu' | 'berjalan' | 'jeda' | 'selesai'
          pengumuman?: string | null
          nilai_dikunci?: boolean
        }
        Update: {
          peserta_aktif_id?: string | null
          nama_sesi?: string | null
          status?: 'menunggu' | 'berjalan' | 'jeda' | 'selesai'
          pengumuman?: string | null
          nilai_dikunci?: boolean
        }
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
          total: number
          catatan: string | null
          is_submitted: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          sesi_id: string
          peserta_id: string
          juri_id: string
          interpretasi?: number | null
          artikulasi?: number | null
          penghayatan?: number | null
          penampilan?: number | null
          catatan?: string | null
          is_submitted?: boolean
        }
        Update: {
          interpretasi?: number | null
          artikulasi?: number | null
          penghayatan?: number | null
          penampilan?: number | null
          catatan?: string | null
          is_submitted?: boolean
          submitted_at?: string | null
        }
      }
      juri_sesi: {
        Row: {
          id: string
          event_id: string
          juri_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          event_id: string
          juri_id: string
          is_active?: boolean
        }
        Update: {
          is_active?: boolean
        }
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
          kategori: string
          kategori_id: string
          event_nama: string
          event_id: string
          jumlah_juri_menilai: number
          avg_interpretasi: number | null
          avg_artikulasi: number | null
          avg_penghayatan: number | null
          avg_penampilan: number | null
          avg_total: number | null
          nilai_akhir: number | null
          ranking: number | null
        }
      }
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
export type JuriSesi = Database['public']['Tables']['juri_sesi']['Row']
export type RekapPenilaian = Database['public']['Views']['v_rekap_penilaian']['Row']
