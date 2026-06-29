"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, History, Sparkles, Share2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TopNav } from "@/components/top-nav";
import { ConnectionBadge } from "@/components/collab/connection-badge";
import { CollaborativeEditor } from "@/components/editor/collaborative-editor";
import { VersionHistoryPanel } from "@/components/editor/version-history-panel";
import { AiPanel } from "@/components/ai/ai-panel";
import { SharePanel } from "@/components/editor/share-panel";
import { useCollabProvider } from "@/hooks/use-collab-provider";
import { useUiStore } from "@/stores/ui-store";
import { colorForUser, shortName } from "@/lib/client-utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";

type DocDetail = {
  document: {
    id: string; title: string; preview: string | null; wordCount: number;
    createdAt: string; updatedAt: string; ownerId: string;
    state: string | null; stateVector: string | null;
    owner: { id: string; name: string | null; email: string };
    members: Array<{ userId: string; role: "OWNER" | "EDITOR" | "VIEWER"; user: { id: string; name: string | null; email: string; image?: string | null } }>;
    myRole: "OWNER" | "EDITOR" | "VIEWER" | null;
  };
};

export function EditorWorkspace({ documentId }: { documentId: string }) {
  const closeDocument = useUiStore((s) => s.closeDocument);
  const editorPanel = useUiStore((s) => s.editorPanel);
  const setEditorPanel = useUiStore((s) => s.setEditorPanel);
  const { data: session } = useSession();

  const { data, isLoading, error } = useQuery<DocDetail>({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Document not found");
        if (res.status === 403) throw new Error("You don't have access to this document");
        throw new Error("Failed to load document");
      }
      return res.json();
    },
    retry: false,
  });

  const role = data?.document.myRole ?? null;
  const canEdit = role === "OWNER" || role === "EDITOR";

  const tokenGetter = React.useCallback(async () => {
    const res = await fetch(`/api/collab/token?documentId=${documentId}`, { credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as { token?: string };
    return json.token ?? null;
  }, [documentId]);

  const collab = useCollabProvider({
    documentId, tokenGetter, role: role ?? "VIEWER",
    onAuthError: () => toast.error("Collaboration authentication failed"),
  });

  const [title, setTitle] = React.useState(data?.document.title ?? "");
  const [titleDirty, setTitleDirty] = React.useState(false);
  React.useEffect(() => {
    if (data?.document.title) { setTitle(data.document.title); setTitleDirty(false); }
  }, [data?.document.title]);

  const saveTitle = async () => {
    if (!titleDirty || !title.trim()) return;
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }), credentials: "include",
      });
      if (!res.ok) throw new Error();
      setTitleDirty(false);
    } catch { toast.error("Could not save title"); }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav onHome={closeDocument} />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav onHome={closeDocument} />
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center">
          <p className="text-lg font-medium">{error?.message ?? "Document not found"}</p>
          <Button onClick={closeDocument} className="mt-4">Back to documents</Button>
        </div>
      </div>
    );
  }

  const members = data.document.members;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav onHome={closeDocument} />
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <Button variant="ghost" size="icon" onClick={closeDocument} aria-label="Back to documents" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleDirty(true); }}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            disabled={!canEdit}
            className={cn("h-8 border-transparent bg-transparent px-2 text-base font-medium hover:border-input focus-visible:border-input", titleDirty && "border-input")}
            aria-label="Document title"
          />
          <div className="ml-auto flex items-center gap-2">
            <ConnectionBadge status={collab.status} />
            {role && role !== "OWNER" && (<Badge variant="secondary" className="hidden sm:inline-flex">{role.toLowerCase()}</Badge>)}
            <TooltipProvider>
              <div className="flex items-center -space-x-2">
                {members.slice(0, 4).map((m) => {
                  const color = colorForUser(m.user.id);
                  const name = shortName(m.user.name, m.user.email);
                  return (
                    <Tooltip key={m.userId}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background" style={{ backgroundColor: color }}>
                          <AvatarFallback className="text-[10px] font-medium text-white" style={{ backgroundColor: color }}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{m.user.name ?? m.user.email} · {m.role.toLowerCase()}</TooltipContent>
                    </Tooltip>
                  );
                })}
                {members.length > 4 && (<div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">+{members.length - 4}</div>)}
              </div>
            </TooltipProvider>
            <div className="flex items-center gap-1">
              <PanelToggle active={editorPanel === "versions"} onClick={() => setEditorPanel(editorPanel === "versions" ? null : "versions")} icon={History} label="Version history" />
              <PanelToggle active={editorPanel === "ai"} onClick={() => setEditorPanel(editorPanel === "ai" ? null : "ai")} icon={Sparkles} label="AI assistant" />
              <PanelToggle active={editorPanel === "share"} onClick={() => setEditorPanel(editorPanel === "share" ? null : "share")} icon={Share2} label="Share" />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={editorPanel ? 70 : 100} minSize={50}>
            <div className="h-[calc(100vh-7rem)] p-4 sm:p-6">
              {session?.user && (
                <ErrorBoundary>
                  <CollaborativeEditor doc={collab.doc} awareness={collab.awareness} canEdit={canEdit} />
                </ErrorBoundary>
              )}
            </div>
          </ResizablePanel>
          {editorPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
                <div className="h-[calc(100vh-7rem)] overflow-hidden border-l border-border bg-background">
                  {editorPanel === "versions" && <VersionHistoryPanel documentId={documentId} doc={collab.doc} canEdit={canEdit} />}
                  {editorPanel === "ai" && <AiPanel documentId={documentId} />}
                  {editorPanel === "share" && <SharePanel documentId={documentId} canManage={role === "OWNER"} />}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </main>
    </div>
  );
}

function PanelToggle({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof History; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? "secondary" : "ghost"} size="icon" onClick={onClick} className="h-8 w-8" aria-pressed={active} aria-label={label}><Icon className="h-4 w-4" /></Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
