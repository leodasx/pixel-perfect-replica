import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/MovieCard";
import { LoadingState, ErrorState } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cinema.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CineBook — Book Movie Tickets in Kochi" },
      {
        name: "description",
        content:
          "Now showing in Kochi: browse films, compare showtimes at PVR, Cinepolis and Vanitha Vineetha, and book your seats in seconds.",
      },
      { property: "og:title", content: "CineBook — Book Movie Tickets in Kochi" },
      {
        property: "og:description",
        content: "Now showing in Kochi. Pick a film, a showtime and your seats.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, genre, poster, rating, duration, language")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="relative isolate">
        <img
          src={heroImage}
          alt="Dark cinema auditorium with a glowing screen"
          width={1920}
          height={1088}
          className="h-[62vh] min-h-[380px] w-full object-cover"
        />
        <div className="cine-hero-overlay absolute inset-0" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-10">
            <p className="mb-2 flex items-center gap-2 text-sm text-accent">
              <MapPin className="h-4 w-4" /> Kochi, Kerala
            </p>
            <h1 className="max-w-2xl font-display text-5xl leading-none sm:text-7xl">
              Your seat is waiting at the movies
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Real showtimes, live seat availability and instant confirmation across the city's
              best screens.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/movies" search={{ q: undefined }}>
                <Ticket className="mr-2 h-5 w-5" /> Book tickets
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl tracking-wide">Now Showing</h2>
          <Link
            to="/movies"
            search={{ q: undefined }}
            className="text-sm text-primary hover:underline"
          >
            See all
          </Link>
        </div>

        {isLoading && <LoadingState label="Loading movies..." />}
        {isError && <ErrorState label="Unable to load movies." />}
        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
