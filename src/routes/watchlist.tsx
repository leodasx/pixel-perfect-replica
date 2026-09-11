import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/MovieCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "My Watchlist — CineBook" },
      { name: "description", content: "Movies you saved on CineBook to watch later." },
      { property: "og:title", content: "My Watchlist — CineBook" },
      { property: "og:description", content: "Movies you saved to watch later." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["watchlist", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("id, movie:movies(id, title, genre, poster, rating, duration, language)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState label="Loading..." />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">Watchlist</h1>
        <p className="mt-2 text-muted-foreground">Sign in to save movies for later.</p>
        <Button asChild className="mt-5">
          <Link to="/login" search={{ next: "/watchlist" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove from watchlist.");
      return;
    }
    toast.success("Removed from watchlist.");
    void queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    void queryClient.invalidateQueries({ queryKey: ["watchlist-entry"] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">My Watchlist</h1>

      {isLoading && <LoadingState label="Loading watchlist..." />}
      {isError && <ErrorState label="Unable to load your watchlist." />}
      {data && data.length === 0 && <EmptyState label="Your watchlist is empty." />}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {data?.map((entry) =>
          entry.movie ? (
            <div key={entry.id} className="space-y-2">
              <MovieCard movie={entry.movie} />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => remove(entry.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
