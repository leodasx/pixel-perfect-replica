import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/PageState";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — CineBook" },
      { name: "description", content: "Manage your CineBook profile details and contact number." },
      { property: "og:title", content: "My Profile — CineBook" },
      { property: "og:description", content: "Manage your CineBook profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setName(data.name);
      setPhone(data.phone ?? "");
    }
  }, [data]);

  if (loading) return <LoadingState label="Loading..." />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">Profile</h1>
        <p className="mt-2 text-muted-foreground">Sign in to view your profile.</p>
        <Button asChild className="mt-5">
          <Link to="/login" search={{ next: "/profile" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, name, phone, email: user.email ?? "" }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error("Could not save your profile.");
    toast.success("Profile saved.");
    void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-4xl tracking-wide">My Profile</h1>
      {isLoading ? (
        <LoadingState label="Loading profile..." />
      ) : (
        <form onSubmit={save} className="cine-panel mt-6 space-y-4 p-6">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>
            Save changes
          </Button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/my-bookings">My Bookings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/watchlist">Watchlist</Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="secondary">
            <Link to="/admin">Admin Dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
