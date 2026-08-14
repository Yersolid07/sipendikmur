import { describe, it, expect } from 'vitest'
import { calculateTotalScore } from './score'

describe('calculateTotalScore', () => {
  const kriteriaPerorangan = [
    { key: 'interpretasi', max: 35 },
    { key: 'penghayatan', max: 30 },
    { key: 'artikulasi', max: 25 },
    { key: 'penampilan', max: 10 }
  ]

  it('calculates perfect score (all 5s) without deductions', () => {
    const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 }
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores })
    expect(total).toBe(100)
  })

  it('calculates mid score (all 2.5s)', () => {
    const scores = { interpretasi: 2.5, penghayatan: 2.5, artikulasi: 2.5, penampilan: 2.5 }
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores })
    expect(total).toBe(50)
  })

  it('applies clear_text penalty (-5)', () => {
    const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 }
    const perhatian = { clear_text: false, salah_kata: [], menambah_kata: [], mengurangi_kata: [] }
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores, perhatian })
    expect(total).toBe(95) // 100 - 5
  })

  it('applies mistakes penalty (-1 per mistake)', () => {
    const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 }
    const perhatian = { 
      clear_text: true, 
      salah_kata: [1, 2], 
      menambah_kata: [3], 
      mengurangi_kata: [] 
    }
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores, perhatian })
    expect(total).toBe(97) // 100 - 3
  })

  it('adds Catatan Juri bonus (max 10)', () => {
    const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 }
    const catatan_aspek = { a: 5, b: 5, c: 5, d: 5, e: 5, f: 5, g: 5, h: 5, i: 5, j: 5 } // 50 points
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores, catatan_aspek })
    expect(total).toBe(110) // 100 + 10
  })

  it('calculates complex scenario', () => {
    const scores = { interpretasi: 4, penghayatan: 3.5, artikulasi: 4, penampilan: 4 }
    // Int: 4/5 * 35 = 28
    // Peng: 3.5/5 * 30 = 21
    // Art: 4/5 * 25 = 20
    // Pen: 4/5 * 10 = 8
    // Base: 77
    
    const perhatian = { 
      clear_text: false, // -5
      salah_kata: [1, 2], // -2
      menambah_kata: [], 
      mengurangi_kata: [5] // -1
    } // Total penalty: -8

    const catatan_aspek = { a: 3, b: 4, c: 3, d: 2, e: 4, f: 3, g: 5, h: 4, i: 4, j: 3 } // sum: 35
    // Bonus: (35 / 50) * 10 = 7
    
    // Final = 77 - 8 + 7 = 76
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores, perhatian, catatan_aspek })
    expect(total).toBe(76)
  })

  it('never returns negative score', () => {
    const scores = { interpretasi: 1, penghayatan: 1, artikulasi: 1, penampilan: 1 } // Base = 20
    const perhatian = { clear_text: false, salah_kata: new Array(20).fill(1), menambah_kata: [], mengurangi_kata: [] } // Penalty = -25
    const total = calculateTotalScore({ kriteria: kriteriaPerorangan, scores, perhatian })
    expect(total).toBe(0) // Should be 0, not -5
  })

  describe('score scaling (konvensional)', () => {
    it('scales 100 to max range', () => {
      const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 } // 100
      const total = calculateTotalScore({ 
        kriteria: kriteriaPerorangan, 
        scores,
        scale: { min: 80.0, max: 81.999 } 
      })
      expect(total).toBeCloseTo(81.999, 3)
    })

    it('scales 0 to min range', () => {
      const scores = { interpretasi: 0, penghayatan: 0, artikulasi: 0, penampilan: 0 } // 0
      const total = calculateTotalScore({ 
        kriteria: kriteriaPerorangan, 
        scores,
        scale: { min: 80.0, max: 81.999 } 
      })
      expect(total).toBeCloseTo(80.0, 3)
    })

    it('scales 50 to middle of range', () => {
      const scores = { interpretasi: 2.5, penghayatan: 2.5, artikulasi: 2.5, penampilan: 2.5 } // 50
      const total = calculateTotalScore({ 
        kriteria: kriteriaPerorangan, 
        scores,
        scale: { min: 80.0, max: 82.0 } 
      })
      // 80 + 0.5 * 2.0 = 81.0
      expect(total).toBeCloseTo(81.0, 3)
    })

    it('caps score at max range even if bonus pushes it over 100', () => {
      const scores = { interpretasi: 5, penghayatan: 5, artikulasi: 5, penampilan: 5 } // 100
      const catatan_aspek = { a: 5, b: 5 } // bonus: 2
      const total = calculateTotalScore({ 
        kriteria: kriteriaPerorangan, 
        scores,
        catatan_aspek, // total 102
        scale: { min: 80.0, max: 81.999 } 
      })
      // 80 + 1.02 * 1.999 = 82.039 -> Capped at 81.999
      expect(total).toBe(81.999)
    })
  })
})
