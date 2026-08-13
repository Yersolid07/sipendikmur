import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
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
    <html lang="id" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-[var(--color-surface)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  )
}
