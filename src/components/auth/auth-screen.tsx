"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Button>
        )}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><FileText className="h-6 w-6" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">CoSync</h1>
          <p className="mt-1 text-sm text-muted-foreground">Local-first collaborative editor with offline sync & CRDT conflict resolution</p>
        </div>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{mode === "signin" ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>{mode === "signin" ? "Sign in to access your documents" : "Start collaborating in seconds"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4">
                <SignInForm loading={loading} setLoading={setLoading} onSuccess={() => router.refresh()} />
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <SignUpForm loading={loading} setLoading={setLoading} onSuccess={() => { toast.success("Account created. Sign in to continue."); setMode("signin"); }} />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">Your documents are stored locally first, then synced securely.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function SignInForm({ loading, setLoading, onSuccess }: { loading: boolean; setLoading: (b: boolean) => void; onSuccess: () => void }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { toast.error("Invalid email or password"); return; }
    onSuccess();
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in</Button>
    </form>
  );
}

function SignUpForm({ loading, setLoading, onSuccess }: { loading: boolean; setLoading: (b: boolean) => void; onSuccess: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Sign up failed"); return; }
      onSuccess();
    } catch { toast.error("Network error. Please try again."); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Name</Label>
        <Input id="signup-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button>
    </form>
  );
}
