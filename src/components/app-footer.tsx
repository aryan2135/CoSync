import Link from "next/link";
import { Github, Linkedin, FileText } from "lucide-react";

/**
 * Sticky application footer.
 * Replace "Your Name", GitHub, and LinkedIn URLs with your real details.
 */
export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">CoSync</span> · Local-First Collaborative Editor
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Built by <span className="font-medium text-foreground">Aryan Dongre</span>
          </span>
          <Link
            href="https://github.com/aryan2135"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label="GitHub profile"
          >
            <Github className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          <Link
            href="https://www.linkedin.com/in/aryan-dongre-29b858313/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label="LinkedIn profile"
          >
            <Linkedin className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">LinkedIn</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
