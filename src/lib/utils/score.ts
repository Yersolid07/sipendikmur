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

  // Calculate Catatan Juri Bonus (Max 10)
  if (catatan_aspek) {
    const aspectKeys = Object.keys(catatan_aspek)
    if (aspectKeys.length > 0) {
      let aspectSum = 0
      for (const key of aspectKeys) {
        aspectSum += catatan_aspek[key]
      }
      const catatanBonus = (aspectSum / 50) * 10
      sum += catatanBonus
    }
  }

  const rawSum = Math.max(0, sum)

  if (scale && scale.max > scale.min) {
    // rawSum includes base criteria (max: baseMax) + catatan bonus (max: 10)
    const maxPossible = baseMax + 10
    
    // Scale the rawSum proportionally to the range
    const scaled = scale.min + (rawSum / maxPossible) * (scale.max - scale.min)
    return Math.min(scaled, scale.max)
  }

  return rawSum
}
