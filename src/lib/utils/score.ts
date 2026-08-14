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
  
  // Calculate Main Criteria
  for (const k of kriteria) {
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
    // rawSum is out of 100 base. Even with bonus, we scale it.
    // If rawSum exceeds 100, we still cap it to max to strictly follow range limits?
    // Wait, let's just scale it linearly. We will cap it at `scale.max` in all cases.
    const scaled = scale.min + (rawSum / 100) * (scale.max - scale.min)
    return Math.min(scaled, scale.max)
  }

  return rawSum
}
