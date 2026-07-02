"use client";
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── TYPES ───
interface AgentResult { name: string; color: string; response: string; score?: number; }
interface DNADim { name: string; candidate: number; ideal: number; }
interface DNAData { dimensions: DNADim[]; summary: string; }
interface Analysis {
  decision: string; decision_confidence: number; ats_match_score: number; overall_fit: number;
  experience_match: string; seniority_level: string; years_experience: string;
  must_have_skills: { required: string[]; present: string[]; missing: string[]; match_percent: number };
  good_to_have_skills: { listed: string[]; candidate_has: string[]; match_percent: number };
  red_flags: { flag: string; severity: string; evidence: string }[];
  green_flags: { flag: string; strength: string; evidence: string }[];
  education_assessment: { score: number; institution_tier: string; relevance: string; notes: string };
  interview_questions: { question: string; type: string; probes: string; difficulty: string }[];
  salary_assessment: { estimated_expectation: string; market_fit: string; notes: string };
  next_steps: { action: string; timeline: string; focus_areas: string[]; interviewer_recommendation: string };
  shortlist_summary: string; comparable_benchmark: string; error?: string; message?: string;
  faang_recruiter_report?: {
    evidence: string[];
    risks: string[];
    missing_signals: string[];
    interview_concerns: string[];
    salary_concerns: string[];
    team_fit_concerns: string[];
    growth_potential: string[];
  };
}
interface CandidateInput { id: string; name: string; resume: string; }
interface RankedCandidate {
  id: string; name: string; rank: number; overall_score: number; verdict: string; summary: string;
  strengths: string[]; weaknesses: string[];
  scores: { technical: number; experience: number; leadership: number; culture_fit: number; growth_potential: number };
  predicted_questions: string[]; hire_recommendation: string;
}

// ─── HELPERS ───
function parseScore(t: string): number {
  const m = t.match(/Score:\s*(\d{1,3})\s*\/\s*100/i) || t.match(/(\d{1,3})\s*\/\s*100/i);
  if (m) { const n = parseInt(m[1]); return n >= 0 && n <= 100 ? n : 60; }
  return 60;
}

function dc(d: string): string {
  if (!d) return "#94a3b8";
  const norm = d.toUpperCase();
  return norm === "STRONG HIRE" ? "#00ff88"
    : norm === "HIRE" ? "#22c55e"
    : norm === "LEAN HIRE" || norm === "LEANING HIRE" ? "#a3e635"
    : norm === "LEAN REJECT" || norm === "LEANING NO HIRE" ? "#f97316"
    : norm === "STRONG REJECT" || norm === "NO HIRE" || norm === "REJECT" ? "#ff4466"
    : "#94a3b8";
}

function dIcon(d: string): string {
  if (!d) return "⏳";
  const norm = d.toUpperCase();
  return norm === "STRONG HIRE" ? "✅"
    : norm === "HIRE" ? "👍"
    : norm === "LEAN HIRE" || norm === "LEANING HIRE" ? "🤔"
    : norm === "LEAN REJECT" || norm === "LEANING NO HIRE" ? "👎"
    : norm === "STRONG REJECT" || norm === "NO HIRE" || norm === "REJECT" ? "❌"
    : "⏳";
}

// ─── UI COMPONENTS ───
function GradientBg() {
  return (
    <>
      <style>{`
        @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.1)}66%{transform:translate(-30px,60px) scale(0.9)}}
        @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-80px,40px) scale(1.2)}66%{transform:translate(50px,-60px) scale(0.85)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,0.08);}
        .glass-strong{background:rgba(255,255,255,0.06);backdrop-filter:blur(60px);border:1px solid rgba(255,255,255,0.1);}
        .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);border:none;color:white;font-weight:700;cursor:pointer;transition:all 0.25s;letter-spacing:1px;}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(99,102,241,0.4);}
        .btn-primary:disabled{opacity:0.35;cursor:not-allowed;transform:none;}
        .tab-btn{transition:all 0.2s;border:1px solid transparent;cursor:pointer;font-family:inherit;}
        .tab-btn:hover{color:white !important;}
        textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.35);border-radius:2px;}
        .card-hover{transition:border-color 0.2s;}
        .card-hover:hover{border-color:rgba(99,102,241,0.3) !important;}
      `}</style>
      <div style={{position:"fixed",inset:0,overflow:"hidden",zIndex:0,background:"linear-gradient(135deg,#06030f 0%,#0a0520 50%,#04080f 100%)"}}>
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:"55%",height:"55%",background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(90px)",animation:"blob1 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"-20%",right:"-10%",width:"50%",height:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.12) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(90px)",animation:"blob2 17s ease-in-out infinite"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)",backgroundSize:"70px 70px"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent 0%,rgba(99,102,241,0.6) 30%,rgba(168,85,247,0.6) 70%,transparent 100%)"}}/>
      </div>
    </>
  );
}

function Typewriter({text,speed=8,onDone}:{text:string;speed?:number;onDone?:()=>void}) {
  const [d,setD]=useState("");
  const [done,setDone]=useState(false);
  useEffect(()=>{
    setD("");setDone(false);let i=0;
    const t=setInterval(()=>{i++;setD(text.slice(0,i));if(i>=text.length){clearInterval(t);setDone(true);onDone?.();}},speed);
    return()=>clearInterval(t);
  },[text]);
  return <span style={{whiteSpace:"pre-wrap"}}>{d}{!done&&<span style={{animation:"blink 0.8s infinite",color:"rgba(255,255,255,0.5)"}}>|</span>}</span>;
}

function Ring({score,color,size=80}:{score:number;color:string;size?:number}) {
  const [s,setS]=useState(0);
  const r=size*0.4,circ=2*Math.PI*r;
  useEffect(()=>{let v=0;const t=setInterval(()=>{v=Math.min(v+2,score);setS(v);if(v>=score)clearInterval(t);},14);return()=>clearInterval(t);},[score]);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={size*0.065}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.065}
          strokeDasharray={circ} strokeDashoffset={circ-(circ*s/100)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.05s",filter:s>0?`drop-shadow(0 0 6px ${color}80)`:""}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
        <span style={{fontSize:size*0.23,fontWeight:900,color,lineHeight:1}}>{s}</span>
        <span style={{fontSize:size*0.1,color:"rgba(255,255,255,0.3)"}}>/ 100</span>
      </div>
    </div>
  );
}

function DNARadar({data}:{data:DNAData}) {
  const [progress,setProgress]=useState(0);
  const size=250,center=size/2,dims=data.dimensions,total=dims.length;
  useEffect(()=>{let p=0;const t=setInterval(()=>{p+=0.03;if(p>=1){setProgress(1);clearInterval(t);}else setProgress(p);},16);return()=>clearInterval(t);},[]);
  const gp=(idx:number,val:number)=>{const a=(Math.PI*2*idx)/total-Math.PI/2;const r=(val/100)*(size*0.38)*progress;return{x:center+r*Math.cos(a),y:center+r*Math.sin(a)};};
  const ga=(idx:number,r:number)=>{const a=(Math.PI*2*idx)/total-Math.PI/2;return{x:center+r*Math.cos(a),y:center+r*Math.sin(a)};};
  const pts=dims.map((d,i)=>gp(i,d.candidate));
  const ips=dims.map((d,i)=>gp(i,d.ideal));
  const toPath=(p:{x:number,y:number}[])=>p.map((pt,i)=>`${i===0?"M":"L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ")+"Z";
  return (
    <div>
      <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.5,textAlign:"center",marginBottom:12}}>{data.summary}</p>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"1.5rem",flexWrap:"wrap"}}>
        <svg width={size} height={size}>
          {Array.from({length:4}).map((_,i)=><circle key={i} cx={center} cy={center} r={(size*0.38)*((i+1)/4)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
          {dims.map((_,i)=>{const p=ga(i,size*0.38);return<line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>;})}
          <path d={toPath(ips)} fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
          <path d={toPath(pts)} fill="rgba(168,85,247,0.18)" stroke="#a855f7" strokeWidth="2" style={{filter:"drop-shadow(0 0 8px rgba(168,85,247,0.4))"}}/>
          {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="#a855f7" style={{filter:"drop-shadow(0 0 5px #a855f7)"}}/>)}
          {dims.map((d,i)=>{const p=ga(i,size*0.46);const anchor=p.x<center-10?"end":p.x>center+10?"start":"middle";return(
            <g key={i}>
              <text x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="system-ui">{d.name}</text>
              <text x={p.x} y={p.y+11} textAnchor={anchor} dominantBaseline="middle" fill="#a855f7" fontSize="9" fontWeight="700" fontFamily="system-ui">{Math.round(d.candidate*progress)}</text>
            </g>
          );})}
        </svg>
        <div style={{minWidth:175}}>
          {dims.map((d,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{d.name}</span>
                <span style={{fontSize:11,color:"#a855f7",fontWeight:700}}>{d.candidate}<span style={{color:"rgba(99,102,241,0.5)",fontWeight:400}}>/{d.ideal}</span></span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:999,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${d.candidate*progress}%`,background:d.candidate>=d.ideal?"linear-gradient(90deg,#00ff88,#22d3ee)":"linear-gradient(90deg,#a855f7,#6366f1)",borderRadius:999,transition:"width 0.05s"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───
export default function RecruiterPage() {
  const [mode, setMode] = useState<"single"|"multi"|"funnel">("single");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    {id:"1",name:"Candidate 1",resume:""},{id:"2",name:"Candidate 2",resume:""}
  ]);
  const [step, setStep] = useState<"input"|"loading"|"debate"|"verdict"|"ranking"|"funnel_results">("input");
  const [agents, setAgents] = useState<(AgentResult&{typing?:boolean})[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [avg, setAvg] = useState(0);
  const [loadMsg, setLoadMsg] = useState("Initializing");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dna, setDna] = useState<DNAData|null>(null);
  const [analysis, setAnalysis] = useState<Analysis|null>(null);
  const [githubData, setGithubData] = useState<any>(null);
  const [linkedinAnalysis, setLinkedinAnalysis] = useState<any>(null);
  const [ranked, setRanked] = useState<RankedCandidate[]|null>(null);
  const [rankMeta, setRankMeta] = useState<{comparison_summary:string;top_pick_reason:string}|null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis"|"debate"|"questions"|"dna">("analysis");
  const [expandedCandidate, setExpandedCandidate] = useState<string|null>(null);
  const [funnelStates, setFunnelStates] = useState<any[]>([]);
  const [funnelAnalytics, setFunnelAnalytics] = useState<any>(null);
  const [enterpriseReports, setEnterpriseReports] = useState<any[]>([]);
  const [enterpriseWeights, setEnterpriseWeights] = useState<any>({
    technical: 20,
    projects: 20,
    experience: 15,
    problemSolving: 10,
    aiml: 10,
    leadership: 5,
    communication: 5,
    learningPotential: 5,
    cultureFit: 5,
    education: 3,
    logistics: 2
  });
  const rawRef = useRef<AgentResult[]>([]);

  const loadMsgs = ["Initializing committee","Parsing job description","Analyzing resume","Agents deliberating","Compiling analysis"];

  const handleFileUpload = async (file: File, candidateId?: string) => {
    if (!file) return;
    if (!candidateId) setUploading(true);
    try {
      const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(file); });
      const resp = await fetch("/api/parse-resume", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({imageBase64: b64, mimeType: file.type}) });
      const data = await resp.json();
      if (data.text) {
        if (candidateId) setCandidates(p => p.map(c => c.id === candidateId ? {...c, resume: data.text} : c));
        else setResume(data.text);
      } else setError("Extract failed — please paste text manually");
    } catch { setError("Upload failed — please paste text manually"); }
    if (!candidateId) setUploading(false);
  };

  const handleBulkFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(file); });
      const resp = await fetch("/api/parse-resume", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({imageBase64: b64, mimeType: file.type}) });
      const data = await resp.json();
      
      if (data.pages) {
        const splitResp = await fetch("/api/split-resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages: data.pages })
        });
        const splitData = await splitResp.json();
        if (splitData.candidates) {
          const newCandidates = splitData.candidates.map((c: any, index: number) => ({
            id: (Date.now() + index).toString(),
            name: c.name,
            resume: c.resume
          }));
          setCandidates(newCandidates);
        } else {
          setError("Failed to split candidate resumes from PDF.");
        }
      } else {
        setError("Could not extract pages from PDF.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to split and populate resumes.");
    }
    setUploading(false);
  };

  const runAnalysis = async () => {
    if (!jd.trim() || !resume.trim()) return;
    setError(""); setStep("loading"); setDna(null); setAnalysis(null); setActiveTab("analysis");
    let i = 0; const lt = setInterval(() => { i++; if (i < loadMsgs.length) setLoadMsg(loadMsgs[i]); }, 900);
    try {
      const [debateRes, analysisRes] = await Promise.all([
        fetch("/api/debate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({jd, resume}) }),
        fetch("/api/recruiter-analysis", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({jd, resume}) }),
      ]);
      clearInterval(lt);
      const [debateData, analysisData] = await Promise.all([debateRes.json(), analysisRes.json()]);

      if (debateData.agents) {
        rawRef.current = debateData.agents.map((a: AgentResult) => ({...a, score: parseScore(a.response)}));
      }
      if (!analysisData.error || analysisData.decision) setAnalysis(analysisData);
      if (analysisData.error && !analysisData.decision) { setError(analysisData.message || "Analysis failed"); setStep("input"); return; }

      fetch("/api/dna", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({jd, resume}) })
        .then(r => r.json()).then(setDna).catch(() => {});

      setAgents([]); setCurrentIdx(0); setStep("debate");
    } catch (e: any) { clearInterval(lt); setError(e.message); setStep("input"); }
  };

  const exportRankingToXLSX = () => {
    if (!ranked || ranked.length === 0) return;

    const rows = ranked
      .filter(c => c.overall_score > 0)
      .sort((a, b) => a.rank - b.rank)
      .map(c => ({
        Rank: c.rank,
        Name: c.name,
        "Overall Score": c.overall_score,
        Verdict: c.verdict,
        Summary: c.summary,
        Strengths: c.strengths?.join("; ") || "",
        Concerns: c.weaknesses?.join("; ") || "",
        "Technical Score": c.scores?.technical ?? "",
        "Experience Score": c.scores?.experience ?? "",
        "Leadership Score": c.scores?.leadership ?? "",
        "Culture Fit Score": c.scores?.culture_fit ?? "",
        "Growth Potential Score": c.scores?.growth_potential ?? "",
        "Hire Recommendation": c.hire_recommendation || "",
      }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns roughly based on header + content length
    const colWidths = Object.keys(rows[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...rows.map(r => String((r as any)[key] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 60) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ranked Candidates");

    const filename = `candidate-ranking-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // ═══════════════════════════════════════════════════════════
// PATCH 1 — Find this function in your original page.tsx:
//   const runRanking = async () => { ... }
// REPLACE the entire function body with this:
// ═══════════════════════════════════════════════════════════

const runRanking = async () => {
  const valid = candidates.filter(c => c.resume.trim().length >= 80);
  if (!jd.trim() || valid.length < 2) {
    setError("Need complete JD and at least 2 candidates with resumes (min 80 chars each)");
    return;
  }

  setError("");
  setRankLoading(true);
  setRanked(null);
  setStep("ranking");
  setLoadMsg("Initializing analysis...");

  let pollInterval: NodeJS.Timeout | null = null;

  // 10-minute hard timeout (30 candidates × ~15s each on free tier = ~7.5 min)
  const timeoutId = setTimeout(() => {
    if (pollInterval) clearInterval(pollInterval);
    setError("Analysis timed out — try with fewer candidates");
    setStep("input");
    setRankLoading(false);
  }, 600000);

  try {
    // ── STEP 1: Start the job ──────────────────────────────────────────
    const initRes = await fetch("/api/bulk-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidates: valid.map(c => ({
          id: c.id,
          name: c.name.trim(),
          resume: c.resume.trim(),   // route converts this to resumeText internally
        })),
        jobDescription: jd,
      }),
    });

    const initData = await initRes.json();
    if (initData.error) {
      clearTimeout(timeoutId);
      setError(initData.error);
      setStep("input");
      setRankLoading(false);
      return;
    }

    const { jobId } = initData;

    // ── STEP 2: Poll until complete ────────────────────────────────────
    pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/bulk-analyze?jobId=${jobId}`);
        if (!pollRes.ok) return; // transient — keep polling
        const job = await pollRes.json();

        if (job.status === "processing") {
          const phase = job.phase === "ranking" ? "Ranking & comparing..." : "Scoring candidates...";
          setLoadMsg(`${phase} (${job.progress || 0}/${job.total || 0})`);

        } else if (job.status === "error") {
          clearInterval(pollInterval!);
          clearTimeout(timeoutId);
          setError(job.error || "Analysis failed");
          setStep("input");
          setRankLoading(false);

        } else if (job.status === "complete") {
          clearInterval(pollInterval!);
          clearTimeout(timeoutId);

          // ── STEP 3: Map twoPassRanker output → RankedCandidate ──────
          // New format from twoPassRanker.js:
          // { candidate_id, candidateName, final_score, verdict, committee_note,
          //   hire_instinct, biggest_strength, biggest_concern, hidden_signal,
          //   red_flags, trajectory, impact_quality, recruiter_verdict, rank }

          const verdictMap: Record<string, string> = {
            STRONGLY_RECOMMEND: "Strong Hire",
            RECOMMEND:          "Lean Hire",
            HOLD:               "Lean Reject",
            REJECT:             "Strong Reject",
          };

          const mappedRanked: RankedCandidate[] = (job.ranked || []).map((c: any) => ({
            id:            c.candidate_id,
            name:          c.candidateName || c.candidate_id,
            rank:          c.rank,
            overall_score: c.final_score || 0,
            verdict:       verdictMap[c.verdict] || c.verdict || "Lean Reject",

            // committee_note is the comparative "what I'd say in the room" verdict
            summary: c.committee_note || c.recruiter_verdict || "Screening complete.",

            // Real strengths and concerns from deep pass1 analysis
            strengths:  Array.isArray(c.strengths) ? c.strengths : (c.biggest_strength ? [c.biggest_strength] : []),
            weaknesses: Array.isArray(c.concerns) ? c.concerns : (c.biggest_concern ? [c.biggest_concern] : []),

            // Real predicted questions from pass1 + hidden signal
            predicted_questions: [
              ...(Array.isArray(c.predicted_questions) ? c.predicted_questions : []),
              ...(c.hidden_signal ? [`Hidden signal: ${c.hidden_signal}`] : []),
            ],

            // Real sub-scores from AI — no more fake derived multipliers
            scores: {
              technical:        c.scores?.technical ?? c.final_score ?? 0,
              experience:       c.scores?.experience ?? c.final_score ?? 0,
              leadership:       c.scores?.leadership ?? Math.round((c.final_score || 0) * 0.85),
              culture_fit:      c.scores?.culture_fit ?? Math.round((c.final_score || 0) * 0.90),
              growth_potential:  c.scores?.growth_potential ?? c.final_score ?? 0,
            },

            hire_recommendation: c.hire_recommendation || c.committee_note || "Proceed to technical screen",
          }));

          const mappedFailed: RankedCandidate[] = (job.failed || []).map((c: any) => ({
            id: c.id, name: c.name || "Unknown Candidate", rank: mappedRanked.length + 1,
            overall_score: 0, verdict: "Strong Reject",
            summary: c.error || "Failed to process resume.",
            strengths: [], weaknesses: [],
            scores: { technical: 0, experience: 0, leadership: 0, culture_fit: 0, growth_potential: 0 },
            predicted_questions: [], hire_recommendation: "Re-check resume text.",
          }));

          setRanked([...mappedRanked, ...mappedFailed]);
          setRankMeta({
            comparison_summary: job.committeeReport || `${mappedRanked.length} candidates ranked by adversarial FAANG committee model.${job.failed?.length ? ` ${job.failed.length} failed.` : ""}`,
            top_pick_reason: mappedRanked.length > 0
              ? `${mappedRanked[0].name} leads with ${mappedRanked[0].overall_score}/100 — ${mappedRanked[0].summary}`
              : "No candidates met the threshold.",
          });
          setRankLoading(false);
        }
      } catch (err) {
        // network hiccup during poll — keep going
        console.warn("Poll error:", err);
      }
    }, 2000);

  } catch (e: any) {
    clearTimeout(timeoutId);
    if (pollInterval) clearInterval(pollInterval);
    setError(e.message || "Failed to rank candidates");
    setStep("input");
    setRankLoading(false);
  }
};

// Helper: derive a 0-100 sub-score from qualitative signal + base score
function deriveScore(signal: string | undefined, base: number, weight: number): number {
  void weight;
  const multiplier =
    signal === "exceptional" || signal === "rising"  ? 1.15 :
    signal === "solid"       || signal === "flat"    ? 1.00 :
    signal === "weak"        || signal === "unclear" ? 0.82 :
    signal === "none"        || signal === "declining"? 0.65 : 1.00;
  return Math.min(Math.round(base * multiplier), 100);
}
 

  const runFunnelSimulation = async () => {
    if (!jd.trim() || jd.trim().length < 80) { setError("Need complete JD (min 80 characters) to filter candidates."); return; }
    setError(""); setStep("loading"); setLoadMsg("Analyzing 500 Candidates");
    try {
      const resp = await fetch("/api/funnel/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: "job-1" })
      });
      const data = await resp.json();
      
      const analResp = await fetch("/api/funnel/analytics?jobId=job-1");
      const analData = await analResp.json();

      if (data.funnelStates) {
        setFunnelStates(data.funnelStates);
        setFunnelAnalytics(analData);
        setStep("funnel_results");
      } else {
        setError("Funnel simulation failed.");
        setStep("input");
      }
    } catch (e: any) {
      setError(e.message || "Funnel simulation failed.");
      setStep("input");
    }
  };

  useEffect(() => {
    if (step !== "debate") return;
    if (currentIdx >= rawRef.current.length) return;
    const a = rawRef.current[currentIdx];
    setTimeout(() => setAgents(prev => [...prev, {...a, typing: true}]), 200);
  }, [currentIdx, step]);

  const handleAgentDone = (i: number) => {
    setAgents(prev => prev.map((a, idx) => idx === i ? {...a, typing: false} : a));
    if (i + 1 < rawRef.current.length) setTimeout(() => setCurrentIdx(i + 1), 400);
    else {
      const scores = rawRef.current.map(a => a.score || 0).filter(s => s > 0);
      setAvg(scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0);
      setTimeout(() => setStep("verdict"), 800);
    }
  };

  const verdictLabel = avg >= 85 ? "STRONG HIRE" : avg >= 70 ? "HIRE" : avg >= 50 ? "LEANING HIRE" : avg >= 35 ? "LEANING NO HIRE" : "NO HIRE";
  const verdictColor = dc(verdictLabel);

  const TABS = [
    {id:"analysis",label:"📊 Analysis"},
    {id:"debate",label:"⚡ Debate"},
    {id:"questions",label:"🎯 Interview Qs"},
    {id:"dna",label:"🧬 DNA"},
  ];

  const vdc = analysis ? dc(analysis.decision) : "#94a3b8";

  const ScorePill = ({label,val,color}:{label:string;val:number;color:string}) => (
    <div style={{textAlign:"center",padding:"12px 16px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{fontSize:"1.5rem",fontWeight:900,color,lineHeight:1}}>{val}%</div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:1.5,marginTop:3}}>{label}</div>
    </div>
  );

  const reset = () => { setStep("input"); setAgents([]); setCurrentIdx(0); setResume(""); setDna(null); setAnalysis(null); setRanked(null); setGithubData(null); setLinkedinAnalysis(null); setError(""); };

  return (
    <div style={{minHeight:"100vh",color:"white",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative"}}>
      <GradientBg />

      {/* NAV */}
      <nav style={{position:"relative",zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem 2rem",borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#6366f1,#a855f7)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 4px 20px rgba(99,102,241,0.4)"}}>⚡</div>
          <span style={{fontWeight:800,fontSize:16,letterSpacing:"-0.5px",background:"linear-gradient(135deg,#fff,#a5b4fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>COGNALYZE</span>
          <span style={{fontSize:10,padding:"2px 9px",border:"1px solid rgba(99,102,241,0.35)",borderRadius:20,color:"rgba(99,102,241,0.8)",letterSpacing:1}}>RECRUITER</span>
        </div>
        <a href="/" style={{color:"rgba(255,255,255,0.35)",textDecoration:"none",fontSize:13,display:"flex",alignItems:"center",gap:4}}>
          <span>←</span><span>Back to Home</span>
        </a>
      </nav>

      <div style={{position:"relative",zIndex:10,maxWidth:"1000px",margin:"0 auto",padding:"3rem 2rem 5rem"}}>

        {/* ─── INPUT ─── */}
        {step === "input" && (
          <div style={{animation:"fadeUp 0.6s ease"}}>
            {/* Header */}
            <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
              <div style={{fontSize:10,letterSpacing:4,color:"rgba(99,102,241,0.8)",marginBottom:12,fontWeight:600}}>RECRUITER INTELLIGENCE</div>
              <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontWeight:900,letterSpacing:"-2px",lineHeight:1.08,marginBottom:12,background:"linear-gradient(135deg,#fff 20%,#a5b4fc 60%,#ec4899 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                FAANG-level candidate<br/>analysis in 60 seconds
              </h1>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:"2rem"}}>5 adversarial AI agents · ATS scoring · Skills matrix · Red flags · Predicted questions</p>

              {/* Mode toggle */}
              <div style={{display:"inline-flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:5,gap:4}}>
                {[
                  {id:"single",icon:"👤",label:"Single Candidate"},
                  {id:"multi",icon:"👥",label:"Compare Candidates"}
                ].map(m => (
                  <button key={m.id} onClick={() => setMode(m.id as any)} style={{padding:"8px 20px",borderRadius:10,fontSize:13,fontWeight:mode===m.id?700:400,background:mode===m.id?"rgba(255,255,255,0.1)":"transparent",color:mode===m.id?"white":"rgba(255,255,255,0.4)",border:mode===m.id?"1px solid rgba(255,255,255,0.12)":"1px solid transparent",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:6}}>
                    <span>{m.icon}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* JD Input — always shown */}
            <div className="glass-strong" style={{borderRadius:20,padding:"1.75rem",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#6366f1",boxShadow:"0 0 8px #6366f1"}}/>
                <span style={{fontSize:11,letterSpacing:2,color:"rgba(99,102,241,0.9)",fontWeight:700}}>JOB DESCRIPTION</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginLeft:4}}>min 80 characters</span>
              </div>
              <textarea value={jd} onChange={e => setJd(e.target.value)} rows={6} style={{width:"100%",background:"rgba(99,102,241,0.06)",border:`1px solid ${jd.trim().length>0&&jd.trim().length<80?"rgba(255,68,102,0.4)":"rgba(99,102,241,0.2)"}`,borderRadius:12,padding:"12px 14px",color:"rgba(255,255,255,0.88)",fontSize:13,resize:"none",fontFamily:"inherit",lineHeight:1.65,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(99,102,241,0.6)"} onBlur={e=>e.target.style.borderColor=jd.trim().length>0&&jd.trim().length<80?"rgba(255,68,102,0.4)":"rgba(99,102,241,0.2)"} placeholder="Paste the complete job description here — role requirements, qualifications, responsibilities..."/>
              {jd.trim().length > 0 && jd.trim().length < 80 && <div style={{fontSize:11,color:"#ff4466",marginTop:5}}>⚠ Too short — need at least 80 characters for accurate analysis ({jd.trim().length}/80)</div>}
            </div>

            {/* Custom Weights matrix (only for compare candidates mode) */}
            {mode === "multi" && (
              <div className="glass-strong" style={{borderRadius:20,padding:"1.5rem",marginBottom:12}}>
                <details>
                  <summary style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",cursor:"pointer",outline:"none",userSelect:"none"}}>
                    ⚙️ Custom Scoring Weights Matrix ({Object.values(enterpriseWeights as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}%)
                  </summary>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"15px 30px",marginTop:14}}>
                    {[
                      { key: "technical", label: "Technical Skills" },
                      { key: "projects", label: "Projects Quality" },
                      { key: "experience", label: "Experience Match" },
                      { key: "problemSolving", label: "Problem Solving" },
                      { key: "aiml", label: "AI/ML Expert Knowledge" },
                      { key: "leadership", label: "Leadership & Ownership" },
                      { key: "communication", label: "Communication Score" },
                      { key: "learningPotential", label: "Learning Speed" },
                      { key: "cultureFit", label: "Culture Match" },
                      { key: "education", label: "Education Quality" },
                      { key: "logistics", label: "Logistics & Location" }
                    ].map(w => (
                      <div key={w.key} style={{display:"flex",flexDirection:"column",gap:4}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                          <span>{w.label}</span>
                          <span style={{fontWeight:700,color:"#6366f1"}}>{enterpriseWeights[w.key]}%</span>
                        </div>
                        <input type="range" min="0" max="50" value={enterpriseWeights[w.key]} onChange={e => setEnterpriseWeights((p: any) => ({...p, [w.key]: Number(e.target.value)}))} style={{accentColor:"#6366f1",width:"100%",cursor:"pointer"}}/>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            {mode === "single" && (
              <div className="glass-strong" style={{borderRadius:20,padding:"1.75rem",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#a855f7",boxShadow:"0 0 8px #a855f7"}}/>
                  <span style={{fontSize:11,letterSpacing:2,color:"rgba(168,85,247,0.9)",fontWeight:700}}>CANDIDATE RESUME</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginLeft:4}}>min 80 characters</span>
                </div>
                <div onClick={() => document.getElementById("singleUp")?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }} style={{border:"2px dashed rgba(168,85,247,0.25)",borderRadius:12,padding:"16px",textAlign:"center",cursor:"pointer",marginBottom:10,transition:"all 0.2s",background:"rgba(168,85,247,0.03)"}} onMouseEnter={e => {e.currentTarget.style.borderColor="rgba(168,85,247,0.5)";e.currentTarget.style.background="rgba(168,85,247,0.06)";}} onMouseLeave={e => {e.currentTarget.style.borderColor="rgba(168,85,247,0.25)";e.currentTarget.style.background="rgba(168,85,247,0.03)";}}>
                  <input id="singleUp" type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}/>
                  {uploading ? <div style={{color:"#a855f7",fontSize:12}}><span style={{animation:"spin 0.8s linear infinite",display:"inline-block",marginRight:6}}>⟳</span>Extracting text...</div> : <div><div style={{fontSize:22,marginBottom:4}}>📄</div><div style={{color:"rgba(168,85,247,0.8)",fontSize:12,fontWeight:600}}>Upload Resume (PDF/Image)</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:11,marginTop:2}}>Drag & drop or click</div></div>}
                </div>
                <div style={{textAlign:"center",color:"rgba(255,255,255,0.18)",fontSize:11,marginBottom:8,letterSpacing:1}}>— OR PASTE TEXT —</div>
                <textarea value={resume} onChange={e => setResume(e.target.value)} rows={7} style={{width:"100%",background:"rgba(168,85,247,0.05)",border:`1px solid ${resume.trim().length>0&&resume.trim().length<80?"rgba(255,68,102,0.4)":"rgba(168,85,247,0.2)"}`,borderRadius:12,padding:"12px 14px",color:"rgba(255,255,255,0.88)",fontSize:13,resize:"none",fontFamily:"inherit",lineHeight:1.65,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(168,85,247,0.6)"} onBlur={e=>e.target.style.borderColor=resume.trim().length>0&&resume.trim().length<80?"rgba(255,68,102,0.4)":"rgba(168,85,247,0.2)"} placeholder="Paste the complete resume here — education, experience, projects, skills, achievements..."/>
                {resume.trim().length > 0 && resume.trim().length < 80 && <div style={{fontSize:11,color:"#ff4466",marginTop:5}}>⚠ Too short — need at least 80 characters ({resume.trim().length}/80)</div>}
              </div>
            )}

            {/* Multi mode */}
            {mode === "multi" && (
              <div className="glass-strong" style={{borderRadius:20,padding:"1.75rem",marginBottom:14}}>
                <div onClick={() => document.getElementById("bulkUp")?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBulkFileUpload(f); }} style={{border:"2px dashed rgba(99,102,241,0.25)",borderRadius:12,padding:"20px 16px",textAlign:"center",cursor:"pointer",marginBottom:16,transition:"all 0.2s",background:"rgba(99,102,241,0.03)"}} onMouseEnter={e => {e.currentTarget.style.borderColor="rgba(99,102,241,0.5)";e.currentTarget.style.background="rgba(99,102,241,0.06)";}} onMouseLeave={e => {e.currentTarget.style.borderColor="rgba(99,102,241,0.25)";e.currentTarget.style.background="rgba(99,102,241,0.03)";}}>
                  <input id="bulkUp" type="file" accept=".pdf" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFileUpload(f); }}/>
                  {uploading ? <div style={{color:"#6366f1",fontSize:13,fontWeight:600}}><span style={{animation:"spin 0.8s linear infinite",display:"inline-block",marginRight:6}}>⟳</span>Splitting resumes...</div> : <div><div style={{fontSize:24,marginBottom:6}}>🌪️</div><div style={{color:"rgba(99,102,241,0.9)",fontSize:13,fontWeight:600}}>Bulk Upload Multi-Resume PDF (Up to 500 Resumes)</div><div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:3}}>Drag & drop a combined PDF file to automatically split and populate</div></div>}
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:"#a855f7",boxShadow:"0 0 8px #a855f7"}}/>
                    <span style={{fontSize:11,letterSpacing:2,color:"rgba(168,85,247,0.9)",fontWeight:700}}>CANDIDATES ({candidates.length}/500)</span>
                  </div>
                  <button onClick={() => candidates.length < 500 && setCandidates(p => [...p, {id:Date.now().toString(),name:`Candidate ${p.length+1}`,resume:""}])} disabled={candidates.length >= 500} style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"rgba(99,102,241,0.9)",cursor:"pointer",fontSize:12,fontWeight:600,opacity:candidates.length>=500?0.4:1}}>
                    + Add Candidate
                  </button>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:500,overflowY:"auto",paddingRight:5}}>
                  {candidates.map((c, i) => {
                    const isExpanded = expandedCandidate === c.id || candidates.length <= 2;
                    return (
                      <div key={c.id || `cand-input-${i}`} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"10px 14px"}}>
                        <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
                          <div onClick={() => setExpandedCandidate(isExpanded ? null : c.id)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,#6366f1,#a855f7)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                            <span style={{fontWeight:600,fontSize:13,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                            <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{c.resume.trim().length > 0 ? "✓ Uploaded" : "Empty"}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <button onClick={() => setExpandedCandidate(isExpanded ? null : c.id)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11}}>{isExpanded ? "Collapse" : "Edit"}</button>
                            <label style={{padding:"3px 8px",borderRadius:6,border:"1px solid rgba(168,85,247,0.3)",background:"rgba(168,85,247,0.08)",color:"rgba(168,85,247,0.8)",cursor:"pointer",fontSize:10,fontWeight:600,flexShrink:0}}>
                              Upload<input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, c.id); }}/>
                            </label>
                            {candidates.length > 2 && <button onClick={() => setCandidates(p => p.filter(x => x.id !== c.id))} style={{padding:"3px 6px",borderRadius:5,border:"1px solid rgba(255,68,102,0.25)",background:"transparent",color:"rgba(255,68,102,0.6)",cursor:"pointer",fontSize:11}}>✕</button>}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{marginTop:10}}>
                            <input value={c.name} onChange={e => setCandidates(p => p.map(x => x.id===c.id ? {...x,name:e.target.value} : x))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"white",fontSize:12,marginBottom:8,boxSizing:"border-box"}} placeholder="Candidate name"/>
                            <textarea value={c.resume} onChange={e => setCandidates(p => p.map(x => x.id===c.id ? {...x,resume:e.target.value} : x))} rows={3} style={{width:"100%",background:"rgba(168,85,247,0.04)",border:`1px solid ${c.resume.trim().length>0&&c.resume.trim().length<80?"rgba(255,68,102,0.3)":"rgba(168,85,247,0.15)"}`,borderRadius:10,padding:"10px 12px",color:"rgba(255,255,255,0.75)",fontSize:12,resize:"none",fontFamily:"inherit",lineHeight:1.5,boxSizing:"border-box"}} placeholder="Paste resume content here..."/>
                            {c.resume.trim().length > 0 && c.resume.trim().length < 80 && <div style={{fontSize:10,color:"#ff4466",marginTop:3}}>Too short ({c.resume.trim().length}/80)</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <div style={{padding:"10px 14px",background:"rgba(255,68,102,0.1)",border:"1px solid rgba(255,68,102,0.25)",borderRadius:10,color:"#ff4466",fontSize:13,marginBottom:12}}>⚠ {error}</div>}

            {mode === "single" ? (
              <button className="btn-primary" onClick={runAnalysis} disabled={!jd.trim()||!resume.trim()||jd.trim().length<80||resume.trim().length<80} style={{width:"100%",padding:"1rem",borderRadius:14,fontSize:15,letterSpacing:2,boxShadow:"0 0 60px rgba(99,102,241,0.2)"}}>
                ⚡ RUN FULL ANALYSIS →
              </button>
            ) : (
              <button className="btn-primary" onClick={runRanking} disabled={!jd.trim()||jd.trim().length<80||candidates.filter(c=>c.resume.trim().length>=80).length<2} style={{width:"100%",padding:"1rem",borderRadius:14,fontSize:15,letterSpacing:2,boxShadow:"0 0 60px rgba(99,102,241,0.2)"}}>
                🏆 RANK & COMPARE ALL →
              </button>
            )}
          </div>
        )}

        {/* ─── LOADING ─── */}
        {step === "loading" && (
          <div style={{textAlign:"center",padding:"8rem 0",animation:"fadeIn 0.4s ease"}}>
            <div style={{position:"relative",width:100,height:100,margin:"0 auto 2.5rem"}}>
              <div style={{position:"absolute",inset:0,border:"1.5px solid rgba(99,102,241,0.2)",borderTop:"1.5px solid #6366f1",borderRadius:"50%",animation:"spin 1.2s linear infinite"}}/>
              <div style={{position:"absolute",inset:"14px",border:"1.5px solid rgba(168,85,247,0.15)",borderBottom:"1.5px solid #a855f7",borderRadius:"50%",animation:"spin 0.8s linear infinite reverse"}}/>
              <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>⚡</span>
            </div>
            <div style={{fontSize:14,letterSpacing:3,color:"rgba(255,255,255,0.5)"}}>{loadMsg}...</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.2)",marginTop:8}}>Running 5 agents + comprehensive analysis in parallel</div>
          </div>
        )}

        {/* ─── DEBATE STEP ─── */}
        {step === "debate" && (
          <div style={{animation:"fadeIn 0.5s ease"}}>
            <div style={{textAlign:"center",marginBottom:"2rem"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"4px 14px",background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.2)",borderRadius:999,marginBottom:10}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#22d3ee",animation:"blink 1s infinite"}}/>
                <span style={{fontSize:10,color:"#22d3ee",letterSpacing:2,fontWeight:600}}>COMMITTEE IN SESSION</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {agents.map((a, i) => (
                <div key={i} style={{animation:"slideRight 0.4s ease"}}>
                  <div className="glass" style={{borderRadius:16,padding:"1.25rem",border:`1px solid ${a.color}20`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${a.color}50,transparent)`}}/>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:"2px",background:`linear-gradient(180deg,${a.color},${a.color}15)`}}/>
                    <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",paddingLeft:8}}>
                      <Ring score={a.score||0} color={a.color} size={60}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:a.color}}>{a.name.toUpperCase()}</span>
                          {a.typing && <span style={{fontSize:9,padding:"1px 8px",background:`${a.color}15`,border:`1px solid ${a.color}30`,borderRadius:999,color:a.color,animation:"blink 1s infinite"}}>SPEAKING</span>}
                        </div>
                        <div style={{color:"rgba(255,255,255,0.72)",fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                          {a.typing ? <Typewriter text={a.response} speed={6} onDone={() => handleAgentDone(i)}/> : a.response}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {agents.length < rawRef.current.length && <div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:13,padding:"1rem",animation:"blink 1.5s infinite"}}>Next agent preparing...</div>}
            </div>
          </div>
        )}

        {/* ─── VERDICT ─── */}
        {step === "verdict" && (
          <div style={{animation:"scaleIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275)"}}>

            {/* Decision Banner */}
            {analysis && (
              <div style={{borderRadius:22,padding:"1.75rem 2rem",marginBottom:"1.25rem",border:`1.5px solid ${vdc}30`,background:`linear-gradient(135deg,${vdc}06 0%,rgba(0,0,0,0.3) 100%)`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${vdc}80,transparent)`}}/>
                {analysis.decision === "INSUFFICIENT_DATA" ? (
                  <div style={{textAlign:"center",padding:"1rem 0"}}>
                    <div style={{fontSize:"3rem",marginBottom:"1rem"}}>⚠️</div>
                    <div style={{fontSize:"1.8rem",fontWeight:900,color:"#94a3b8",marginBottom:8}}>INSUFFICIENT DATA</div>
                    <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:"1.5rem"}}>{analysis.message}</div>
                    <button className="btn-primary" onClick={reset} style={{padding:"0.75rem 2rem",borderRadius:12,fontSize:13,letterSpacing:2}}>← Try Again with Complete Data</button>
                  </div>
                ) : (
                  <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1.25rem"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"1.25rem"}}>
                        <div style={{fontSize:"3rem"}}>{dIcon(analysis.decision)}</div>
                        <div>
                          <div style={{fontSize:"2.5rem",fontWeight:900,color:vdc,letterSpacing:-1.5,lineHeight:1,textShadow:`0 0 40px ${vdc}60`}}>{analysis.decision}</div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:5}}>{analysis.seniority_level} · {analysis.years_experience} · {analysis.experience_match} Match</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        <ScorePill label="ATS MATCH" val={analysis.ats_match_score} color={analysis.ats_match_score>=70?"#00ff88":"#fbbf24"}/>
                        <ScorePill label="OVERALL FIT" val={analysis.overall_fit} color={analysis.overall_fit>=70?"#00ff88":analysis.overall_fit>=50?"#fbbf24":"#ff4466"}/>
                        <ScorePill label="CONFIDENCE" val={analysis.decision_confidence} color="#a5b4fc"/>
                      </div>
                    </div>
                    <div style={{marginTop:"1.25rem",padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:10,borderLeft:`3px solid ${vdc}`,display:"flex",flexDirection:"column",gap:4}}>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>{analysis.shortlist_summary}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Benchmark: {analysis.comparable_benchmark}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PROFILE INTELLIGENCE PANEL */}
            {(githubData || linkedinAnalysis) && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem", marginBottom: "1rem" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(99,102,241,0.8)", fontWeight: 600, marginBottom: "1rem" }}>
                  🔍 PROFILE INTELLIGENCE
                </div>

                {/* GitHub Summary */}
                {githubData && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <img src={githubData.profile.avatar_url} alt="Avatar" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>github.com/{githubData.profile.username}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{githubData.repoCount} repos · ⭐{githubData.totalStars} total stars · {githubData.profile.followers} followers</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                      {githubData.topLanguages.map((l: any) => (
                        <span key={l.lang} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 999, color: "#a5b4fc" }}>{l.lang}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>TOP PROJECTS</div>
                    {githubData.topRepos.map((r: any) => (
                      <div key={r.name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, padding: "5px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{r.name}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>⭐{r.stars} · {r.language || "?"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* LinkedIn Analysis */}
                {linkedinAnalysis && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "rgba(14,165,233,0.9)", fontWeight: 600 }}>LinkedIn Analysis</div>
                      <div style={{ padding: "2px 10px", borderRadius: 999, background: `rgba(${linkedinAnalysis.fitScore >= 70 ? "0,255,136" : linkedinAnalysis.fitScore >= 50 ? "251,191,36" : "255,68,102"},0.12)`, fontSize: 10, fontWeight: 700, color: linkedinAnalysis.fitScore >= 70 ? "#00ff88" : linkedinAnalysis.fitScore >= 50 ? "#fbbf24" : "#ff4466" }}>
                        Fit: {linkedinAnalysis.fitScore}/100
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{linkedinAnalysis.careerTrajectory}</div>
                    {linkedinAnalysis.redFlags?.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, color: "#ff4466", fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>⚠ RED FLAGS</div>
                        {linkedinAnalysis.redFlags.map((f: string, i: number) => (
                          <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", paddingLeft: 8, borderLeft: "2px solid rgba(255,68,102,0.4)", marginBottom: 3 }}>{f}</div>
                        ))}
                      </div>
                    )}
                    {linkedinAnalysis.greenFlags?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: "#00ff88", fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>✓ STRENGTHS</div>
                        {linkedinAnalysis.greenFlags.map((f: string, i: number) => (
                          <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", paddingLeft: 8, borderLeft: "2px solid rgba(0,255,136,0.4)", marginBottom: 3 }}>{f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {analysis && analysis.decision !== "INSUFFICIENT_DATA" && (
              <>
                {/* Tabs */}
                <div style={{display:"flex",gap:5,marginBottom:"1.25rem",background:"rgba(255,255,255,0.03)",borderRadius:14,padding:"5px",border:"1px solid rgba(255,255,255,0.06)"}}>
                  {TABS.map(t => (
                    <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id as any)} style={{flex:1,padding:"0.55rem 0.25rem",borderRadius:10,fontSize:12,background:activeTab===t.id?"rgba(255,255,255,0.09)":"transparent",color:activeTab===t.id?"white":"rgba(255,255,255,0.38)",border:activeTab===t.id?"1px solid rgba(255,255,255,0.12)":"1px solid transparent",fontWeight:activeTab===t.id?600:400}}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Full Analysis */}
                {activeTab === "analysis" && (
                  <div style={{animation:"fadeIn 0.3s ease"}}>
                    {analysis.faang_recruiter_report && (
                      <div className="glass card-hover" style={{borderRadius:20,padding:"1.5rem",border:"1px solid rgba(255,255,255,0.08)",marginBottom:"1rem"}}>
                        <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.4)",marginBottom:"1.25rem",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                          <span>🕵️ FAANG REC RATING & HM INTELLIGENCE</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>
                          <div>
                            <div style={{fontSize:11,color:"#00ff88",fontWeight:700,marginBottom:6}}>EVIDENCE</div>
                            {analysis.faang_recruiter_report.evidence?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#ff4466",fontWeight:700,marginBottom:6}}>RISKS</div>
                            {analysis.faang_recruiter_report.risks?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#818cf8",fontWeight:700,marginBottom:6}}>MISSING SIGNALS</div>
                            {analysis.faang_recruiter_report.missing_signals?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#c084fc",fontWeight:700,marginBottom:6}}>INTERVIEW CONCERNS</div>
                            {analysis.faang_recruiter_report.interview_concerns?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginBottom:6}}>SALARY CONCERNS</div>
                            {analysis.faang_recruiter_report.salary_concerns?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#f43f5e",fontWeight:700,marginBottom:6}}>TEAM FIT CONCERNS</div>
                            {analysis.faang_recruiter_report.team_fit_concerns?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                          <div style={{gridColumn:"span 2"}}>
                            <div style={{fontSize:11,color:"#22d3ee",fontWeight:700,marginBottom:6}}>GROWTH POTENTIAL</div>
                            {analysis.faang_recruiter_report.growth_potential?.map((item, idx) => (
                              <div key={idx} style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4,lineHeight:1.4}}>• {item}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>

                      {/* Skills Matrix */}
                      <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(255,255,255,0.07)"}}>
                        <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.35)",marginBottom:"1rem",fontWeight:600}}>SKILLS MATRIX</div>
                        {analysis.must_have_skills && (
                        <div style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Must-Have</span>
                            <span style={{fontSize:12,fontWeight:700,color:(analysis.must_have_skills.match_percent ?? 0)>=70?"#00ff88":"#ff4466"}}>{analysis.must_have_skills.match_percent ?? 0}%</span>
                          </div>
                          <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:999,marginBottom:8,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${analysis.must_have_skills.match_percent ?? 0}%`,background:(analysis.must_have_skills.match_percent ?? 0)>=70?"linear-gradient(90deg,#00ff88,#22d3ee)":"linear-gradient(90deg,#ff4466,#ff6b6b)",borderRadius:999,transition:"width 0.8s ease"}}/>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {analysis.must_have_skills.present?.map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.25)",borderRadius:6,color:"#00ff88"}}>✓ {s}</span>)}
                            {analysis.must_have_skills.missing?.map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(255,68,102,0.1)",border:"1px solid rgba(255,68,102,0.25)",borderRadius:6,color:"#ff4466"}}>✗ {s}</span>)}
                          </div>
                        </div>
                        )}
                        {analysis.good_to_have_skills?.listed?.length > 0 && (
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Good-to-Have</span>
                              <span style={{fontSize:12,fontWeight:700,color:"#fbbf24"}}>{analysis.good_to_have_skills.match_percent}%</span>
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {analysis.good_to_have_skills.candidate_has?.map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:6,color:"#fbbf24"}}>✓ {s}</span>)}
                              {analysis.good_to_have_skills.listed?.filter(s => !analysis.good_to_have_skills.candidate_has?.includes(s)).map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"rgba(255,255,255,0.3)"}}>— {s}</span>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Education */}
                      {analysis.education_assessment && (
                        <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(255,255,255,0.07)"}}>
                          <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.35)",marginBottom:"1rem",fontWeight:600}}>EDUCATION ASSESSMENT</div>
                          <div style={{display:"flex",gap:"1rem",alignItems:"flex-start"}}>
                            <Ring score={analysis.education_assessment.score} color="#a855f7" size={64}/>
                            <div>
                              <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                                <span style={{fontSize:11,padding:"2px 8px",background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:6,color:"#a855f7"}}>{analysis.education_assessment.institution_tier}</span>
                                <span style={{fontSize:11,padding:"2px 8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"rgba(255,255,255,0.5)"}}>{analysis.education_assessment.relevance} Relevance</span>
                              </div>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>{analysis.education_assessment.notes}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Red + Green Flags */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                      <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(255,68,102,0.15)"}}>
                        <div style={{fontSize:10,letterSpacing:2,color:"#ff4466",marginBottom:"1rem",fontWeight:600}}>🚩 RED FLAGS</div>
                        {analysis.red_flags?.length > 0 ? analysis.red_flags.map((f, i) => (
                          <div key={i} style={{marginBottom:9,padding:"9px 11px",background:"rgba(255,68,102,0.06)",borderRadius:9,borderLeft:`2px solid ${f.severity==="High"||f.severity==="Critical"?"#ff4466":"#fbbf24"}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.85)"}}>{f.flag}</span>
                              <span style={{fontSize:9,padding:"1px 7px",background:f.severity==="High"||f.severity==="Critical"?"rgba(255,68,102,0.2)":"rgba(251,191,36,0.15)",borderRadius:999,color:f.severity==="High"||f.severity==="Critical"?"#ff4466":"#fbbf24",fontWeight:600,flexShrink:0}}>{f.severity}</span>
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.42)",lineHeight:1.4}}>{f.evidence}</div>
                          </div>
                        )) : <div style={{color:"rgba(255,255,255,0.25)",fontSize:13}}>No major red flags identified</div>}
                      </div>
                      <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(0,255,136,0.15)"}}>
                        <div style={{fontSize:10,letterSpacing:2,color:"#00ff88",marginBottom:"1rem",fontWeight:600}}>✅ GREEN FLAGS</div>
                        {analysis.green_flags?.length > 0 ? analysis.green_flags.map((f, i) => (
                          <div key={i} style={{marginBottom:9,padding:"9px 11px",background:"rgba(0,255,136,0.05)",borderRadius:9,borderLeft:`2px solid ${f.strength==="High"?"#00ff88":"#fbbf24"}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.85)"}}>{f.flag}</span>
                              <span style={{fontSize:9,padding:"1px 7px",background:f.strength==="High"?"rgba(0,255,136,0.15)":"rgba(251,191,36,0.15)",borderRadius:999,color:f.strength==="High"?"#00ff88":"#fbbf24",fontWeight:600,flexShrink:0}}>{f.strength}</span>
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.42)",lineHeight:1.4}}>{f.evidence}</div>
                          </div>
                        )) : <div style={{color:"rgba(255,255,255,0.25)",fontSize:13}}>Identifying strengths...</div>}
                      </div>
                    </div>

                    {/* Next Steps + Salary */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                      {analysis.next_steps && (
                        <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(99,102,241,0.18)"}}>
                          <div style={{fontSize:10,letterSpacing:2,color:"rgba(99,102,241,0.8)",marginBottom:"1rem",fontWeight:600}}>📋 NEXT STEPS</div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                            <div style={{padding:"5px 14px",background:"linear-gradient(135deg,#6366f1,#a855f7)",borderRadius:8,fontSize:12,fontWeight:700}}>{analysis.next_steps.action}</div>
                            <span style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{analysis.next_steps.timeline}</span>
                          </div>
                          {analysis.next_steps.focus_areas?.map((f, i) => (
                            <div key={i} style={{display:"flex",gap:6,marginBottom:5}}>
                              <span style={{color:"#6366f1",fontSize:11,flexShrink:0}}>→</span>
                              <span style={{fontSize:12,color:"rgba(255,255,255,0.58)",lineHeight:1.4}}>{f}</span>
                            </div>
                          ))}
                          <div style={{marginTop:10,padding:"8px 10px",background:"rgba(99,102,241,0.08)",borderRadius:8,fontSize:11,color:"rgba(99,102,241,0.7)",lineHeight:1.4}}>
                            💡 {analysis.next_steps.interviewer_recommendation}
                          </div>
                        </div>
                      )}
                      {analysis.salary_assessment && (
                        <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(251,191,36,0.15)"}}>
                          <div style={{fontSize:10,letterSpacing:2,color:"#fbbf24",marginBottom:"1rem",fontWeight:600}}>💰 SALARY ASSESSMENT</div>
                          <div style={{fontSize:"1.4rem",fontWeight:700,color:"white",marginBottom:6}}>{analysis.salary_assessment.estimated_expectation}</div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:999,marginBottom:10}}>
                            <span style={{fontSize:11,color:"#fbbf24",fontWeight:600}}>{analysis.salary_assessment.market_fit}</span>
                          </div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.5}}>{analysis.salary_assessment.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Debate */}
                {activeTab === "debate" && (
                  <div style={{animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:"1.25rem"}}>
                      {agents.map((a, i) => (
                        <div key={i} className="glass" style={{borderRadius:14,padding:"0.9rem",border:`1px solid ${a.color}20`,textAlign:"center"}}>
                          <Ring score={a.score||0} color={a.color} size={54}/>
                          <div style={{fontSize:9,color:a.color,letterSpacing:1,fontWeight:700,marginTop:6}}>{a.name.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
                      <Ring score={avg} color={verdictColor} size={110}/>
                      <div style={{fontSize:"2.8rem",fontWeight:900,color:verdictColor,letterSpacing:-2,marginTop:8,textShadow:`0 0 40px ${verdictColor}60`}}>{verdictLabel}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4}}>Committee Average</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {agents.map((a, i) => (
                        <div key={i} className="glass" style={{borderRadius:14,padding:"1.2rem",border:`1px solid ${a.color}18`,position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"2px",background:`linear-gradient(180deg,${a.color},${a.color}10)`}}/>
                          <div style={{paddingLeft:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{width:6,height:6,borderRadius:"50%",background:a.color,boxShadow:`0 0 8px ${a.color}`}}/>
                                <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:a.color}}>{a.name.toUpperCase()}</span>
                              </div>
                              <span style={{fontSize:11,color:a.color,fontWeight:700}}>{a.score}/100</span>
                            </div>
                            <div style={{color:"rgba(255,255,255,0.7)",fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{a.response}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Interview Questions */}
                {activeTab === "questions" && (() => {
                  // Normalize: API may return interview_questions as an object {dsa:[], core_cs:[], ...} or a flat array
                  let qs: any[] = [];
                  if (Array.isArray(analysis.interview_questions)) {
                    qs = analysis.interview_questions;
                  } else if (analysis.interview_questions && typeof analysis.interview_questions === "object") {
                    for (const [cat, arr] of Object.entries(analysis.interview_questions)) {
                      if (Array.isArray(arr)) {
                        qs.push(...(arr as any[]).map((q: any) => ({ ...q, type: q.type || cat.replace(/_/g, " ").toUpperCase() })));
                      }
                    }
                  }
                  return (
                  <div style={{animation:"fadeIn 0.3s ease"}}>
                    <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:"1.25rem"}}>Questions crafted to probe specific gaps and verify claims in this candidate's profile.</p>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {qs.map((q, i) => (
                        <div key={i} className="glass card-hover" style={{borderRadius:16,padding:"1.4rem",border:"1px solid rgba(251,191,36,0.12)",position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:"linear-gradient(180deg,#fbbf24,#fbbf2415)"}}/>
                          <div style={{paddingLeft:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                                <span style={{fontSize:10,fontWeight:700,color:"rgba(251,191,36,0.8)",letterSpacing:1}}>Q{i+1}</span>
                                <span style={{fontSize:10,padding:"2px 8px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:999,color:"#fbbf24"}}>{q.type || q.topic || "General"}</span>
                              </div>
                              <span style={{fontSize:10,padding:"2px 8px",background:q.difficulty==="Hard"?"rgba(255,68,102,0.1)":q.difficulty==="Medium"?"rgba(251,191,36,0.1)":"rgba(0,255,136,0.08)",border:`1px solid ${q.difficulty==="Hard"?"rgba(255,68,102,0.25)":q.difficulty==="Medium"?"rgba(251,191,36,0.25)":"rgba(0,255,136,0.2)"}`,borderRadius:999,color:q.difficulty==="Hard"?"#ff4466":q.difficulty==="Medium"?"#fbbf24":"#00ff88"}}>{q.difficulty}</span>
                            </div>
                            <p style={{color:"rgba(255,255,255,0.88)",fontSize:14,fontWeight:500,marginBottom:10,lineHeight:1.5}}>{q.question}</p>
                            <div style={{padding:"7px 10px",background:"rgba(99,102,241,0.08)",borderRadius:8,display:"flex",gap:7,alignItems:"flex-start"}}>
                              <span style={{color:"#6366f1",fontSize:11,flexShrink:0,marginTop:1}}>🎯</span>
                              <span style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>Probes: {q.probes || q.why_asked || ""}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })()}

                {/* Tab: DNA */}
                {activeTab === "dna" && (
                  <div style={{animation:"fadeIn 0.3s ease"}}>
                    {dna ? (
                      <div className="glass" style={{borderRadius:18,padding:"2rem",border:"1px solid rgba(168,85,247,0.18)"}}>
                        <div style={{fontSize:10,letterSpacing:3,color:"rgba(168,85,247,0.8)",marginBottom:"1.25rem",fontWeight:600,textAlign:"center"}}>CANDIDATE DNA PROFILE</div>
                        <DNARadar data={dna}/>
                      </div>
                    ) : (
                      <div style={{textAlign:"center",padding:"4rem",color:"rgba(255,255,255,0.25)"}}>
                        <div style={{fontSize:28,animation:"spin 1.2s linear infinite",display:"inline-block",marginBottom:12}}>⟳</div>
                        <div style={{fontSize:14}}>Building DNA profile...</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {analysis && analysis.decision !== "INSUFFICIENT_DATA" && (
              <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:"1.5rem"}}>
                <button className="btn-primary" onClick={reset} style={{padding:"0.75rem 2rem",borderRadius:12,fontSize:13,letterSpacing:2}}>↺ New Analysis</button>
              </div>
            )}
          </div>
        )}

        {/* ─── RANKING ─── */}
        {step === "ranking" && (
          <div style={{animation:"fadeIn 0.5s ease"}}>
            {rankLoading ? (
              <div style={{textAlign:"center",padding:"6rem 0"}}>
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 2rem"}}>
                  <div style={{position:"absolute",inset:0,border:"1.5px solid rgba(99,102,241,0.2)",borderTop:"1.5px solid #6366f1",borderRadius:"50%",animation:"spin 1.2s linear infinite"}}/>
                  <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🏆</span>
                </div>
                <div style={{fontSize:14,letterSpacing:3,color:"rgba(255,255,255,0.5)",marginBottom:8}}>{loadMsg}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",maxWidth:400,margin:"0 auto",lineHeight:1.5}}>
                  Each candidate goes through 3 stages: parsing → scoring → deep analysis. This takes ~15-30s per candidate on free tier.
                </div>
              </div>
            ) : ranked && (
              <div>
                <div style={{textAlign:"center",marginBottom:"2rem"}}>
                  <div style={{fontSize:10,letterSpacing:4,color:"rgba(99,102,241,0.8)",marginBottom:8,fontWeight:600}}>CANDIDATE RANKING</div>
                  <h2 style={{fontSize:"2rem",fontWeight:800,letterSpacing:-1,marginBottom:8}}>Committee's Verdict</h2>
                  {rankMeta && (
                    <div style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      maxWidth: 800,
                      margin: "1.5rem auto 0",
                      textAlign: "left",
                      whiteSpace: "pre-wrap",
                      background: "rgba(99, 102, 241, 0.05)",
                      border: "1px solid rgba(99, 102, 241, 0.15)",
                      borderRadius: 14,
                      padding: "20px",
                      lineHeight: "1.7"
                    }}>
                      {rankMeta.comparison_summary}
                    </div>
                  )}
                </div>

                {rankMeta?.top_pick_reason && (
                  <div style={{padding:"12px 16px",background:"rgba(0,255,136,0.06)",border:"1px solid rgba(0,255,136,0.15)",borderRadius:12,marginBottom:"1.25rem",fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>
                    🏆 <strong style={{color:"#00ff88"}}>Top pick reason:</strong> {rankMeta.top_pick_reason}
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {ranked.filter(c => c.overall_score > 0).sort((a,b) => a.rank - b.rank).map((c, i) => {
                    const vc = dc(c.verdict);
                    const isExpanded = expandedCandidate === c.id;
                    return (
                      <div key={c.id || `ranked-${i}`} style={{borderRadius:18,border:`1px solid ${vc}20`,overflow:"hidden",animation:`slideRight 0.4s ease ${i*0.08}s both`,background:"rgba(255,255,255,0.03)"}}>
                        <div style={{padding:"1.2rem 1.5rem",cursor:"pointer",display:"flex",alignItems:"center",gap:14}} onClick={() => setExpandedCandidate(isExpanded ? null : c.id)}>
                          <div style={{width:44,height:44,borderRadius:"50%",background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#9ca3af,#6b7280)":i===2?"linear-gradient(135deg,#92400e,#78350f)":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:i<3?"18px":"14px",flexShrink:0,boxShadow:i===0?"0 0 20px rgba(251,191,36,0.4)":"none"}}>
                            {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${c.rank}`}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <span style={{fontWeight:700,fontSize:15}}>{c.name}</span>
                              <span style={{fontSize:11,padding:"2px 9px",background:`${vc}15`,border:`1px solid ${vc}30`,borderRadius:999,color:vc,fontWeight:600,flexShrink:0}}>{c.verdict}</span>
                            </div>
                            <p style={{fontSize:12,color:"rgba(255,255,255,0.45)",margin:0,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.summary}</p>
                          </div>
                          <div style={{textAlign:"center",flexShrink:0}}>
                            <div style={{fontSize:"1.6rem",fontWeight:900,color:vc,lineHeight:1}}>{c.overall_score}</div>
                            <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",letterSpacing:1}}>SCORE</div>
                          </div>
                          <div style={{fontSize:16,color:"rgba(255,255,255,0.25)",flexShrink:0}}>{isExpanded?"▲":"▼"}</div>
                        </div>

                        {isExpanded && (
                          <div style={{padding:"0 1.5rem 1.4rem",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,margin:"1rem 0"}}>
                              {Object.entries(c.scores||{}).map(([k,v]) => (
                                <div key={k} style={{textAlign:"center",background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"8px 4px",border:"1px solid rgba(255,255,255,0.06)"}}>
                                  <div style={{fontSize:"1.2rem",fontWeight:700,color:Number(v)>=70?"#00ff88":Number(v)>=50?"#fbbf24":"#ff4466"}}>{v}</div>
                                  <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",textTransform:"capitalize",marginTop:2}}>{k.replace("_"," ")}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                              <div style={{background:"rgba(0,255,136,0.05)",border:"1px solid rgba(0,255,136,0.12)",borderRadius:12,padding:"10px 12px"}}>
                                <div style={{fontSize:9,color:"#00ff88",fontWeight:600,letterSpacing:1,marginBottom:7}}>STRENGTHS</div>
                                {c.strengths?.map((s,j) => <div key={j} style={{display:"flex",gap:5,marginBottom:5}}><span style={{color:"#00ff88",fontSize:10,flexShrink:0}}>•</span><span style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.4}}>{s}</span></div>)}
                              </div>
                              <div style={{background:"rgba(255,68,102,0.05)",border:"1px solid rgba(255,68,102,0.12)",borderRadius:12,padding:"10px 12px"}}>
                                <div style={{fontSize:9,color:"#ff4466",fontWeight:600,letterSpacing:1,marginBottom:7}}>CONCERNS</div>
                                {c.weaknesses?.map((s,j) => <div key={j} style={{display:"flex",gap:5,marginBottom:5}}><span style={{color:"#ff4466",fontSize:10,flexShrink:0}}>•</span><span style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.4}}>{s}</span></div>)}
                              </div>
                            </div>
                            {c.predicted_questions?.length > 0 && (
                              <div style={{background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                                <div style={{fontSize:9,color:"#fbbf24",fontWeight:600,letterSpacing:1,marginBottom:7}}>PREDICTED INTERVIEW QUESTIONS</div>
                                {c.predicted_questions.map((q,j) => <div key={j} style={{display:"flex",gap:6,marginBottom:6}}><span style={{color:"#fbbf24",fontSize:10,flexShrink:0,fontWeight:700}}>Q{j+1}</span><span style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.4}}>{q}</span></div>)}
                              </div>
                            )}
                             {/* Enterprise Rejection and Roadmap details */}
                             {enterpriseReports[i]?.comparativeRejectionDetails && (
                               <div style={{padding:"10px 12px",background:"rgba(255,68,102,0.06)",border:"1px solid rgba(255,68,102,0.15)",borderRadius:12,marginBottom:10,fontSize:12,lineHeight:1.5}}>
                                 <span style={{color:"#ff4466",fontWeight:700}}>Recruiter Transparency: </span>
                                 <span style={{color:"rgba(255,255,255,0.7)"}}>{enterpriseReports[i].comparativeRejectionDetails}</span>
                                </div>
                             )}

                             {enterpriseReports[i]?.improvementRoadmap?.length > 0 && (
                               <div style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.12)",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                                 <div style={{fontSize:9,color:"#6366f1",fontWeight:600,letterSpacing:1,marginBottom:7}}>PERSONALIZED ROADMAP FOR IMPROVEMENT</div>
                                 {enterpriseReports[i].improvementRoadmap.map((item: string, j: number) => (
                                   <div key={j} style={{display:"flex",gap:6,marginBottom:5}}>
                                     <span style={{color:"#6366f1",fontSize:10,flexShrink:0}}>→</span>
                                     <span style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.4}}>{item}</span>
                                   </div>
                                 ))}
                               </div>
                             )}

                             <div style={{padding:"8px 12px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:10,fontSize:12,lineHeight:1.5}}>
                               <span style={{color:"rgba(99,102,241,0.8)",fontWeight:600}}>Unique Advantage: </span>
                               <span style={{color:"rgba(255,255,255,0.6)"}}>{c.hire_recommendation}</span>
                             </div>
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Collapsed section for unparsed/empty candidates */}
                {ranked.filter(c => c.overall_score === 0).length > 0 && (
                  <details style={{marginTop:"1rem"}}>
                    <summary style={{fontSize:12,color:"rgba(255,255,255,0.35)",cursor:"pointer",padding:"8px 0",userSelect:"none"}}>
                      ⚠️ {ranked.filter(c => c.overall_score === 0).length} candidate(s) could not be parsed — click to expand
                    </summary>
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                      {ranked.filter(c => c.overall_score === 0).map((c, i) => (
                        <div key={c.id || `unparsed-${i}`} style={{padding:"8px 14px",background:"rgba(255,68,102,0.04)",border:"1px solid rgba(255,68,102,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{c.name}</span>
                          <span style={{fontSize:10,color:"rgba(255,68,102,0.5)"}}>Resume empty or could not be parsed</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div style={{display:"flex",justifyContent:"center",gap:"1rem",marginTop:"1.5rem"}}>
                  <button className="btn-primary" onClick={() => { setStep("input"); setRanked(null); }} style={{padding:"0.75rem 2rem",borderRadius:12,fontSize:13,letterSpacing:2}}>↺ New Ranking</button>
                  <button
                    className="btn-primary"
                    onClick={exportRankingToXLSX}
                    style={{ padding: "0.75rem 2rem", borderRadius: 12, fontSize: 13, letterSpacing: 2 }}
                  >
                    ⬇ Export to XLSX
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FUNNEL RESULTS ─── */}
        {step === "funnel_results" && (
          <div style={{animation:"fadeIn 0.5s ease"}}>
            <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
              <div style={{fontSize:10,letterSpacing:4,color:"rgba(99,102,241,0.8)",marginBottom:8,fontWeight:600}}>HIRING FUNNEL SIMULATION</div>
              <h2 style={{fontSize:"2.2rem",fontWeight:900,letterSpacing:-1.5,marginBottom:8}}>Multi-Stage Shortlisting Report</h2>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",maxWidth:600,margin:"0 auto"}}>Candid evaluation of 500 applicants through resume filters, code deep screening, and live hiring committee review.</p>
            </div>

            {/* Funnel Stats Grid */}
            {funnelAnalytics && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:"2rem"}}>
                {[
                  { label: "APPLICANTS", val: funnelAnalytics.funnel.totalApplicants, color: "#94a3b8" },
                  { label: "STAGE 1 PASSED", val: funnelAnalytics.funnel.stage1Passed, color: "#a855f7" },
                  { label: "STAGE 2 PASSED", val: funnelAnalytics.funnel.stage2Passed, color: "#6366f1" },
                  { label: "FINALISTS", val: funnelAnalytics.funnel.finalists, color: "#22d3ee" },
                  { label: "OFFERS", val: funnelAnalytics.funnel.offers, color: "#00ff88" },
                  { label: "WAITLIST", val: funnelAnalytics.funnel.waitlist, color: "#fbbf24" }
                ].map((stat, idx) => (
                  <div key={idx} className="glass" style={{padding:"14px",borderRadius:14,textAlign:"center",border:`1px solid ${stat.color}25`}}>
                    <div style={{fontSize:"1.6rem",fontWeight:900,color:stat.color}}>{stat.val}</div>
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:1,marginTop:2}}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Funnel Stack Diagram */}
            {funnelAnalytics && (
              <div className="glass" style={{borderRadius:20,padding:"2rem",border:"1px solid rgba(255,255,255,0.06)",marginBottom:"2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.35)",fontWeight:700,marginBottom:10}}>CONVERSION PIPELINE</div>
                <div style={{width:"100%",maxWidth:400,height:24,background:"rgba(148,163,184,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(148,163,184,0.3)",fontSize:11,fontWeight:700}}>
                  Total applicants: {funnelAnalytics.funnel.totalApplicants}
                </div>
                <div style={{width:"80%",maxWidth:320,height:24,background:"rgba(168,85,247,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(168,85,247,0.3)",fontSize:11,fontWeight:700,color:"#c084fc"}}>
                  Stage 1 Screened: {funnelAnalytics.funnel.stage1Passed}
                </div>
                <div style={{width:"60%",maxWidth:320,height:24,background:"rgba(99,102,241,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(99,102,241,0.3)",fontSize:11,fontWeight:700,color:"#818cf8"}}>
                  Stage 2 Deep Checked: {funnelAnalytics.funnel.stage2Passed}
                </div>
                <div style={{width:"40%",maxWidth:320,height:24,background:"rgba(34,211,238,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(34,211,238,0.3)",fontSize:11,fontWeight:700,color:"#22d3ee"}}>
                  Committee Finalists: {funnelAnalytics.funnel.finalists}
                </div>
                <div style={{width:"20%",maxWidth:320,height:24,background:"rgba(0,255,136,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(0,255,136,0.3)",fontSize:11,fontWeight:700,color:"#00ff88"}}>
                  Offers: {funnelAnalytics.funnel.offers}
                </div>
              </div>
            )}

            {/* Funnel Candidates List */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:"2rem"}}>
              {funnelStates.map((fs, idx) => {
                const isExpanded = expandedCandidate === fs.candidate_id;
                const statusColor = fs.status === "HIRE" ? "#00ff88" : fs.status === "ADVANCE" ? "#22d3ee" : fs.status === "HOLD" ? "#fbbf24" : "#ff4466";
                return (
                  <div key={fs.candidate_id} style={{borderRadius:18,border:`1px solid ${statusColor}20`,background:"rgba(255,255,255,0.03)",overflow:"hidden"}}>
                    <div style={{padding:"1.2rem 1.5rem",cursor:"pointer",display:"flex",alignItems:"center",gap:14}} onClick={() => setExpandedCandidate(isExpanded ? null : fs.candidate_id)}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>
                        #{fs.rank || idx + 1}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontWeight:700,fontSize:14}}>{fs.name}</span>
                          <span style={{fontSize:9,padding:"1px 8px",background:`${statusColor}15`,border:`1px solid ${statusColor}30`,borderRadius:999,color:statusColor,fontWeight:600}}>{fs.status}</span>
                        </div>
                        <p style={{fontSize:12,color:"rgba(255,255,255,0.45)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fs.headline}</p>
                      </div>
                      <div style={{fontSize:16,color:"rgba(255,255,255,0.25)"}}>{isExpanded?"▲":"▼"}</div>
                    </div>

                    {isExpanded && (
                      <div style={{padding:"1.25rem 1.5rem",borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",gap:12}}>
                        {/* Stage 1 Report */}
                        <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.05)"}}>
                          <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#a855f7",marginBottom:6}}>STAGE 1: RESUME SCREEN</div>
                          <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>{fs.stage_1_report.reasons}</div>
                        </div>

                        {/* Stage 2 Report */}
                        {fs.stage_2_report && (
                          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.05)"}}>
                            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#6366f1",marginBottom:6}}>STAGE 2: DEEP SCREEN</div>
                            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>{fs.stage_2_report.reasonForDecision}</div>
                          </div>
                        )}

                        {/* Stage 3 Committee Report */}
                        {fs.committee_report && (
                          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.05)"}}>
                            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#22d3ee",marginBottom:6}}>STAGE 3: COMMITTEE FEEDBACK</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}><strong style={{color:"#00ff88"}}>Recruiter:</strong> {fs.committee_report.recruiterOpinion}</div>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}><strong style={{color:"#22d3ee"}}>Hiring Manager:</strong> {fs.committee_report.hiringManagerOpinion}</div>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}><strong style={{color:"#fbbf24"}}>Tech Lead:</strong> {fs.committee_report.technicalLeadOpinion}</div>
                            </div>
                          </div>
                        )}

                        {/* Stage 4 Decision */}
                        {fs.final_decision_report && (
                          <div style={{background:"rgba(0,255,136,0.04)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(0,255,136,0.12)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#00ff88",marginBottom:4}}>STAGE 4: FINAL RECRUITING OFFER</div>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Expected performance: <strong>{fs.final_decision_report.expectedPerformance}</strong></div>
                            </div>
                            <div style={{fontSize:"1.2rem",fontWeight:800,color:"#00ff88"}}>{fs.final_decision_report.recommendedSalaryBand}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{display:"flex",justifyContent:"center",marginTop:"1.5rem"}}>
              <button className="btn-primary" onClick={() => { setStep("input"); setFunnelStates([]); }} style={{padding:"0.75rem 2rem",borderRadius:12,fontSize:13,letterSpacing:2}}>↺ New Simulation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}