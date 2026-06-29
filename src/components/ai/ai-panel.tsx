"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, Tag, Type, Wand2, MessageSquare, Send, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Tab = "summary" | "tags" | "title" | "improve" | "qa";

const tabs: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "title", label: "Title", icon: Type },
  { id: "improve", label: "Improve", icon: Wand2 },
  { id: "qa", label: "Ask", icon: MessageSquare },
];

export function AiPanel({ documentId }: { documentId: string }) {
  const [tab, setTab] = React.useState<Tab>("summary");
  const [output, setOutput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [qaHistory, setQaHistory] = React.useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [selection, setSelection] = React.useState("");
  const [instruction, setInstruction] = React.useState("");

  const run = async (endpoint: Tab) => {
    setLoading(true); setError(null); setOutput("");
    try {
      const body: Record<string, unknown> = { documentId };
      if (endpoint === "improve") {
        if (!selection.trim()) { setError("Paste some text to improve first."); setLoading(false); return; }
        body.selection = selection;
        if (instruction.trim()) body.instruction = instruction;
      } else if (endpoint === "qa") {
        if (!question.trim()) { setError("Type a question first."); setLoading(false); return; }
        body.question = question;
      }
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? (res.status === 503 ? "AI is not configured." : "Request failed"));
        setLoading(false); return;
      }
      const reader = res.body?.getReader();
      if (!reader) { setError("No response stream"); setLoading(false); return; }
      let acc = "";
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
      if (endpoint === "qa") {
        setQaHistory((h) => [...h, { role: "user", content: question }, { role: "assistant", content: acc }]);
        setQuestion("");
      }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  const copyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">AI assistant</h2>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {tabs.map((t) => (
          <Button key={t.id} variant={tab === t.id ? "secondary" : "ghost"} size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => { setTab(t.id); setOutput(""); setError(null); }}>
            <t.icon className="h-3 w-3" />{t.label}
          </Button>
        ))}
      </div>
      <ScrollArea className="cosync-scroll flex-1">
        <div className="p-3">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          {tab === "qa" && (
            <div className="mb-3 space-y-2">
              {qaHistory.map((m, i) => (
                <div key={i} className={cn("rounded-md p-2 text-sm", m.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4")}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "improve" && (
            <div className="mb-3 space-y-2">
              <Textarea placeholder="Paste the text you want to improve…" value={selection} onChange={(e) => setSelection(e.target.value)} className="min-h-[100px] text-sm" />
              <Input placeholder="Instruction (optional, e.g. 'make it more formal')" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="text-sm" />
            </div>
          )}
          {output && (
            <div className="group relative rounded-md border border-border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {output}{loading && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/60" />}
              </p>
              {!loading && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={copyOutput} aria-label="Copy result">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          )}
          {!output && !loading && tab !== "qa" && tab !== "improve" && (
            <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
              <Sparkles className="mb-2 h-6 w-6 opacity-50" /><p>Click run to generate.</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-3">
        {tab === "qa" ? (
          <form onSubmit={(e) => { e.preventDefault(); run("qa"); }} className="flex gap-2">
            <Input placeholder="Ask a question about this document…" value={question} onChange={(e) => setQuestion(e.target.value)} className="text-sm" />
            <Button type="submit" size="icon" disabled={loading || !question.trim()} className="h-9 w-9 shrink-0">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </form>
        ) : (
          <Button onClick={() => run(tab)} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Generating…" : tab === "summary" ? "Generate summary" : tab === "tags" ? "Extract tags" : tab === "title" ? "Suggest titles" : "Improve text"}
          </Button>
        )}
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">AI features run server-side. Switch providers via the AI_PROVIDER env var.</p>
      </div>
    </div>
  );
}
