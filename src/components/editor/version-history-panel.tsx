"use client";

import * as React from "react";
import * as Y from "yjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Camera, Clock, RotateCcw, Loader2, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { bytesToBase64, base64ToBytes } from "@/lib/crdt/codec";

type VersionList = {
  versions: Array<{
    id: string; label: string | null; contentText: string; wordCount: number;
    charCount: number; createdAt: string;
    createdBy: { id: string; name: string | null; email: string };
  }>;
};

function getCurrentContent(doc: Y.Doc) {
  const fragment = doc.getXmlFragment("default");
  const text = fragment.toString().replace(/<[^>]+>/g, " ").trim();
  const html = serializeFragmentToHtml(fragment);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return { text, html, words, chars: text.length };
}

function serializeFragmentToHtml(fragment: Y.XmlFragment): string {
  let html = "";
  fragment.forEach((child) => {
    if (child instanceof Y.XmlElement) {
      const tag = child.nodeName;
      let inner = "";
      child.forEach?.((grand: Y.XmlText | Y.XmlElement) => { inner += grand.toString(); });
      html += `<${tag}>${inner}</${tag}>`;
    } else if (child instanceof Y.XmlText) {
      html += child.toString();
    }
  });
  return html;
}

export function VersionHistoryPanel({ documentId, doc, canEdit }: { documentId: string; doc: Y.Doc; canEdit: boolean }) {
  const qc = useQueryClient();
  const [label, setLabel] = React.useState("");
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [restoreId, setRestoreId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<VersionList>({
    queryKey: ["versions", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load versions");
      return res.json();
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const { text, html, words, chars } = getCurrentContent(doc);
      const state = Y.encodeStateAsUpdate(doc);
      const stateVector = Y.encodeStateVector(doc);
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined, state: bytesToBase64(state), stateVector: bytesToBase64(stateVector), contentText: text, contentHtml: html, wordCount: words, charCount: chars }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Snapshot failed");
      return res.json();
    },
    onSuccess: () => { setLabel(""); qc.invalidateQueries({ queryKey: ["versions", documentId] }); toast.success("Snapshot saved"); },
    onError: () => toast.error("Could not save snapshot"),
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load version");
      const data = (await res.json()) as { version: { state: string } };
      return data.version.state;
    },
    onSuccess: (stateB64) => {
      try {
        const snapshotState = base64ToBytes(stateB64);
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, snapshotState);
        const snapshotFragment = tempDoc.getXmlFragment("default");
        doc.transact(() => {
          const live = doc.getXmlFragment("default");
          while (live.length > 0) live.delete(0, 1);
          snapshotFragment.forEach((child) => { live.push([cloneXmlNode(child as Y.XmlElement | Y.XmlText)]); });
        });
        tempDoc.destroy();
        toast.success("Document restored — collaborators updated");
        setRestoreId(null);
      } catch (e) { console.error("restore failed:", e); toast.error("Restore failed"); }
    },
  });

  const versions = data?.versions ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Version history</h2></div>
        <Badge variant="secondary" className="text-xs">{versions.length}</Badge>
      </div>
      {canEdit && (
        <div className="border-b border-border p-3">
          <div className="flex gap-2">
            <Input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" />
            <Button size="sm" onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending} className="h-8 shrink-0">
              {snapshotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span className="ml-1.5">Snapshot</span>
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Snapshots are append-only. Restore creates new operations that safely propagate to collaborators.</p>
        </div>
      )}
      <ScrollArea className="cosync-scroll flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />))}</div>
          ) : versions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No snapshots yet. Create one to enable time-travel.</div>
          ) : (
            <ol className="space-y-1">
              {versions.map((v, i) => (
                <li key={v.id} className="group rounded-md border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="text-xs font-medium">{v.label ?? `Version ${versions.length - i}`}</span></div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.contentText.slice(0, 120) || "(empty)"}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</span><span>·</span><span>{v.wordCount} words</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setPreviewId(v.id)}><Eye className="mr-1 h-3 w-3" />Preview</Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400" onClick={() => setRestoreId(v.id)}>
                        <RotateCcw className="mr-1 h-3 w-3" />Restore
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </ScrollArea>
      <PreviewDialog documentId={documentId} versionId={previewId} onClose={() => setPreviewId(null)} />
      <Dialog open={!!restoreId} onOpenChange={(o) => !o && setRestoreId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>The document will be reverted to this snapshot. This is applied as new CRDT operations, so active collaborators will receive the change and your version history stays intact.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreId(null)}>Cancel</Button>
            <Button onClick={() => restoreId && restoreMutation.mutate(restoreId)} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cloneXmlNode(node: Y.XmlElement | Y.XmlText): Y.XmlElement | Y.XmlText {
  if (node instanceof Y.XmlText) {
    const clone = new Y.XmlText();
    clone.applyDelta(node.toDelta());
    return clone;
  }
  const clone = new Y.XmlElement(node.nodeName);
  const attrs = node.getAttributes();
  for (const [k, v] of Object.entries(attrs)) clone.setAttribute(k, String(v));
  node.forEach((child) => { clone.push([cloneXmlNode(child as Y.XmlElement | Y.XmlText)]); });
  return clone;
}

function PreviewDialog({ documentId, versionId, onClose }: { documentId: string; versionId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["version", documentId, versionId],
    queryFn: async () => {
      if (!versionId) return null;
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load version");
      return res.json() as Promise<{ version: { contentText: string; contentHtml: string; label: string | null; createdAt: string } }>;
    },
    enabled: !!versionId,
  });

  return (
    <Dialog open={!!versionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{data?.version.label ?? "Version preview"}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
          </DialogTitle>
          <DialogDescription>{data && new Date(data.version.createdAt).toLocaleString()}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{data?.version.contentText || "(empty document)"}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
