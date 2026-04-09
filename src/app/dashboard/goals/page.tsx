"use client";
import { useState, useEffect, useCallback } from "react";

interface Goal { id: string; title: string; description: string | null; frequency: string; reminderTimes: string[]; nudgeConfig: any; nudgeMessage: string | null; currentStreak: number; }
interface Section { id: string; name: string; goals: Goal[]; }

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQ = [{ v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" }];

export default function GoalsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [unsectioned, setUnsectioned] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionName, setSectionName] = useState("");

  // Add goal state
  const [activeAdd, setActiveAdd] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [freq, setFreq] = useState("daily");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [wantNudge, setWantNudge] = useState(true);
  const [nudgeType, setNudgeType] = useState("daily");
  const [nudgeDays, setNudgeDays] = useState([1, 3, 5]);
  const [nudgeInterval, setNudgeInterval] = useState(2);
  const [nudgeMsg, setNudgeMsg] = useState("");

  // Edit goal state
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eFreq, setEFreq] = useState("daily");
  const [eTimes, setETimes] = useState<string[]>([]);
  const [eWantNudge, setEWantNudge] = useState(true);
  const [eNudgeType, setENudgeType] = useState("daily");
  const [eNudgeDays, setENudgeDays] = useState<number[]>([]);
  const [eNudgeInterval, setENudgeInterval] = useState(2);
  const [eNudgeMsg, setENudgeMsg] = useState("");

  // Section edit
  const [editSec, setEditSec] = useState<string | null>(null);
  const [editSecName, setEditSecName] = useState("");

  const fetch_ = useCallback(async () => { const r = await fetch("/api/goals"); const d = await r.json(); setSections(d.sections || []); setUnsectioned(d.unsectioned || []); setLoading(false); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  async function createSection(e: React.FormEvent) { e.preventDefault(); if (!sectionName.trim()) return; setError(""); const r = await fetch("/api/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: sectionName.trim() }) }); if (!r.ok) { setError((await r.json()).error); return; } setSectionName(""); fetch_(); }
  async function updateSec(id: string) { await fetch("/api/sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editSecName }) }); setEditSec(null); fetch_(); }
  async function delSec(id: string) { await fetch(`/api/sections?id=${id}`, { method: "DELETE" }); fetch_(); }
  async function delGoal(id: string) { await fetch(`/api/goals?id=${id}`, { method: "DELETE" }); fetch_(); }

  function openAdd(secId: string | null) { setActiveAdd(secId); setTitle(""); setDesc(""); setFreq("daily"); setTimes(["08:00"]); setWantNudge(true); setNudgeType("daily"); setNudgeDays([1,3,5]); setNudgeInterval(2); setNudgeMsg(""); }

  function buildNudgeConfig(type: string, days: number[], interval: number) {
    if (type === "daily") return { type: "daily" };
    if (type === "days") return { type: "days", days };
    if (type === "interval") return { type: "interval", interval };
    return null;
  }

  async function addGoal(secId: string | null) {
    if (!title.trim()) return; setError("");
    const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: desc.trim() || null, frequency: freq, reminderTimes: wantNudge ? times.filter(t => t) : [], nudgeConfig: wantNudge ? buildNudgeConfig(nudgeType, nudgeDays, nudgeInterval) : null, nudgeMessage: nudgeMsg.trim() || null, sectionId: secId }) });
    if (!r.ok) { setError((await r.json()).error); return; }
    setActiveAdd(null); fetch_();
  }

  function startEditGoal(g: Goal) {
    setEditGoal(g); setETitle(g.title); setEDesc(g.description || ""); setEFreq(g.frequency);
    setETimes(g.reminderTimes.length > 0 ? [...g.reminderTimes] : []);
    setEWantNudge(g.reminderTimes.length > 0);
    const cfg = g.nudgeConfig || { type: "daily" };
    setENudgeType(cfg.type || "daily"); setENudgeDays(cfg.days || [1,3,5]); setENudgeInterval(cfg.interval || 2);
    setENudgeMsg(g.nudgeMessage || "");
  }

  async function saveEditGoal() {
    if (!editGoal || !eTitle.trim()) return;
    await fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editGoal.id, title: eTitle.trim(), description: eDesc.trim() || null, frequency: eFreq, reminderTimes: eWantNudge ? eTimes.filter(t => t) : [], nudgeConfig: eWantNudge ? buildNudgeConfig(eNudgeType, eNudgeDays, eNudgeInterval) : null, nudgeMessage: eNudgeMsg.trim() || null }) });
    setEditGoal(null); fetch_();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;

  const fb = (f: string) => { const c: Record<string,string> = { daily: "bg-accent/10 text-accent", weekly: "bg-warning/10 text-warning", monthly: "bg-success/10 text-success" }; return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c[f]||""}`}>{f}</span>; };

  function nudgeText(g: Goal) {
    if (!g.reminderTimes.length) return null;
    return g.reminderTimes.join(", ");
  }

  function nudgeScheduleUI(type: string, setType: (v:string)=>void, days: number[], setDays: (v:number[])=>void, interval: number, setInterval: (v:number)=>void) {
    return (<>
      <div><label className="text-xs text-muted block mb-1.5">Schedule</label>
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={()=>setType("daily")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type==="daily"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Every day</button>
          <button type="button" onClick={()=>{setType("days");if(!days.length)setDays([1,3,5]);}} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type==="days"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Specific days</button>
          <button type="button" onClick={()=>setType("interval")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type==="interval"?"bg-accent text-white":"bg-background border border-border text-muted"}`}>Every X days</button>
        </div>
      </div>
      {type==="days" && <div className="flex gap-1">{DAY_NAMES.map((n,i)=>(<button key={i} type="button" onClick={()=>setDays(days.includes(i)?days.filter(d=>d!==i):[...days,i].sort())} className={`w-8 h-8 rounded-full text-xs font-medium ${days.includes(i)?"bg-accent text-white":"bg-background border border-border text-muted"}`}>{n}</button>))}</div>}
      {type==="interval" && <div className="flex items-center gap-2"><span className="text-sm text-muted">Every</span><input type="number" min={2} max={30} value={interval} onChange={e=>setInterval(Math.max(2,Math.min(30,parseInt(e.target.value)||2)))} className="w-16 px-2 py-1.5 border border-border rounded-lg text-sm text-center bg-background" /><span className="text-sm text-muted">days</span></div>}
    </>);
  }

  function timesUI(curTimes: string[], setTimes: (v: string[]) => void) {
    return (<div>
      <label className="text-xs text-muted block mb-1.5">Nudge times</label>
      <div className="space-y-2">
        {curTimes.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="time" value={t} onChange={e => { const n = [...curTimes]; n[i] = e.target.value; setTimes(n); }} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-background" />
            {curTimes.length > 1 && <button type="button" onClick={() => setTimes(curTimes.filter((_, idx) => idx !== i))} className="text-muted hover:text-red-500 text-sm">&times;</button>}
          </div>
        ))}
        <button type="button" onClick={() => setTimes([...curTimes, "12:00"])} className="text-xs text-accent hover:underline">+ Add another time</button>
      </div>
    </div>);
  }

  function goalForm(secId: string|null) {
    if (activeAdd !== secId) return null;
    return (
      <div className="mt-3 space-y-3 bg-background rounded-xl p-4 border border-accent/20">
        <input type="text" placeholder="Goal title" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-card" autoFocus />
        <input type="text" placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card" />
        <div><label className="text-xs text-muted block mb-1.5">Frequency</label><div className="flex gap-1.5">{FREQ.map(f=>(<button key={f.v} type="button" onClick={()=>setFreq(f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${freq===f.v?"bg-accent text-white":"bg-card border border-border text-muted"}`}>{f.l}</button>))}</div></div>
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">{"\uD83D\uDD14"} Nudge</span><button type="button" onClick={()=>setWantNudge(!wantNudge)} className={`w-10 h-5 rounded-full ${wantNudge?"bg-accent":"bg-border"}`}><div className={`w-4 h-4 rounded-full bg-white shadow ${wantNudge?"translate-x-5":"translate-x-0.5"}`}/></button></div>
          {wantNudge && (<>
            {nudgeScheduleUI(nudgeType, setNudgeType, nudgeDays, setNudgeDays, nudgeInterval, setNudgeInterval)}
            {timesUI(times, setTimes)}
            <div><label className="text-xs text-muted block mb-1.5">Custom notification message (optional)</label><input type="text" placeholder='e.g., "Go hit the gym! 💪"' value={nudgeMsg} onChange={e=>setNudgeMsg(e.target.value)} className="w-full px-3 py-1.5 border border-border rounded-lg text-sm bg-background" /></div>
          </>)}
        </div>
        <div className="flex gap-2"><button onClick={()=>addGoal(secId)} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Add Goal</button><button onClick={()=>setActiveAdd(null)} className="px-4 py-2 text-muted text-sm">Cancel</button></div>
      </div>
    );
  }

  function renderGoals(gs: Goal[], secId: string|null) {
    return (<>
      {gs.map((g,i)=>(
        <div key={g.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
          <span className="text-muted text-xs w-5">{i+1}.</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{g.title}</p>
              {fb(g.frequency)}
              {g.currentStreak > 0 && <span className="text-xs text-warning">{"\uD83D\uDD25"}{g.currentStreak}</span>}
            </div>
            {g.description && <p className="text-xs text-muted truncate">{g.description}</p>}
            {g.reminderTimes.length > 0 && <p className="text-xs text-muted mt-0.5">{"\u23F0"} {nudgeText(g)}</p>}
          </div>
          <button onClick={()=>startEditGoal(g)} className="text-xs text-muted hover:text-accent shrink-0">Edit</button>
          <button onClick={()=>delGoal(g.id)} className="text-muted hover:text-red-500 shrink-0">&times;</button>
        </div>
      ))}
      {activeAdd!==secId && <button onClick={()=>openAdd(secId)} className="w-full py-2.5 border border-dashed border-border rounded-lg text-xs text-muted hover:text-accent hover:border-accent/50">+ Add Goal</button>}
      {goalForm(secId)}
    </>);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">My Goals</h1><p className="text-muted text-sm">Organize goals — each with its own frequency and nudge schedule</p></div>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <form onSubmit={createSection} className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-medium text-sm mb-3">Create Section</h3>
        <div className="flex gap-2"><input type="text" placeholder="Section name" value={sectionName} onChange={e=>setSectionName(e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background" required /><button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Create</button></div>
      </form>

      {sections.map(s=>(
        <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
          {editSec===s.id ? (
            <div className="p-4 bg-background flex gap-2 items-center"><input type="text" value={editSecName} onChange={e=>setEditSecName(e.target.value)} className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-card" /><button onClick={()=>updateSec(s.id)} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium">Save</button><button onClick={()=>setEditSec(null)} className="text-muted text-xs">Cancel</button></div>
          ) : (
            <div className="p-4 flex items-center justify-between border-b border-border"><div className="flex items-center gap-3"><h2 className="font-semibold">{s.name}</h2><span className="text-xs text-muted">{s.goals.length} goals</span></div><div className="flex gap-2"><button onClick={()=>{setEditSec(s.id);setEditSecName(s.name);}} className="text-xs text-muted hover:text-accent">Edit</button><button onClick={()=>delSec(s.id)} className="text-xs text-muted hover:text-red-500">Delete</button></div></div>
          )}
          <div className="p-4 space-y-2">{renderGoals(s.goals, s.id)}</div>
        </div>
      ))}

      {unsectioned.length > 0 && <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="p-4 border-b border-border"><h2 className="font-semibold">Uncategorized</h2></div><div className="p-4 space-y-2">{renderGoals(unsectioned, null)}</div></div>}
      {sections.length===0 && unsectioned.length===0 && <div className="bg-card border border-border rounded-xl p-8 text-center"><p className="text-muted">No goals yet. Create a section and add goals!</p></div>}

      {/* Edit goal modal */}
      {editGoal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-5 w-full max-w-md shadow-xl space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg">Edit Goal</h3>
            <input type="text" placeholder="Goal title" value={eTitle} onChange={e=>setETitle(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
            <input type="text" placeholder="Description (optional)" value={eDesc} onChange={e=>setEDesc(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
            <div><label className="text-xs text-muted block mb-1.5">Frequency</label><div className="flex gap-1.5">{FREQ.map(f=>(<button key={f.v} type="button" onClick={()=>setEFreq(f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${eFreq===f.v?"bg-accent text-white":"bg-background border border-border text-muted"}`}>{f.l}</button>))}</div></div>

            <div className="bg-background border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{"\uD83D\uDD14"} Nudge</span><button type="button" onClick={()=>setEWantNudge(!eWantNudge)} className={`w-10 h-5 rounded-full ${eWantNudge?"bg-accent":"bg-border"}`}><div className={`w-4 h-4 rounded-full bg-white shadow ${eWantNudge?"translate-x-5":"translate-x-0.5"}`}/></button></div>
              {eWantNudge && (<>
                {nudgeScheduleUI(eNudgeType, setENudgeType, eNudgeDays, setENudgeDays, eNudgeInterval, setENudgeInterval)}
                {timesUI(eTimes.length ? eTimes : ["08:00"], (v) => setETimes(v))}
                <div><label className="text-xs text-muted block mb-1.5">Custom notification message</label><input type="text" placeholder='e.g., "Don&apos;t skip leg day! 🦵"' value={eNudgeMsg} onChange={e=>setENudgeMsg(e.target.value)} className="w-full px-3 py-1.5 border border-border rounded-lg text-sm bg-card" /></div>
              </>)}
            </div>

            <div className="flex gap-2 justify-end pt-2"><button onClick={()=>setEditGoal(null)} className="px-4 py-2 text-muted text-sm">Cancel</button><button onClick={saveEditGoal} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
