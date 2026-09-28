import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Subtle background ambient gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl">
          <Image
            src="/images/logo-brand-dark.png"
            alt="ASSO Logo"
            width={140}
            height={40}
            className="h-9 w-auto object-contain filter drop-shadow-md"
            priority
          />
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-[12px] font-medium text-[var(--foreground-muted)] bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-full shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span>Enterprise Hotel Management SaaS</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-[12px] text-[var(--foreground-muted)]">
        <p>© {new Date().getFullYear()} StayHub Technologies Pvt. Ltd. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-[var(--foreground-subtle)]">
          Protected by PostgreSQL Row Level Security (RLS) & ISO-grade Tenant Isolation.
        </p>
      </footer>
    </div>
  );
}
