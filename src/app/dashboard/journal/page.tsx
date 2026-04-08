"use client";

import { useState, useEffect, useCallback } from "react";

interface JournalEntry {
  id: string;
  date: string;
  prompt: string;
  response: string;
  createdAt: string;
}

const ALL_PROMPTS = [
  "What are you grateful for today?",
  "How are you feeling right now?",
  "What's one thing you accomplished today?",
  "What challenged you today and how did you handle it?",
  "What's one thing you'd like to improve tomorrow?",
  "Describe a memorable moment from today.",
  "Who made a positive impact on your day?",
  "What did you learn today?",
  "What are your top 3 priorities for tomorrow?",
  "Write about something that made you smile today.",
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState(ALL_PROMPTS[0]);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/journal");
    const data = await res.json();
    setEntries(data.entries || []);
    if (data.todayPrompt) setSelectedPrompt(data.todayPrompt);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;
    setSaving(true);

    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: selectedPrompt, response: response.trim() }),
    });

    setResponse("");
    setSaving(false);
    fetchEntries();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal</h1>
        <p className="text-muted text-sm">Reflect on your day with guided prompts</p>
      </div>

      {/* New entry */}
      <form onSubmit={saveEntry} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Today&apos;s Prompt</label>
          <select
            value={selectedPrompt}
            onChange={(e) => setSelectedPrompt(e.target.value)}
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background text-sm"
          >
            {ALL_PROMPTS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your thoughts..."
            rows={5}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-background resize-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </form>

      {/* Past entries */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Entries</h2>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">{new Date(entry.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
              <p className="text-sm font-medium text-accent mb-1">{entry.prompt}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.response}</p>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-center text-muted py-8">No journal entries yet. Write your first one above!</p>
          )}
        </div>
      </div>
    </div>
  );
}
