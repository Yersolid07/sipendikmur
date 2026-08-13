import type { Metadata } from 'next'
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'BUMOTIK - Sistem Penjurian Baca Mazmur GMIM',
  description:
    'Aplikasi penilaian dan pemeringkatan lomba baca Mazmur GMIM — objektif, transparan, dan mudah digunakan oleh juri.',
  keywords: ['GMIM', 'baca mazmur', 'penjurian', 'BUMOTIK', 'lomba mazmur'],
  openGraph: {
    title: 'BUMOTIK - Sistem Penjurian Baca Mazmur GMIM',
    description: 'Aplikasi penilaian lomba baca Mazmur GMIM yang objektif dan transparan.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${cormorant.variable} ${plusJakarta.variable}`}>
      <body className="font-jakarta antialiased bg-slate-950 text-white">
        {children}
      </body>
    </html>
  )
}
