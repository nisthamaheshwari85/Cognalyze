"use client";
import { useState } from "react";

const sections = [
  {
    icon: "⚡",
    title: "What is COGNALYZE?",
    content: `COGNALYZE is the world's first AI Hiring Committee — a platform that uses 5 adversarial AI agents to evaluate candidates the way FAANG companies actually hire: through structured debate, not keyword matching.

Built for Google Hackathon 2025, COGNALYZE solves the single biggest problem in hiring: great candidates get rejected because their resume doesn't match an algorithm, while unqualified candidates pass because they know which keywords to use.

The insight: Great hiring decisions come from disagreement, not consensus. When a Champion, Skeptic, Futurist, Pattern Breaker, and Culture Oracle all argue about a candidate — you get signal that no ATS can produce.`
  },
  {
    icon: "🏆",
    title: "The #412 → #3 Moment",
    content: `Anika had exactly the skills the company needed. But her title was "Data Analyst" not "ML Engineer." Every ATS buried her at #412.

The Pattern Breaker agent found her GitHub. The Champion agent quantified her impact. The Skeptic asked hard questions. The committee ranked her #3.

This is what COGNALYZE is built for: finding the candidates that systems miss.`
  }
];

const features = [
  {
    category: "FOR RECRUITERS",
    color: "#6366f1",
    items: [
      { name: "5-Agent AI Debate", desc: "Champion, Skeptic, Futurist, Pattern Breaker & Culture Oracle argue about every candidate", icon: "⚡" },
      { name: "ATS Match Score", desc: "Real-time keyword matching against your JD with percentage breakdown", icon: "🎯" },
      { name: "Skills Matrix", desc: "Must-have vs good-to-have skills — what the candidate has and what's missing", icon: "📊" },
      { name: "Red & Green Flags", desc: "Evidence-based concerns and strengths with specific resume references", icon: "🚩" },
      { name: "Candidate DNA Radar", desc: "7-dimension profile: Technical Depth, Leadership, Communication, Culture Fit + more", icon: "🧬" },
      { name: "Interview Questions", desc: "5 targeted questions that probe specific gaps in this candidate's profile", icon: "🎤" },
      { name: "Salary Assessment", desc: "Market-aligned compensation estimate based on experience and role", icon: "💰" },
      { name: "Multi-Candidate Ranking", desc: "Upload up to 8 resumes, get ranked comparison with reasons", icon: "👥" },
      { name: "SHORTLIST/HOLD/REJECT Decision", desc: "Clear hiring recommendation with confidence percentage", icon: "✅" },
    ]
  },
  {
    category: "FOR CANDIDATES",
    color: "#ec4899",
    items: [
      { name: "Honest Feedback", desc: "5 agents give you the real feedback recruiters think but don't say", icon: "💬" },
      { name: "Skills Gap Analysis", desc: "Exact skills you have vs what the role needs — with learning resources", icon: "📈" },
      { name: "Resume Rewriter", desc: "Evidence-based rewrite with ATS score before/after — no fake skills added", icon: "✍️" },
      { name: "Career Roadmap", desc: "Honest 6-month plan to close your gaps with specific courses and projects", icon: "🗺️" },
      { name: "Interview Prep", desc: "Predicted FAANG-level questions based on your specific resume gaps", icon: "🎯" },
    ]
  },
  {
    category: "AI MOCK INTERVIEW",
    color: "#00ff88",
    items: [
      { name: "FAANG-Level Interviewer Alex", desc: "Unlimited adaptive questions based on your resume and JD — Behavioral, Technical, System Design, Culture", icon: "👔" },
      { name: "Live 7-Dimension Scoring", desc: "Relevance, Technical Accuracy, Communication, Problem Solving, Depth, Examples, Confidence — after every answer", icon: "📊" },
      { name: "Evidence-Based Analysis", desc: "Specific feedback on what you said, not generic advice", icon: "🎯" },
      { name: "Suggested Better Answers", desc: "Exact example of how to answer better for every response", icon: "💡" },
      { name: "Body Language Analysis", desc: "Camera-based posture, eye contact, confidence scoring", icon: "📷" },
      { name: "Voice Mode", desc: "Speak your answers — AI interviewer speaks back naturally", icon: "🎤" },
      { name: "Final HIRE/NO-HIRE Verdict", desc: "Detailed FAANG-style decision with scorecard, standout moments, and interviewer note", icon: "🏆" },
    ]
  },
  {
    category: "RESUME BUILDER",
    color: "#fbbf24",
    items: [
      { name: "6 Professional Templates", desc: "Modern Tech (sidebar), Corporate, Executive, Creative, Fresher, Startup — each genuinely different", icon: "📄" },
      { name: "Keyword Optimization", desc: "Inject JD keywords naturally throughout — maximizes ATS score", icon: "🔑" },
      { name: "AI Quantification", desc: "Transforms weak bullets into metric-driven achievements", icon: "📈" },
      { name: "ATS Score Display", desc: "See your ATS score before and after optimization", icon: "🎯" },
      { name: "PDF Export", desc: "Download clean, print-ready PDF in any template", icon: "⬇️" },
    ]
  }
];

const techStack = [
  { name: "Next.js 14", desc: "App Router, Server Components", icon: "▲" },
  { name: "TypeScript", desc: "Full type safety", icon: "TS" },
  { name: "Groq API", desc: "llama-3.3-70b-versatile + llama-3.1-8b-instant", icon: "⚡" },
  { name: "Groq Vision", desc: "llama-3.2-11b-vision-preview for body language", icon: "👁" },
  { name: "Web Speech API", desc: "Browser STT + TTS for voice mode", icon: "🎤" },
  { name: "Tailwind CSS", desc: "Utility-first styling", icon: "🎨" },
];

export default function AboutPage() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div style={{ minHeight: "100vh", background: "#06030f", color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:2px;}
      `}</style>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(6,3,15,0.9)", backdropFilter: "blur(20px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#a855f7)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 800, background: "linear-gradient(135deg,#fff,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>COGNALYZE</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/recruiter" style={{ textDecoration: "none" }}><button style={{ padding: "6px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>For Recruiters</button></a>
          <a href="/" style={{ textDecoration: "none" }}><button style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Home</button></a>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "5rem 2rem 3rem", textAlign: "center", animation: "fadeUp 0.8s ease" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "rgba(99,102,241,0.8)", marginBottom: 16, fontWeight: 600 }}>PRODUCT OVERVIEW</div>
        <h1 style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", fontWeight: 900, letterSpacing: -3, lineHeight: 1.05, marginBottom: 20, background: "linear-gradient(135deg,#fff 20%,#a5b4fc 60%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          COGNALYZE
        </h1>
        <p style={{ fontSize: "clamp(1rem,2vw,1.25rem)", color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto 3rem", lineHeight: 1.7 }}>
          The world's first AI Hiring Committee. 5 adversarial agents debate every candidate — finding signal that ATS systems miss, and giving candidates the feedback they deserve.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {[["⚡ 5 AI Agents","Adversarial debate"], ["🎯 FAANG-Level", "Interview simulation"], ["📊 7-Dimension", "Live scoring"], ["🧬 DNA Profile", "Candidate fingerprint"], ["📄 6 Templates", "ATS-optimized resume"]].map(([title, sub], i) => (
            <div key={i} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem 5rem" }}>

        {/* About sections */}
        <div style={{ marginBottom: "4rem" }}>
          {sections.map((s, i) => (
            <div key={i} onClick={() => setExpanded(expanded === i ? null : i)} style={{ marginBottom: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>{expanded === i ? "▲" : "▼"}</span>
              </div>
              {expanded === i && (
                <div style={{ padding: "0 1.5rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginTop: "1rem", whiteSpace: "pre-line" }}>{s.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features by category */}
        {features.map((cat, ci) => (
          <div key={ci} style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
              <div style={{ height: 2, width: 30, background: cat.color, borderRadius: 999 }} />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: 1, color: cat.color }}>{cat.category}</h2>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${cat.color}30,transparent)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
              {cat.items.map((item, i) => (
                <div key={i} style={{ padding: "1.1rem 1.25rem", background: "rgba(255,255,255,0.04)", border: `1px solid ${cat.color}15`, borderRadius: 14, transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = `${cat.color}40`} onMouseLeave={e => e.currentTarget.style.borderColor = `${cat.color}15`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{item.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tech Stack */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <div style={{ height: 2, width: 30, background: "#22d3ee", borderRadius: 999 }} />
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: 1, color: "#22d3ee" }}>TECHNICAL STACK</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {techStack.map((t, i) => (
              <div key={i} style={{ padding: "1rem 1.25rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,211,238,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#22d3ee", flexShrink: 0 }}>{t.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Rules */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", color: "#fbbf24" }}>🛡️ AI EVALUATION PRINCIPLES</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {["Never hallucinate skills or experience", "Every observation traced to resume evidence", "Evidence-based scoring — not black box", "Same quality answer = same score range", "No generic feedback without evidence", "Explainable decisions with score breakdown"].map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#00ff88", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: -1, marginBottom: "1rem" }}>Start using COGNALYZE</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem", fontSize: 15 }}>Built for Google Hackathon 2025 · Powered by Groq</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/recruiter" style={{ textDecoration: "none" }}><button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>⚡ Recruiter Mode</button></a>
            <a href="/candidate" style={{ textDecoration: "none" }}><button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "1px solid rgba(236,72,153,0.4)", background: "rgba(236,72,153,0.1)", color: "#f9a8d4", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✦ Candidate Mode</button></a>
            <a href="/interview" style={{ textDecoration: "none" }}><button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "1px solid rgba(0,255,136,0.4)", background: "rgba(0,255,136,0.08)", color: "#00ff88", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🎤 Mock Interview</button></a>
            <a href="/resume" style={{ textDecoration: "none" }}><button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.08)", color: "#fbbf24", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>📄 Resume Builder</button></a>
          </div>
        </div>
      </div>
    </div>
  );
}