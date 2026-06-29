"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Providers } from "@/components/providers";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DocumentDashboard } from "@/components/documents/document-dashboard";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { useUiStore } from "@/stores/ui-store";

function AppShell() {
  const { data: session, status } = useSession();
  const view = useUiStore((s) => s.view);
  const activeDocumentId = useUiStore((s) => s.activeDocumentId);

  // "showAuth" flips true when the visitor clicks a sign-in / get-started CTA
  // on the landing page. Stays false on first visit so they see the landing page.
  const [showAuth, setShowAuth] = React.useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Logged in → app (dashboard or editor).
  if (session) {
    if (view === "editor" && activeDocumentId) {
      return <EditorWorkspace documentId={activeDocumentId} />;
    }
    return <DocumentDashboard />;
  }

  // Logged out + clicked a CTA → auth screen.
  if (showAuth) {
    return <AuthScreen onBack={() => setShowAuth(false)} />;
  }

  // Logged out + first visit → landing page.
  return <LandingPage onAuth={() => setShowAuth(true)} />;
}

export default function HomePage() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}
