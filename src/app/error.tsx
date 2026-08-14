'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="panel max-w-md w-full text-center p-8 border-red-500/30">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-display font-bold text-[var(--color-text)] mb-3">
          Terjadi Kesalahan
        </h2>
        <p className="text-[var(--color-text-muted)] mb-6 text-sm">
          Sistem mendeteksi adanya malfungsi atau masalah koneksi. Silakan coba muat ulang halaman.
        </p>
        <button
          onClick={() => reset()}
          className="btn-primary w-full"
        >
          Muat Ulang Halaman
        </button>
      </div>
    </div>
  )
}
