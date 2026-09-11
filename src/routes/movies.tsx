import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/MovieCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { Input } from "@/components/ui/input";

type MovieSearch = { q: string | undefined };

export const Route = createFileRoute("/movies")({
  validateSearch: (search: Record<string, unknown>): MovieSearch => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All Movies — CineBook Kochi" },
      {
        name: "description",
        content: "Search every film now showing in Kochi by title, genre or language on CineBook.",
      },
      { property: "og:title", content: "All Movies — CineBook Kochi" },
      {
        property: "og:description",
        content: "Search films now showing in Kochi by title, genre or language.",
      },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/movies" });
  const [term, setTerm] = useState(q ?? "");

  useEffect(() => {
    setTerm(q ?? "");
  }, [q]);

  useEffect(() => {
    const id = setTimeout(() => {
      if ((term || undefined) !== q) {
        void navigate({ search: { q: term || undefined }, replace: true });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [term, q, navigate]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["movies", q ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("movies")
        .select("id, title, genre, poster, rating, duration, language")
        .order("title");
      if (q) {
        const like = `%${q}%`;
        query = query.or(`title.ilike.${like},genre.ilike.${like},language.ilike.${like}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">Movies in Kochi</h1>
      <div className="relative mt-5 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by title, genre or language"
          className="pl-9"
          aria-label="Search movies"
        />
      </div>

      <div className="mt-8">
        {isLoading && <LoadingState label="Loading movies..." />}
        {isError && <ErrorState label="Unable to load movies." />}
        {data && data.length === 0 && <EmptyState label="No movies found." />}
        {data && data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
