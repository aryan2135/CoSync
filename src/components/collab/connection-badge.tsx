"use client";

import { Loader2, Wifi, WifiOff, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CollabStatus } from "@/hooks/use-collab-provider";

const config: Record<CollabStatus, { label: string; icon: typeof Wifi; className: string }> = {
  connecting: { label: "Syncing…", icon: Loader2, className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900" },
  connected: { label: "All changes saved", icon: Check, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900" },
  disconnected: { label: "Offline — changes saved locally", icon: WifiOff, className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800" },
  error: { label: "Connection error", icon: AlertCircle, className: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900" },
};

export function ConnectionBadge({ status }: { status: CollabStatus }) {
  const { label, icon: Icon, className } = config[status];
  const animate = status === "connecting";
  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${className}`} role="status" aria-live="polite" aria-label={`Sync status: ${label}`}>
      <Icon className={`h-3 w-3 ${animate ? "animate-spin" : ""}`} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Badge>
  );
}
