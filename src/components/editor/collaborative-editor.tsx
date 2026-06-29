"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { EditorToolbar } from "./editor-toolbar";

type Props = {
  doc: Y.Doc;
  awareness: Awareness;
  canEdit: boolean;
};

export function CollaborativeEditor({ doc, awareness, canEdit }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline underline-offset-2" } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount.configure({ limit: null }),
      Placeholder.configure({
        placeholder: canEdit
          ? "Start writing, or press / for commands… offline edits sync automatically."
          : "You have view-only access to this document.",
        emptyEditorClass: "before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground/70 before:pointer-events-none",
      }),
      Collaboration.configure({ document: doc }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-8 py-6 leading-relaxed",
        spellcheck: "true",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document content",
      },
    },
    editable: canEdit,
    immediatelyRender: false,
  });

  React.useEffect(() => {
    if (editor) editor.setEditable(canEdit);
  }, [editor, canEdit]);

  return (
    <div className="flex h-full flex-col gap-3">
      <EditorToolbar editor={editor} canEdit={canEdit} />
      <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-background">
        <EditorContent editor={editor} className="h-full overflow-y-auto" />
      </div>
      <EditorStatusBar editor={editor} />
    </div>
  );
}

function EditorStatusBar({ editor }: { editor: Editor | null }) {
  const [stats, setStats] = React.useState({ words: 0, chars: 0 });
  React.useEffect(() => {
    if (!editor) return;
    const update = () => { setStats({ words: editor.storage.characterCount?.words() ?? 0, chars: editor.storage.characterCount?.characters() ?? 0 }); };
    editor.on("update", update);
    update();
    return () => { editor.off("update", update); };
  }, [editor]);

  return (
    <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
      <span>{stats.words} {stats.words === 1 ? "word" : "words"} · {stats.chars} characters</span>
      <span className="hidden sm:inline">Press <kbd className="rounded border px-1">⌘</kbd> + <kbd className="rounded border px-1">Z</kbd> to undo · changes sync via CRDT</span>
    </div>
  );
}
