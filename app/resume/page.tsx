"use client";
import { useState } from "react";

interface ResumeData {
  name: string; title: string; email: string; phone: string;
  linkedin: string; github?: string; location: string; summary: string;
  experience: { role: string; company: string; duration: string; location: string; bullets: string[] }[];
  education: { degree: string; institution: string; year: string; gpa?: string; relevant?: string }[];
  skills: { languages: string[]; frameworks: string[]; tools: string[]; databases: string[]; concepts: string[] };
  projects: { name: string; link?: string; tech: string; bullets: string[] }[];
  certifications: string[];
  achievements: string[];
  ats_score: number;
  keywords_matched: string[];
  improvements: string[];
  advanced_metrics?: {
    recruiter_attention: number;
    skill_credibility: number;
    achievement_impact: number;
    content_quality: number;
    personal_branding: number;
    design_quality: number;
    interview_readiness: number;
    trust_score: number;
    resume_dna_score: number;
  };
}

const TEMPLATES = [
  { id: "ats-classic", name: "ATS Classic", desc: "Harvard/Wall Street style, single-column, max ATS compliance", accent: "#111827", bg: "#111827" },
  { id: "modern-tech", name: "Modern Tech", desc: "Sidebar layout, skills panel, modern visual feel", accent: "#6366f1", bg: "#1e1b4b" },
  { id: "corporate", name: "Corporate", desc: "Traditional recruiter format, serif font", accent: "#1e3a5f", bg: "#1e3a5f" },
  { id: "executive", name: "Executive", desc: "Premium layout, leadership-focused", accent: "#92400e", bg: "#92400e" },
  { id: "creative", name: "Creative", desc: "Gradient header, visual hierarchy", accent: "#7c3aed", bg: "#7c3aed" },
  { id: "fresher", name: "Fresher", desc: "Education-first, clean details", accent: "#059669", bg: "#059669" },
  { id: "startup", name: "Startup", desc: "Bold modern typography, projects focus", accent: "#dc2626", bg: "#dc2626" },
];

function TemplateThumb({ t, selected, onClick }: { t: typeof TEMPLATES[0]; selected: boolean; onClick: () => void }) {
  const layouts: Record<string, React.ReactNode> = {
    "ats-classic": (
      <div style={{ padding: "6px 8px" }}>
        <div style={{ textAlign: "center", borderBottom: "1.5px solid #111827", paddingBottom: 2, marginBottom: 4 }}>
          <div style={{ height: 3, background: "#111827", width: "16px", margin: "0 auto 2px", borderRadius: 0.5 }} />
          <div style={{ height: 1.5, background: "rgba(0,0,0,0.2)", width: "24px", margin: "0 auto" }} />
        </div>
        {[14, 10, 12, 8, 10].map((w, i) => (
          <div key={i} style={{ height: 2, background: "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 0.5, marginBottom: 2 }} />
        ))}
      </div>
    ),
    "modern-tech": (
      <div style={{ display: "flex", height: "100%", gap: 2 }}>
        <div style={{ width: "35%", background: t.bg, borderRadius: "2px 0 0 2px", padding: "4px 3px" }}>
          {[16, 8, 6, 6, 6].map((w, i) => <div key={i} style={{ height: 2, background: "rgba(255,255,255,0.6)", width: `${w}px`, borderRadius: 1, marginBottom: i === 0 ? 3 : 2 }} />)}
        </div>
        <div style={{ flex: 1, padding: "4px 3px" }}>
          {[14, 10, 8, 8, 6, 8, 8, 6].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? t.accent : "rgba(0,0,0,0.15)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
        </div>
      </div>
    ),
    "corporate": (
      <div style={{ padding: "4px 5px" }}>
        <div style={{ textAlign: "center", borderBottom: `1.5px solid ${t.accent}`, paddingBottom: 3, marginBottom: 3 }}>
          {[12, 8, 10].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? t.accent : "rgba(0,0,0,0.2)", width: `${w}px`, borderRadius: 1, marginBottom: 1, margin: "0 auto 1px" }} />)}
        </div>
        {[14, 10, 8, 8, 10, 8, 8].map((w, i) => <div key={i} style={{ height: 2, background: i % 3 === 0 ? t.accent : "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
      </div>
    ),
    "executive": (
      <div style={{ padding: "4px 3px 4px 7px", borderLeft: `3px solid ${t.accent}` }}>
        {[16, 8, 10, 6, 12, 8, 8, 6, 10, 8].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? "#1c1c1c" : i === 1 ? t.accent : "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
      </div>
    ),
    "creative": (
      <div>
        <div style={{ background: `linear-gradient(135deg,${t.accent},#a855f7)`, padding: "5px 4px", borderRadius: "3px 3px 0 0" }}>
          {[14, 8, 10].map((w, i) => <div key={i} style={{ height: 2, background: "rgba(255,255,255,0.8)", width: `${w}px`, borderRadius: 1, marginBottom: 1 }} />)}
        </div>
        <div style={{ padding: "3px 4px" }}>
          {[12, 8, 8, 6, 10, 8].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? t.accent : "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
        </div>
      </div>
    ),
    "fresher": (
      <div style={{ padding: "4px 5px" }}>
        <div style={{ background: "#ecfdf5", border: `1.5px solid ${t.accent}`, borderRadius: 3, padding: "3px 3px", marginBottom: 3 }}>
          {[12, 8, 9].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? t.accent : "rgba(0,0,0,0.15)", width: `${w}px`, borderRadius: 1, marginBottom: 1 }} />)}
        </div>
        {[12, 8, 8, 6, 10, 8].map((w, i) => <div key={i} style={{ height: 2, background: i % 3 === 0 ? t.accent : "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
      </div>
    ),
    "startup": (
      <div style={{ padding: "4px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid #111`, paddingBottom: 3, marginBottom: 3 }}>
          <div>{[14, 8].map((w, i) => <div key={i} style={{ height: 2, background: i === 0 ? "#111" : t.accent, width: `${w}px`, borderRadius: 1, marginBottom: 1 }} />)}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>{[8, 6].map((w, i) => <div key={i} style={{ height: 1.5, background: "rgba(0,0,0,0.2)", width: `${w}px`, borderRadius: 1 }} />)}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 3 }}>
          {[6, 8, 5, 7].map((w, i) => <div key={i} style={{ height: 5, background: "#111", width: `${w}px`, borderRadius: 1 }} />)}
        </div>
        {[12, 8, 8].map((w, i) => <div key={i} style={{ height: 2, background: "rgba(0,0,0,0.12)", width: `${w}px`, borderRadius: 1, marginBottom: 2 }} />)}
      </div>
    ),
  };

  return (
    <div onClick={onClick} style={{ cursor: "pointer", borderRadius: 14, border: `2px solid ${selected ? (t.id === "ats-classic" ? "#6366f1" : t.accent) : "rgba(255,255,255,0.08)"}`, background: selected ? `${t.id === "ats-classic" ? "#6366f1" : t.accent}10` : "rgba(255,255,255,0.02)", transition: "all 0.2s", overflow: "hidden" }}>
      <div style={{ height: 80, background: "white", margin: "8px 8px 0", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
        {layouts[t.id]}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: selected ? "white" : "rgba(255,255,255,0.6)", marginBottom: 2 }}>{t.name}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>{t.desc}</div>
      </div>
    </div>
  );
}

function ResumeSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${accent}30`, paddingBottom: 4, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function ResumePage() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [targetRole, setTargetRole] = useState("");
  const [experience, setExperience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [background, setBackground] = useState("");
  const [template, setTemplate] = useState("ats-classic");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [certifications, setCertifications] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [error, setError] = useState("");

  const build = async () => {
    if (!targetRole || !background) return;
    setStep("loading"); setError("");
    try {
      const res = await fetch("/api/build-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, targetRole, experience, background, template, linkedin, github, certifications })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResume(data); setStep("result");
    } catch (e: any) { setError(e.message); setStep("input"); }
  };

  const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

  const downloadPDF = () => {
    if (!resume) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const css: Record<string, string> = {
      "ats-classic": `
        body{font-family:'Georgia',Times,serif;font-size:9.5pt;color:#111827;line-height:1.45;margin:0;}
        .wrap{max-width:760px;margin:0 auto;padding:30px 40px;}
        .hd{text-align:center;margin-bottom:14px;}
        .name{font-size:18pt;font-weight:700;letter-spacing:-0.5px;color:#111827;margin-bottom:4px;text-transform:uppercase;}
        .ci{font-size:8pt;color:#4b5563;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}
        .sm{font-size:9pt;color:#374151;line-height:1.5;margin-bottom:12px;text-align:justify;}
        .mt{font-size:9pt;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #111827;padding-bottom:2px;margin:14px 0 6px;}
        .jh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;}
        .jt{font-weight:700;font-size:9.5pt;color:#111827;}
        .co{font-weight:700;font-size:9.5pt;color:#374151;}
        .du{font-size:8.5pt;color:#4b5563;font-style:italic;}
        li{font-size:9pt;color:#374151;line-height:1.45;margin-bottom:2px;}
        .skills-grid{display:table;width:100%;margin-bottom:6px;}
        .skills-row{display:table-row;}
        .skills-label{display:table-cell;font-weight:700;width:110px;font-size:9.5pt;padding-bottom:3px;color:#111827;}
        .skills-val{display:table-cell;font-size:9pt;color:#374151;padding-bottom:3px;}
        .ch{display:inline-block;margin-right:10px;font-size:8.5pt;}
        .clearfix::after{content:'';display:table;clear:both;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`,
      "modern-tech": `
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:9pt;color:#1f2937;margin:0;}
        .wrap{display:grid;grid-template-columns:215px 1fr;min-height:100vh;}
        .sidebar{background:#1e1b4b;color:white;padding:26px 18px;}
        .main{padding:26px 30px;}
        .name{font-size:17pt;font-weight:800;color:white;letter-spacing:-0.5px;line-height:1.1;margin-bottom:3px;}
        .title{font-size:9.5pt;color:#a5b4fc;font-weight:500;margin-bottom:18px;}
        .ci{font-size:8pt;color:#c7d2fe;margin-bottom:5px;display:flex;align-items:center;gap:5px;}
        .st{font-size:7.5pt;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid rgba(165,180,252,0.25);padding-bottom:3px;margin:16px 0 8px;}
        .sk{font-size:8pt;color:#e0e7ff;margin-bottom:3px;}
        .mt{font-size:9pt;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #6366f1;padding-bottom:3px;margin:16px 0 9px;}
        .jh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;flex-wrap:wrap;}
        .jt{font-weight:700;font-size:9.5pt;color:#1f2937;}
        .co{color:#6366f1;font-weight:600;font-size:9pt;}
        .du{font-size:7.5pt;color:#9ca3af;}
        li{font-size:8.5pt;color:#374151;line-height:1.5;margin-bottom:1.5px;}
        .sm{font-size:9pt;color:#374151;line-height:1.65;padding:8px 10px;background:#f5f3ff;border-left:3px solid #6366f1;border-radius:0 3px 3px 0;margin-bottom:14px;}
        .ch{display:inline-block;background:#ede9fe;color:#6366f1;font-size:7.5pt;padding:1px 6px;border-radius:3px;margin:1px;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`,
      "corporate": `
        body{font-family:'Times New Roman',serif;font-size:10pt;color:#000;margin:0;}
        .wrap{max-width:760px;margin:0 auto;padding:34px 42px;}
        .hd{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;}
        .name{font-size:21pt;font-weight:700;color:#1e3a5f;}
        .title{font-size:10.5pt;font-style:italic;color:#1e3a5f;margin:3px 0 6px;}
        .ci{font-size:8pt;color:#444;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}
        .mt{font-size:9.5pt;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #1e3a5f;padding-bottom:2px;margin:14px 0 7px;}
        .jt{font-weight:700;font-size:9.5pt;}
        .co{font-weight:600;}
        .du{font-size:8.5pt;color:#555;float:right;}
        li{font-size:9pt;line-height:1.55;margin-bottom:1.5px;}
        .sm{font-size:9pt;line-height:1.65;margin-bottom:12px;}
        .ch{display:inline-block;font-size:8.5pt;margin-right:12px;}
        .clearfix::after{content:'';display:table;clear:both;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`,
      "executive": `
        body{font-family:Georgia,serif;font-size:9.5pt;color:#1c1c1c;margin:0;}
        .wrap{max-width:760px;margin:0 auto;padding:30px 42px;}
        .hd{border-left:4px solid #92400e;padding-left:16px;margin-bottom:20px;}
        .name{font-size:25pt;font-weight:700;letter-spacing:-1px;line-height:1;}
        .title{font-size:11.5pt;color:#92400e;font-weight:400;margin:4px 0 7px;letter-spacing:0.5px;}
        .ci{font-size:7.5pt;color:#666;display:flex;gap:14px;flex-wrap:wrap;}
        .tl{font-size:9.5pt;color:#555;font-style:italic;line-height:1.6;margin:12px 0;padding:9px 12px;border:1px solid #d6b896;background:#fdf8f3;border-radius:3px;}
        .mt{font-size:8pt;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:3px;margin:16px 0 7px;border-bottom:1px solid #d6b896;padding-bottom:3px;}
        .jt{font-weight:700;font-size:10pt;color:#1c1c1c;}
        .co{color:#92400e;}
        .du{font-size:8pt;color:#888;float:right;}
        li{font-size:9pt;line-height:1.6;margin-bottom:2px;}
        .sg{display:grid;grid-template-columns:1fr 1fr;gap:3px 18px;}
        .sr{font-size:9pt;margin-bottom:3px;}
        .sc{font-weight:700;color:#1c1c1c;}
        .ch{display:inline-block;border:1px solid #d6b896;padding:1px 8px;font-size:8pt;color:#92400e;margin:2px;border-radius:2px;}
        .clearfix::after{content:'';display:table;clear:both;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`,
      "creative": `
        body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#1a1a1a;margin:0;}
        .hd{background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:28px 34px;}
        .name{font-size:27pt;font-weight:900;letter-spacing:-2px;color:white;}
        .title{font-size:11.5pt;color:rgba(255,255,255,0.8);font-weight:300;margin:3px 0 8px;letter-spacing:2px;text-transform:uppercase;}
        .ci{font-size:8pt;color:rgba(255,255,255,0.7);display:flex;gap:12px;flex-wrap:wrap;}
        .bd{padding:26px 34px;}
        .mt{font-size:10.5pt;font-weight:900;color:#7c3aed;margin:16px 0 9px;display:flex;align-items:center;gap:7px;}
        .mt::after{content:'';flex:1;height:1.5px;background:linear-gradient(90deg,#7c3aed25,transparent);}
        .jt{font-weight:800;font-size:10pt;color:#1a1a1a;}
        .co{color:#7c3aed;font-weight:600;font-size:9.5pt;}
        .du{font-size:7.5pt;color:#9ca3af;}
        li{font-size:8.5pt;color:#374151;line-height:1.55;margin-bottom:2px;}
        .sm{font-size:9pt;line-height:1.7;color:#374151;padding:10px 12px;background:#faf5ff;border-radius:6px;margin-bottom:14px;}
        .st{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px;}
        .sg{background:#f3e8ff;color:#7c3aed;padding:2px 9px;border-radius:999px;font-size:8pt;font-weight:600;}
        .ch{display:inline-block;border:1.5px solid #c4b5fd;color:#7c3aed;padding:1px 9px;font-size:7.5pt;border-radius:999px;margin:2px;}
        @media print{
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .hd{background:none !important;background-color:transparent !important;color:#7c3aed !important;border-bottom:2px solid #7c3aed !important;padding:20px 0 !important;}
          .name{color:#7c3aed !important;}
          .title{color:#a855f7 !important;}
          .ci{color:#4b5563 !important;}
        }`,
      "fresher": `
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1f2937;margin:0;}
        .wrap{max-width:760px;margin:0 auto;padding:26px 34px;}
        .hd{text-align:center;background:#ecfdf5;border:2px solid #059669;border-radius:10px;padding:18px;margin-bottom:18px;}
        .name{font-size:21pt;font-weight:800;color:#064e3b;}
        .title{font-size:10pt;color:#059669;font-weight:600;margin:3px 0 7px;}
        .ci{font-size:8pt;color:#374151;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}
        .mt{display:inline-block;font-size:9pt;font-weight:700;color:#064e3b;text-transform:uppercase;letter-spacing:1.5px;background:#ecfdf5;padding:3px 9px;border-radius:4px;margin:13px 0 7px;}
        .ec{background:#f0fdf4;border:1px solid #a7f3d0;border-radius:7px;padding:10px 12px;margin-bottom:8px;}
        .jt{font-weight:700;font-size:9.5pt;color:#064e3b;}
        .co{color:#059669;font-size:9pt;}
        .du{font-size:7.5pt;color:#9ca3af;float:right;}
        li{font-size:8.5pt;color:#374151;line-height:1.5;margin-bottom:2px;}
        .sm{font-size:9pt;line-height:1.65;margin-bottom:14px;}
        .sr{font-size:9pt;margin-bottom:3px;}
        .sc{font-weight:700;color:#064e3b;}
        .ch{display:inline-block;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;padding:2px 7px;border-radius:3px;font-size:7.5pt;margin:2px;}
        .clearfix::after{content:'';display:table;clear:both;}
        @media print{
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .hd{background:transparent !important;border:2px solid #059669 !important;padding:14px !important;}
          .ec{background:transparent !important;border:1px solid #6ee7b7 !important;}
        }`,
      "startup": `
        body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#111;margin:0;}
        .wrap{max-width:760px;margin:0 auto;padding:22px 30px;}
        .hd{border-bottom:3.5px solid #111;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px;}
        .nb .name{font-size:26pt;font-weight:900;letter-spacing:-2px;color:#111;line-height:1;}
        .nb .title{font-size:10.5pt;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-top:3px;}
        .cb{font-size:7.5pt;color:#555;text-align:right;line-height:1.6;}
        .sm{font-size:9pt;line-height:1.65;padding:8px 10px;background:#fff5f5;border-left:3px solid #dc2626;margin-bottom:12px;}
        .mt{font-size:7.5pt;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#111;border-top:1.5px solid #111;padding-top:4px;margin:14px 0 7px;}
        .jt{font-weight:900;font-size:9.5pt;}
        .co{color:#dc2626;font-weight:700;}
        .du{font-size:7.5pt;color:#888;float:right;}
        li{font-size:8.5pt;line-height:1.5;margin-bottom:2px;}
        .st{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px;}
        .sg{background:#111;color:white;padding:2px 9px;font-size:7.5pt;font-weight:700;border-radius:2px;}
        .pn{font-weight:900;font-size:9.5pt;text-transform:uppercase;letter-spacing:0.5px;}
        .pt{font-size:7.5pt;color:#dc2626;font-weight:700;}
        .ch{display:inline-block;border:2px solid #111;padding:1px 7px;font-size:7.5pt;font-weight:700;margin:2px;}
        .clearfix::after{content:'';display:table;clear:both;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`
    };

    const buildContent = () => {
      if (!resume) return "";
      const r = resume;

      const formatAch = (s: string) => {
        const idx = s.indexOf(":");
        return idx !== -1 ? `<strong>${s.slice(0, idx)}</strong>:${s.slice(idx + 1)}` : s;
      };

      if (template === "ats-classic") return `
        <div class="wrap">
          <div class="hd">
            <div class="name">${r.name}</div>
            <div class="ci">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join(" &nbsp;|&nbsp; ")}</div>
          </div>
          <div class="sm">${r.summary}</div>
          
          ${r.experience?.length ? `
            <div class="mt">Professional Experience</div>
            ${r.experience.map(e => `
              <div class="exp-block" style="margin-bottom:10px">
                <div class="jh">
                  <div><span class="jt">${e.role}</span> · <span class="co">${e.company}</span></div>
                  <span class="du">${e.duration} · ${e.location}</span>
                </div>
                <ul style="padding-left:14px;margin-top:2px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul>
              </div>
            `).join("")}
          ` : ""}

          ${r.projects?.length ? `
            <div class="mt">Projects</div>
            ${r.projects.map(p => `
              <div class="proj-block" style="margin-bottom:8px">
                <div class="jh">
                  <div><span class="jt">${p.name}</span> <span style="font-size:8pt;font-weight:normal;color:#4b5563;font-style:italic;">| ${p.tech}</span></div>
                  ${p.link ? `<span class="du">${p.link}</span>` : ""}
                </div>
                <ul style="padding-left:14px;margin-top:2px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul>
              </div>
            `).join("")}
          ` : ""}

          ${r.education?.length ? `
            <div class="mt">Education</div>
            ${r.education.map(e => `
              <div class="edu-block" style="margin-bottom:6px">
                <div class="jh">
                  <div><span class="jt">${e.degree}</span> · <span class="co">${e.institution}</span>${e.relevant ? ` <span style="font-size:8pt;font-weight:normal;color:#4b5563;">(${e.relevant})</span>` : ""}</div>
                  <span class="du">${e.year}${e.gpa ? ` · GPA: ${e.gpa}` : ""}</span>
                </div>
              </div>
            `).join("")}
          ` : ""}

          <div class="mt">Technical Skills</div>
          <div class="skills-grid">
            ${r.skills?.languages?.length ? `<div class="skills-row"><div class="skills-label">Languages:</div><div class="skills-val">${r.skills.languages.join(", ")}</div></div>` : ""}
            ${r.skills?.frameworks?.length ? `<div class="skills-row"><div class="skills-label">Frameworks:</div><div class="skills-val">${r.skills.frameworks.join(", ")}</div></div>` : ""}
            ${r.skills?.tools?.length ? `<div class="skills-row"><div class="skills-label">Tools & Cloud:</div><div class="skills-val">${r.skills.tools.join(", ")}</div></div>` : ""}
            ${r.skills?.databases?.length ? `<div class="skills-row"><div class="skills-label">Databases:</div><div class="skills-val">${r.skills.databases.join(", ")}</div></div>` : ""}
          </div>

          ${r.certifications?.length ? `
            <div class="mt">Certifications</div>
            <div style="margin-bottom:4px">${r.certifications.map(c => `<span class="ch">• ${c}</span>`).join("")}</div>
          ` : ""}

          ${r.achievements?.length ? `
            <div class="mt">Achievements</div>
            <ul style="padding-left:14px;margin-top:2px">${r.achievements.map(a => `<li>${formatAch(a)}</li>`).join("")}</ul>
          ` : ""}
        </div>`;

      if (template === "modern-tech") return `
        <div class="wrap">
          <div class="sidebar">
            <div class="name">${r.name}</div>
            <div class="title">${r.title}</div>
            ${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).map(c => `<div class="ci">${c}</div>`).join("")}
            ${r.skills?.languages?.length ? `<div class="st">Languages</div>${r.skills.languages.map(s => `<div class="sk">• ${s}</div>`).join("")}` : ""}
            ${r.skills?.frameworks?.length ? `<div class="st">Frameworks</div>${r.skills.frameworks.map(s => `<div class="sk">• ${s}</div>`).join("")}` : ""}
            ${r.skills?.tools?.length ? `<div class="st">Tools & Cloud</div>${r.skills.tools.map(s => `<div class="sk">• ${s}</div>`).join("")}` : ""}
            ${r.skills?.databases?.length ? `<div class="st">Databases</div>${r.skills.databases.map(s => `<div class="sk">• ${s}</div>`).join("")}` : ""}
            ${r.certifications?.length ? `<div class="st">Certifications</div>${r.certifications.map(c => `<div class="sk" style="font-size:7.5pt">🏆 ${c}</div>`).join("")}` : ""}
          </div>
          <div class="main">
            <div class="sm">${r.summary}</div>
            ${r.experience?.length ? `<div class="mt">Professional Experience</div>${r.experience.map(e => `<div class="exp-block" style="margin-bottom:12px"><div class="jh"><div><span class="jt">${e.role}</span> · <span class="co">${e.company}</span></div><span class="du">${e.duration} · ${e.location}</span></div><ul style="padding-left:14px;margin-top:3px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
            ${r.projects?.length ? `<div class="mt">Projects</div>${r.projects.map(p => `<div class="proj-block" style="margin-bottom:10px"><div><span class="jt">${p.name}</span>${p.link ? ` <span style="font-size:7.5pt;color:#9ca3af">${p.link}</span>` : ""}</div><div style="color:#6366f1;font-size:7.5pt;margin:2px 0">${p.tech}</div><ul style="padding-left:14px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
            ${r.education?.length ? `<div class="mt">Education</div>${r.education.map(e => `<div class="edu-block" style="display:flex;justify-content:space-between;margin-bottom:7px"><div><span class="jt">${e.degree}</span> · <span class="co">${e.institution}</span>${e.relevant ? `<div style="font-size:7.5pt;color:#6b7280;margin-top:2px">${e.relevant}</div>` : ""}</div><span class="du">${e.year}${e.gpa ? ` · ${e.gpa}` : ""}</span></div>`).join("")}` : ""}
            ${r.achievements?.length ? `<div class="mt">Achievements</div>${r.achievements.map(a => `<div style="font-size:8.5pt;color:#374151;margin-bottom:3px">★ ${formatAch(a)}</div>`).join("")}` : ""}
          </div>
        </div>`;

      if (template === "creative") return `
        <div class="hd"><div class="name">${r.name}</div><div class="title">${r.title}</div><div class="ci">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join(" &nbsp;|&nbsp; ")}</div></div>
        <div class="bd">
          <div class="sm">${r.summary}</div>
          ${r.experience?.length ? `<div class="mt">Professional Experience</div>${r.experience.map(e => `<div class="exp-block" style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><div><span class="jt">${e.role}</span> · <span class="co">${e.company}</span></div><span class="du">${e.duration}</span></div><ul style="padding-left:14px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${r.projects?.length ? `<div class="mt">Projects</div>${r.projects.map(p => `<div class="proj-block" style="margin-bottom:10px"><span class="jt">${p.name}</span>${p.link ? ` <span style="font-size:7.5pt;color:#888">${p.link}</span>` : ""}<div class="st" style="margin:3px 0">${p.tech.split(",").map((t: string) => `<span class="sg">${t.trim()}</span>`).join("")}</div><ul style="padding-left:14px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${r.education?.length ? `<div class="mt">Education</div>${r.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:7px"><div><strong>${e.degree}</strong> · <span class="co">${e.institution}</span></div><span class="du">${e.year}${e.gpa ? ` · ${e.gpa}` : ""}</span></div>`).join("")}` : ""}
          <div class="mt">Technical Skills</div><div class="st">${[...(r.skills?.languages || []), ...(r.skills?.frameworks || []), ...(r.skills?.tools || [])].map(s => `<span class="sg">${s}</span>`).join("")}</div>
          ${r.certifications?.length ? `<div class="mt">Certifications</div><div>${r.certifications.map(c => `<span class="ch">${c}</span>`).join("")}</div>` : ""}
          ${r.achievements?.length ? `<div class="mt">Achievements</div>${r.achievements.map(a => `<div style="font-size:8.5pt;margin-bottom:3px">⭐ ${formatAch(a)}</div>`).join("")}` : ""}
        </div>`;

      if (template === "fresher") return `
        <div class="wrap">
          <div class="hd"><div class="name">${r.name}</div><div class="title">${r.title}</div><div class="ci">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join(" · ")}</div></div>
          <div class="sm">${r.summary}</div>
          ${r.education?.length ? `<div><span class="mt">Education</span></div>${r.education.map(e => `<div class="ec"><div style="display:flex;justify-content:space-between"><div><strong style="color:#064e3b">${e.degree}</strong><div style="color:#059669;font-size:8.5pt;margin-top:1px">${e.institution}</div>${e.relevant ? `<div style="font-size:7.5pt;color:#6b7280;margin-top:2px">${e.relevant}</div>` : ""}</div><div style="text-align:right"><span style="font-size:8.5pt;color:#6b7280">${e.year}</span>${e.gpa ? `<div style="font-size:8.5pt;color:#059669;font-weight:700">${e.gpa}</div>` : ""}</div></div></div>`).join("")}` : ""}
          ${r.projects?.length ? `<div><span class="mt">Projects</span></div>${r.projects.map(p => `<div style="margin-bottom:10px"><strong>${p.name}</strong> <span style="color:#059669;font-size:8.5pt">| ${p.tech}</span>${p.link ? ` <span style="font-size:7.5pt;color:#6b7280">${p.link}</span>` : ""}<ul style="padding-left:14px;margin-top:3px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${r.experience?.length ? `<div><span class="mt">Professional Experience</span></div>${r.experience.map(e => `<div style="margin-bottom:10px" class="clearfix"><span class="jt">${e.role}</span><div style="display:flex;justify-content:space-between"><span class="co">${e.company}</span><span class="du">${e.duration}</span></div><ul style="padding-left:14px;margin-top:3px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          <div><span class="mt">Technical Skills</span></div>
          ${r.skills?.languages?.length ? `<div class="sr"><span class="sc">Languages: </span>${r.skills.languages.join(", ")}</div>` : ""}
          ${r.skills?.frameworks?.length ? `<div class="sr"><span class="sc">Frameworks: </span>${r.skills.frameworks.join(", ")}</div>` : ""}
          ${r.skills?.tools?.length ? `<div class="sr"><span class="sc">Tools & Cloud: </span>${r.skills.tools.join(", ")}</div>` : ""}
          ${r.certifications?.length ? `<div><span class="mt">Certifications</span></div><div>${r.certifications.map(c => `<span class="ch">${c}</span>`).join("")}</div>` : ""}
          ${r.achievements?.length ? `<div><span class="mt">Achievements</span></div>${r.achievements.map(a => `<div style="font-size:8.5pt;color:#374151;margin-bottom:3px">🏆 ${formatAch(a)}</div>`).join("")}` : ""}
        </div>`;

      if (template === "startup") return `
        <div class="wrap">
          <div class="hd"><div class="nb"><div class="name">${r.name}</div><div class="title">${r.title}</div></div><div class="cb">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join("<br>")}</div></div>
          <div class="sm">${r.summary}</div>
          <div class="mt">Technical Skills</div><div class="st">${[...(r.skills?.languages || []), ...(r.skills?.frameworks || []), ...(r.skills?.tools || [])].map(s => `<span class="sg">${s}</span>`).join("")}</div>
          ${r.experience?.length ? `<div class="mt">Professional Experience</div>${r.experience.map(e => `<div style="margin-bottom:12px" class="clearfix"><div><span class="jt">${e.role}</span> · <span class="co">${e.company}</span><span class="du">${e.duration}</span></div><ul style="padding-left:14px;margin-top:3px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${r.projects?.length ? `<div class="mt">Projects</div>${r.projects.map(p => `<div style="margin-bottom:10px"><span class="pn">${p.name}</span> · <span class="pt">${p.tech}</span>${p.link ? ` <span style="font-size:7.5pt;color:#888">[${p.link}]</span>` : ""}<ul style="padding-left:14px;margin-top:3px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${r.education?.length ? `<div class="mt">Education</div>${r.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:6px" class="clearfix"><div><strong>${e.degree}</strong> · ${e.institution}</div><span class="du">${e.year}${e.gpa ? ` · ${e.gpa}` : ""}</span></div>`).join("")}` : ""}
          ${r.certifications?.length ? `<div class="mt">Certifications</div><div>${r.certifications.map(c => `<span class="ch">${c}</span>`).join("")}</div>` : ""}
          ${r.achievements?.length ? `<div class="mt">Achievements</div>${r.achievements.map(a => `<div style="font-size:8.5pt;margin-bottom:3px">→ ${formatAch(a)}</div>`).join("")}` : ""}
        </div>`;

      // Corporate & Executive (similar structure, different styles)
      const isExec = template === "executive";
      return `
        <div class="wrap">
          ${isExec
          ? `<div class="hd"><div class="name">${r.name}</div><div class="title">${r.title}</div><div class="ci">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join(" · ")}</div></div><div class="tl">${r.summary}</div>`
          : `<div class="hd"><div class="name">${r.name}</div><div class="title">${r.title}</div><div class="ci">${[r.email && `✉ ${r.email}`, r.phone && `📱 ${r.phone}`, r.location && `📍 ${r.location}`, r.linkedin && `🔗 ${r.linkedin}`, r.github && `⌨ ${r.github}`].filter(Boolean).join(" · ")}</div></div><div class="sm">${r.summary}</div>`
        }
          <div class="mt">Professional Experience</div>
          ${r.experience?.map(e => `<div class="exp-block clearfix" style="margin-bottom:13px"><div><span class="jt">${e.role}</span> · <span class="co">${e.company}</span><span class="du">${e.duration} · ${e.location}</span></div><ul style="padding-left:14px;margin-top:3px">${e.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}
          ${r.education?.length ? `<div class="mt">Education</div>${r.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:7px" class="clearfix"><div><span class="jt">${e.degree}</span> · <span class="co">${e.institution}</span>${e.relevant ? `<div style="font-size:7.5pt;color:#666;margin-top:2px">${e.relevant}</div>` : ""}</div><span style="font-size:7.5pt;color:#888">${e.year}${e.gpa ? ` · ${e.gpa}` : ""}</span></div>`).join("")}` : ""}
          <div class="mt">Technical Skills</div>
          ${isExec ? `<div class="sg">` : ""}
          ${r.skills?.languages?.length ? `<div class="${isExec ? "" : "sr"}"><span class="${isExec ? "sc" : "sc"}">Languages: </span>${r.skills.languages.join(", ")}</div>` : ""}
          ${r.skills?.frameworks?.length ? `<div class="${isExec ? "" : "sr"}"><span class="${isExec ? "sc" : "sc"}">Frameworks: </span>${r.skills.frameworks.join(", ")}</div>` : ""}
          ${r.skills?.tools?.length ? `<div class="${isExec ? "" : "sr"}"><span class="${isExec ? "sc" : "sc"}">Tools & Cloud: </span>${r.skills.tools.join(", ")}</div>` : ""}
          ${r.skills?.databases?.length ? `<div class="${isExec ? "" : "sr"}"><span class="${isExec ? "sc" : "sc"}">Databases: </span>${r.skills.databases.join(", ")}</div>` : ""}
          ${isExec ? `</div>` : ""}
          ${r.certifications?.length ? `<div class="mt">Certifications</div><div>${r.certifications.map(c => `<span class="ch">${c}</span>`).join("")}</div>` : ""}
          ${r.achievements?.length ? `<div class="mt">${isExec ? "Executive Highlights" : "Achievements"}</div>${r.achievements.map(a => `<div style="font-size:8.5pt;color:#374151;margin-bottom:3px">★ ${formatAch(a)}</div>`).join("")}` : ""}
          ${r.projects?.length ? `<div class="mt">Projects</div>${r.projects.map(p => `<div style="margin-bottom:9px"><strong>${p.name}</strong> <span style="font-size:7.5pt;color:#888">| ${p.tech}</span><ul style="padding-left:14px;margin-top:2px">${p.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`).join("")}` : ""}
        </div>`;
    };

    const a4Base = `@page{size:A4;margin:18mm 20mm;}html,body{width:210mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.exp-block,.proj-block,.edu-block{page-break-inside:avoid;}ul{page-break-inside:avoid;}`;
    win.document.write(`<!DOCTYPE html><html><head><title>${resume.name} — Resume</title><style>*{margin:0;padding:0;box-sizing:border-box;} ul{padding-left:14px;} .clearfix::after{content:'';display:table;clear:both;} ${a4Base} ${css[template] || css["modern-tech"]}</style></head><body>${buildContent()}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06030f", color: "white", fontFamily: "-apple-system,sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:2px;}
      `}</style>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#a855f7)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📄</div>
          <span style={{ fontWeight: 800, background: "linear-gradient(135deg,#fff,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>COGNALYZE</span>
          <span style={{ fontSize: 10, padding: "2px 8px", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 20, color: "rgba(99,102,241,0.8)" }}>RESUME BUILDER</span>
        </div>
        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Back</a>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "3rem 2rem" }}>

        {/* INPUT */}
        {step === "input" && (
          <div style={{ animation: "fadeUp 0.6s ease" }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "rgba(99,102,241,0.8)", marginBottom: 10, fontWeight: 600 }}>AI RESUME BUILDER</div>
              <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, marginBottom: 10, background: "linear-gradient(135deg,#fff 30%,#a5b4fc 60%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Best resume. Best ATS score.<br />7 professional templates.
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>AI-crafted, keyword-optimized, PDF-ready</p>
            </div>

            {/* Template selector */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 600 }}>SELECT TEMPLATE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }}>
                {TEMPLATES.map(t => <TemplateThumb key={t.id} t={t} selected={template === t.id} onClick={() => setTemplate(t.id)} />)}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#6366f1", marginBottom: 8, fontWeight: 700 }}>TARGET ROLE *</div>
                  <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Senior ML Engineer at Google" style={{ width: "100%", padding: "11px 14px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.2)"} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#a855f7", marginBottom: 8, fontWeight: 700 }}>YEARS OF EXPERIENCE</div>
                  <input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 3 years" style={{ width: "100%", padding: "11px 14px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#a855f7"} onBlur={e => e.target.style.borderColor = "rgba(168,85,247,0.2)"} />
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#00ff88", marginBottom: 8, fontWeight: 700 }}>KEYWORDS (comma separated)</div>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Python, Machine Learning, AWS, React, System Design, Docker, PostgreSQL..." style={{ width: "100%", padding: "11px 14px", background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#00ff88"} onBlur={e => e.target.style.borderColor = "rgba(0,255,136,0.2)"} />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>💡 Copy keywords from the job posting — AI weaves them naturally throughout</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#38bdf8", marginBottom: 8, fontWeight: 700 }}>LINKEDIN ACCOUNT</div>
                  <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="e.g. linkedin.com/in/username" style={{ width: "100%", padding: "11px 14px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#38bdf8"} onBlur={e => e.target.style.borderColor = "rgba(56,189,248,0.2)"} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", marginBottom: 8, fontWeight: 700 }}>GITHUB ACCOUNT</div>
                  <input value={github} onChange={e => setGithub(e.target.value)} placeholder="e.g. github.com/username" style={{ width: "100%", padding: "11px 14px", background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#94a3b8"} onBlur={e => e.target.style.borderColor = "rgba(148,163,184,0.2)"} />
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#fbbf24", marginBottom: 8, fontWeight: 700 }}>CERTIFICATIONS (comma separated)</div>
                <input value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="e.g. AWS Solutions Architect, Google Cloud Professional Data Engineer" style={{ width: "100%", padding: "11px 14px", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, color: "white", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#fbbf24"} onBlur={e => e.target.style.borderColor = "rgba(251,191,36,0.2)"} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#ec4899", marginBottom: 8, fontWeight: 700 }}>YOUR BACKGROUND * — be detailed for best results</div>
                <textarea value={background} onChange={e => setBackground(e.target.value)} rows={8} placeholder={`Example:\nName: Priya Sharma. CS student at IIT Delhi, 3rd year. Interned at Flipkart — built recommendation engine, increased CTR by 18%. Built AI chatbot used by 5000+ college students. Won TechFest IIT Bombay 2024 (national hackathon). Skills: Python, ML, React, SQL. Applying for ML Engineer roles at FAANG companies.`} style={{ width: "100%", background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 14, padding: 14, color: "rgba(255,255,255,0.85)", fontSize: 13, resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#ec4899"} onBlur={e => e.target.style.borderColor = "rgba(236,72,153,0.2)"} />
              </div>
            </div>

            {/* AI capabilities */}
            <div style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: 14, padding: "1.1rem 1.4rem", marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#00ff88", marginBottom: 10, fontWeight: 600 }}>AI OPTIMIZES AUTOMATICALLY</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {["Quantifies every achievement with real metrics", "Injects all keywords naturally throughout", "FAANG-level action verbs only", "Removes weak phrases that fail ATS", "Optimizes section order for your role", "6 truly different template styles"].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: "#00ff88", fontSize: 11, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && <p style={{ color: "#ff4466", textAlign: "center", marginBottom: 12, fontSize: 13 }}>⚠ {error}</p>}

            <button onClick={build} disabled={!targetRole || !background} style={{ width: "100%", padding: "1rem", borderRadius: 14, border: "none", background: !targetRole || !background ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)", color: "white", fontSize: 15, fontWeight: 800, letterSpacing: 3, cursor: !targetRole || !background ? "not-allowed" : "pointer", opacity: !targetRole || !background ? 0.4 : 1, boxShadow: targetRole && background ? "0 0 50px rgba(99,102,241,0.3)" : "none", transition: "all 0.3s" }}>
              ✨ BUILD MY RESUME →
            </button>
          </div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "8rem 0" }}>
            <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 2rem" }}>
              <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ position: "absolute", inset: 14, border: "2px solid rgba(168,85,247,0.15)", borderBottom: "2px solid #a855f7", borderRadius: "50%", animation: "spin 0.7s linear infinite reverse" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✨</div>
            </div>
            <div style={{ fontSize: 14, letterSpacing: 3, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Building your resume...</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Optimizing ATS · Adding metrics · Injecting keywords · Applying {tpl.name} template</div>
          </div>
        )}

        {/* RESULT */}
        {step === "result" && resume && (
          <div style={{ animation: "fadeUp 0.6s ease" }}>
            {/* Stats bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.8rem", fontWeight: 900, color: resume.ats_score >= 85 ? "#00ff88" : "#fbbf24", lineHeight: 1 }}>{resume.ats_score}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>ATS SCORE</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ padding: "4px 12px", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 999, fontSize: 12, color: "#00ff88", fontWeight: 600 }}>
                    {resume.keywords_matched?.length || 0} keywords matched
                  </div>
                  <div style={{ padding: "4px 12px", background: `${tpl.accent}15`, border: `1px solid ${tpl.accent}30`, borderRadius: 999, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                    {tpl.name} template
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep("input")} style={{ padding: "0.7rem 1.5rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>↺ Rebuild</button>
                <button onClick={downloadPDF} style={{ padding: "0.7rem 1.75rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>
                  ↓ Download PDF
                </button>
              </div>
            </div>

            {/* Improvements */}
            {resume.improvements?.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "0.8rem 1.2rem", marginBottom: "1.2rem", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "rgba(99,102,241,0.8)", fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>AI IMPROVED:</span>
                {resume.improvements.map((imp, i) => <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#a5b4fc" }}>✓</span> {imp}</span>)}
              </div>
            )}

            {/* Advanced AI Quality Metrics Dashboard */}
            {resume.advanced_metrics && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#a5b4fc", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📊</span> Advanced AI Resume Quality Analytics
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                  {[
                    { label: "Recruiter Attention Score", key: "recruiter_attention", desc: "First 6-10 sec scan speed, visual flow, and layout layout optimization." },
                    { label: "Skill Credibility Score", key: "skill_credibility", desc: "Technical skill evidence and validation density." },
                    { label: "Achievement Impact Score", key: "achievement_impact", desc: "STAR/XYZ formatted metrics and outcome orientation." },
                    { label: "Content Quality Score", key: "content_quality", desc: "Grammar, spelling, and precision action verbs usage." },
                    { label: "Personal Branding Score", key: "personal_branding", desc: "Professional summary value proposition & profile presence." },
                    { label: "Design Quality Score", key: "design_quality", desc: "Consistent formatting, typography cohesion, and structure." },
                    { label: "Interview Readiness Score", key: "interview_readiness", desc: "How effectively content prepares for technical questioning." },
                    { label: "Trust Score", key: "trust_score", desc: "Fact grounding authenticity level (no fake exaggeration)." },
                    { label: "Resume DNA Score", key: "resume_dna_score", desc: "Role suitability rating mapped to industry career progressions." },
                  ].map((m) => {
                    const score = resume.advanced_metrics?.[m.key as keyof typeof resume.advanced_metrics] ?? 0;
                    const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={m.key} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "1rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{m.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color }}>{score}%</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.3 }}>{m.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview — A4 proportions */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
              <div style={{ width: 794, minHeight: 1123, background: "white", color: "#1a1a1a", borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)", overflow: "hidden", fontFamily: template === "corporate" || template === "executive" || template === "ats-classic" ? "'Georgia',serif" : "'Helvetica Neue',Arial,sans-serif", fontSize: "9.5pt", lineHeight: 1.4, transformOrigin: "top center" }}>

              {/* ATS Classic — Harvard style */}
              {template === "ats-classic" && (
                <div style={{ padding: "30px 40px" }}>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: "18pt", fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: -0.5, marginBottom: 4 }}>{resume.name}</div>
                    <div style={{ fontSize: "8pt", color: "#4b5563", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                      {[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}
                    </div>
                  </div>
                  <PreviewContent resume={resume} accent="#111827" template={template} />
                </div>
              )}

              {/* Modern Tech — sidebar layout */}
              {template === "modern-tech" && (
                <div style={{ display: "grid", gridTemplateColumns: "215px 1fr" }}>
                  <div style={{ background: "#1e1b4b", color: "white", padding: "26px 18px" }}>
                    <div style={{ fontSize: "17pt", fontWeight: 800, color: "white", letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 3 }}>{resume.name}</div>
                    <div style={{ fontSize: "9.5pt", color: "#a5b4fc", fontWeight: 500, marginBottom: 18 }}>{resume.title}</div>
                    {[resume.email, resume.phone, resume.location, resume.linkedin, resume.github].filter(Boolean).map((c, i) => <div key={i} style={{ fontSize: "8pt", color: "#c7d2fe", marginBottom: 5 }}>{c}</div>)}
                    {[{ label: "Languages", items: resume.skills?.languages }, { label: "Frameworks", items: resume.skills?.frameworks }, { label: "Tools & Cloud", items: resume.skills?.tools }, { label: "Databases", items: resume.skills?.databases }].filter(s => s.items?.length).map(s => (
                      <div key={s.label} style={{ marginTop: 16 }}>
                        <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 2, borderBottom: "1px solid rgba(165,180,252,0.25)", paddingBottom: 3, marginBottom: 8 }}>{s.label}</div>
                        {s.items?.map((sk, i) => <div key={i} style={{ fontSize: "8pt", color: "#e0e7ff", marginBottom: 3 }}>• {sk}</div>)}
                      </div>
                    ))}
                    {resume.certifications?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 2, borderBottom: "1px solid rgba(165,180,252,0.25)", paddingBottom: 3, marginBottom: 8 }}>Certifications</div>
                        {resume.certifications.map((c, i) => <div key={i} style={{ fontSize: "7.5pt", color: "#e0e7ff", marginBottom: 3 }}>🏆 {c}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "26px 28px" }}>
                    <PreviewContent resume={resume} accent="#6366f1" template={template} />
                  </div>
                </div>
              )}

              {/* Creative — gradient header */}
              {template === "creative" && (
                <>
                  <div style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", padding: "26px 32px" }}>
                    <div style={{ fontSize: "25pt", fontWeight: 900, letterSpacing: -2, color: "white" }}>{resume.name}</div>
                    <div style={{ fontSize: "11pt", color: "rgba(255,255,255,0.8)", fontWeight: 300, margin: "3px 0 8px", letterSpacing: 2, textTransform: "uppercase" }}>{resume.title}</div>
                    <div style={{ fontSize: "8pt", color: "rgba(255,255,255,0.7)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}
                    </div>
                  </div>
                  <div style={{ padding: "24px 32px" }}>
                    <PreviewContent resume={resume} accent="#7c3aed" template={template} />
                  </div>
                </>
              )}

              {/* Fresher — card header */}
              {template === "fresher" && (
                <div style={{ padding: "24px 32px" }}>
                  <div style={{ textAlign: "center", background: "#ecfdf5", border: "2px solid #059669", borderRadius: 10, padding: 18, marginBottom: 18 }}>
                    <div style={{ fontSize: "21pt", fontWeight: 800, color: "#064e3b" }}>{resume.name}</div>
                    <div style={{ fontSize: "10pt", color: "#059669", fontWeight: 600, margin: "3px 0 7px" }}>{resume.title}</div>
                    <div style={{ fontSize: "8pt", color: "#374151", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                      {[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}
                    </div>
                  </div>
                  <PreviewContent resume={resume} accent="#059669" template={template} />
                </div>
              )}

              {/* Startup — bold header */}
              {template === "startup" && (
                <div style={{ padding: "22px 30px" }}>
                  <div style={{ borderBottom: "3.5px solid #111", paddingBottom: 12, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: "25pt", fontWeight: 900, letterSpacing: -2, color: "#111", lineHeight: 1 }}>{resume.name}</div>
                      <div style={{ fontSize: "10.5pt", color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{resume.title}</div>
                    </div>
                    <div style={{ fontSize: "8pt", color: "#555", textAlign: "right", lineHeight: 1.6 }}>
                      {[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <div key={i}>{c}</div>)}
                    </div>
                  </div>
                  <PreviewContent resume={resume} accent="#dc2626" template={template} />
                </div>
              )}

              {/* Corporate & Executive */}
              {(template === "corporate" || template === "executive") && (
                <div style={{ padding: template === "executive" ? "30px 40px" : "32px 40px" }}>
                  {template === "executive" ? (
                    <div style={{ borderLeft: "4px solid #92400e", paddingLeft: 16, marginBottom: 18 }}>
                      <div style={{ fontSize: "24pt", fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>{resume.name}</div>
                      <div style={{ fontSize: "11.5pt", color: "#92400e", fontWeight: 400, margin: "4px 0 7px", letterSpacing: 0.5 }}>{resume.title}</div>
                      <div style={{ fontSize: "7.5pt", color: "#666", display: "flex", gap: 14, flexWrap: "wrap" }}>{[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a5f", paddingBottom: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: "21pt", fontWeight: 700, color: "#1e3a5f" }}>{resume.name}</div>
                      <div style={{ fontSize: "10.5pt", fontStyle: "italic", color: "#1e3a5f", margin: "3px 0 6px" }}>{resume.title}</div>
                      <div style={{ fontSize: "8pt", color: "#444", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>{[resume.email && `✉ ${resume.email}`, resume.phone && `📱 ${resume.phone}`, resume.location && `📍 ${resume.location}`, resume.linkedin && `🔗 ${resume.linkedin}`, resume.github && `⌨ ${resume.github}`].filter(Boolean).map((c, i) => <span key={i}>{c}</span>)}</div>
                    </div>
                  )}
                  <PreviewContent resume={resume} accent={template === "executive" ? "#92400e" : "#1e3a5f"} template={template} />
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewContent({ resume, accent, template }: { resume: ResumeData; accent: string; template: string }) {
  const isCreative = template === "creative";
  const isFresher = template === "fresher";
  const isStartup = template === "startup";
  const isMT = template === "modern-tech";
  const isATS = template === "ats-classic";

  const SecTitle = ({ children }: { children: string }) => (
    <div style={{ fontSize: isStartup ? "7.5pt" : isMT ? "9pt" : isCreative ? "10.5pt" : "9.5pt", fontWeight: isStartup ? 900 : 700, color: accent, textTransform: "uppercase", letterSpacing: isStartup ? 3 : isCreative ? 0.5 : 1.5, borderBottom: isCreative ? "none" : isStartup ? `1.5px solid #111` : `1px solid ${accent}30`, paddingBottom: isCreative ? 0 : 3, margin: `${isStartup ? 12 : 14}px 0 ${isStartup ? 7 : 9}px`, ...(isCreative ? { display: "flex", alignItems: "center", gap: 6 } : {}) }}>
      {children}
    </div>
  );

  return (
    <>
      {/* Summary */}
      {!isMT && (
        <div style={{ fontSize: "9pt", color: "#374151", lineHeight: 1.65, marginBottom: 14, padding: isCreative ? "10px 12px" : isStartup ? "8px 10px" : 0, background: isCreative ? "#faf5ff" : isStartup ? "#fff5f5" : "transparent", borderLeft: isStartup ? "3px solid #dc2626" : "none", borderRadius: isCreative ? 6 : 0 }}>
          {resume.summary}
        </div>
      )}

      {/* Skills for startup */}
      {isStartup && (
        <>
          <SecTitle>Technical Skills</SecTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {[...(resume.skills?.languages || []), ...(resume.skills?.frameworks || []), ...(resume.skills?.tools || [])].map((s, i) => (
              <span key={i} style={{ background: "#111", color: "white", padding: "2px 9px", fontSize: "7.5pt", fontWeight: 700, borderRadius: 2 }}>{s}</span>
            ))}
          </div>
        </>
      )}

      {/* Education first for fresher */}
      {isFresher && resume.education?.length > 0 && (
        <>
          <div style={{ display: "inline-block", fontSize: "9pt", fontWeight: 700, color: "#064e3b", textTransform: "uppercase", letterSpacing: 1.5, background: "#ecfdf5", padding: "3px 9px", borderRadius: 4, margin: "0 0 8px" }}>Education</div>
          {resume.education.map((e, i) => (
            <div key={i} style={{ background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: "9.5pt", color: "#064e3b" }}>{e.degree}</strong>
                  <div style={{ color: "#059669", fontSize: "8.5pt", marginTop: 1 }}>{e.institution}</div>
                  {e.relevant && <div style={{ fontSize: "7.5pt", color: "#6b7280", marginTop: 2 }}>{e.relevant}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "8pt", color: "#6b7280" }}>{e.year}</span>
                  {e.gpa && <div style={{ fontSize: "8.5pt", color: "#059669", fontWeight: 700 }}>{e.gpa}</div>}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <>
          <SecTitle>{isFresher ? "Professional Experience" : isStartup ? "Professional Experience" : isATS ? "Professional Experience" : "Experience"}</SecTitle>
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", marginBottom: 3 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "9.5pt", color: "#1a1a1a" }}>{exp.role}</span>
                  <span style={{ color: "#6b7280", fontSize: "9pt" }}> · </span>
                  <span style={{ color: accent, fontWeight: 600, fontSize: "9pt" }}>{exp.company}</span>
                </div>
                <span style={{ fontSize: "7.5pt", color: "#9ca3af" }}>{exp.duration} · {exp.location}</span>
              </div>
              <ul style={{ paddingLeft: 14, margin: 0 }}>
                {exp.bullets.map((b, j) => <li key={j} style={{ fontSize: "8.5pt", color: "#374151", lineHeight: 1.5, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>
      )}

      {/* Projects */}
      {resume.projects?.length > 0 && (
        <>
          <SecTitle>Projects</SecTitle>
          {resume.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontWeight: isStartup ? 900 : 700, fontSize: isStartup ? "9.5pt" : "9pt", color: "#1a1a1a", textTransform: isStartup ? "uppercase" : "none", letterSpacing: isStartup ? 0.5 : 0 }}>{p.name}</span>
                {p.link && <span style={{ fontSize: "7.5pt", color: "#9ca3af", marginLeft: 6 }}>{p.link}</span>}
                {isCreative ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, margin: "3px 0" }}>
                    {p.tech.split(",").map((t, j) => <span key={j} style={{ background: "#f3e8ff", color: "#7c3aed", padding: "1px 7px", borderRadius: 999, fontSize: "7.5pt", fontWeight: 600 }}>{t.trim()}</span>)}
                  </div>
                ) : (
                  <span style={{ fontSize: "8pt", color: "#6b7280", fontStyle: "italic", marginLeft: 6 }}>| {p.tech}</span>
                )}
              </div>
              <ul style={{ paddingLeft: 14, margin: 0 }}>
                {p.bullets.map((b, j) => <li key={j} style={{ fontSize: "8.5pt", color: "#374151", lineHeight: 1.5, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>
      )}

      {/* Education (non-fresher) */}
      {!isFresher && resume.education?.length > 0 && (
        <>
          <SecTitle>Education</SecTitle>
          {resume.education.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: "9pt", color: "#1a1a1a" }}>{e.degree}</span>
                <span style={{ color: "#6b7280", fontSize: "8.5pt" }}> · </span>
                <span style={{ color: accent, fontSize: "9pt" }}>{e.institution}</span>
                {e.relevant && <div style={{ fontSize: "7.5pt", color: "#6b7280", marginTop: 2 }}>{e.relevant}</div>}
              </div>
              <span style={{ fontSize: "7.5pt", color: "#9ca3af" }}>{e.year}{e.gpa ? ` · ${e.gpa}` : ""}</span>
            </div>
          ))}
        </>
      )}

      {/* Skills (non-sidebar, non-startup) */}
      {isATS ? (
        <>
          <SecTitle>Technical Skills</SecTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {resume.skills?.languages?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong style={{ color: "#111827" }}>Languages: </strong>{resume.skills.languages.join(", ")}</div>}
            {resume.skills?.frameworks?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong style={{ color: "#111827" }}>Frameworks: </strong>{resume.skills.frameworks.join(", ")}</div>}
            {resume.skills?.tools?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong style={{ color: "#111827" }}>Tools & Cloud: </strong>{resume.skills.tools.join(", ")}</div>}
            {resume.skills?.databases?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong style={{ color: "#111827" }}>Databases: </strong>{resume.skills.databases.join(", ")}</div>}
          </div>
        </>
      ) : !isMT && !isStartup && !isCreative && (
        <>
          <SecTitle>Technical Skills</SecTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "3px 16px" }}>
            {resume.skills?.languages?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong>Languages:</strong> {resume.skills.languages.join(", ")}</div>}
            {resume.skills?.frameworks?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong>Frameworks:</strong> {resume.skills.frameworks.join(", ")}</div>}
            {resume.skills?.tools?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong>Tools:</strong> {resume.skills.tools.join(", ")}</div>}
            {resume.skills?.databases?.length > 0 && <div style={{ fontSize: "8.5pt" }}><strong>Databases:</strong> {resume.skills.databases.join(", ")}</div>}
          </div>
        </>
      )}

      {/* Creative skills */}
      {isCreative && (
        <>
          <SecTitle>Technical Skills</SecTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {[...(resume.skills?.languages || []), ...(resume.skills?.frameworks || []), ...(resume.skills?.tools || [])].map((s, i) => (
              <span key={i} style={{ background: "#f3e8ff", color: "#7c3aed", padding: "2px 9px", borderRadius: 999, fontSize: "7.5pt", fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </>
      )}

      {/* Fresher skills */}
      {isFresher && (
        <>
          <div style={{ display: "inline-block", fontSize: "9pt", fontWeight: 700, color: "#064e3b", textTransform: "uppercase", letterSpacing: 1.5, background: "#ecfdf5", padding: "3px 9px", borderRadius: 4, margin: "12px 0 8px" }}>Technical Skills</div>
          {[{ label: "Programming", items: resume.skills?.languages }, { label: "Frameworks", items: resume.skills?.frameworks }, { label: "Tools", items: resume.skills?.tools }].filter(s => s.items?.length).map(s => (
            <div key={s.label} style={{ fontSize: "9pt", marginBottom: 4 }}><strong style={{ color: "#064e3b" }}>{s.label}: </strong>{s.items?.join(", ")}</div>
          ))}
        </>
      )}

      {/* Certifications */}
      {resume.certifications?.length > 0 && !isMT && (
        <>
          <SecTitle>Certifications</SecTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {resume.certifications.map((c, i) => (
              <span key={i} style={{ fontSize: "8pt", background: `${accent}10`, border: `1px solid ${accent}25`, borderRadius: isCreative ? 999 : 3, padding: "2px 8px", color: accent }}>{c}</span>
            ))}
          </div>
        </>
      )}

      {/* Achievements */}
      {resume.achievements?.length > 0 && (
        <>
          <SecTitle>{template === "executive" ? "Executive Highlights" : "Achievements"}</SecTitle>
          {resume.achievements.map((a, i) => {
            const idx = a.indexOf(":");
            if (idx !== -1) {
              return (
                <div key={i} style={{ fontSize: "8.5pt", color: "#374151", marginBottom: 4 }}>
                  <span style={{ color: accent }}>★</span> <strong>{a.slice(0, idx)}</strong>:{a.slice(idx + 1)}
                </div>
              );
            }
            return (
              <div key={i} style={{ fontSize: "8.5pt", color: "#374151", marginBottom: 4 }}>
                <span style={{ color: accent }}>★</span> {a}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}