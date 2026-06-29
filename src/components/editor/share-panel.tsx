"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Crown, Pencil, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorForUser, shortName } from "@/lib/client-utils";

type MemberList = {
  members: Array<{
    userId: string; role: "OWNER" | "EDITOR" | "VIEWER"; createdAt: string;
    user: { id: string; name: string | null; email: string; image?: string | null };
  }>;
};

export function SharePanel({ documentId, canManage }: { documentId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"EDITOR" | "VIEWER">("EDITOR");

  const { data, isLoading } = useQuery<MemberList>({
    queryKey: ["members", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }), credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members", documentId] }); qc.invalidateQueries({ queryKey: ["document", documentId] }); setEmail(""); toast.success("Member added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (args: { userId: string; role: "EDITOR" | "VIEWER" }) => {
      const res = await fetch(`/api/documents/${documentId}/members/${args.userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: args.role }), credentials: "include",
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members", documentId] }); toast.success("Role updated"); },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/documents/${documentId}/members/${userId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Remove failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members", documentId] }); qc.invalidateQueries({ queryKey: ["document", documentId] }); toast.success("Member removed"); },
  });

  const members = data?.members ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Users className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Sharing</h2>
      </div>
      {canManage && (
        <div className="border-b border-border p-3">
          <div className="flex gap-2">
            <Input type="email" placeholder="Invite by email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            <Select value={role} onValueChange={(v) => setRole(v as "EDITOR" | "VIEWER")}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="EDITOR">Editor</SelectItem><SelectItem value="VIEWER">Viewer</SelectItem></SelectContent>
            </Select>
            <Button size="sm" className="h-8 shrink-0" onClick={() => inviteMutation.mutate()} disabled={!email.trim() || inviteMutation.isPending}>
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Editors can write; viewers are read-only (enforced server-side).</p>
        </div>
      )}
      <ScrollArea className="cosync-scroll flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-12 animate-pulse rounded-md bg-muted/40" />))}</div>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => {
                const color = colorForUser(m.user.id);
                const name = shortName(m.user.name, m.user.email);
                return (
                  <li key={m.userId} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40">
                    <Avatar className="h-8 w-8" style={{ backgroundColor: color }}>
                      <AvatarFallback className="text-[10px] font-medium text-white" style={{ backgroundColor: color }}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.user.name ?? m.user.email}</p>
                      {m.user.name && <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>}
                    </div>
                    {m.role === "OWNER" ? (
                      <Badge variant="secondary" className="gap-1 text-xs"><Crown className="h-3 w-3" />Owner</Badge>
                    ) : canManage ? (
                      <div className="flex items-center gap-1">
                        <Select value={m.role} onValueChange={(v) => updateRoleMutation.mutate({ userId: m.userId, role: v as "EDITOR" | "VIEWER" })}>
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EDITOR"><span className="flex items-center gap-1"><Pencil className="h-3 w-3" />Editor</span></SelectItem>
                            <SelectItem value="VIEWER"><span className="flex items-center gap-1"><Eye className="h-3 w-3" />Viewer</span></SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMutation.mutate(m.userId)} aria-label={`Remove ${m.user.email}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">{m.role.toLowerCase()}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
