"use client";
import { useState, useEffect, useRef } from "react";

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
  return d === "SHORTLIST" || d === "STRONG HIRE" || d === "HIRE" ? "#00ff88"
    : d === "HOLD" || d === "CONSIDER" ? "#fbbf24"
    : d === "INSUFFICIENT_DATA" || d === "ERROR" ? "#94a3b8"
    : "#ff4466";
}

function dIcon(d: string): string {
  return d === "SHORTLIST" || d === "STRONG HIRE" ? "✅"
    : d === "HOLD" || d === "CONSIDER" ? "⏳"
    : d === "INSUFFICIENT_DATA" ? "⚠️"
    : "❌";
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
  const [mode, setMode] = useState<"single"|"multi">("single");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    {id:"1",name:"Candidate 1",resume:""},{id:"2",name:"Candidate 2",resume:""}
  ]);
  const [step, setStep] = useState<"input"|"loading"|"debate"|"verdict"|"ranking">("input");
  const [agents, setAgents] = useState<(AgentResult&{typing?:boolean})[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [avg, setAvg] = useState(0);
  const [loadMsg, setLoadMsg] = useState("Initializing");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dna, setDna] = useState<DNAData|null>(null);
  const [analysis, setAnalysis] = useState<Analysis|null>(null);
  const [ranked, setRanked] = useState<RankedCandidate[]|null>(null);
  const [rankMeta, setRankMeta] = useState<{comparison_summary:string;top_pick_reason:string}|null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis"|"debate"|"questions"|"dna">("analysis");
  const [expandedCandidate, setExpandedCandidate] = useState<string|null>(null);
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

  const runRanking = async () => {
    const valid = candidates.filter(c => c.resume.trim().length >= 80);
    if (!jd.trim() || valid.length < 2) { setError("Need complete JD and at least 2 candidates with resumes (min 80 chars each)"); return; }
    setError(""); setRankLoading(true); setRanked(null); setStep("ranking");
    try {
      const res = await fetch("/api/rank-candidates", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({candidates: valid, jd}) });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("input"); }
      else { setRanked(data.ranked); setRankMeta({comparison_summary: data.comparison_summary, top_pick_reason: data.top_pick_reason}); }
    } catch (e: any) { setError(e.message); setStep("input"); }
    setRankLoading(false);
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

  const verdictColor = avg >= 75 ? "#00ff88" : avg >= 50 ? "#fbbf24" : "#ff4466";
  const verdictLabel = avg >= 75 ? "SHORTLIST" : avg >= 50 ? "HOLD" : "PASS";

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

  const reset = () => { setStep("input"); setAgents([]); setCurrentIdx(0); setResume(""); setDna(null); setAnalysis(null); setRanked(null); setError(""); };

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
                {[{id:"single",icon:"👤",label:"Single Candidate"},{id:"multi",icon:"👥",label:"Compare Candidates"}].map(m => (
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

            {/* Single mode */}
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
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:"#a855f7",boxShadow:"0 0 8px #a855f7"}}/>
                    <span style={{fontSize:11,letterSpacing:2,color:"rgba(168,85,247,0.9)",fontWeight:700}}>CANDIDATES ({candidates.length}/8)</span>
                  </div>
                  <button onClick={() => candidates.length < 8 && setCandidates(p => [...p, {id:Date.now().toString(),name:`Candidate ${p.length+1}`,resume:""}])} disabled={candidates.length >= 8} style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"rgba(99,102,241,0.9)",cursor:"pointer",fontSize:12,fontWeight:600,opacity:candidates.length>=8?0.4:1}}>
                    + Add Candidate
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {candidates.map((c, i) => (
                    <div key={c.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,#6366f1,#a855f7)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                        <input value={c.name} onChange={e => setCandidates(p => p.map(x => x.id===c.id ? {...x,name:e.target.value} : x))} style={{flex:1,background:"transparent",border:"none",color:"white",fontSize:13,fontWeight:600,fontFamily:"inherit"}} placeholder={`Candidate ${i+1} name`}/>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <label style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(168,85,247,0.3)",background:"rgba(168,85,247,0.08)",color:"rgba(168,85,247,0.8)",cursor:"pointer",fontSize:11,fontWeight:600,flexShrink:0}}>
                            📄 Upload<input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, c.id); }}/>
                          </label>
                          {candidates.length > 2 && <button onClick={() => setCandidates(p => p.filter(x => x.id !== c.id))} style={{padding:"4px 8px",borderRadius:6,border:"1px solid rgba(255,68,102,0.25)",background:"transparent",color:"rgba(255,68,102,0.6)",cursor:"pointer",fontSize:12}}>✕</button>}
                        </div>
                      </div>
                      <textarea value={c.resume} onChange={e => setCandidates(p => p.map(x => x.id===c.id ? {...x,resume:e.target.value} : x))} rows={3} style={{width:"100%",background:"rgba(168,85,247,0.04)",border:`1px solid ${c.resume.trim().length>0&&c.resume.trim().length<80?"rgba(255,68,102,0.3)":"rgba(168,85,247,0.15)"}`,borderRadius:10,padding:"10px 12px",color:"rgba(255,255,255,0.75)",fontSize:12,resize:"none",fontFamily:"inherit",lineHeight:1.5,boxSizing:"border-box"}} placeholder="Paste resume or upload file..."/>
                      {c.resume.trim().length > 0 && c.resume.trim().length < 80 && <div style={{fontSize:10,color:"#ff4466",marginTop:3}}>Too short ({c.resume.trim().length}/80)</div>}
                    </div>
                  ))}
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
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>

                      {/* Skills Matrix */}
                      <div className="glass card-hover" style={{borderRadius:16,padding:"1.25rem",border:"1px solid rgba(255,255,255,0.07)"}}>
                        <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.35)",marginBottom:"1rem",fontWeight:600}}>SKILLS MATRIX</div>
                        <div style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Must-Have</span>
                            <span style={{fontSize:12,fontWeight:700,color:analysis.must_have_skills.match_percent>=70?"#00ff88":"#ff4466"}}>{analysis.must_have_skills.match_percent}%</span>
                          </div>
                          <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:999,marginBottom:8,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${analysis.must_have_skills.match_percent}%`,background:analysis.must_have_skills.match_percent>=70?"linear-gradient(90deg,#00ff88,#22d3ee)":"linear-gradient(90deg,#ff4466,#ff6b6b)",borderRadius:999,transition:"width 0.8s ease"}}/>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {analysis.must_have_skills.present?.map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.25)",borderRadius:6,color:"#00ff88"}}>✓ {s}</span>)}
                            {analysis.must_have_skills.missing?.map((s,i) => <span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(255,68,102,0.1)",border:"1px solid rgba(255,68,102,0.25)",borderRadius:6,color:"#ff4466"}}>✗ {s}</span>)}
                          </div>
                        </div>
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
                {activeTab === "questions" && (
                  <div style={{animation:"fadeIn 0.3s ease"}}>
                    <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:"1.25rem"}}>Questions crafted to probe specific gaps and verify claims in this candidate's profile.</p>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {analysis.interview_questions?.map((q, i) => (
                        <div key={i} className="glass card-hover" style={{borderRadius:16,padding:"1.4rem",border:"1px solid rgba(251,191,36,0.12)",position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:"linear-gradient(180deg,#fbbf24,#fbbf2415)"}}/>
                          <div style={{paddingLeft:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                                <span style={{fontSize:10,fontWeight:700,color:"rgba(251,191,36,0.8)",letterSpacing:1}}>Q{i+1}</span>
                                <span style={{fontSize:10,padding:"2px 8px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:999,color:"#fbbf24"}}>{q.type}</span>
                              </div>
                              <span style={{fontSize:10,padding:"2px 8px",background:q.difficulty==="Hard"?"rgba(255,68,102,0.1)":q.difficulty==="Medium"?"rgba(251,191,36,0.1)":"rgba(0,255,136,0.08)",border:`1px solid ${q.difficulty==="Hard"?"rgba(255,68,102,0.25)":q.difficulty==="Medium"?"rgba(251,191,36,0.25)":"rgba(0,255,136,0.2)"}`,borderRadius:999,color:q.difficulty==="Hard"?"#ff4466":q.difficulty==="Medium"?"#fbbf24":"#00ff88"}}>{q.difficulty}</span>
                            </div>
                            <p style={{color:"rgba(255,255,255,0.88)",fontSize:14,fontWeight:500,marginBottom:10,lineHeight:1.5}}>{q.question}</p>
                            <div style={{padding:"7px 10px",background:"rgba(99,102,241,0.08)",borderRadius:8,display:"flex",gap:7,alignItems:"flex-start"}}>
                              <span style={{color:"#6366f1",fontSize:11,flexShrink:0,marginTop:1}}>🎯</span>
                              <span style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>Probes: {q.probes}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                <div style={{fontSize:14,letterSpacing:3,color:"rgba(255,255,255,0.5)"}}>Ranking candidates...</div>
              </div>
            ) : ranked && (
              <div>
                <div style={{textAlign:"center",marginBottom:"2rem"}}>
                  <div style={{fontSize:10,letterSpacing:4,color:"rgba(99,102,241,0.8)",marginBottom:8,fontWeight:600}}>CANDIDATE RANKING</div>
                  <h2 style={{fontSize:"2rem",fontWeight:800,letterSpacing:-1,marginBottom:8}}>Committee's Verdict</h2>
                  {rankMeta && <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",maxWidth:600,margin:"0 auto"}}>{rankMeta.comparison_summary}</p>}
                </div>

                {rankMeta?.top_pick_reason && (
                  <div style={{padding:"12px 16px",background:"rgba(0,255,136,0.06)",border:"1px solid rgba(0,255,136,0.15)",borderRadius:12,marginBottom:"1.25rem",fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>
                    🏆 <strong style={{color:"#00ff88"}}>Top pick reason:</strong> {rankMeta.top_pick_reason}
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {ranked.sort((a,b) => a.rank - b.rank).map((c, i) => {
                    const vc = dc(c.verdict);
                    const isExpanded = expandedCandidate === c.id;
                    return (
                      <div key={c.id} style={{borderRadius:18,border:`1px solid ${vc}20`,overflow:"hidden",animation:`slideRight 0.4s ease ${i*0.08}s both`,background:"rgba(255,255,255,0.03)"}}>
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
                            <div style={{padding:"8px 12px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:10,fontSize:12,lineHeight:1.5}}>
                              <span style={{color:"rgba(99,102,241,0.8)",fontWeight:600}}>Recommendation: </span>
                              <span style={{color:"rgba(255,255,255,0.6)"}}>{c.hire_recommendation}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"center",marginTop:"1.5rem"}}>
                  <button className="btn-primary" onClick={() => { setStep("input"); setRanked(null); }} style={{padding:"0.75rem 2rem",borderRadius:12,fontSize:13,letterSpacing:2}}>↺ New Ranking</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}