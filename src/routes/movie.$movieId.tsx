import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Star, Clock, Calendar, Play, Heart, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { formatShowDate, formatShowTime } from "@/lib/booking";

export const Route = createFileRoute("/movie/$movieId")({
  head: () => ({
    meta: [
      { title: "Movie Details & Showtimes — CineBook" },
      {
        name: "description",
        content:
          "See the story, runtime and rating, then pick a date, theatre and showtime to book your seats.",
      },
      { property: "og:title", content: "Movie Details & Showtimes — CineBook" },
      {
        property: "og:description",
        content: "Pick a date, theatre and showtime, then choose your seats.",
      },
    ],
  }),
  component: MovieDetails,
});

function MovieDetails() {
  const { movieId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const movieQuery = useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("id", movieId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const showsQuery = useQuery({
    queryKey: ["shows", movieId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("shows")
        .select("id, show_date, show_time, theatre:theatres(id, name, location, amenity)")
        .eq("movie_id", movieId)
        .gte("show_date", today)
        .order("show_date")
        .order("show_time");
      if (error) throw error;
      return data;
    },
  });

  const watchlistQuery = useQuery({
    queryKey: ["watchlist-entry", movieId, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("id")
        .eq("movie_id", movieId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const dates = useMemo(
    () => Array.from(new Set((showsQuery.data ?? []).map((s) => s.show_date))),
    [showsQuery.data],
  );
  const activeDate = selectedDate ?? dates[0] ?? null;

  const theatreGroups = useMemo(() => {
    const rows = (showsQuery.data ?? []).filter((s) => s.show_date === activeDate);
    const map = new Map<
      string,
      {
        name: string;
        location: string;
        amenity: string;
        shows: { id: string; show_time: string }[];
      }
    >();
    for (const row of rows) {
      const t = row.theatre;
      if (!t) continue;
      if (!map.has(t.id)) {
        map.set(t.id, { name: t.name, location: t.location, amenity: t.amenity, shows: [] });
      }
      map.get(t.id)!.shows.push({ id: row.id, show_time: row.show_time });
    }
    return Array.from(map.entries());
  }, [showsQuery.data, activeDate]);

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error("Please sign in to use your watchlist.");
      void navigate({ to: "/login", search: { next: `/movie/${movieId}` } });
      return;
    }
    if (watchlistQuery.data) {
      const { error } = await supabase.from("watchlist").delete().eq("id", watchlistQuery.data.id);
      if (error) {
        toast.error("Could not update watchlist.");
        return;
      }
      toast.success("Removed from watchlist.");
    } else {
      const { error } = await supabase
        .from("watchlist")
        .insert({ user_id: user.id, movie_id: movieId });
      if (error) {
        toast.error("Could not update watchlist.");
        return;
      }
      toast.success("Added to watchlist.");
    }
    void queryClient.invalidateQueries({ queryKey: ["watchlist-entry", movieId, user.id] });
    void queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  };

  if (movieQuery.isLoading) return <LoadingState label="Loading movie..." />;
  if (movieQuery.isError) return <ErrorState label="Unable to load this movie." />;
  if (!movieQuery.data) return <EmptyState label="Movie not found." />;

  const movie = movieQuery.data;

  return (
    <div>
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[280px_1fr]">
          <img
            src={movie.poster}
            alt={`${movie.title} poster`}
            className="w-full max-w-[280px] rounded-xl border border-border object-cover shadow-[var(--shadow-card)]"
          />
          <div>
            <h1 className="font-display text-5xl tracking-wide">{movie.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-accent">
                <Star className="h-4 w-4 fill-current" /> {movie.rating}/10
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {movie.duration} min
              </span>
              <span>{movie.language}</span>
              {movie.release_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {formatShowDate(movie.release_date)}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.genre.split(",").map((g) => (
                <Badge key={g} variant="secondary">
                  {g.trim()}
                </Badge>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-muted-foreground">{movie.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="secondary" disabled={!movie.trailer_url}>
                <a
                  href={movie.trailer_url ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Play className="mr-2 h-4 w-4" /> Watch Trailer
                </a>
              </Button>
              <Button variant={watchlistQuery.data ? "default" : "outline"} onClick={toggleWatchlist}>
                <Heart
                  className={`mr-2 h-4 w-4 ${watchlistQuery.data ? "fill-current" : ""}`}
                />
                {watchlistQuery.data ? "In Watchlist" : "Add to Watchlist"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="font-display text-3xl tracking-wide">Book Your Tickets</h2>

        {showsQuery.isLoading && <LoadingState label="Loading showtimes..." />}
        {showsQuery.isError && <ErrorState label="Unable to load showtimes." />}
        {showsQuery.data && dates.length === 0 && (
          <EmptyState label="No upcoming shows for this movie." />
        )}

        {dates.length > 0 && (
          <>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              {dates.map((date) => {
                const active = date === activeDate;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`min-w-24 rounded-lg border px-4 py-2 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    }`}
                  >
                    {formatShowDate(date)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-4">
              {theatreGroups.map(([theatreId, group]) => (
                <div key={theatreId} className="cine-panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-2xl tracking-wide">{group.name}</h3>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {group.location}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-accent">
                      {group.amenity}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {group.shows.map((show) => (
                      <Button
                        key={show.id}
                        variant="outline"
                        onClick={() => navigate({ to: "/book/$showId", params: { showId: show.id } })}
                      >
                        {formatShowTime(show.show_time)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
