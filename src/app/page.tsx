import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Stride</h1>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-foreground hover:text-accent transition-colors">Log In</Link>
          <Link href="/register" className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">Sign Up</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="text-6xl mb-6">&#x1F3C3;</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Build better habits,<br />
            <span className="text-accent">one day at a time.</span>
          </h2>
          <p className="text-lg text-muted mb-8 max-w-lg mx-auto">
            Track your daily goals, journal your thoughts, get nudge reminders, and watch your progress grow with beautiful charts.
          </p>
          <Link href="/register" className="px-6 py-3 bg-accent text-white rounded-lg font-medium text-lg hover:bg-accent/90 transition-colors inline-block">Get Started Free</Link>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 text-left">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-2xl mb-2">&#x1F3AF;</div>
              <h3 className="font-semibold text-sm">Goal Tracking</h3>
              <p className="text-xs text-muted mt-1">Set and track daily goals</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-2xl mb-2">&#x1F4D3;</div>
              <h3 className="font-semibold text-sm">Journaling</h3>
              <p className="text-xs text-muted mt-1">Guided daily prompts</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-2xl mb-2">&#x1F4CA;</div>
              <h3 className="font-semibold text-sm">Analytics</h3>
              <p className="text-xs text-muted mt-1">Monthly performance charts</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-2xl mb-2">&#x1F514;</div>
              <h3 className="font-semibold text-sm">Reminders</h3>
              <p className="text-xs text-muted mt-1">Timed nudge alerts</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
