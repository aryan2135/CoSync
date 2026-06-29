"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote,
  Undo2, Redo2, Link as LinkIcon, Highlighter, RemoveFormatting, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = { editor: Editor | null; canEdit: boolean };

const colors = ["#0f172a", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#6b7280"];
const highlights = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e9d5ff", "#a7f3d0", "#fecaca"];

function ToolbarButton({ onClick, active, disabled, label, children }: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label} title={label} className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}>
      {children}
    </Button>
  );
}

export function EditorToolbar({ editor, canEdit }: Props) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [colorOpen, setColorOpen] = React.useState(false);
  const [hlOpen, setHlOpen] = React.useState(false);

  if (!editor) return null;

  const setLink = () => {
    const url = linkUrl.trim();
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
  };

  const openLink = () => {
    const prev = editor.getAttributes("link").href;
    setLinkUrl(typeof prev === "string" ? prev : "");
    setLinkOpen(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-background/95 p-1 shadow-sm backdrop-blur" role="toolbar" aria-label="Text formatting">
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!canEdit || !editor.can().undo()} label="Undo"><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!canEdit || !editor.can().redo()} label="Redo"><Redo2 className="h-4 w-4" /></ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} disabled={!canEdit} label="Heading 1"><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} disabled={!canEdit} label="Heading 2"><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} disabled={!canEdit} label="Heading 3"><Heading3 className="h-4 w-4" /></ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} disabled={!canEdit} label="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} disabled={!canEdit} label="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} disabled={!canEdit} label="Underline"><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} disabled={!canEdit} label="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} disabled={!canEdit} label="Inline code"><Code className="h-4 w-4" /></ToolbarButton>
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild><ToolbarButton onClick={() => setColorOpen((v) => !v)} disabled={!canEdit} label="Text color"><Palette className="h-4 w-4" /></ToolbarButton></PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((c) => (<button key={c} type="button" onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }} className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: c }} aria-label={`Set text color ${c}`} />))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}>Reset color</Button>
        </PopoverContent>
      </Popover>
      <Popover open={hlOpen} onOpenChange={setHlOpen}>
        <PopoverTrigger asChild><ToolbarButton onClick={() => setHlOpen((v) => !v)} active={editor.isActive("highlight")} disabled={!canEdit} label="Highlight"><Highlighter className="h-4 w-4" /></ToolbarButton></PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1.5">
            {highlights.map((c) => (<button key={c} type="button" onClick={() => { editor.chain().focus().setHighlight({ color: c }).run(); setHlOpen(false); }} className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: c }} aria-label={`Highlight ${c}`} />))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={() => { editor.chain().focus().unsetHighlight().run(); setHlOpen(false); }}>Remove highlight</Button>
        </PopoverContent>
      </Popover>
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild><ToolbarButton onClick={openLink} active={editor.isActive("link")} disabled={!canEdit} label="Insert link"><LinkIcon className="h-4 w-4" /></ToolbarButton></PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Link URL</label>
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setLink()} placeholder="https://example.com" className="mb-2 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); }}>Remove</Button>
            <Button size="sm" onClick={setLink}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} disabled={!canEdit} label="Bullet list"><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} disabled={!canEdit} label="Numbered list"><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} disabled={!canEdit} label="Task list"><ListChecks className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} disabled={!canEdit} label="Quote"><Quote className="h-4 w-4" /></ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} disabled={!canEdit} label="Clear formatting"><RemoveFormatting className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}
