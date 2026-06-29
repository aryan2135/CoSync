"use client";

import * as React from "react";
import {
  FileText, WifiOff, GitBranch, History, Users, Sparkles, Shield,
  ArrowRight, Github, Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

type Props = { onAuth: () => void };

const features = [
  { icon: WifiOff, title: "Local-First & Offline-Ready", description: "Your edits persist to IndexedDB instantly — the UI never blocks on the network. Work offline confidently; changes reconcile automatically on reconnect." },
  { icon: GitBranch, title: "Deterministic Conflict Resolution", description: "Built on Yjs CRDTs — operations merge commutatively and idempotently. No data loss, no 'yours vs mine' dialogs, ever." },
  { icon: History, title: "Version History & Time Travel", description: "Capture labeled snapshots and restore any past state safely. Restore emits new operations, so active collaborators are never disrupted." },
  { icon: Users, title: "Real-Time Collaboration", description: "Live sync via WebSocket. Role-based access (Owner / Editor / Viewer) enforced server-side — viewers can read but never mutate." },
  { icon: Sparkles, title: "AI-Powered Writing", description: "Summarize, extract tags, suggest titles, improve prose, or ask questions about your document. Pluggable provider layer." },
  { icon: Shield, title: "Production-Grade Security", description: "JWT auth, tenant isolation, anti-OOM guards, Zod validation on every route, and Row-Level Security ready for PostgreSQL." },
];

export function LandingPage({ onAuth }: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileText className="h-4 w-4" /></div>
            <span className="text-sm font-semibold tracking-tight">CoSync</span>
            <Badge variant="secondary" className="ml-2 hidden text-[10px] sm:inline-flex">Local-First</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onAuth} className="hidden sm:inline-flex">Sign in</Button>
            <Button size="sm" onClick={onAuth}>Get Started</Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50" style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 60%)" }} />
        <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge variant="outline" className="mb-6 gap-1.5 py-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            CRDT-powered · Offline-first · Open architecture
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Write anywhere.<br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Sync everywhere.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            A collaborative document editor that works seamlessly without an internet connection. Deterministic conflict resolution ensures your edits never clash. Granular version history lets you travel through time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={onAuth} className="w-full sm:w-auto">Start writing free<ArrowRight className="ml-2 h-4 w-4" /></Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <a href="#features" className="inline-flex items-center">Explore features</a>
            </Button>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
            {[{ value: "0", label: "Network requests to start editing" }, { value: "100%", label: "Offline edits preserved" }, { value: "∞", label: "Concurrent editors, zero conflicts" }].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-primary sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Engineered for the hardest problems</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Not another CRUD app. A distributed systems solution tackling browser state management, sync race conditions, and complex merge algorithms over real-time protocols.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border/60 bg-background p-6 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight sm:text-3xl">How conflict-free sync works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[{ step: "01", title: "Edit locally", body: "Every keystroke is written to IndexedDB. The UI responds instantly — no network round-trips." },
              { step: "02", title: "Sync in background", body: "When online, a WebSocket pushes CRDT updates to the server and pulls remote changes." },
              { step: "03", title: "Merge deterministically", body: "CRDT operations are commutative and idempotent. Any two replicas converge to identical state." }].map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-3 text-3xl font-bold text-primary/20">{s.step}</div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to write without limits?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80 sm:text-base">Create an account in seconds. Your first document is ready offline before the network even connects.</p>
          <Button size="lg" variant="secondary" onClick={onAuth} className="mt-6">Get started — it&apos;s free<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </section>

      <footer className="mt-auto border-t border-border/60 bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            <span><span className="font-medium text-foreground">CoSync</span> · Local-First Collaborative Editor</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Built by <span className="font-medium text-foreground">Aryan Dongre</span></span>
            <Link href="https://github.com/aryan2135" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" aria-label="GitHub profile"><Github className="h-4 w-4" /></Link>
            <Link href="https://www.linkedin.com/in/aryan-dongre-29b858313/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" aria-label="LinkedIn profile"><Linkedin className="h-4 w-4" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
