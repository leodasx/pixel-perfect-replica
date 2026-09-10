import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginSearch = { next?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const next = typeof search['next'] === "string" ? search['next'] : undefined;
    return { next: next && next.startsWith("/") ? next : undefined };
  },
  head: () => ({
    meta: [
      { title: "Sign In — CineBook" },
      { name: "description", content: "Sign in to CineBook to book tickets and view your bookings." },
      { property: "og:title", content: "Sign In — CineBook" },
      { property: "og:description", content: "Sign in to book tickets and view your bookings." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) window.location.replace(next ?? "/");
  }, [user, next]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    void navigate({ to: next ?? "/" });
  };

  const googleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: next ?? "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-wide">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Book tickets and track your bookings.</p>

      <form onSubmit={signIn} className="cine-panel mt-6 space-y-4 p-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={googleSignIn}>
          Continue with Google
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        New to CineBook?{" "}
        <Link to="/signup" search={{ next }} className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
