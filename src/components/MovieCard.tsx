import { Link } from "@tanstack/react-router";
import { Star, Clock } from "lucide-react";

export type MovieCardData = {
  id: string;
  title: string;
  genre: string;
  poster: string;
  rating: number;
  duration: number;
  language: string;
};

export function MovieCard({ movie }: { movie: MovieCardData }) {
  return (
    <Link
      to="/movie/$movieId"
      params={{ movieId: movie.id }}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1 hover:border-primary/60"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={movie.poster}
          alt={`${movie.title} poster`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-semibold text-accent">
          <Star className="h-3 w-3 fill-current" />
          {movie.rating}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate font-display text-lg tracking-wide">{movie.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{movie.genre}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {movie.duration} min · {movie.language}
        </p>
      </div>
    </Link>
  );
}
