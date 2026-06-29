import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppFooter } from "@/components/app-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoSync — Local-First Collaborative Editor",
  description:
    "A local-first collaborative document editor with offline synchronization, deterministic conflict resolution (CRDTs), and granular version control.",
  keywords: [
    "local-first",
    "collaborative editor",
    "CRDT",
    "Yjs",
    "offline sync",
    "version control",
    "Next.js",
  ],
  authors: [{ name: "CoSync" }],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "CoSync — Local-First Collaborative Editor",
    description:
      "Offline-first document collaboration with deterministic conflict resolution and version history.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1 flex flex-col">{children}</div>
            <AppFooter />
          </div>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
