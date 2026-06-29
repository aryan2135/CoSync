"use client";

import { create } from "zustand";

export type View = "dashboard" | "editor";

type UiState = {
  view: View;
  activeDocumentId: string | null;
  editorPanel: "versions" | "ai" | "share" | null;
  openDocument: (id: string) => void;
  closeDocument: () => void;
  setEditorPanel: (panel: UiState["editorPanel"]) => void;
};

export const useUiStore = create<UiState>((set) => ({
  view: "dashboard",
  activeDocumentId: null,
  editorPanel: null,
  openDocument: (id) => set({ view: "editor", activeDocumentId: id, editorPanel: null }),
  closeDocument: () => set({ view: "dashboard", activeDocumentId: null, editorPanel: null }),
  setEditorPanel: (panel) => set({ editorPanel: panel }),
}));
