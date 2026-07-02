export function calculateSemanticScore(jdEmbedding: number[], candidateEmbedding: number[]): number {
  if (jdEmbedding.length !== candidateEmbedding.length || jdEmbedding.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < jdEmbedding.length; i++) {
    dotProduct += jdEmbedding[i] * candidateEmbedding[i];
    normA += jdEmbedding[i] * jdEmbedding[i];
    normB += candidateEmbedding[i] * candidateEmbedding[i];
  }
  const cosine = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(100, ((cosine + 1) / 2) * 100));
}

export function calculateExperienceScore(actualYoe: number, targetYoe: number): number {
  if (targetYoe === 0) {
    // If target is 0, any experience is basically fine, but flag 15 YOE applying for new grad.
    if (actualYoe > 3) return 50;
    return 100;
  }
  
  if (actualYoe === targetYoe) return 100;
  
  // Gaussian decay to penalize under-qualification and over-qualification
  let variance = Math.max(1.5, targetYoe * 0.3); // ~30% acceptable variance for under
  if (actualYoe > targetYoe) {
     // Be more forgiving of over-qualification (wider variance)
     variance = Math.max(3.0, targetYoe * 0.6);
  }
  
  const decay = Math.exp(-Math.pow(actualYoe - targetYoe, 2) / (2 * Math.pow(variance, 2)));
  return Math.max(0, Math.min(100, Math.round(decay * 100)));
}

export function calculateTrajectoryScore(avgTenureMonths: number, promotionsCount: number): number {
  // Avg_Tenure_Score: Max points for 24-48 months average tenure. Penalize <12 months.
  let tenureScore = 0;
  if (avgTenureMonths >= 24) {
    tenureScore = 40; // Max points for stable tenure
  } else if (avgTenureMonths >= 12) {
    tenureScore = 20 + ((avgTenureMonths - 12) / 12) * 20; // 20-40 points
  } else {
    tenureScore = (avgTenureMonths / 12) * 20; // 0-20 points (penalized for job hopping)
  }

  // Promotion_Velocity_Score: Points for moving up within the same company
  const promoScore = Math.min(60, promotionsCount * 20); // 3 promos maxes it out
  
  return Math.min(100, Math.round(tenureScore + promoScore));
}

export function calculateCompanyQualityScore(tier: 1 | 2 | 3 | 4): number {
  const lookup = { 1: 100, 2: 75, 3: 50, 4: 30 };
  return lookup[tier] || 30;
}

export function calculateEducationQualityScore(tier: 1 | 2 | 3 | 4, isRelevantDegree: boolean): number {
  const lookup = { 1: 100, 2: 75, 3: 50, 4: 30 };
  const base = lookup[tier] || 30;
  return isRelevantDegree ? base : base * 0.7; // 30% penalty for irrelevant degree
}

// Fraud & Integrity Penalties
export function calculateIntegrityPenalties(
  skillDensityPercent: number, 
  fakeSkillsCount: number, 
  unexplainedGapsMonths: number
): { totalPenalty: number; flags: string[] } {
  let penalty = 0;
  const flags: string[] = [];

  if (skillDensityPercent > 15) {
    penalty += 20;
    flags.push(`High keyword density (${skillDensityPercent}%). Possible stuffing.`);
  }

  if (fakeSkillsCount > 0) {
    penalty += (fakeSkillsCount * 10);
    flags.push(`${fakeSkillsCount} skills claimed with zero context in experience bullets.`);
  }

  if (unexplainedGapsMonths > 12) {
    penalty += 15;
    flags.push(`Unexplained employment gap of ${unexplainedGapsMonths} months.`);
  }

  return { totalPenalty: Math.min(100, penalty), flags };
}
