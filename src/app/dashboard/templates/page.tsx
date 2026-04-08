"use client";

import { useState, useEffect, useCallback } from "react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  goals: string[];
  frequency: string;
  isBuiltIn: boolean;
}

interface SectionOption {
  id: string;
  name: string;
  frequency: string;
}

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [goalInput, setGoalInput] = useState("");
  const [goalList, setGoalList] = useState<string[]>([]);

  // Edit modal
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFreq, setEditFreq] = useState("daily");
  const [editGoals, setEditGoals] = useState<string[]>([]);
  const [editGoalInput, setEditGoalInput] = useState("");

  // Apply modal
  const [applyingTemplate, setApplyingTemplate] = useState<Template | null>(null);
  const [applyMode, setApplyMode] = useState<"new" | "merge">("new");
  const [targetSectionId, setTargetSectionId] = useState("");

  const fetchData = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/sections"),
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    setTemplates(tData);
    setSections(sData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  // --- Create template ---
  function addGoalToList() {
    if (goalInput.trim()) {
      setGoalList((prev) => [...prev, goalInput.trim()]);
      setGoalInput("");
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || goalList.length === 0) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, goals: goalList, frequency }),
    });
    setName("");
    setDescription("");
    setFrequency("daily");
    setGoalList([]);
    fetchData();
  }

  // --- Edit template ---
  function startEdit(t: Template) {
    setEditingTemplate(t);
    setEditName(t.name);
    setEditDesc(t.description || "");
    setEditFreq(t.frequency);
    setEditGoals([...t.goals]);
    setEditGoalInput("");
  }

  async function saveEdit() {
    if (!editingTemplate || !editName.trim() || editGoals.length === 0) return;
    await fetch("/api/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingTemplate.id, name: editName.trim(), description: editDesc.trim() || null, goals: editGoals, frequency: editFreq }),
    });
    setEditingTemplate(null);
    fetchData();
    showMessage("Template updated!");
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    fetchData();
    showMessage("Template deleted");
  }

  // --- Apply template ---
  function startApply(t: Template) {
    setApplyingTemplate(t);
    setApplyMode("new");
    setTargetSectionId(sections.length > 0 ? sections[0].id : "");
  }

  async function confirmApply() {
    if (!applyingTemplate) return;
    const res = await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: applyingTemplate.id,
        mode: applyMode,
        targetSectionId: applyMode === "merge" ? targetSectionId : null,
      }),
    });
    const data = await res.json();
    setApplyingTemplate(null);
    fetchData();
    showMessage(data.message);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;
  }

  const builtIn = templates.filter((t) => t.isBuiltIn);
  const custom = templates.filter((t) => !t.isBuiltIn);

  const freqBadge = (f: string) => {
    const colors: Record<string, string> = { daily: "bg-accent/10 text-accent", weekly: "bg-warning/10 text-warning", monthly: "bg-success/10 text-success" };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[f] || ""}`}>{f}</span>;
  };

  function renderTemplate(t: Template) {
    return (
      <div key={t.id} className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{t.name}</h3>
              {freqBadge(t.frequency)}
            </div>
            {t.description && <p className="text-xs text-muted mt-1">{t.description}</p>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {t.goals.map((g, i) => (
            <div key={i} className="text-sm flex items-center gap-2">
              <span className="text-accent">{"\u2022"}</span> {g}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => startApply(t)} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90">
            Apply
          </button>
          <button onClick={() => startEdit(t)} className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted hover:text-foreground hover:border-accent/30">
            Edit
          </button>
          {!t.isBuiltIn && (
            <button onClick={() => deleteTemplate(t.id)} className="px-3 py-1.5 text-xs text-muted hover:text-red-500">
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted text-sm">Use templates to quickly set up goal sections</p>
      </div>

      {message && (
        <div className="bg-success/10 text-success text-sm px-4 py-3 rounded-lg">{message}</div>
      )}

      {/* Apply modal */}
      {applyingTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-lg mb-1">Apply &quot;{applyingTemplate.name}&quot;</h3>
            <p className="text-sm text-muted mb-4">Choose how to add these goals:</p>

            <div className="space-y-3 mb-5">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${applyMode === "new" ? "border-accent bg-accent/5" : "border-border"}`}>
                <input type="radio" checked={applyMode === "new"} onChange={() => setApplyMode("new")} className="mt-1 accent-[var(--accent)]" />
                <div>
                  <div className="font-medium text-sm">Create as new section</div>
                  <div className="text-xs text-muted">Creates a new &quot;{applyingTemplate.name}&quot; section with all goals</div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${applyMode === "merge" ? "border-accent bg-accent/5" : "border-border"}`}>
                <input type="radio" checked={applyMode === "merge"} onChange={() => setApplyMode("merge")} className="mt-1 accent-[var(--accent)]" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Merge into existing section</div>
                  <div className="text-xs text-muted mb-2">Add goals to a section you already have (skips duplicates)</div>
                  {applyMode === "merge" && (
                    <select
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-lg text-sm bg-background"
                    >
                      {sections.length === 0 && <option value="">No sections yet</option>}
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.frequency})</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setApplyingTemplate(null)} className="px-4 py-2 text-sm text-muted hover:text-foreground">Cancel</button>
              <button
                onClick={confirmApply}
                disabled={applyMode === "merge" && !targetSectionId}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl space-y-3">
            <h3 className="font-semibold text-lg">Edit Template</h3>
            <input
              type="text"
              placeholder="Template name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background"
            />
            <select
              value={editFreq}
              onChange={(e) => setEditFreq(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <div>
              <div className="text-sm font-medium mb-1">Goals</div>
              <div className="space-y-1 mb-2">
                {editGoals.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-accent">{"\u2022"}</span>
                    <span className="flex-1">{g}</span>
                    <button onClick={() => setEditGoals((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-red-500">&times;</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a goal"
                  value={editGoalInput}
                  onChange={(e) => setEditGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (editGoalInput.trim()) { setEditGoals((prev) => [...prev, editGoalInput.trim()]); setEditGoalInput(""); } } }}
                  className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-background"
                />
                <button
                  type="button"
                  onClick={() => { if (editGoalInput.trim()) { setEditGoals((prev) => [...prev, editGoalInput.trim()]); setEditGoalInput(""); } }}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent/10"
                >+</button>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm text-muted hover:text-foreground">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Built-in */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Built-in Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtIn.map(renderTemplate)}
        </div>
      </div>

      {/* Custom */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Templates</h2>
        {custom.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {custom.map(renderTemplate)}
          </div>
        ) : (
          <p className="text-muted text-sm mb-4">No custom templates yet.</p>
        )}

        {/* Create form */}
        <form onSubmit={createTemplate} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-medium">Create New Template</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background"
              required
            />
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a goal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoalToList(); } }}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background"
            />
            <button type="button" onClick={addGoalToList} className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent/10">+</button>
          </div>
          {goalList.length > 0 && (
            <div className="space-y-1">
              {goalList.map((g, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-accent">{"\u2022"}</span>
                  <span className="flex-1">{g}</span>
                  <button type="button" onClick={() => setGoalList((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-red-500">&times;</button>
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={goalList.length === 0} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
            Create Template
          </button>
        </form>
      </div>
    </div>
  );
}
