import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Clapperboard, MapPin, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/movies", search: { q: query || undefined } });
    setOpen(false);
  };

  const navLinks = (
    <>
      <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Home
      </Link>
      <Link
        to="/movies"
        search={{ q: undefined }}
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Movies
      </Link>
      <Link
        to="/my-bookings"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        My Bookings
      </Link>
    </>
  );

  return (
    <header className="no-print sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Clapperboard className="h-6 w-6 text-primary" />
          <span className="font-display text-2xl leading-none tracking-wide">CineBook</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">{navLinks}</nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for movies, theatres, or events"
              className="pl-9"
              aria-label="Search movies"
            />
          </div>
        </form>

        <div className="hidden items-center gap-1 rounded-md border border-border px-2 py-1 text-sm text-muted-foreground lg:flex">
          <MapPin className="h-4 w-4 text-accent" />
          Kochi
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="hidden md:inline-flex">
                {user.email?.split("@")[0]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/my-bookings">My Bookings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/watchlist">Watchlist</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">Admin Dashboard</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/login" search={{ next: undefined }}>
              Sign in
            </Link>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <form onSubmit={submitSearch} className="mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies"
              aria-label="Search movies"
            />
          </form>
          <div className="flex flex-col gap-3" onClick={() => setOpen(false)}>
            {navLinks}
            {user ? (
              <>
                <Link to="/profile" className="text-sm text-muted-foreground">
                  Profile
                </Link>
                <Link to="/watchlist" className="text-sm text-muted-foreground">
                  Watchlist
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-sm text-muted-foreground">
                    Admin Dashboard
                  </Link>
                )}
                <button
                  className="text-left text-sm text-primary"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" search={{ next: undefined }} className="text-sm text-primary">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
