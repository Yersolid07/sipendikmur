'use client'

import { Info } from 'lucide-react'

export default function AcaraSelesaiView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="panel p-10 border-red-500 bg-red-50 max-w-lg mx-auto mt-10">
        <h2 className="text-2xl font-bold text-red-700 mb-4 flex justify-center items-center gap-2">
          <Info className="w-8 h-8" /> Event Telah Berakhir
        </h2>
        <p className="text-red-600 text-sm mx-auto mb-6">
          Seluruh rangkaian acara untuk event ini telah resmi diakhiri oleh Panitia. 
          Anda tidak dapat lagi mengakses panel operasional ini. Terima kasih atas kerja keras Anda.
        </p>
      </div>
    </div>
  )
}
