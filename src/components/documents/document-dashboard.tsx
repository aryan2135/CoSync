"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { FileText, Plus, Search, Users, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUiStore } from "@/stores/ui-store";
import { TopNav } from "@/components/top-nav";

type DocList = {
  documents: Array<{
    id: string; title: string; preview: string | null; wordCount: number;
    updatedAt: string; createdAt: string;
    owner: { id: string; name: string | null; email: string };
    members: Array<{ userId: string; role: "OWNER" | "EDITOR" | "VIEWER"; user: { id: string; name: string | null; email: string; image?: string | null } }>;
  }>;
};

export function DocumentDashboard() {
  const qc = useQueryClient();
  const openDocument = useUiStore((s) => s.openDocument);
  const [query, setQuery] = React.useState("");

  const { data, isLoading } = useQuery<DocList>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}), credentials: "include" });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json() as Promise<{ document: { id: string } }>;
    },
    onSuccess: ({ document }) => { qc.invalidateQueries({ queryKey: ["documents"] }); openDocument(document.id); },
    onError: () => toast.error("Could not create document"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document archived"); },
  });

  const docs = data?.documents ?? [];
  const filtered = docs.filter((d) => !query || d.title.toLowerCase().includes(query.toLowerCase()) || (d.preview ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <TopNav onHome={() => {}} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">Local-first. Offline-ready. Conflict-free collaboration.</p>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}New document
          </Button>
        </div>
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search documents" />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-muted/40" />))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
              <h3 className="text-lg font-medium">{query ? "No matches found" : "No documents yet"}</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{query ? "Try a different search term." : "Create your first document to start writing locally and collaborating in real time."}</p>
              {!query && <Button onClick={() => createMutation.mutate()} className="mt-4"><Plus className="mr-2 h-4 w-4" />Create document</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => {
              const isOwner = doc.members.some((m) => m.role === "OWNER");
              return (
                <Card key={doc.id} className="group relative cursor-pointer transition-all hover:border-primary/40 hover:shadow-md" onClick={() => openDocument(doc.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDocument(doc.id); } }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><CardTitle className="line-clamp-1 text-base">{doc.title}</CardTitle></div>
                    </div>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">{doc.preview || "Empty document"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3"><span className="flex items-center gap-1"><Users className="h-3 w-3" />{doc.members.length}</span><span>{doc.wordCount} words</span></div>
                    <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                  </CardContent>
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button" onClick={(e) => e.stopPropagation()} className="absolute right-3 top-3 hidden rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-focus-within:opacity-100" aria-label="Archive document">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive document?</AlertDialogTitle>
                          <AlertDialogDescription>This moves the document to the archive. This action cannot be undone in this build.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Archive</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
