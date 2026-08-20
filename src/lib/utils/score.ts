export interface ScoreParams {
  kriteria: { key: string; max: number }[]
  scores: Record<string, number>
  perhatian?: {
    clear_text: boolean
    salah_kata: number[]
    menambah_kata: number[]
    mengurangi_kata: number[]
  }
  catatan_aspek?: Record<string, number>
  scale?: { min: number; max: number }
}

export function calculateTotalScore({ kriteria, scores, perhatian, catatan_aspek, scale }: ScoreParams): number {
  let sum = 0
  let baseMax = 0
  
  // Calculate Main Criteria
  for (const k of kriteria) {
    baseMax += k.max
    const grade = scores[k.key] || 0
    if (grade > 0) {
      sum += (grade / 5) * k.max
    }
  }

  // Calculate Perhatian Deductions
  if (perhatian) {
    if (!perhatian.clear_text) sum -= 5
    const mistakesCount = 
      (perhatian.salah_kata?.length || 0) + 
      (perhatian.menambah_kata?.length || 0) + 
      (perhatian.mengurangi_kata?.length || 0)
    sum -= mistakesCount
  }

  // Calculate Bonus from Catatan Aspek
  let catatanBonus = 0
  if (catatan_aspek) {
    const keys = Object.keys(catatan_aspek)
    let bonusSum = 0
    keys.forEach(k => bonusSum += catatan_aspek[k])
    
    // Max 10 points bonus
    if (keys.length > 0) {
      catatanBonus = (bonusSum / (keys.length * 5)) * 10
    }
  }

  const rawSum = Math.max(0, sum + catatanBonus)

  if (scale && scale.max > scale.min) {
    // The true maximum possible score includes the 10 points bonus
    const maxPossible = baseMax + 10
    
    // Scale the rawSum proportionally to the range
    const scaled = scale.min + (rawSum / maxPossible) * (scale.max - scale.min)
    return Math.min(scaled, scale.max)
  }

  return rawSum
}
