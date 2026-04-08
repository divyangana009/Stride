"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Today", icon: "\u2600\uFE0F" },
  { href: "/dashboard/journal", label: "Journal", icon: "\uD83D\uDCD3" },
  { href: "/dashboard/goals", label: "Goals", icon: "\uD83C\uDFAF" },
  { href: "/dashboard/history", label: "History", icon: "\uD83D\uDCC5" },
  { href: "/dashboard/stats", label: "Stats", icon: "\uD83D\uDCCA" },
  { href: "/dashboard/templates", label: "Templates", icon: "\uD83D\uDCCB" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
        <Link href="/dashboard" className="text-xl font-bold text-accent">Stride</Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-muted hover:text-foreground transition-colors">Sign Out</button>
      </header>
      <div className="flex flex-1">
        <nav className="w-48 border-r border-border p-4 space-y-1 hidden md:block bg-card">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === item.href ? "bg-accent/10 text-accent font-medium" : "text-muted hover:text-foreground hover:bg-background"}`}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-6 max-w-4xl">{children}</main>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center text-xs ${pathname === item.href ? "text-accent" : "text-muted"}`}>
            <span className="text-lg">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
