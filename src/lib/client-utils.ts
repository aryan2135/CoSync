"use client";

import * as React from "react";

export const features = {
  collabWsUrl: "/?XTransformPort=3001",
};

export function colorForUser(userId: string): string {
  const palette = ["#0ea5e9", "#f97316", "#10b981", "#a855f7", "#ec4899", "#eab308", "#14b8a6", "#ef4444", "#8b5cf6", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function shortName(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
  if (email) return email.split("@")[0];
  return "Anonymous";
}

export function useMounted(): boolean {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}
