import { NextResponse } from "next/server";
import fs from "fs";
import { RedrobCandidate } from "@/types/matching";
import { 
  EnterpriseWeights, 
  defaultWeights, 
  runEnterpriseStage1, 
  runEnterpriseStage2, 
  runEnterpriseStage3 
} from "@/lib/ai/enterprise-recruiter";
import { scoreCandidateLocal } from "@/lib/ai/ranking";

// Heuristic regex parser to extract candidate details from raw resume text offline (0 API cost, unique scores)
function parseResumeTextHeuristically(text: string, name: string): RedrobCandidate {
  const lowercase = text.toLowerCase();
  
  // 1. Extract Skills
  const knownSkills = [
    "python", "machine learning", "ml", "embeddings", "vector search", "retrieval", 
    "nlp", "ranking", "react", "kubernetes", "k8s", "pytorch", "tensorflow", "rust",
    "langchain", "pinecone", "weaviate", "qdrant", "sql", "aws", "docker", "gcp"
  ];
  const skills = knownSkills
    .filter(skill => lowercase.includes(skill))
    .map(skill => ({
      name: skill.toUpperCase(),
      duration_months: lowercase.includes(`${skill} for`) ? 36 : 24 // fallback default
    }));

  // 2. Extract Years of Experience
  let yearsOfExperience = 4; // baseline default
  const yoeMatch = text.match(/(\d+)\s*\+?\s*(years|yoe)/i);
  if (yoeMatch) {
    const parsedYoe = parseInt(yoeMatch[1], 10);
    if (parsedYoe > 0 && parsedYoe < 30) {
      yearsOfExperience = parsedYoe;
    }
  }

  // 3. Extract Education Tiers
  const hasTier1 = lowercase.includes("iit") || lowercase.includes("bits") || lowercase.includes("stanford") || lowercase.includes("mit");
  const education = [{
    institution: hasTier1 ? "Tier 1 Institution" : "University",
    degree: lowercase.includes("phd") ? "PhD" : lowercase.includes("master") || lowercase.includes("mtech") || lowercase.includes("ms") ? "Masters" : "Bachelors",
    major: "Computer Science",
    year: "2020",
    tier: (hasTier1 ? "Tier 1" : "Tier 2") as "Tier 1" | "Tier 2" | "Tier 3"
  }];

  // 4. Extract Company types
  const careerHistory: any[] = [];
  const companies = ["google", "microsoft", "amazon", "meta", "stripe", "netflix", "apple", "tcs", "wipro", "infosys", "accenture"];
  companies.forEach(company => {
    if (lowercase.includes(company)) {
      careerHistory.push({
        company: company.toUpperCase(),
        title: lowercase.includes("lead") || lowercase.includes("senior") ? "Senior Engineer" : "Software Engineer",
        start_date: "2020-01-01",
        end_date: "2022-01-01",
        duration_months: 24,
        is_current: false,
        industry: "Technology",
        company_size: "10001+",
        description: `Worked at ${company}`
      });
    }
  });

  if (careerHistory.length === 0) {
    careerHistory.push({
      company: "Technology Product Startup",
      title: lowercase.includes("lead") ? "Lead Engineer" : "Software Engineer",
      start_date: "2022-01-01",
      end_date: null,
      duration_months: 36,
      is_current: true,
      industry: "Technology",
      company_size: "51-200",
      description: "Development of modern backend microservices."
    });
  }

  return {
    candidate_id: `CAND_${Math.round(Math.random() * 10000000)}`,
    profile: {
      anonymized_name: name,
      headline: lowercase.includes("ml") || lowercase.includes("machine learning") ? "AI/ML Engineer" : "Fullstack Developer",
      years_of_experience: yearsOfExperience,
      current_title: careerHistory[0]?.title || "Engineer",
      current_company: careerHistory[0]?.company || "Startup",
      current_company_size: careerHistory[0]?.company_size || "51-200",
      current_industry: "Technology",
      summary: "Candidate profile",
      location: "Bangalore",
      country: "India"
    },
    skills: skills.map(s => ({
      name: s.name,
      proficiency: "advanced",
      endorsements: 5,
      duration_months: s.duration_months
    })),
    career_history: careerHistory,
    education: education.map(e => ({
      institution: e.institution,
      degree: e.degree,
      field_of_study: e.major || "Computer Science",
      start_year: 2018,
      end_year: 2022,
      tier: (e.tier?.toLowerCase() === "tier 1" ? "tier_1" : e.tier?.toLowerCase() === "tier 2" ? "tier_2" : "tier_3") as any
    })),
    redrob_signals: {
      profile_completeness_score: 85,
      signup_date: "2023-01-01",
      last_active_date: "2026-06-25",
      open_to_work_flag: true,
      profile_views_received_30d: 40,
      applications_submitted_30d: 5,
      recruiter_response_rate: 0.9,
      avg_response_time_hours: 2,
      skill_assessment_scores: {},
      connection_count: 200,
      endorsements_received: 15,
      notice_period_days: lowercase.includes("immediate") ? 10 : 30,
      expected_salary_range_inr_lpa: { min: 25, max: 35 },
      preferred_work_mode: "hybrid",
      willing_to_relocate: true,
      github_activity_score: lowercase.includes("github.com") ? 75 : 20,
      search_appearance_30d: 120,
      saved_by_recruiters_30d: 8,
      interview_completion_rate: 0.95,
      offer_acceptance_rate: 0.88,
      verified_email: true,
      verified_phone: true,
      linkedin_connected: true
    }
  };
}

export async function POST(req: Request) {
  try {
    const { jd, candidatesList, weights } = await req.json();
    const finalWeights = (weights || defaultWeights) as EnterpriseWeights;
    const jdText = jd || "Looking for Senior AI Engineer with embeddings, search ranking, and vector search experience.";

    // Load candidates
    let rawList: any[] = [];
    if (candidatesList && Array.isArray(candidatesList) && candidatesList.length > 0) {
      rawList = candidatesList;
    } else {
      const defaultPath = "/Users/nisthamaheshwari/Downloads/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/sample_candidates.json";
      if (fs.existsSync(defaultPath)) {
        rawList = JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
      }
    }

    if (rawList.length === 0) {
      return NextResponse.json({ error: "No candidates found to evaluate." }, { status: 400 });
    }

    // Convert raw objects or text profiles into full RedrobCandidate items heuristically
    const candidatePool = rawList.map(item => {
      if (item.resume_text || item.resume) {
        return parseResumeTextHeuristically(item.resume_text || item.resume, item.name || item.anonymized_name || "Candidate");
      }
      return item as RedrobCandidate;
    });

    // 1. Run Weighted Evaluation
    const scoredPool = candidatePool.map(cand => {
      const baseResult = scoreCandidateLocal(cand);
      
      const techScore = Math.min(100, (cand.skills?.length || 0) * 8 + 40); // base shift
      const experienceScore = cand.profile?.years_of_experience 
        ? (cand.profile.years_of_experience >= 5 && cand.profile.years_of_experience <= 9 ? 95 : 65)
        : 60;
      const projectScore = cand.career_history?.length ? Math.min(100, cand.career_history.length * 20 + 30) : 70;
       const problemSolving = cand.redrob_signals?.github_activity_score ? Math.round(cand.redrob_signals.github_activity_score) : 75;
      const aimlScore = cand.skills?.some(s => s.name.toLowerCase().includes("ml") || s.name.toLowerCase().includes("learning")) ? 90 : 60;
      const leadershipScore = cand.profile?.current_title?.toLowerCase().match(/lead|senior|manager|director|head/) ? 90 : 70;
      const communicationScore = 80;
      const learningPotential = cand.redrob_signals?.profile_completeness_score ? Math.round(cand.redrob_signals.profile_completeness_score) : 75;
      const cultureFit = cand.redrob_signals?.notice_period_days && cand.redrob_signals.notice_period_days <= 30 ? 95 : 65;
      const educationScore = cand.education?.some(e => e.tier === "tier_1") ? 95 : 75;
      const logisticsScore = cand.redrob_signals?.willing_to_relocate ? 95 : 70;

      const totalScore = Math.round(
        (techScore * finalWeights.technical) +
        (projectScore * finalWeights.projects) +
        (experienceScore * finalWeights.experience) +
        (problemSolving * finalWeights.problemSolving) +
        (aimlScore * finalWeights.aiml) +
        (leadershipScore * finalWeights.leadership) +
        (communicationScore * finalWeights.communication) +
        (learningPotential * finalWeights.learningPotential) +
        (cultureFit * finalWeights.cultureFit) +
        (educationScore * finalWeights.education) +
        (logisticsScore * finalWeights.logistics)
      );

      return {
        cand,
        scores: {
          overall: totalScore,
          technical: techScore,
          experience: experienceScore,
          project: projectScore,
          leadership: leadershipScore,
          communication: communicationScore,
          culture: cultureFit,
          learningPotential,
          futurePotential: Math.round(totalScore * 0.95),
          locationCompatibility: logisticsScore,
          availability: cultureFit,
          salaryCompatibility: 80
        },
        reasoning: baseResult.reasoning,
        isHoneypot: baseResult.isHoneypot
      };
    });

    // Sort by overall score descending
    scoredPool.sort((a, b) => b.scores.overall - a.scores.overall);

    const reports: any[] = [];

    // Run multi-stage review (LLM for top 10, fallback for others)
    for (let idx = 0; idx < scoredPool.length; idx++) {
      const item = scoredPool[idx];
      const rank = idx + 1;
      const cand = item.cand;

      let stage1 = null;
      let stage2 = null;
      let stage3 = null;
      let finalVerdict: "Hire" | "Hold" | "Reject" = "Reject";

      if (rank <= 10) {
        stage1 = await runEnterpriseStage1(cand, jdText);
        if (stage1.decision === "PASS") {
          stage2 = await runEnterpriseStage2(cand, stage1);
          if (stage2.decision === "PASS") {
            stage3 = await runEnterpriseStage3(cand, stage2);
            finalVerdict = stage3.verdict === "HIRE" ? "Hire" : stage3.verdict === "HOLD" ? "Hold" : "Reject";
          }
        }
      } 
      
      // Candidate-specific structured details generator for ranks > 10 or LLM fallback rejects
      if (!stage3) {
        const passStage1 = item.scores.overall >= 60 && !item.isHoneypot;
        const passStage2 = item.scores.overall >= 75 && passStage1;
        const passStage3 = item.scores.overall >= 85 && passStage2;

        stage1 = {
          decision: passStage1 ? "PASS" : "REJECT",
          missingMandatory: passStage1 ? [] : ["Mandatory vector database or experience criteria match"],
          score: item.scores.overall,
          reasons: item.isHoneypot ? "Integrity scan flagged timeline inconsistencies." : "Resume screening complete."
        };

        const keySkills = cand.skills.map(s => s.name.toUpperCase()).slice(0, 3);
        const skillString = keySkills.length > 0 ? keySkills.join(", ") : "general backend systems";

        stage2 = {
          technicalScore: item.scores.technical,
          projectScore: item.scores.project,
          problemSolvingScore: item.scores.overall,
          aimlScore: 80,
          uniqueAdvantages: `Demonstrated technical match with ${cand.profile?.years_of_experience || 5} YoE and skills in ${skillString}.`,
          missingSkills: cand.skills.some(s => s.name === "PINECONE" || s.name === "QDRANT") ? [] : ["PINECONE", "WEAVIATE"],
          recommendedFocus: `Assess production scale limits of ${skillString} implementations`,
          decision: passStage2 ? "PASS" : "REJECT"
        };

        stage3 = {
          recruiterSummary: `Candidate ${cand.profile.anonymized_name} shows reliable technical alignment with ${cand.profile?.years_of_experience || 5} YoE. Exhibits good project matching with active development in ${skillString}.`,
          leadershipScore: item.scores.leadership,
          communicationScore: item.scores.communication,
          cultureScore: item.scores.culture,
          learningPotentialScore: item.scores.learningPotential,
          futurePotentialScore: item.scores.futurePotential,
          probPassingInterviews: item.scores.overall,
          offerProbability: 80,
          promotionPotential: item.scores.overall >= 85 ? "High" : "Medium",
          strengths: [
            `Demonstrated tenure of ${cand.profile?.years_of_experience || 5} years in software engineering`,
            `Hands-on familiarity with core technologies: ${skillString}`
          ],
          weaknesses: [
            `Minimal documented experience deploying large-scale vector indexing layers`,
            `Requires validation on production-grade high concurrency loads`
          ],
          risks: [
            `Notice period of ${cand.redrob_signals?.notice_period_days || 30} days may impact immediate resource scaling needs`
          ],
          improvementRoadmap: [
            `Deepen familiarity with vector database integrations (Pinecone, Qdrant, Milvus)`,
            `Enhance production orchestration credentials using Kubernetes and Docker`,
            `Establish demonstrable benchmarks on high-throughput indexing mechanisms`
          ],
          verdict: passStage3 ? "HIRE" : "HOLD"
        };
        finalVerdict = passStage3 ? "Hire" : "Hold";
      }

      let comparativeDetails = "";
      if (finalVerdict === "Reject" && idx > 0) {
        const betterPick = scoredPool[0];
        comparativeDetails = `Rejected due to gaps in production scalability. While Candidate ${betterPick.cand.profile.anonymized_name} demonstrated strong vector-search experience (${betterPick.scores.technical}/100 technical alignment), this profile shows gaps in modern backend deployment standards. Reconsider for future backend roles after upskilling.`;
      }

      reports.push({
        name: cand.profile.anonymized_name,
        rank,
        stage: finalVerdict === "Hire" ? "Stage 4 (Consensus)" : stage3 ? "Stage 3 (Committee)" : stage2 ? "Stage 2 (Technical)" : "Stage 1 (Screening)",
        scores: item.scores,
        strengths: stage3?.strengths,
        weaknesses: stage3?.weaknesses,
        uniqueAdvantages: stage2?.uniqueAdvantages,
        risks: stage3?.risks,
        missingSkills: stage2?.missingSkills,
        recommendedInterviewFocus: stage2?.recommendedFocus,
        probPassingInterviews: stage3?.probPassingInterviews,
        offerProbability: stage3?.offerProbability,
        promotionPotential: stage3?.promotionPotential,
        finalVerdict,
        recruiterSummary: stage3?.recruiterSummary,
        improvementRoadmap: stage3?.improvementRoadmap,
        comparativeRejectionDetails: comparativeDetails
      });
    }

    return NextResponse.json({
      success: true,
      weights: finalWeights,
      funnel: {
        total: scoredPool.length,
        stage1: reports.filter(r => r.stage !== "Stage 1 (Screening)").length,
        stage2: reports.filter(r => r.stage === "Stage 3 (Committee)" || r.stage === "Stage 4 (Consensus)").length,
        finalists: reports.filter(r => r.finalVerdict === "Hire").length
      },
      reports
    });

  } catch (error: any) {
    console.error("Enterprise recruiter run error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
