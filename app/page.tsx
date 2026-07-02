"use client";
import { useState, useEffect, useRef } from "react";

function useCountUp(target: number, duration = 2000) {
  const [val, setVal] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(ease * target));
      if (p < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);
  return val;
}

function StatCounter({ value, suffix = "", prefix = "", label }: { value: number; suffix?: string; prefix?: string; label: string }) {
  const count = useCountUp(value, 2200);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 900, letterSpacing: "-2px", color: "white", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginTop: 6, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

const TICKER_ITEMS = [
  "LIVE: AI committee shortlisted Candidate #4,721 ✓",
  "NEW: 3 red flags detected in resume scan →",
  "VERIFIED: Trust score 94/100 — interview passed ✓",
  "ANALYSIS: Technical depth score 87/100 for ML role",
  "RANKED: Candidate A beats Candidate B by 23 points",
  "FLAGGED: Tab switch detected during live interview ⚠",
  "SHORTLIST: Champion agent overrides Skeptic 90 vs 55",
  "COMPLETE: 5-agent debate reached consensus in 8.2s",
];

const FEATURES = [
  {
    id: "recruiter",
    href: "/recruiter",
    icon: "⚡",
    label: "AI HIRING COMMITTEE",
    title: "5 agents debate\nevery candidate",
    desc: "Champion, Skeptic, Futurist, Pattern Breaker & Culture Oracle argue about your candidate — then reach a verdict with evidence.",
    stat: "5 AI agents",
    color: "#818cf8",
    tags: ["ATS Score", "Red Flags", "Skills Matrix", "DNA Profile"],
  },
  {
    id: "interview",
    href: "/interview",
    icon: "🎤",
    label: "FAANG INTERVIEW SIM",
    title: "Unlimited adaptive\nFAANG questions",
    desc: "Alex, a Staff Engineer at Google, interviews you with questions tailored to your resume. Live 7-dimension scoring after every answer.",
    stat: "7-dim scoring",
    color: "#34d399",
    tags: ["Voice Mode", "Live Scoring", "Body Language", "Final Verdict"],
  },
  {
    id: "secure-interview",
    href: "/secure-interview",
    icon: "🛡️",
    label: "PROCTORED INTERVIEW",
    title: "Secure interview\nwith trust score",
    desc: "Face monitoring, tab-switch detection, identity verification. Every session generates a tamper-proof Trust Certificate for recruiters.",
    stat: "Trust Score™",
    color: "#f87171",
    tags: ["Face Detection", "Tab Monitor", "Identity Verify", "Trust Report"],
    badge: "NEW",
  },
  {
    id: "candidate",
    href: "/candidate",
    icon: "✦",
    label: "CANDIDATE INTELLIGENCE",
    title: "Honest feedback\nrecruiters don't give",
    desc: "5 agents tell you what's wrong with your profile — skills gap, resume rewrite, 6-month roadmap, and predicted interview questions.",
    stat: "5 feedback modes",
    color: "#f472b6",
    tags: ["Gaps Analysis", "Resume Rewriter", "Roadmap", "Predictions"],
  },
  {
    id: "resume",
    href: "/resume",
    icon: "📄",
    label: "RESUME BUILDER",
    title: "6 templates,\nmaximum ATS score",
    desc: "Build a resume from a prompt. AI injects keywords, quantifies achievements, and exports clean PDF in 6 professional templates.",
    stat: "ATS optimized",
    color: "#fb923c",
    tags: ["6 Templates", "Keyword Inject", "PDF Export", "ATS Score"],
  },
  {
    id: "about",
    href: "/about",
    icon: "◈",
    label: "PLATFORM OVERVIEW",
    title: "Everything\nCOGNALYZE does",
    desc: "Full documentation of every feature, our AI evaluation principles, tech stack, and the story behind the hiring committee concept.",
    stat: "Full docs",
    color: "#a78bfa",
    tags: ["AI Principles", "Tech Stack", "Use Cases", "Philosophy"],
  },
];

export default function Home() {
  const [tick, setTick] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickerRef.current = setInterval(() => setTick(p => (p + 1) % TICKER_ITEMS.length), 3200);
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#05060f", color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes ticker{0%{opacity:0;transform:translateY(8px)}10%{opacity:1;transform:translateY(0)}90%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes scanline{0%{top:-4px}100%{top:100%}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.2)}50%{box-shadow:0 0 60px rgba(99,102,241,0.5)}}
        .feature-card{transition:all 0.3s cubic-bezier(0.4,0,0.2,1);cursor:pointer;}
        .feature-card:hover{transform:translateY(-4px);}
        a{text-decoration:none;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:2px;}
      `}</style>

      {/* GRID BACKGROUND */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(99,102,241,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* LIVE TICKER */}
      <div style={{ position: "relative", zIndex: 10, background: "rgba(99,102,241,0.1)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "7px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#00ff88" }}>LIVE</span>
          </div>
          <div key={tick} style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", animation: "ticker 3.2s ease-in-out", letterSpacing: 0.5 }}>
            {TICKER_ITEMS[tick]}
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,6,15,0.85)", backdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#6366f1,#a855f7)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, animation: "glow 3s ease-in-out infinite" }}>⚡</div>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px", color: "white" }}>COGNALYZE</div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(99,102,241,0.7)", marginTop: -2 }}>AI HIRING COMMITTEE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[{ href: "/about", label: "Docs" }, { href: "/recruiter", label: "Recruiters" }, { href: "/candidate", label: "Candidates" }].map(l => (
            <a key={l.href} href={l.href}>
              <button style={{ padding: "6px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                {l.label}
              </button>
            </a>
          ))}
          <a href="/secure-interview">
            <button style={{ padding: "6px 14px", borderRadius: 9, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>
              🛡️ Secure Interview
            </button>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 10, padding: "6rem 2rem 4rem", maxWidth: 1100, margin: "0 auto", animation: "fadeUp 0.8s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "3rem", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 999, marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 10, letterSpacing: 3, color: "rgba(99,102,241,0.9)", fontWeight: 700 }}>RED ROB - INDIA RUNS</span>
            </div>
            <h1 style={{ fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 900, letterSpacing: "-4px", lineHeight: 1.0, marginBottom: "1.5rem", color: "white" }}>
              The First<br />
              <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI Hiring</span><br />
              Committee
            </h1>
            <p style={{ fontSize: "clamp(1rem,2vw,1.2rem)", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 520, marginBottom: "2.5rem" }}>
              5 adversarial AI agents debate every candidate. ATS scoring, red flags, skills matrix, proctored interviews — FAANG-grade hiring intelligence for everyone.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/recruiter">
                <button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 50px rgba(99,102,241,0.3)", transition: "all 0.25s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  ⚡ Start Analysis →
                </button>
              </a>
              <a href="/interview">
                <button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.25s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                  🎤 Try Mock Interview
                </button>
              </a>
              <a href="/secure-interview">
                <button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.25s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.14)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}>
                  🛡️ Secure Interview
                </button>
              </a>
            </div>
          </div>

          {/* Hero terminal */}
          <div style={{ width: 300, flexShrink: 0, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", animation: "float 6s ease-in-out infinite" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
              {["#ff6b6b", "#fbbf24", "#00ff88"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4, letterSpacing: 1 }}>COGNALYZE LIVE</span>
            </div>
            <div style={{ padding: "14px 14px", fontFamily: "monospace", fontSize: 11 }}>
              {[
                { label: "Candidate", value: "Priya S.", color: "white" },
                { label: "Role", value: "ML Engineer", color: "#a5b4fc" },
                { label: "Champion", value: "90/100 ↑", color: "#00ff88" },
                { label: "Skeptic", value: "55/100 ↓", color: "#ff4466" },
                { label: "Futurist", value: "82/100", color: "#a78bfa" },
                { label: "Pattern", value: "87/100", color: "#fbbf24" },
                { label: "Culture", value: "82/100", color: "#38bdf8" },
                { label: "⎯⎯⎯⎯⎯", value: "⎯⎯⎯⎯⎯", color: "rgba(255,255,255,0.2)" },
                { label: "VERDICT", value: "SHORTLIST ✓", color: "#00ff88" },
                { label: "ATS Match", value: "84%", color: "#00ff88" },
                { label: "Trust Score", value: "94/100 🛡️", color: "#00ff88" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "3rem 2rem", background: "rgba(99,102,241,0.03)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2rem" }}>
          <StatCounter value={5} label="AI Agents per Analysis" />
          <StatCounter value={7} label="Scoring Dimensions" />
          <StatCounter value={6} label="Resume Templates" />
          <StatCounter value={100} suffix="%" label="Evidence-Based Analysis" />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: "relative", zIndex: 10, padding: "5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "rgba(99,102,241,0.7)", marginBottom: 12, fontWeight: 600 }}>PLATFORM MODULES</div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-2px", color: "white", lineHeight: 1.1 }}>
            Everything hiring needs.<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>In one platform.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
          {FEATURES.map((f, i) => (
            <a key={f.id} href={f.href} style={{ textDecoration: "none" }}>
              <div className="feature-card" style={{ padding: "1.75rem", background: hoveredFeature === f.id ? `rgba(${f.color === "#818cf8" ? "129,140,248" : f.color === "#34d399" ? "52,211,153" : f.color === "#f87171" ? "248,113,113" : f.color === "#f472b6" ? "244,114,182" : f.color === "#fb923c" ? "251,146,60" : "167,139,250"},0.08)` : "rgba(255,255,255,0.03)", border: `1px solid ${hoveredFeature === f.id ? `${f.color}35` : "rgba(255,255,255,0.07)"}`, borderRadius: 18, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", animation: `fadeUp 0.6s ease ${i * 0.08}s both` }} onMouseEnter={() => setHoveredFeature(f.id)} onMouseLeave={() => setHoveredFeature(null)}>
                {f.badge && (
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "2px 8px", background: `${f.color}25`, border: `1px solid ${f.color}40`, borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: f.color }}>{f.badge}</div>
                )}
                <div style={{ fontSize: 9, letterSpacing: 2, color: `${f.color}80`, fontWeight: 600, marginBottom: 10 }}>{f.label}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "white", lineHeight: 1.3, marginBottom: 12, whiteSpace: "pre-line" }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, flex: 1, marginBottom: 16 }}>{f.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                  {f.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 10, padding: "3px 8px", background: `${f.color}12`, border: `1px solid ${f.color}20`, borderRadius: 6, color: f.color }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: f.color, fontWeight: 600 }}>{f.stat}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", transition: "all 0.2s", transform: hoveredFeature === f.id ? "translateX(4px)" : "translateX(0)" }}>→</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* SECURE INTERVIEW HIGHLIGHT */}
      <section style={{ position: "relative", zIndex: 10, padding: "3rem 2rem 5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(248,113,113,0.08),rgba(0,0,0,0.4))", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 24, padding: "3rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg,transparent,rgba(248,113,113,0.8),transparent)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "3rem", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 999, marginBottom: 16 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, color: "#f87171", fontWeight: 700 }}>NEW FEATURE</span>
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,3vw,2.8rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: 14, color: "white" }}>
                Cognalyze<br />Secure Interview
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 480, marginBottom: "1.5rem" }}>
                Built for colleges running placement drives and enterprises hiring remotely. Every interview generates a cryptographically-tied Trust Score — face monitoring, tab detection, identity verification.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "2rem" }}>
                {["🪪 Identity Verification", "👁 Live Face Monitoring", "🔄 Tab-Switch Detection", "📊 Authenticity Scoring", "🏆 Trust Certificate", "🎙 Session Recording"].map(item => (
                  <span key={item} style={{ fontSize: 12, padding: "5px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 8, color: "rgba(255,255,255,0.65)" }}>{item}</span>
                ))}
              </div>
              <a href="/secure-interview">
                <button style={{ padding: "0.9rem 2rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#e63946,#f87171)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 40px rgba(248,113,113,0.25)", transition: "all 0.25s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  🛡️ Try Secure Interview →
                </button>
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
              {[["Trust Score", "94/100", "#00ff88"],["Face Detected", "✓ 98%", "#00ff88"],["Tab Switches", "0", "#00ff88"],["Violations", "None", "#00ff88"],["Verdict", "VERIFIED", "#00ff88"]].map(([l,v,c])=>(
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", zIndex: 10, padding: "3rem 2rem 5rem", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "rgba(99,102,241,0.7)", marginBottom: 12, fontWeight: 600 }}>THE PROCESS</div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, letterSpacing: "-2px" }}>How COGNALYZE works</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
          {[
            { step: "01", title: "Paste JD + Resume", desc: "Provide the job description and candidate resume. Our AI parses structure, keywords, and requirements instantly.", color: "#818cf8" },
            { step: "02", title: "5 Agents Debate", desc: "Champion, Skeptic, Futurist, Pattern Breaker, and Culture Oracle simultaneously analyze and argue their verdicts.", color: "#c084fc" },
            { step: "03", title: "Get FAANG-Grade Verdict", desc: "Receive SHORTLIST/HOLD/REJECT with ATS score, skills matrix, red flags, salary estimate, and interview questions.", color: "#f472b6" },
          ].map(s => (
            <div key={s.step} style={{ padding: "1.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18 }}>
              <div style={{ fontSize: "3rem", fontWeight: 900, color: s.color, opacity: 0.4, letterSpacing: -2, lineHeight: 1, marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>{s.step}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 10, padding: "3rem 2rem 6rem", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: "1rem" }}>
            Start hiring<br />
            <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>intelligently.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Built for Red Rob India Runs Hackathon. Powered by Groq.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { href: "/recruiter", label: "⚡ Recruiter Mode", style: { background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "white", fontWeight: 700, boxShadow: "0 0 50px rgba(99,102,241,0.3)" } },
              { href: "/candidate", label: "✦ Candidate Mode", style: { background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.25)", color: "#f9a8d4", fontWeight: 600 } },
              { href: "/secure-interview", label: "🛡️ Secure Interview", style: { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5", fontWeight: 600 } },
            ].map(btn => (
              <a key={btn.href} href={btn.href}>
                <button style={{ padding: "0.85rem 1.75rem", borderRadius: 12, cursor: "pointer", fontSize: 14, fontFamily: "inherit", transition: "all 0.25s", ...btn.style }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  {btn.label}
                </button>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, background: "linear-gradient(135deg,#6366f1,#a855f7)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>COGNALYZE</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>— The First AI Hiring Committee</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["/recruiter", "/candidate", "/interview", "/secure-interview", "/resume", "/about"].map(href => (
            <a key={href} href={href} style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
              {href.slice(1).replace("-", " ") || "home"}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Powered by Groq · Red Rob India Runs Hackathon</div>
      </footer>
    </div>
  );
}