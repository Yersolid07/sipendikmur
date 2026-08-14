export default function Loading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
      <h3 className="text-xl font-display font-bold text-[var(--color-text)] animate-pulse">
        Memuat Data...
      </h3>
      <p className="text-[var(--color-text-muted)] text-sm mt-2">
        Sistem sedang menyinkronkan data secara real-time.
      </p>
    </div>
  )
}
