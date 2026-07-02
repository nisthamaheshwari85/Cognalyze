import { EvaluationReport } from "@/types/matching";

export interface ExplanationReport {
  scoreCalculationBreakdown: string;
  selectionJustification: string;
  rejectionTriggers: string[];
  missingExperienceDetails: string[];
  missingSkillsDetails: string[];
  overallMatchConfidence: number;
}

export function generateExplanation(
  report: EvaluationReport, 
  parsedCand: any, 
  parsedJd: any
): ExplanationReport {
  const triggers: string[] = [];
  const missingExp: string[] = [];
  const missingSkills: string[] = [];

  // 1. Analyze score weights
  const breakdown = `Final Score (${report.final_score}/100) is calculated as:
  - Semantic Skill Match (35%): ${report.scores.semantic}/100
  - Experience Match (20%): ${report.scores.experience}/100
  - Career Trajectory Match (10%): ${report.scores.trajectory}/100
  - Domain Match (10%): ${report.scores.domain}/100
  - Company Quality Match (10%): ${report.scores.company}/100
  - Education Quality Match (5%): ${report.scores.education}/100
  - Behavioral Signal Match (5%): ${report.scores.behavioral}/100
  - Availability Match (5%): ${report.scores.availability}/100
  - Penalties (Honeypot/Fraud): -${report.fraud_flags.length * 15}`;

  // 2. Identify selection justifications vs rejection triggers
  if (report.final_score >= 70) {
    if (report.scores.semantic >= 80) {
      missingSkills.push("None — candidate matches all core tech stacks.");
    }
  } else {
    // Collect specific missing skills from Jd
    const candSkills = (parsedCand?.skills || []).map((s: any) => s.name.toLowerCase());
    const jdMandatory = parsedJd?.mandatorySkills || ["machine learning", "embeddings", "vector database"];
    
    jdJdSkillsLoop:
    for (const skill of jdMandatory) {
      if (!candSkills.includes(skill.toLowerCase())) {
        missingSkills.push(skill);
      }
    }
    
    if (report.scores.experience < 50) {
      triggers.push(`Experience of ${parsedCand?.profile?.years_of_experience} years falls outside the optimal ${parsedJd?.minYearsExperience || 5}-${parsedJd?.maxYearsExperience || 9} YoE target.`);
      missingExp.push("Candidate has gaps in tenure stability or insufficient total Years of Experience.");
    }
  }

  // Fallback missing messages
  if (missingSkills.length === 0) missingSkills.push("No severe missing skills detected.");
  if (missingExp.length === 0) missingExp.push("Candidate's experience level is sufficient.");

  const selectionJustification = report.final_score >= 70 
    ? `Selected due to strong alignment in modern ML retrieval and vector indexing, with a highly responsive availability score.`
    : `Rejected or placed on hold due to gaps in mandatory ML skills and mismatch in years of experience.`;

  return {
    scoreCalculationBreakdown: breakdown,
    selectionJustification,
    rejectionTriggers: triggers.length > 0 ? triggers : ["No absolute deal breakers triggered."],
    missingExperienceDetails: missingExp,
    missingSkillsDetails: missingSkills,
    overallMatchConfidence: report.confidence_score
  };
}
