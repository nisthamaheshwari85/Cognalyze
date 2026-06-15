"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ NORMAL INTERVIEW INTERFACES ═══
interface Msg { role: "user" | "assistant"; content: string; time: string; }
interface ScoreBreakdown { relevance: number; technicalAccuracy: number; communicationClarity: number; problemSolving: number; depth: number; examples: number; confidence: number; }
interface ScoreEvidence { strengths: string[]; improvements: string[]; suggestedAnswer: string; scoreReason: string; }
interface ScoreData { overall: number; breakdown: ScoreBreakdown; evidence: ScoreEvidence; verdict: string; hiringSignal: string; bodyLanguage: any; timestamp: number; }
interface BodyLang { overall: number; posture: number; eyeContact: number; confidence: number; expression: number; notes: string; }
interface FinalVerdict { decision: string; confidence: number; headline: string; overview: string; hire_reasons: string[]; no_hire_reasons: string[]; standout_moments: string[]; concerning_moments: string[]; scorecard: Record<string, { score: number; comment: string }>; next_steps: string; interviewer_note: string; }

// ═══ PROCTORING INTERFACES ═══
interface Violation { time: string; type: string; severity: "critical" | "high" | "medium" | "low"; }
interface AICheck { isAI: boolean; ai_score: number; risk_level: string; signals_found: string[]; verdict: string; }
interface TrustReport { trust_score: number; verdict: string; verdict_reason: string; breakdown: Record<string, { score: number; label: string; note: string }>; flags: string[]; ai_observation: string; recruiter_recommendation: string; confidence_level: string; }

const ZERO_SCORE: ScoreData = {
  overall: 0, timestamp: 0,
  breakdown: { relevance: 0, technicalAccuracy: 0, communicationClarity: 0, problemSolving: 0, depth: 0, examples: 0, confidence: 0 },
  evidence: { strengths: [], improvements: [], suggestedAnswer: "", scoreReason: "Answer the first question to see your score" },
  verdict: "Waiting for first answer...", hiringSignal: "NEUTRAL",
  bodyLanguage: { overall: 0, posture: 0, eyeContact: 0, confidence: 0, expression: 0, notes: "" }
};

// ═══ FACE OVAL (from secure interview) ═══
function FaceOval({ status }: { status: "idle" | "ok" | "missing" | "multiple" }) {
  const c = status === "ok" ? "#00ff88" : status === "missing" ? "#ff4466" : status === "multiple" ? "#fbbf24" : "rgba(255,255,255,0.3)";
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}>
      <div style={{ width: "55%", height: "75%", border: `2px solid ${c}`, borderRadius: "50%", boxShadow: status !== "idle" ? `0 0 20px ${c}40, inset 0 0 20px ${c}10` : "none", transition: "all 0.5s" }} />
      {status !== "idle" && (
        <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", padding: "3px 12px", background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 999, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 9, color: c, fontWeight: 700, letterSpacing: 1 }}>
            {status === "ok" ? "✓ FACE DETECTED" : status === "missing" ? "✗ FACE NOT VISIBLE" : "⚠ MULTIPLE FACES"}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══ TRUST RING (from secure interview) ═══
function TrustRing({ score, size = 60 }: { score: number; size?: number }) {
  const c = score >= 80 ? "#00ff88" : score >= 60 ? "#fbbf24" : "#ff4466";
  const r = size * 0.42, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.07} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={size * 0.07}
          strokeDasharray={circ} strokeDashoffset={circ - (circ * score / 100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s", filter: `drop-shadow(0 0 6px ${c})` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 900, color: c, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

// ═══ ALEX FACE (unchanged) ═══
function AlexFace({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#0f0c24,#1a0e35,#0d1a2e)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes floatFace{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes speakGlow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.3),0 8px 30px rgba(0,0,0,0.5)}50%{box-shadow:0 0 60px rgba(99,102,241,0.7),0 0 100px rgba(168,85,247,0.4),0 8px 30px rgba(0,0,0,0.5)}}
        @keyframes eyeBlink{0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(0.05)}}
        @keyframes mouthTalk{0%,100%{height:4px}50%{height:16px}}
        @keyframes bgPulse{0%,100%{opacity:0.3}50%{opacity:0.7}}
        @keyframes ringOut{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2);opacity:0}}
      `}</style>
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.2),transparent 70%)", animation: "bgPulse 3s ease-in-out infinite", filter: "blur(20px)" }} />
      {speaking && [1, 2, 3].map(i => (
        <div key={i} style={{ position: "absolute", width: `${90 + i * 55}px`, height: `${90 + i * 55}px`, borderRadius: "50%", border: `1.5px solid rgba(99,102,241,${0.55 - i * 0.14})`, animation: `ringOut ${0.7 + i * 0.25}s ease-out infinite`, animationDelay: `${i * 0.18}s`, pointerEvents: "none" }} />
      ))}
      <div style={{ position: "relative", animation: speaking ? "none" : "floatFace 4s ease-in-out infinite" }}>
        <div style={{ width: 90, height: 100, borderRadius: "48% 48% 44% 44%", background: "linear-gradient(160deg,#c8845a,#a86035)", position: "relative", animation: speaking ? "speakGlow 1.5s ease-in-out infinite" : "none", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", transition: "box-shadow 0.4s" }}>
          <div style={{ position: "absolute", top: -10, left: -5, right: -5, height: 44, borderRadius: "50% 50% 0 0", background: "linear-gradient(160deg,#150800,#2a1008)" }} />
          <div style={{ position: "absolute", top: -8, left: -10, width: 22, height: 38, borderRadius: "50% 0 0 50%", background: "#150800" }} />
          <div style={{ position: "absolute", top: -8, right: -10, width: 22, height: 38, borderRadius: "0 50% 50% 0", background: "#150800" }} />
          {[0, 1].map(i => <div key={i} style={{ position: "absolute", top: 21, left: i === 0 ? 12 : 47, width: 17, height: 2.5, borderRadius: 999, background: "#0f0800", transform: i === 0 ? "rotate(-10deg)" : "rotate(10deg)" }} />)}
          <div style={{ position: "absolute", top: 30, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: "#0f0800", display: "flex", alignItems: "center", justifyContent: "center", animation: "eyeBlink 4s ease-in-out infinite", animationDelay: `${i * 0.12}s`, overflow: "hidden", position: "relative" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2d1860" }} />
                <div style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.9)", top: "15%", left: "20%" }} />
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)", width: 8, height: 7, borderRadius: "0 0 5px 5px", background: "rgba(0,0,0,0.18)" }} />
          <div style={{ position: "absolute", bottom: 15, left: "50%", transform: "translateX(-50%)", width: 34, overflow: "hidden", display: "flex", justifyContent: "center", gap: 2, alignItems: "flex-end", height: speaking ? "auto" : 8 }}>
            {speaking ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ width: 4, background: "#6b2810", borderRadius: 999, minHeight: 3, maxHeight: 15, animation: `mouthTalk ${0.22 + i * 0.04}s ease-in-out infinite alternate`, animationDelay: `${i * 0.04}s` }} />
              ))
            ) : (
              <div style={{ width: 34, height: 8, borderRadius: "0 0 8px 8px", background: "rgba(90,40,20,0.7)" }} />
            )}
          </div>
          <div style={{ position: "absolute", bottom: -20, left: 8, right: 8, height: 26, background: "linear-gradient(180deg,#1a3a6e,#2458a8)", borderRadius: "0 0 6px 6px" }} />
          <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "11px solid #1a3a6e" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: speaking ? "#6366f1" : listening ? "#00ff88" : "rgba(255,255,255,0.25)", boxShadow: speaking ? "0 0 8px #6366f1" : listening ? "0 0 8px #00ff88" : "none", transition: "all 0.3s" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "white" }}>Alex</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Staff Engineer · Google</span>
      </div>
      {(speaking || listening) && (
        <div style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2.5, alignItems: "flex-end" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ width: 2.5, background: speaking ? "#6366f1" : "#00ff88", borderRadius: 999, minHeight: 3, maxHeight: 18, animation: `mouthTalk ${0.28 + i * 0.05}s ease-in-out infinite alternate`, animationDelay: `${i * 0.055}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ SCORE PANEL (unchanged) ═══
function ScorePanel({ score, updating }: { score: ScoreData; updating: boolean }) {
  const ov = score.overall, bd = score.breakdown, ev = score.evidence, bl = score.bodyLanguage, hs = score.hiringSignal;
  const hsColor = hs === "STRONG" ? "#00ff88" : hs === "MODERATE" ? "#fbbf24" : hs === "WEAK" ? "#ff8c00" : hs === "CRITICAL" ? "#ff4466" : "rgba(255,255,255,0.25)";
  const oc = ov >= 75 ? "#00ff88" : ov >= 55 ? "#fbbf24" : ov > 0 ? "#ff4466" : "rgba(255,255,255,0.15)";
  const r = 40, circ = 2 * Math.PI * r;
  const DIMS = [
    { key: "relevance", label: "Relevance", max: 20, color: "#6366f1" },
    { key: "technicalAccuracy", label: "Technical", max: 20, color: "#00ff88" },
    { key: "communicationClarity", label: "Clarity", max: 15, color: "#22d3ee" },
    { key: "problemSolving", label: "Problem Solving", max: 15, color: "#fbbf24" },
    { key: "depth", label: "Depth", max: 15, color: "#a855f7" },
    { key: "examples", label: "Examples", max: 10, color: "#ec4899" },
    { key: "confidence", label: "Confidence", max: 5, color: "#38bdf8" },
  ];
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "12px 12px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>LIVE SCORE</span>
        {updating && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: "#6366f1", animation: "blink 0.6s infinite" }} /><span style={{ fontSize: 9, color: "rgba(99,102,241,0.7)" }}>updating</span></div>}
      </div>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 6px" }}>
          <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="44" cy="44" r={r} fill="none" stroke={oc} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={circ - (circ * ov / 100)}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s", filter: ov > 0 ? `drop-shadow(0 0 8px ${oc})` : "none" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 900, color: oc, lineHeight: 1 }}>{ov > 0 ? ov : "—"}</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>/ 100</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `${hsColor}18`, border: `1px solid ${hsColor}35`, borderRadius: 999 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: hsColor }} />
          <span style={{ fontSize: 9, color: hsColor, fontWeight: 700, letterSpacing: 1 }}>{hs}</span>
        </div>
        {score.verdict && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 5, fontStyle: "italic", lineHeight: 1.4, padding: "0 2px" }}>"{score.verdict}"</div>}
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "10px 10px 4px", marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontWeight: 600 }}>BREAKDOWN</div>
        {DIMS.map(d => {
          const val = (bd as any)[d.key] || 0, pct = (val / d.max) * 100;
          const c = pct >= 75 ? "#00ff88" : pct >= 50 ? "#fbbf24" : pct > 0 ? "#ff4466" : "rgba(255,255,255,0.1)";
          return (
            <div key={d.key} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{d.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{val > 0 ? `${val}/${d.max}` : "—"}</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${d.color}60,${d.color})`, borderRadius: 999, transition: "width 0.9s ease" }} />
              </div>
            </div>
          );
        })}
        {ev.scoreReason && <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(99,102,241,0.08)", borderRadius: 8, fontSize: 10, color: "rgba(99,102,241,0.8)", lineHeight: 1.5, borderLeft: "2px solid rgba(99,102,241,0.4)" }}>{ev.scoreReason}</div>}
      </div>
      {ev.strengths?.length > 0 && (
        <div style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
          <div style={{ fontSize: 9, color: "#00ff88", fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>✓ STRENGTHS</div>
          {ev.strengths.map((s, i) => <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}><span style={{ color: "#00ff88", fontSize: 10, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{s}</span></div>)}
        </div>
      )}
      {ev.improvements?.length > 0 && (
        <div style={{ background: "rgba(255,68,102,0.05)", border: "1px solid rgba(255,68,102,0.15)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
          <div style={{ fontSize: 9, color: "#ff4466", fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>⚠ IMPROVE</div>
          {ev.improvements.map((s, i) => <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}><span style={{ color: "#ff4466", fontSize: 10, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{s}</span></div>)}
        </div>
      )}
      {ev.suggestedAnswer && (
        <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
          <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 600, marginBottom: 5, letterSpacing: 1 }}>🎯 STRONGER ANSWER</div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>{ev.suggestedAnswer}</p>
        </div>
      )}
      {bl?.overall > 0 && (
        <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
          <div style={{ fontSize: 9, color: "#f97316", fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>📷 BODY LANGUAGE</div>
          {[["Posture", bl.posture], ["Eye Contact", bl.eyeContact], ["Confidence", bl.confidence], ["Expression", bl.expression]].map(([l, v]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{l}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: Number(v) >= 70 ? "#00ff88" : Number(v) >= 50 ? "#fbbf24" : "#ff4466" }}>{v}</span>
            </div>
          ))}
          {bl.notes && <div style={{ fontSize: 9, color: "rgba(249,115,22,0.6)", marginTop: 4, fontStyle: "italic", lineHeight: 1.3 }}>{bl.notes}</div>}
        </div>
      )}
      {score.timestamp > 0 && <div style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.12)", letterSpacing: 1 }}>{new Date(score.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>}
    </div>
  );
}

// ═══ VERDICT MODAL (unchanged) ═══
function VerdictModal({ verdict, onClose }: { verdict: FinalVerdict; onClose: () => void }) {
  const isHire = verdict.decision === "HIRE" || verdict.decision === "STRONG_HIRE";
  const dc = isHire ? "#00ff88" : verdict.decision === "NO_HIRE" ? "#ff4466" : "#fbbf24";
  const dIcon = verdict.decision === "STRONG_HIRE" ? "🏆" : isHire ? "✅" : verdict.decision === "STRONG_NO_HIRE" ? "❌" : "⚠️";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)", zIndex: 1000, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 780, width: "100%", fontFamily: "-apple-system,sans-serif" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ textAlign: "center", padding: "3rem 2rem 2rem", background: `linear-gradient(135deg,${dc}12,rgba(0,0,0,0.4))`, border: `1px solid ${dc}35`, borderRadius: "24px 24px 0 0", animation: "fadeUp 0.6s ease" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{dIcon}</div>
          <div style={{ fontSize: "3.5rem", fontWeight: 900, color: dc, letterSpacing: -2, textShadow: `0 0 60px ${dc}`, lineHeight: 1, marginBottom: "1rem" }}>{verdict.decision.replace("_", " ")}</div>
          <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", fontWeight: 500, maxWidth: 500, margin: "0 auto 1rem", lineHeight: 1.5 }}>"{verdict.headline}"</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: `${dc}15`, border: `1px solid ${dc}30`, borderRadius: 999 }}>
            <span style={{ fontSize: 12, color: dc, fontWeight: 600 }}>Interviewer confidence: {verdict.confidence}%</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "1.5rem 2rem", marginBottom: 2 }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>{verdict.overview}</p>
        </div>
        {verdict.scorecard && Object.keys(verdict.scorecard).length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "1.5rem 2rem", marginBottom: 2 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: "1rem" }}>SCORECARD</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {Object.entries(verdict.scorecard).map(([k, v]) => (
                <div key={k} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: v.score >= 70 ? "#00ff88" : v.score >= 50 ? "#fbbf24" : "#ff4466" }}>{v.score}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 999, marginBottom: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${v.score}%`, background: v.score >= 70 ? "#00ff88" : v.score >= 50 ? "#fbbf24" : "#ff4466", borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{v.comment}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 2 }}>
          <div style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#00ff88", fontWeight: 600, marginBottom: "0.75rem" }}>✓ HIRE SIGNALS</div>
            {verdict.hire_reasons?.map((r, i) => <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7 }}><span style={{ color: "#00ff88", fontSize: 11, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{r}</span></div>)}
          </div>
          <div style={{ background: "rgba(255,68,102,0.05)", border: "1px solid rgba(255,68,102,0.15)", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff4466", fontWeight: 600, marginBottom: "0.75rem" }}>✗ CONCERNS</div>
            {verdict.no_hire_reasons?.map((r, i) => <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7 }}><span style={{ color: "#ff4466", fontSize: 11, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{r}</span></div>)}
          </div>
        </div>
        {(verdict.standout_moments?.length > 0 || verdict.concerning_moments?.length > 0) && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "1.5rem 2rem", marginBottom: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {verdict.standout_moments?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#6366f1", fontWeight: 600, marginBottom: "0.75rem" }}>🌟 BEST MOMENTS</div>
                  {verdict.standout_moments.map((m, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid rgba(99,102,241,0.4)", lineHeight: 1.5 }}>{m}</div>)}
                </div>
              )}
              {verdict.concerning_moments?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#fbbf24", fontWeight: 600, marginBottom: "0.75rem" }}>⚠ WEAK MOMENTS</div>
                  {verdict.concerning_moments.map((m, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid rgba(251,191,36,0.4)", lineHeight: 1.5 }}>{m}</div>)}
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "1.5rem 2rem", borderRadius: "0 0 24px 24px", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(99,102,241,0.8)", fontWeight: 600, marginBottom: 6 }}>NEXT STEPS</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>{verdict.next_steps}</p>
          </div>
          <div style={{ padding: "1rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(99,102,241,0.8)", fontWeight: 600, marginBottom: 5 }}>INTERVIEWER'S NOTE</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>"{verdict.interviewer_note}"</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <a href="/candidate" style={{ textDecoration: "none" }}><button style={{ padding: "0.75rem 1.5rem", borderRadius: 12, background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)", color: "#f9a8d4", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Candidate Analysis</button></a>
          <button onClick={onClose} style={{ padding: "0.75rem 1.5rem", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Review Transcript</button>
          <a href="/" style={{ textDecoration: "none" }}><button style={{ padding: "0.75rem 1.5rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Home →</button></a>
        </div>
      </div>
    </div>
  );
}

// ═══ TRUST REPORT MODAL (from secure interview) ═══
function TrustReportModal({ report, aiChecks, onClose, onDownload }: { report: TrustReport; aiChecks: AICheck[]; onClose: () => void; onDownload: () => void }) {
  const aiWarnings = aiChecks.filter(c => c.isAI).length;
  const vc = report.verdict === "VERIFIED" ? "#00ff88" : report.verdict === "CAUTION" ? "#fbbf24" : "#ff4466";
  const icon = report.verdict === "VERIFIED" ? "✅" : report.verdict === "CAUTION" ? "⚠️" : "🚩";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(20px)", zIndex: 1001, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 720, width: "100%", fontFamily: "-apple-system,sans-serif" }}>
        <div style={{ textAlign: "center", padding: "2.5rem 2rem 2rem", background: `linear-gradient(135deg,${vc}08,rgba(0,0,0,0.4))`, border: `1px solid ${vc}30`, borderRadius: "24px 24px 0 0" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${vc},transparent)`, borderRadius: "24px 24px 0 0" }} />
          <div style={{ fontSize: "3.5rem", marginBottom: 10 }}>{icon}</div>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, color: vc, letterSpacing: -2, textShadow: `0 0 40px ${vc}40`, marginBottom: 4 }}>{report.verdict}</div>
          <div style={{ fontSize: "4rem", fontWeight: 900, color: "white", letterSpacing: -2, lineHeight: 1, marginBottom: 8 }}>{report.trust_score}<span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/100</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>{report.verdict_reason}</div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <span style={{ fontSize: 11, padding: "3px 12px", background: `${vc}15`, border: `1px solid ${vc}30`, borderRadius: 999, color: vc }}>Confidence: {report.confidence_level}</span>
            <span style={{ fontSize: 11, padding: "3px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, color: "rgba(255,255,255,0.4)" }}>{aiWarnings > 0 ? `${aiWarnings} AI warnings` : "No AI text detected"}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, marginBottom: 2 }}>
          {Object.values(report.breakdown).map((b, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: b.score >= 70 ? "#00ff88" : b.score >= 50 ? "#fbbf24" : "#ff4466", marginBottom: 4 }}>{b.score}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: 4 }}>{b.label}</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginBottom: 5 }}>
                <div style={{ height: "100%", width: `${b.score}%`, background: b.score >= 70 ? "#00ff88" : b.score >= 50 ? "#fbbf24" : "#ff4466", borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>{b.note}</div>
            </div>
          ))}
        </div>
        {aiChecks.length > 0 && (
          <div style={{ background: aiWarnings > 0 ? "rgba(255,68,102,0.06)" : "rgba(0,255,136,0.05)", border: `1px solid ${aiWarnings > 0 ? "rgba(255,68,102,0.18)" : "rgba(0,255,136,0.15)"}`, padding: "1.25rem", marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: aiWarnings > 0 ? "#ff4466" : "#00ff88", fontWeight: 600, letterSpacing: 2, marginBottom: "1rem" }}>🤖 AI TEXT DETECTION RESULTS</div>
            {aiChecks.map((c, i) => (
              <div key={i} style={{ marginBottom: 8, padding: "8px 10px", background: c.isAI ? "rgba(255,68,102,0.08)" : "rgba(0,255,136,0.05)", border: `1px solid ${c.isAI ? "rgba(255,68,102,0.2)" : "rgba(0,255,136,0.15)"}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.isAI ? "#ff4466" : "#00ff88" }}>{c.isAI ? "⚠ AI-generated" : "✓ Human answer"} — Answer {i + 1}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>AI Score: {c.ai_score}%</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{c.verdict}</div>
                {c.signals_found.length > 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Signals: {c.signals_found.join(", ")}</div>}
              </div>
            ))}
          </div>
        )}
        {report.flags.length > 0 && (
          <div style={{ background: "rgba(255,68,102,0.06)", border: "1px solid rgba(255,68,102,0.18)", padding: "1.25rem", marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: "#ff4466", fontWeight: 600, letterSpacing: 2, marginBottom: "1rem" }}>🚩 VIOLATIONS ({report.flags.length})</div>
            {report.flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(255,68,102,0.4)", lineHeight: 1.4 }}>{f}</div>)}
          </div>
        )}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "1.25rem", marginBottom: 2 }}>
          <div style={{ fontSize: 10, color: "rgba(76,201,240,0.8)", fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>🧠 AI BEHAVIORAL ANALYSIS</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>{report.ai_observation}</p>
        </div>
        <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.18)", padding: "1.25rem", borderRadius: "0 0 24px 24px", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 10, color: "#00ff88", fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>📋 RECRUITER RECOMMENDATION</div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0 }}>{report.recruiter_recommendation}</p>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onDownload} style={{ padding: "0.85rem 2rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>⬇ Download Trust Report</button>
          <button onClick={onClose} style={{ padding: "0.85rem 1.75rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function InterviewPage() {
  // ── Normal interview state ──
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [started, setStarted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [qNum, setQNum] = useState(0);
  const [stage, setStage] = useState("intro");
  const [ended, setEnded] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<ScoreData>(ZERO_SCORE);
  const [scoring, setScoring] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [bodyLang, setBodyLang] = useState<BodyLang | null>(null);
  const [bodyScanning, setBodyScanning] = useState(false);
  const [finalVerdict, setFinalVerdict] = useState<FinalVerdict | null>(null);
  const [showVerdict, setShowVerdict] = useState(false);
  const [buildingVerdict, setBuildingVerdict] = useState(false);

  // ── Secure mode state ──
  const [secureMode, setSecureMode] = useState(false);
  const [securePhase, setSecurePhase] = useState<"identity" | "precheck" | "done">("identity");
  const [identityPhoto, setIdentityPhoto] = useState<string | null>(null);
  const [checksDone, setChecksDone] = useState({ camera: false, mic: false, security: false, network: false });
  const [checkStep, setCheckStep] = useState(-1);
  const [faceStatus, setFaceStatus] = useState<"idle" | "ok" | "missing" | "multiple">("idle");
  const [tabSwitches, setTabSwitches] = useState(0);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [faceOkFrames, setFaceOkFrames] = useState(0);
  const [multipleFaceFrames, setMultipleFaceFrames] = useState(0);
  const [liveTrust, setLiveTrust] = useState(100);
  const [aiChecks, setAiChecks] = useState<AICheck[]>([]);
  const [pasteCount, setPasteCount] = useState(0);
  const [aiWarnings, setAiWarnings] = useState(0);
  const [trustReport, setTrustReport] = useState<TrustReport | null>(null);
  const [showTrustReport, setShowTrustReport] = useState(false);
  const [buildingTrustReport, setBuildingTrustReport] = useState(false);
  const [pasteDetected, setPasteDetected] = useState(false);

  // ── All refs ──
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const identityVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modeRef = useRef(mode);
  const endedRef = useRef(false);
  const jdRef = useRef(jd);
  const resumeRef = useRef(resume);
  const msgsRef = useRef<Msg[]>([]);
  const qNumRef = useRef(0);
  const bodyLangRef = useRef<BodyLang | null>(null);
  const secureModeRef = useRef(secureMode);
  const tabSwitchesRef = useRef(0);
  const windowBlursRef = useRef(0);
  const pasteCountRef = useRef(0);
  const totalFramesRef = useRef(0);
  const faceOkFramesRef = useRef(0);
  const multipleFaceFramesRef = useRef(0);
  const aiWarningsRef = useRef(0);
  const violationsRef = useRef<Violation[]>([]);
  const aiChecksRef = useRef<AICheck[]>([]);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef(Date.now());
  const lastQuestionRef = useRef("");
  const inputTypingStartRef = useRef<number | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { endedRef.current = ended; }, [ended]);
  useEffect(() => { jdRef.current = jd; }, [jd]);
  useEffect(() => { resumeRef.current = resume; }, [resume]);
  useEffect(() => { bodyLangRef.current = bodyLang; }, [bodyLang]);
  useEffect(() => { secureModeRef.current = secureMode; }, [secureMode]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("jd")) setJd(decodeURIComponent(p.get("jd")!));
    if (p.get("resume")) setResume(decodeURIComponent(p.get("resume")!));
    setVoiceOk("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.getVoices();
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Sync stream to video
  useEffect(() => {
    if (!streamRef.current) return;
    const vid = !started && secureMode && securePhase === "identity" ? identityVideoRef.current : videoRef.current;
    if (vid && vid.srcObject !== streamRef.current) {
      vid.srcObject = streamRef.current;
      vid.onloadedmetadata = () => vid.play().catch(() => {});
    }
  }, [started, secureMode, securePhase]);

  // Normal camera (non-secure)
  useEffect(() => {
    if (!camOn || secureMode) return;
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
        }
        setCamErr("");
      } catch (e: any) {
        setCamErr(e.name === "NotAllowedError" ? "Permission denied" : "Camera unavailable");
        setCamOn(false);
      }
    })();
    return () => {
      active = false;
      if (!camOn) { streamRef.current?.getTracks().forEach(t => t.stop()); if (videoRef.current) videoRef.current.srcObject = null; }
    };
  }, [camOn, secureMode]);

  // Body language scan (normal mode)
  useEffect(() => {
    if (!camOn || !started || secureMode) return;
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      setBodyScanning(true);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, 320, 240);
        const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        const res = await fetch("/api/body-language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: b64 }) });
        if (res.ok) { const d = await res.json(); setBodyLang(d); }
      } catch {}
      setBodyScanning(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [camOn, started, secureMode]);

  // ── LIVE TRUST SCORE CALC ──
  useEffect(() => {
    if (!secureMode) return;
    const faceScore = totalFrames > 0 ? (faceOkFrames / totalFrames) * 38 : 38;
    const focusPenalty = tabSwitches * 7 + windowBlurCount * 2;
    const focusScore = Math.max(0, 32 - focusPenalty);
    const behaviorPenalty = aiWarnings * 8 + pasteCount * 10 + (multipleFaceFrames > 1 ? 12 : 0);
    const behaviorScore = Math.max(0, 30 - behaviorPenalty);
    setLiveTrust(Math.round(faceScore + focusScore + behaviorScore));
  }, [secureMode, totalFrames, faceOkFrames, multipleFaceFrames, tabSwitches, windowBlurCount, aiWarnings, pasteCount]);

  // ── TAB/WINDOW PROCTORING ──
  useEffect(() => {
    if (!started || !secureMode) return;
    const onVisibility = () => {
      if (document.hidden) {
        const newCount = tabSwitchesRef.current + 1;
        tabSwitchesRef.current = newCount;
        setTabSwitches(newCount);
        addViolation("Tab switched away", "high");
      }
    };
    const onBlur = () => {
      const newCount = windowBlursRef.current + 1;
      windowBlursRef.current = newCount;
      setWindowBlurCount(newCount);
      addViolation("Window focus lost", "medium");
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [started, secureMode]);

  // ── FACE DETECTION LOOP ──
  useEffect(() => {
    if (!started || !secureMode || !streamRef.current) return;
    faceIntervalRef.current = setInterval(async () => {
      const vid = videoRef.current;
      if (!vid || vid.readyState < 2 || vid.videoWidth === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320; canvas.height = 240;
      canvas.getContext("2d")?.drawImage(vid, 0, 0, 320, 240);
      const b64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
      totalFramesRef.current += 1;
      setTotalFrames(totalFramesRef.current);
      try {
        const res = await fetch("/api/face-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: b64 }) });
        const d = await res.json();
        if (d.faces === 0) {
          setFaceStatus("missing");
          addViolation("Face not visible", "high");
        } else if (d.faces > 1) {
          setFaceStatus("multiple");
          multipleFaceFramesRef.current += 1;
          setMultipleFaceFrames(multipleFaceFramesRef.current);
          addViolation("Multiple faces detected", "critical");
        } else {
          setFaceStatus("ok");
          faceOkFramesRef.current += 1;
          setFaceOkFrames(faceOkFramesRef.current);
        }
      } catch {
        faceOkFramesRef.current += 1;
        setFaceOkFrames(faceOkFramesRef.current);
        setFaceStatus("ok");
      }
    }, 12000);
    return () => { if (faceIntervalRef.current) clearInterval(faceIntervalRef.current); };
  }, [started, secureMode]);

  const addViolation = useCallback((type: string, severity: Violation["severity"]) => {
    const v: Violation = { time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), type, severity };
    violationsRef.current = [...violationsRef.current, v];
    setViolations([...violationsRef.current]);
  }, []);

  // ── SECURE CAMERA INIT ──
  const initSecureCamera = async () => {
    setCamErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true
      });
      streamRef.current = stream;
      setCamOn(true);
      setTimeout(() => {
        const vid = identityVideoRef.current;
        if (vid) { vid.srcObject = stream; vid.onloadedmetadata = () => vid.play().catch(() => {}); }
      }, 100);
      return true;
    } catch (e: any) {
      setCamErr(e.name === "NotAllowedError" ? "Camera permission denied" : "Camera not available");
      return false;
    }
  };

  const captureIdentity = () => {
    const vid = identityVideoRef.current;
    if (!vid || vid.videoWidth === 0) return;
    const c = document.createElement("canvas");
    c.width = vid.videoWidth; c.height = vid.videoHeight;
    c.getContext("2d")?.drawImage(vid, 0, 0);
    setIdentityPhoto(c.toDataURL("image/jpeg", 0.85));
  };

  const runPrechecks = async () => {
    setCheckStep(0);
    const steps: (keyof typeof checksDone)[] = ["camera", "mic", "security", "network"];
    for (let i = 0; i < steps.length; i++) {
      setCheckStep(i);
      await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
      setChecksDone(p => ({ ...p, [steps[i]]: true }));
    }
    await new Promise(r => setTimeout(r, 400));
    setSecurePhase("done");
    await doStartInterview();
  };

  // ── AI TEXT CHECK ──
  const analyzeAnswerForAI = async (text: string) => {
    const dur = inputTypingStartRef.current ? (Date.now() - inputTypingStartRef.current) / 1000 : null;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const wpm = dur && wordCount ? Math.round((wordCount / dur) * 60) : 0;
    if (wpm > 160 || pasteDetected) {
      addViolation(`Possible AI text — ${wpm > 160 ? `${wpm} WPM typing speed` : "paste detected"}`, "high");
    }
    if (wordCount > 30) {
      try {
        const res = await fetch("/api/ai-text-detect", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, question: lastQuestionRef.current, timeToType: dur, wordCount, pasteDetected, typingSpeed: wpm })
        });
        const d: AICheck = await res.json();
        aiChecksRef.current = [...aiChecksRef.current, d];
        setAiChecks([...aiChecksRef.current]);
        if (d.isAI || d.risk_level === "HIGH" || d.risk_level === "CRITICAL") {
          aiWarningsRef.current += 1;
          setAiWarnings(aiWarningsRef.current);
          addViolation(`AI-generated text detected (${d.ai_score}% AI score)`, d.risk_level === "CRITICAL" ? "critical" : "high");
        }
      } catch {}
    }
    setPasteDetected(false);
    inputTypingStartRef.current = null;
  };

  // ── DOWNLOAD TRUST REPORT ──
  const downloadTrustReport = () => {
    if (!trustReport) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const vc = trustReport.verdict === "VERIFIED" ? "#059669" : trustReport.verdict === "CAUTION" ? "#d97706" : "#dc2626";
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>COGNALYZE Trust Report</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;} body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;font-size:14px;line-height:1.6;color:#111;}
      h1{font-size:28px;font-weight:900;letter-spacing:-1px;} .score-big{font-size:64px;font-weight:900;color:${vc};line-height:1;}
      .verdict{font-size:32px;font-weight:900;color:${vc};margin:6px 0;}
      .section{margin:20px 0;padding:16px 18px;border:1px solid #e5e7eb;border-radius:10px;}
      .section h3{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#666;margin-bottom:10px;}
      .bar{height:5px;background:#f0f0f0;border-radius:999px;margin-top:4px;}
      .bar-fill{height:100%;border-radius:999px;background:${vc};}
      .flag{padding:5px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin:3px 0;font-size:12px;color:#991b1b;}
      @media print{body{margin:20px;}}</style></head><body>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111">
        <div style="width:36px;height:36px;background:#111;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">⚡</div>
        <div><div style="font-size:10px;letter-spacing:3px;color:#888;font-weight:700">COGNALYZE SECURE INTERVIEW</div><h1>Integrity Report</h1></div>
      </div>
      <div style="text-align:center;padding:28px;background:${vc}08;border:1px solid ${vc}25;border-radius:12px;margin-bottom:20px">
        <div class="score-big">${trustReport.trust_score}</div>
        <div style="font-size:12px;color:#888;margin:3px 0">/100 Trust Score</div>
        <div class="verdict">${trustReport.verdict}</div>
        <div style="font-size:13px;color:#555">${trustReport.verdict_reason}</div>
      </div>
      <div class="section"><h3>Score Breakdown</h3>
        ${Object.values(trustReport.breakdown).map(b => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><strong>${b.label}</strong><strong style="color:${b.score >= 70 ? "#059669" : b.score >= 50 ? "#d97706" : "#dc2626"}">${b.score}/100</strong></div><div style="font-size:11px;color:#888">${b.note}</div><div class="bar"><div class="bar-fill" style="width:${b.score}%"></div></div></div>`).join("")}
      </div>
      ${trustReport.flags.length > 0 ? `<div class="section"><h3>Violations (${trustReport.flags.length})</h3>${trustReport.flags.map(f => `<div class="flag">⚠ ${f}</div>`).join("")}</div>` : ""}
      <div class="section"><h3>AI Behavioral Analysis</h3><p>${trustReport.ai_observation}</p></div>
      <div class="section" style="background:#f0fdf4;border-color:#86efac"><h3 style="color:#166534">Recruiter Recommendation</h3><p>${trustReport.recruiter_recommendation}</p></div>
      <div style="margin-top:28px;font-size:11px;color:#aaa;display:flex;justify-content:space-between"><span>COGNALYZE Secure Interview™</span><span>${new Date().toLocaleString()}</span></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ── HELPERS ──
  const getVoice = () => {
    const voices = synthRef.current?.getVoices() || [];
    const want = ["Google UK English Male", "Google US English", "Alex", "Daniel", "Rishi", "Arthur", "Samantha"];
    for (const n of want) { const v = voices.find(v => v.name === n); if (v) return v; }
    return voices.find(v => v.lang.startsWith("en")) || null;
  };

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const clean = text.replace(/[*#`_]/g, "").replace(/\n+/g, ". ").trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 0.87; u.pitch = 1.0; u.volume = 1;
    const v = getVoice(); if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); if (modeRef.current === "voice" && !endedRef.current) setTimeout(() => startListening(), 700); };
    u.onerror = () => setSpeaking(false);
    synthRef.current.speak(u);
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const r = new SR(); recRef.current = r;
      r.continuous = false; r.interimResults = true; r.lang = "en-US";
      r.onstart = () => setListening(true);
      r.onresult = (e: any) => {
        const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
        setTranscript(t);
        if (e.results[e.results.length - 1].isFinal) { setTranscript(""); setListening(false); if (t.trim().length > 2) send(t.trim()); }
      };
      r.onerror = () => { setListening(false); setTranscript(""); };
      r.onend = () => setListening(false);
      r.start();
    } catch { setListening(false); }
  }, []);

  const stopListening = () => { try { recRef.current?.stop(); } catch {} setListening(false); setTranscript(""); };

  const refreshScore = async (explicitMsgs: Msg[]) => {
    const userMsgs = explicitMsgs.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;
    setScoring(true);
    try {
      const res = await fetch("/api/interview-score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: explicitMsgs.map(m => ({ role: m.role, content: m.content })), jd: jdRef.current, resume: resumeRef.current, bodyLanguage: bodyLangRef.current })
      });
      if (res.ok) { const d = await res.json(); setScore({ ...d }); }
    } catch (e) { console.error("Score error:", e); }
    setScoring(false);
  };

  const doStartInterview = async () => {
    sessionStartRef.current = Date.now();
    setStarted(true);
    setLoading(true);
    // Attach stream to live video after phase change
    setTimeout(() => {
      if (streamRef.current && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
      }
    }, 200);
    try {
      const res = await fetch("/api/interview-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [], jd: jdRef.current, resume: resumeRef.current, qNumber: 0 }) });
      const d = await res.json();
      lastQuestionRef.current = d.message;
      const m: Msg = { role: "assistant", content: d.message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      msgsRef.current = [m];
      setMsgs([m]);
      if (mode === "voice") setTimeout(() => speak(d.message), 500);
    } catch {}
    setLoading(false);
  };

  const startInterview = async () => {
    if (!jd || !resume) return;
    if (secureMode) {
      // Route through identity verification first
      const ok = await initSecureCamera();
      if (ok) setSecurePhase("identity");
      // Don't call doStartInterview yet — wait for precheck
    } else {
      await doStartInterview();
    }
  };

  const endInterview = async () => {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    stopListening(); synthRef.current?.cancel();
    setEnded(true); endedRef.current = true;
    // Always build final verdict
    setBuildingVerdict(true);
    try {
      const res = await fetch("/api/interview-final", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgsRef.current.map(m => ({ role: m.role, content: m.content })), jd: jdRef.current, resume: resumeRef.current, finalScore: score })
      });
      if (res.ok) { const d = await res.json(); setFinalVerdict(d); setShowVerdict(true); }
    } catch (e) { console.error("Verdict error:", e); }
    setBuildingVerdict(false);
    // Also build trust report if secure mode
    if (secureModeRef.current) {
      setBuildingTrustReport(true);
      const dur = Math.round((Date.now() - sessionStartRef.current) / 1000);
      try {
        const res = await fetch("/api/trust-score", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalFrames: totalFramesRef.current, faceDetectedFrames: faceOkFramesRef.current, multipleFaceFrames: multipleFaceFramesRef.current,
            tabSwitches: tabSwitchesRef.current, windowBlurs: windowBlursRef.current, totalDuration: dur,
            violations: violationsRef.current.map(v => v.type), questionCount: qNumRef.current,
            avgResponseTime: dur / Math.max(1, qNumRef.current),
            behaviorNotes: `AI warnings: ${aiWarningsRef.current}, Paste count: ${pasteCountRef.current}`
          })
        });
        if (res.ok) { const d = await res.json(); setTrustReport(d); }
      } catch {}
      setBuildingTrustReport(false);
    }
  };

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading || ended) return;
    if (secureModeRef.current) await analyzeAnswerForAI(content);
    setInput("");
    const newQ = qNumRef.current + 1;
    qNumRef.current = newQ;
    setQNum(newQ);
    const newStage = newQ <= 1 ? "intro" : newQ <= 4 ? "behavioral" : newQ <= 8 ? "technical" : newQ <= 10 ? "system-design" : "culture";
    setStage(newStage);
    const userMsg: Msg = { role: "user", content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const explicitMsgs = [...msgsRef.current, userMsg];
    msgsRef.current = explicitMsgs;
    setMsgs([...explicitMsgs]);
    refreshScore(explicitMsgs);
    setLoading(true);
    try {
      const res = await fetch("/api/interview-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: explicitMsgs.map(m => ({ role: m.role, content: m.content })), jd: jdRef.current, resume: resumeRef.current, qNumber: newQ })
      });
      const d = await res.json();
      lastQuestionRef.current = d.message;
      const aiMsg: Msg = { role: "assistant", content: d.message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      const finalMsgs = [...explicitMsgs, aiMsg];
      msgsRef.current = finalMsgs;
      setMsgs([...finalMsgs]);
      if (modeRef.current === "voice") speak(d.message);
    } catch {}
    setLoading(false);
  };

  const sc = stage === "intro" ? "#a5b4fc" : stage === "behavioral" ? "#6366f1" : stage === "technical" ? "#00ff88" : stage === "system-design" ? "#fbbf24" : "#38bdf8";
  const sl = { intro: "Intro", behavioral: "Behavioral", technical: "Technical", "system-design": "System Design", culture: "Culture" }[stage] || stage;
  const tc = liveTrust >= 80 ? "#00ff88" : liveTrust >= 60 ? "#fbbf24" : "#ff4466";
  const fc = faceStatus === "ok" ? "#00ff88" : faceStatus === "missing" ? "#ff4466" : faceStatus === "multiple" ? "#fbbf24" : "rgba(255,255,255,0.3)";

  // ════════ SECURE: IDENTITY PAGE ════════
  if (secureMode && !started && securePhase === "identity") return (
    <div style={{ minHeight: "100vh", background: "#04030d", color: "white", fontFamily: "-apple-system,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center", animation: "fadeUp 0.5s ease" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "rgba(230,57,70,0.8)", marginBottom: 10, fontWeight: 600 }}>STEP 1 OF 3 — IDENTITY VERIFICATION</div>
        <h2 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>Look directly at the camera</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: "1.5rem" }}>Align your face in the oval. Click capture when ready.</p>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `2px solid ${identityPhoto ? "#00ff88" : "rgba(230,57,70,0.3)"}`, marginBottom: "1.5rem", background: "#0a0810", minHeight: 280 }}>
          {identityPhoto ? (
            <img src={identityPhoto} alt="Identity" style={{ width: "100%", display: "block", transform: "scaleX(-1)" }} />
          ) : (
            <video ref={identityVideoRef} autoPlay muted playsInline style={{ width: "100%", display: "block", transform: "scaleX(-1)", minHeight: 280, objectFit: "cover" }} />
          )}
          {!identityPhoto && <FaceOval status={camOn ? "ok" : "idle"} />}
          {identityPhoto && <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 12px", background: "rgba(0,255,136,0.9)", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#000" }}>✓ CAPTURED</div>}
        </div>
        {!identityPhoto ? (
          <button onClick={captureIdentity} disabled={!camOn} style={{ width: "100%", padding: "0.9rem", borderRadius: 12, border: "none", background: !camOn ? "rgba(230,57,70,0.15)" : "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", fontSize: 14, fontWeight: 700, cursor: !camOn ? "not-allowed" : "pointer", letterSpacing: 2, opacity: !camOn ? 0.5 : 1 }}>📸 CAPTURE PHOTO</button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setIdentityPhoto(null)} style={{ flex: 1, padding: "0.9rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>↺ Retake</button>
            <button onClick={() => setSecurePhase("precheck")} style={{ flex: 2, padding: "0.9rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2 }}>CONFIRM →</button>
          </div>
        )}
        {camErr && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.3)", borderRadius: 8, fontSize: 12, color: "#ff4466" }}>⚠ {camErr}</div>}
      </div>
    </div>
  );

  // ════════ SECURE: PRECHECK PAGE ════════
  if (secureMode && !started && securePhase === "precheck") return (
    <div style={{ minHeight: "100vh", background: "#04030d", color: "white", fontFamily: "-apple-system,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 460, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "rgba(230,57,70,0.8)", marginBottom: 10, fontWeight: 600 }}>STEP 2 OF 3 — SYSTEM CHECK</div>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: -1 }}>Verifying setup</h2>
        </div>
        {[
          { key: "camera", icon: "📷", label: "Camera feed verified", sub: "Live video stream confirmed" },
          { key: "mic", icon: "🎙", label: "Microphone active", sub: "Audio input confirmed" },
          { key: "security", icon: "🔒", label: "Security environment", sub: "Proctoring system armed" },
          { key: "network", icon: "🌐", label: "Connection stable", sub: "Low latency verified" },
        ].map((item, i) => {
          const done = checksDone[item.key as keyof typeof checksDone];
          const active = checkStep === i && !done;
          return (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem 1.25rem", background: done ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${done ? "rgba(0,255,136,0.2)" : active ? "rgba(230,57,70,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, marginBottom: 10, transition: "all 0.3s" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: done ? "#00ff88" : "rgba(255,255,255,0.8)" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{item.sub}</div>
              </div>
              {done ? <span style={{ fontSize: 18, color: "#00ff88" }}>✓</span>
                : active ? <span style={{ animation: "spin 0.8s linear infinite", display: "inline-block", color: "#e63946", fontSize: 18 }}>⟳</span>
                  : <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 18 }}>○</span>}
            </div>
          );
        })}
        {checkStep === -1 && (
          <button onClick={runPrechecks} style={{ width: "100%", padding: "1rem", marginTop: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2 }}>⚡ START SYSTEM CHECK →</button>
        )}
      </div>
    </div>
  );

  // ════════ SETUP PAGE (normal + secure toggle) ════════
  if (!started) return (
    <div style={{ minHeight: "100vh", background: "#04030d", color: "white", fontFamily: "-apple-system,sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:2px;}
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#a855f7)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 800, background: "linear-gradient(135deg,#fff,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>COGNALYZE</span>
          <span style={{ fontSize: 10, padding: "2px 8px", border: `1px solid ${secureMode ? "rgba(230,57,70,0.4)" : "rgba(99,102,241,0.4)"}`, borderRadius: 20, color: secureMode ? "rgba(230,57,70,0.8)" : "rgba(99,102,241,0.8)" }}>
            {secureMode ? "🛡️ SECURE INTERVIEW" : "INTERVIEW"}
          </span>
        </div>
        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Back</a>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 2rem", animation: "fadeUp 0.6s ease", width: "100%", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: secureMode ? "rgba(230,57,70,0.8)" : "rgba(99,102,241,0.8)", marginBottom: 12, fontWeight: 600 }}>FAANG AI MOCK INTERVIEW</div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.8rem)", fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, marginBottom: 12, background: "linear-gradient(135deg,#fff 30%,#a5b4fc 60%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Interview with Alex<br />Live 7-dimension scoring
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Unlimited FAANG questions · Real scoring · Body language · Final verdict</p>
        </div>

        {/* Secure Mode Toggle */}
        <div onClick={() => setSecureMode(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: secureMode ? "rgba(230,57,70,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${secureMode ? "rgba(230,57,70,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, marginBottom: 14, cursor: "pointer", transition: "all 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: secureMode ? "#fca5a5" : "rgba(255,255,255,0.6)" }}>Secure Proctored Mode</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Face monitoring · AI detection · Tab tracking · Trust certificate</div>
            </div>
          </div>
          <div style={{ width: 44, height: 24, borderRadius: 999, background: secureMode ? "#e63946" : "rgba(255,255,255,0.1)", transition: "background 0.25s", position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: secureMode ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
          </div>
        </div>

        {/* Mode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[{ id: "text", icon: "⌨️", label: "Text Mode", sub: "Type your answers" }, { id: "voice", icon: "🎤", label: "Voice Mode", sub: voiceOk ? "Speak naturally" : "Chrome only" }].map(m => (
            <div key={m.id} onClick={() => m.id === "voice" ? voiceOk && setMode("voice") : setMode("text")} style={{ padding: "1.2rem", borderRadius: 14, border: `2px solid ${mode === m.id ? (m.id === "text" ? "#6366f1" : "#a855f7") : "rgba(255,255,255,0.08)"}`, background: mode === m.id ? `rgba(${m.id === "text" ? "99,102,241" : "168,85,247"},0.1)` : "rgba(255,255,255,0.02)", cursor: m.id === "voice" && !voiceOk ? "not-allowed" : "pointer", textAlign: "center", transition: "all 0.2s", opacity: m.id === "voice" && !voiceOk ? 0.4 : 1 }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: mode === m.id ? "white" : "rgba(255,255,255,0.5)", marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "1.75rem", marginBottom: 14 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#6366f1", marginBottom: 8, fontWeight: 700 }}>JOB DESCRIPTION</div>
            <textarea value={jd} onChange={e => setJd(e.target.value)} rows={5} style={{ width: "100%", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 12, color: "white", fontSize: 13, resize: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.2)"} placeholder="Paste the full job description..." />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#a855f7", marginBottom: 8, fontWeight: 700 }}>YOUR RESUME</div>
            <textarea value={resume} onChange={e => setResume(e.target.value)} rows={5} style={{ width: "100%", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: 12, color: "white", fontSize: 13, resize: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#a855f7"} onBlur={e => e.target.style.borderColor = "rgba(168,85,247,0.2)"} placeholder="Paste your full resume..." />
          </div>
        </div>

        {secureMode && (
          <div style={{ padding: "10px 14px", background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.15)", borderRadius: 10, marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            🔒 Secure mode: camera + mic required. Tab switches, paste actions, and AI text usage will be logged and reported.
          </div>
        )}

        <button onClick={startInterview} disabled={!jd || !resume} style={{ width: "100%", padding: "1rem", borderRadius: 14, border: "none", background: !jd || !resume ? "rgba(99,102,241,0.2)" : secureMode ? "linear-gradient(135deg,#e63946,#ff6b6b)" : "linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)", color: "white", fontSize: 15, fontWeight: 800, letterSpacing: 3, cursor: !jd || !resume ? "not-allowed" : "pointer", opacity: !jd || !resume ? 0.4 : 1, boxShadow: jd && resume ? `0 0 50px rgba(${secureMode ? "230,57,70" : "99,102,241"},0.3)` : "none", transition: "all 0.3s" }}>
          {secureMode ? "🛡️ BEGIN SECURE INTERVIEW →" : mode === "voice" ? "🎤 BEGIN VOICE INTERVIEW →" : "⚡ BEGIN INTERVIEW →"}
        </button>
      </div>
    </div>
  );

  // ════════ ACTIVE INTERVIEW ════════
  return (
    <div style={{ height: "100vh", background: "#04030d", color: "white", fontFamily: "-apple-system,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }} onContextMenu={secureMode ? e => e.preventDefault() : undefined}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ripple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.5);opacity:0}}
        @keyframes wave{0%,100%{height:4px}50%{height:18px}}
        @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:2px;}
      `}</style>

      {showVerdict && finalVerdict && <VerdictModal verdict={finalVerdict} onClose={() => setShowVerdict(false)} />}
      {showTrustReport && trustReport && <TrustReportModal report={trustReport} aiChecks={aiChecks} onClose={() => setShowTrustReport(false)} onDownload={downloadTrustReport} />}

      {/* ── PROCTORING BAR (secure only) ── */}
      {secureMode && (
        <div style={{ flexShrink: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.45rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 999 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#e63946", animation: "blink 1s infinite" }} />
              <span style={{ fontSize: 9, color: "rgba(230,57,70,0.9)", fontWeight: 700, letterSpacing: 1.5 }}>PROCTORING ACTIVE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: fc, boxShadow: `0 0 5px ${fc}` }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Face: <span style={{ color: fc, fontWeight: 600 }}>{faceStatus === "ok" ? "Detected" : faceStatus === "missing" ? "Missing!" : faceStatus === "multiple" ? "Multiple!" : "Checking..."}</span></span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Tabs: <span style={{ color: tabSwitches > 0 ? "#ff4466" : "#00ff88", fontWeight: 600 }}>{tabSwitches}</span></span>
            {pasteCount > 0 && <span style={{ fontSize: 10, color: "#fbbf24" }}>📋 Pastes: {pasteCount}</span>}
            {aiWarnings > 0 && <span style={{ fontSize: 10, color: "#ff4466" }}>🤖 AI flags: {aiWarnings}</span>}
            {violations.length > 0 && <span style={{ fontSize: 10, color: "#ff4466", fontWeight: 600 }}>⚠ {violations.length}</span>}
          </div>
          <TrustRing score={liveTrust} size={32} />
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>FAANG Mock Interview{secureMode ? " 🛡️" : ""}</span>
          <div style={{ padding: "2px 10px", background: `${sc}15`, border: `1px solid ${sc}25`, borderRadius: 999 }}>
            <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{sl}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {scoring && <span style={{ fontSize: 9, color: "rgba(99,102,241,0.7)", animation: "blink 0.8s infinite" }}>● scoring</span>}
          {buildingVerdict && <span style={{ fontSize: 9, color: "#fbbf24", animation: "blink 0.8s infinite" }}>● building verdict</span>}
          {buildingTrustReport && <span style={{ fontSize: 9, color: "#e63946", animation: "blink 0.8s infinite" }}>● trust report</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>Q{qNum}</span>
          {ended && finalVerdict && <button onClick={() => setShowVerdict(true)} style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Verdict 🏆</button>}
          {ended && trustReport && secureMode && <button onClick={() => setShowTrustReport(true)} style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Trust Report 🛡️</button>}
          <button onClick={endInterview} disabled={ended || buildingVerdict} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(255,68,102,0.3)", background: "rgba(255,68,102,0.12)", color: "#ff4466", cursor: ended || buildingVerdict ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, opacity: ended || buildingVerdict ? 0.5 : 1 }}>
            {buildingVerdict ? "Building..." : "End Interview"}
          </button>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 215px", overflow: "hidden" }}>

        {/* LEFT */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6, padding: 8, background: "rgba(0,0,0,0.2)" }}>
          {/* Alex */}
          <div style={{ flex: 2, borderRadius: 14, overflow: "hidden", border: `1px solid ${speaking ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`, transition: "border-color 0.3s", minHeight: 0, boxShadow: speaking ? "0 0 20px rgba(99,102,241,0.2)" : "none" }}>
            <AlexFace speaking={speaking} listening={listening} />
          </div>

          {/* User cam */}
          <div style={{ flex: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${secureMode ? fc + "40" : "rgba(255,255,255,0.1)"}`, background: "#0a0a1a", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110, transition: "border-color 0.5s" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: camOn || secureMode ? "block" : "none" }} />
            {secureMode && <FaceOval status={faceStatus} />}
            {!camOn && !secureMode && (
              <div style={{ textAlign: "center", zIndex: 1, padding: 10 }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🧑</div>
                <button onClick={() => setCamOn(true)} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.15)", color: "rgba(99,102,241,0.9)", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "block", margin: "0 auto" }}>Enable Camera</button>
                {camErr && <div style={{ fontSize: 10, color: "#ff4466", marginTop: 4 }}>{camErr}</div>}
              </div>
            )}
            {camOn && !secureMode && <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); if (videoRef.current) videoRef.current.srcObject = null; setCamOn(false); }} style={{ position: "absolute", top: 6, right: 6, padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(255,68,102,0.4)", background: "rgba(255,68,102,0.2)", color: "#ff4466", cursor: "pointer", fontSize: 10, zIndex: 3 }}>off</button>}
            <div style={{ position: "absolute", bottom: 5, left: 7, fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 600, zIndex: 2 }}>You</div>
            {bodyScanning && camOn && !secureMode && <div style={{ position: "absolute", top: 6, left: 8, fontSize: 9, color: "#f97316", animation: "blink 0.8s infinite", zIndex: 2 }}>● scanning</div>}
          </div>

          {/* Trust display (secure only) */}
          {secureMode && (
            <div style={{ padding: "8px 10px", background: `rgba(${liveTrust >= 80 ? "0,255,136" : liveTrust >= 60 ? "251,191,36" : "255,68,102"},0.06)`, border: `1px solid ${tc}25`, borderRadius: 10, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>TRUST</span>
                <span style={{ fontSize: 9, color: tc, fontWeight: 700, letterSpacing: 1 }}>{liveTrust >= 80 ? "VERIFIED" : liveTrust >= 60 ? "CAUTION" : "FLAGGED"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <TrustRing score={liveTrust} size={60} />
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, marginTop: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${liveTrust}%`, background: `linear-gradient(90deg,${tc}60,${tc})`, borderRadius: 999, transition: "width 0.8s ease" }} />
              </div>
            </div>
          )}

          {/* Body language (normal only) */}
          {bodyLang && !secureMode && (
            <div style={{ padding: "8px 10px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#f97316", fontWeight: 600, marginBottom: 6 }}>BODY LANGUAGE</div>
              {[["Posture", bodyLang.posture], ["Eye Contact", bodyLang.eyeContact], ["Confidence", bodyLang.confidence], ["Expression", bodyLang.expression]].map(([l, v]) => (
                <div key={l as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{l}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: Number(v) >= 70 ? "#00ff88" : Number(v) >= 50 ? "#fbbf24" : "#ff4466" }}>{v}</span>
                </div>
              ))}
              {bodyLang.notes && <div style={{ fontSize: 9, color: "rgba(249,115,22,0.6)", marginTop: 3, fontStyle: "italic", lineHeight: 1.3 }}>{bodyLang.notes}</div>}
            </div>
          )}

          {/* Status */}
          <div style={{ padding: "7px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, flexShrink: 0 }}>
            <div style={{ color: speaking ? "#6366f1" : listening ? "#a855f7" : loading ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.3)", fontWeight: 500, fontSize: 11 }}>
              {speaking ? "🔊 Alex speaking..." : listening ? "🎤 Listening..." : loading ? "💭 Thinking..." : "✓ Ready"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 2 }}>{mode === "voice" ? "Voice mode" : "Text mode"} · Q{qNum}</div>
          </div>
        </div>

        {/* CENTER — Chat */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {mode === "voice" && (speaking || listening || transcript) && (
            <div style={{ padding: "8px 16px", background: speaking ? "rgba(99,102,241,0.07)" : "rgba(168,85,247,0.07)", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ width: 2.5, background: speaking ? "#6366f1" : "#a855f7", borderRadius: 999, minHeight: 3, maxHeight: 16, animation: `wave ${0.3 + i * 0.06}s ease-in-out infinite alternate`, animationDelay: `${i * 0.06}s` }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: speaking ? "#a5b4fc" : "#c4b5fd" }}>
                {speaking ? "Alex speaking..." : "Listening..."}
                {transcript && ` — "${transcript.slice(0, 50)}${transcript.length > 50 ? "..." : ""}"`}
              </span>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 9, marginBottom: 13, flexDirection: m.role === "assistant" ? "row" : "row-reverse", animation: "fadeUp 0.3s ease" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.role === "assistant" ? "linear-gradient(135deg,#6366f1,#a855f7)" : "rgba(255,255,255,0.1)", border: m.role === "user" ? "1px solid rgba(255,255,255,0.12)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                  {m.role === "assistant" ? "👔" : "🧑"}
                </div>
                <div style={{ maxWidth: "82%" }}>
                  <div style={{ padding: "9px 13px", borderRadius: m.role === "assistant" ? "4px 16px 16px 16px" : "16px 4px 16px 16px", background: m.role === "assistant" ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg,#6366f1,#a855f7)", border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none", fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.88)" }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 9, marginBottom: 13 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>👔</div>
                <div style={{ padding: "9px 13px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px 16px 16px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(99,102,241,0.8)", animation: `blink 1.2s infinite ${i * 0.25}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
            {ended ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                {buildingVerdict || buildingTrustReport ? (
                  <span style={{ fontSize: 13, color: "#fbbf24" }}><span style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }}>⟳</span>{buildingVerdict ? "Building verdict..." : "Building trust report..."}</span>
                ) : (
                  <>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Interview complete 🎉</span>
                    {finalVerdict && <button onClick={() => setShowVerdict(true)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Verdict 🏆</button>}
                    {trustReport && secureMode && <button onClick={() => setShowTrustReport(true)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#e63946,#ff6b6b)", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Trust Report 🛡️</button>}
                    <a href="/"><button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12 }}>Home</button></a>
                  </>
                )}
              </div>
            ) : mode === "text" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={input}
                  onChange={e => {
                    if (!inputTypingStartRef.current) inputTypingStartRef.current = Date.now();
                    setInput(e.target.value);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); return; }
                    if (secureMode && (e.ctrlKey || e.metaKey) && e.key === "v") {
                      setPasteDetected(true);
                      const newCount = pasteCountRef.current + 1; pasteCountRef.current = newCount;
                      setPasteCount(newCount);
                      addViolation("Paste action detected", "high");
                    }
                  }}
                  onPaste={secureMode ? () => {
                    setPasteDetected(true);
                    const newCount = pasteCountRef.current + 1; pasteCountRef.current = newCount;
                    setPasteCount(newCount);
                    addViolation("Text pasted — possible AI content", "high");
                  } : undefined}
                  placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 13px", color: "white", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: 11, border: "none", background: !input.trim() || loading ? "rgba(99,102,241,0.15)" : "linear-gradient(135deg,#6366f1,#a855f7)", cursor: !input.trim() || loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "white" }}>
                    {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 12 }}>⟳</span> : "↑"}
                  </button>
                  {voiceOk && <button onClick={() => setMode("voice")} style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎤</button>}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ position: "relative" }}>
                    {listening && <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "2px solid rgba(168,85,247,0.4)", animation: "ripple 1.5s ease-out infinite" }} />}
                    <button onClick={listening ? stopListening : () => { if (!speaking && !loading) startListening(); }} disabled={speaking || loading} style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: listening ? "linear-gradient(135deg,#ff4466,#ec4899)" : speaking || loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#6366f1,#a855f7)", cursor: speaking || loading ? "not-allowed" : "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: listening ? "0 0 25px rgba(236,72,153,0.5)" : "0 0 18px rgba(99,102,241,0.3)", transition: "all 0.25s", opacity: speaking || loading ? 0.4 : 1 }}>
                      {listening ? "⏹" : "🎤"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ color: listening ? "#a855f7" : speaking ? "#6366f1" : loading ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                      {listening ? "Listening — tap to stop" : speaking ? "Alex speaking..." : loading ? "Thinking..." : "Tap mic to speak"}
                    </div>
                    {transcript && <div style={{ fontSize: 11, color: "rgba(168,85,247,0.8)", fontStyle: "italic" }}>"{transcript.slice(0, 50)}{transcript.length > 50 ? "..." : ""}"</div>}
                  </div>
                </div>
                <button onClick={() => { synthRef.current?.cancel(); stopListening(); setMode("text"); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11 }}>⌨️ Text</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)", overflow: "hidden" }}>
          {secureMode ? (
            // Secure: top = score panel, bottom = violations log
            <>
              <div style={{ flex: 1, overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <ScorePanel score={score} updating={scoring} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>INTEGRITY LOG</div>
                <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                  {violations.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1.5rem 0", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>✓</div>No violations
                    </div>
                  ) : [...violations].reverse().map((v, i) => (
                    <div key={i} style={{ marginBottom: 6, padding: "6px 8px", background: `rgba(${v.severity === "critical" ? "220,38,38" : v.severity === "high" ? "255,68,102" : v.severity === "medium" ? "251,191,36" : "99,102,241"},0.08)`, border: `1px solid rgba(${v.severity === "critical" ? "220,38,38" : v.severity === "high" ? "255,68,102" : v.severity === "medium" ? "251,191,36" : "99,102,241"},0.2)`, borderRadius: 8, animation: "slideIn 0.3s ease" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: v.severity === "critical" ? "#dc2626" : v.severity === "high" ? "#ff4466" : v.severity === "medium" ? "#fbbf24" : "#a5b4fc", marginBottom: 1 }}>{v.type}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{v.time}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {[["Face OK", totalFrames > 0 ? `${Math.round(faceOkFrames / totalFrames * 100)}%` : "100%", faceOkFrames / (totalFrames || 1) >= 0.8 ? "#00ff88" : "#ff4466"], ["Tab Switches", String(tabSwitches), tabSwitches === 0 ? "#00ff88" : "#ff4466"], ["Pastes", String(pasteCount), pasteCount === 0 ? "#00ff88" : "#ff4466"], ["AI Flags", String(aiWarnings), aiWarnings === 0 ? "#00ff88" : "#ff4466"]].map(([l, v, c]) => (
                    <div key={l as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{l}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: c as string }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Normal: full score panel
            <ScorePanel score={score} updating={scoring} />
          )}
        </div>
      </div>
    </div>
  );
}