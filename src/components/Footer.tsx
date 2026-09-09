import { Clapperboard } from "lucide-react";

export function Footer() {
  return (
    <footer className="no-print mt-16 border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-primary" />
          <span className="font-display text-xl text-foreground">CineBook</span>
        </div>
        <p>Movie ticket booking in Kochi, Kerala · Demo payments only</p>
      </div>
    </footer>
  );
}
