"use client";
import { useState, useEffect, useCallback } from "react";

interface Goal { id: string; title: string; description: string | null; frequency: string; reminderTime: string | null; nudgeConfig: any; currentStreak: number; }
interface Section { id: string; name: string; goals: Goal[]; }

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQ = [{ v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" }];

export default function GoalsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [unsectioned, setUnsectioned] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [activeAdd, setActiveAdd] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [freq, setFreq] = useState("daily");
  const [time, setTime] = useState("08:00");
  const [wantNudge, setWantNudge] = useState(true);
  const [nudgeType, setNudgeType] = useState("daily");
  const [nudgeDays, setNudgeDays] = useState([1, 3, 5]);
  const [nudgeInterval, setNudgeInterval] = useState(2);
  const [editSec, setEditSec] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetch_ = useCallback(async () => { const r = await fetch("/api/goals"); const d = await r.json(); setSections(d.sections || []); setUnsectioned(d.unsectioned || []); setLoading(false); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  async function createSection(e: React.FormEvent) {
    e.preventDefault(); if (!sectionName.trim()) return; setError("");
    const r = await fetch("/api/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: sectionName.trim() }) });
    if (!r.ok) { setError((await r.json()).error); return; }
    setSectionName(""); fetch_();
  }
  async function updateSec(id: string) { await fetch("/api/sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editName }) }); setEditSec(null); fetch_(); }
  async function delSec(id: string) { await fetch(`/api/sections?id=${id}`, { method: "DELETE" }); fetch_(); }
  async function delGoal(id: string) { await fetch(`/api/goals?id=${id}`, { method: "DELETE" }); fetch_(); }

  function openAdd(secId: string | null) {
    setActiveAdd(secId); setTitle(""); setDesc(""); setFreq("daily"); setTime("08:00"); setWantNudge(true); setNudgeType("daily"); setNudgeDays([1,3,5]); setNudgeInterval(2);
  }

  async function addGoal(secId: string | null) {
    if (!title.trim()) return; setError("");
    const nc = !wantNudge ? null : nudgeType === "daily" ? { type: "daily" } : nudgeType === "days" ? { type: "days", days: nudgeDays } : { type: "interval", interval: nudgeInterval };
    const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: desc.trim() || null, frequency: freq, reminderTime: wantNudge ? time : null, nudgeConfig: nc, sectionId: secId }) });
    if (!r.ok) { setError((await r.json()).error); return; }
    setActiveAdd(null); fetch_();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;

  const fb = (f: string) => {
    const c: Record<string,string> = { daily: "bg-accent/10 text-accent", weekly: "bg-warning/10 text-warning", monthly: "bg-success/10 text-success" };
    return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c[f]||""}`}>{f}</span>;
  };

  function nudgeText(g: Goal) {
    if (!g.reminderTime) return null;
    const c = g.nudgeConfig; const t = g.reminderTime;
    if (!c) return t;
    if (c.type==="daily") return `Daily ${t}`;
    if (c.type==="days"&&c.days) return `${c.days.map((d:number)=>DAY_NAMES[d]).join(",")} ${t}`;
    if (c.type==="interval"&&c.interval) return `Every ${c.interval}d ${t}`;
    return t;
  }

  function preview() {
    if (!wantNudge) return "";
    const t = time||"--:--";
    if (nudgeType==="daily") return `Nudge every day at ${t}`;
    if (nudgeType==="days") return nudgeDays.length?`Nudge on ${nudgeDays.map(d=>DAY_NAMES[d]).join(", ")} at ${t}`:"Select days";
    return `Nudge every ${nudgeInterval} days at ${t}`;
  }

  function goalForm(secId: string|null) {
    if (activeAdd !== secId) return null;
    return (
      <div className="mt-3 space-y-3 bg-background rounded-xl p-4 border border-accent/20">
        <input type="text" placeholder="Goal title" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-card" autoFocus />
        <input type="text" placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-card" />

        {/* Frequency */}
        <div>
          <label className="text-xs text-muted block mb-1.5">Frequency</label>
          <div className="flex gap-1.5">
            {FREQ.map(f=>(
              <button key={f.v} type="button" onClick={()=>setFreq(f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${freq===f.v?"bg-accent text-white":"bg-card border border-border text-muted hover:text-foreground"}`}>{f.l}</button>
            ))}
          </div>
        </div>

        {/* Nudge */}
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{"\uD83D\uDD14"} Nudge</span>
            <button type="button" onClick={()=>setWantNudge(!wantNudge)} className={`w-10 h-5 rounded-full transition-colors ${wantNudge?"bg-accent":"bg-border"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${wantNudge?"translate-x-5":"translate-x-0.5"}`}/>
            </button>
          </div>
          {wantNudge && (<>
            <div>
              <label className="text-xs text-muted block mb-1.5">Schedule</label>
              <div className="flex gap-1.5">
                <button type="button" onClick={()=>setNudgeType("daily")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${nudgeType==="daily"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Every day</button>
                <button type="button" onClick={()=>{setNudgeType("days");if(!nudgeDays.length)setNudgeDays([1,3,5]);}} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${nudgeType==="days"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Specific days</button>
                <button type="button" onClick={()=>setNudgeType("interval")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${nudgeType==="interval"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Every X days</button>
              </div>
            </div>
            {nudgeType==="days" && (
              <div className="flex gap-1">
                {DAY_NAMES.map((n,i)=>(
                  <button key={i} type="button" onClick={()=>setNudgeDays(p=>p.includes(i)?p.filter(d=>d!==i):[...p,i].sort())} className={`w-9 h-9 rounded-full text-xs font-medium ${nudgeDays.includes(i)?"bg-accent text-white":"bg-background border border-border text-muted"}`}>{n}</button>
                ))}
              </div>
            )}
            {nudgeType==="interval" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Every</span>
                <input type="number" min={2} max={30} value={nudgeInterval} onChange={e=>setNudgeInterval(Math.max(2,Math.min(30,parseInt(e.target.value)||2)))} className="w-16 px-3 py-2 border border-border rounded-lg text-sm text-center bg-background" />
                <span className="text-sm text-muted">days</span>
              </div>
            )}
            <div>
              <label className="text-xs text-muted block mb-1">Time</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
            </div>
            <p className="text-xs text-accent bg-accent/5 px-3 py-2 rounded-lg">{"\u2139\uFE0F"} {preview()}</p>
          </>)}
        </div>

        <div className="flex gap-2">
          <button onClick={()=>addGoal(secId)} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Add Goal</button>
          <button onClick={()=>setActiveAdd(null)} className="px-4 py-2 text-muted text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  function goals(gs: Goal[], secId: string|null) {
    return (<>
      {gs.map((g,i)=>(
        <div key={g.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
          <span className="text-muted text-xs w-5">{i+1}.</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{g.title}</p>
              {fb(g.frequency)}
              {g.currentStreak > 0 && <span className="text-xs text-warning">{"\uD83D\uDD25"}{g.currentStreak}</span>}
            </div>
            {g.description && <p className="text-xs text-muted truncate">{g.description}</p>}
          </div>
          {g.reminderTime && <span className="text-xs text-muted bg-background px-2 py-0.5 rounded shrink-0">{"\u23F0"} {nudgeText(g)}</span>}
          <button onClick={()=>delGoal(g.id)} className="text-muted hover:text-red-500 shrink-0">&times;</button>
        </div>
      ))}
      {activeAdd!==secId && <button onClick={()=>openAdd(secId)} className="w-full py-2.5 border border-dashed border-border rounded-lg text-xs text-muted hover:text-accent hover:border-accent/50">+ Add Goal</button>}
      {goalForm(secId)}
    </>);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">My Goals</h1><p className="text-muted text-sm">Organize goals into sections — each goal has its own frequency</p></div>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
      <form onSubmit={createSection} className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3">Create Section</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="Section name (e.g., Fitness, Learning)" value={sectionName} onChange={e=>setSectionName(e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background" required />
          <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Create</button>
        </div>
      </form>
      {sections.map(s=>(
        <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
          {editSec===s.id ? (
            <div className="p-4 bg-background flex gap-2 items-center">
              <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card" />
              <button onClick={()=>updateSec(s.id)} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium">Save</button>
              <button onClick={()=>setEditSec(null)} className="px-3 py-1.5 text-muted text-xs">Cancel</button>
            </div>
          ) : (
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">{s.name}</h2>
                <span className="text-xs text-muted">{s.goals.length} goals</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setEditSec(s.id);setEditName(s.name);}} className="text-xs text-muted hover:text-accent">Edit</button>
                <button onClick={()=>delSec(s.id)} className="text-xs text-muted hover:text-red-500">Delete</button>
              </div>
            </div>
          )}
          <div className="p-4 space-y-2">{goals(s.goals, s.id)}</div>
        </div>
      ))}
      {unsectioned.length > 0 && <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border"><h2 className="font-semibold">Uncategorized</h2></div><div className="p-4 space-y-2">{goals(unsectioned, null)}</div></div>}
      {sections.length===0 && unsectioned.length===0 && <div className="bg-card border border-border rounded-xl p-8 text-center"><p className="text-muted">No goals yet. Create a section and add goals, or apply a template!</p></div>}
    </div>
  );
}
