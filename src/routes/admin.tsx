import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/PageState";
import { formatINR, formatShowDate, formatShowTime } from "@/lib/booking";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — CineBook" },
      { name: "description", content: "Manage movies, theatres, shows and bookings on CineBook." },
      { property: "og:title", content: "Admin Dashboard — CineBook" },
      { property: "og:description", content: "Manage movies, theatres, shows and bookings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const emptyMovie = {
  id: "",
  title: "",
  description: "",
  genre: "",
  duration: 120,
  rating: 7,
  poster: "",
  language: "English",
  release_date: "",
  trailer_url: "",
};

function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const movies = useQuery({
    queryKey: ["admin-movies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const theatres = useQuery({
    queryKey: ["admin-theatres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("theatres").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const shows = useQuery({
    queryKey: ["admin-shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("id, show_date, show_time, movie:movies(title), theatre:theatres(name)")
        .gte("show_date", new Date().toISOString().slice(0, 10))
        .order("show_date")
        .order("show_time")
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_id, total_amount, payment_status, booking_status, created_at, show:shows(show_date, show_time, movie:movies(title), theatre:theatres(name)), booking_seats(seat:seats(seat_number))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = (keys: string[]) =>
    keys.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));

  if (loading) return <LoadingState label="Loading..." />;

  if (!user) {
    return (
      <Gate title="Admin Dashboard" message="Sign in with an admin account to continue.">
        <Button asChild>
          <Link to="/login" search={{ next: "/admin" }}>
            Sign in
          </Link>
        </Button>
      </Gate>
    );
  }

  if (!isAdmin) {
    return (
      <Gate
        title="Admins only"
        message="This account does not have admin access. If no admin exists yet, you can claim it."
      >
        <Button
          onClick={async () => {
            const { data, error } = await supabase.rpc("claim_admin");
            if (error || data === false) {
              toast.error("An admin already exists. Ask them for access.");
              return;
            }
            toast.success("You are now an admin. Reloading...");
            setTimeout(() => window.location.reload(), 900);
          }}
        >
          Claim admin access
        </Button>
      </Gate>
    );
  }

  const revenue = (bookings.data ?? [])
    .filter((b) => b.payment_status === "paid" && b.booking_status === "confirmed")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">Admin Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Movies" value={movies.data?.length ?? 0} />
        <Stat label="Theatres" value={theatres.data?.length ?? 0} />
        <Stat label="Shows" value={shows.data?.length ?? 0} />
        <Stat label="Bookings" value={bookings.data?.length ?? 0} />
        <Stat label="Revenue" value={formatINR(revenue)} />
      </div>

      <Tabs defaultValue="movies" className="mt-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="theatres">Theatres</TabsTrigger>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        {/* MOVIES */}
        <TabsContent value="movies" className="mt-4 space-y-3">
          <MovieDialog
            onSaved={() => invalidate(["admin-movies", "movies"])}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add movie
              </Button>
            }
          />
          {movies.data?.map((m) => (
            <div key={m.id} className="cine-panel flex items-center gap-4 p-3">
              <img src={m.poster} alt="" className="h-16 w-11 rounded object-cover" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{m.title}</p>
                <p className="text-muted-foreground">
                  {m.genre} · {m.duration} min · {m.language}
                </p>
              </div>
              <MovieDialog
                movie={m}
                onSaved={() => invalidate(["admin-movies", "movies"])}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Edit movie">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete movie"
                onClick={async () => {
                  const { error } = await supabase.from("movies").delete().eq("id", m.id);
                  if (error) {
            toast.error("Could not delete this movie.");
            return;
          }
                  toast.success("Movie deleted.");
                  invalidate(["admin-movies", "movies", "admin-shows"]);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* THEATRES */}
        <TabsContent value="theatres" className="mt-4 space-y-3">
          <TheatreDialog
            onSaved={() => invalidate(["admin-theatres"])}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add theatre
              </Button>
            }
          />
          {theatres.data?.map((t) => (
            <div key={t.id} className="cine-panel flex items-center gap-4 p-3 text-sm">
              <div className="flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-muted-foreground">
                  {t.location} · {t.amenity}
                </p>
              </div>
              <TheatreDialog
                theatre={t}
                onSaved={() => invalidate(["admin-theatres"])}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Edit theatre">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete theatre"
                onClick={async () => {
                  const { error } = await supabase.from("theatres").delete().eq("id", t.id);
                  if (error) {
            toast.error("Could not delete this theatre.");
            return;
          }
                  toast.success("Theatre deleted.");
                  invalidate(["admin-theatres", "admin-shows"]);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* SHOWS */}
        <TabsContent value="shows" className="mt-4 space-y-3">
          <ShowDialog
            movies={movies.data ?? []}
            theatres={theatres.data ?? []}
            onSaved={() => invalidate(["admin-shows", "shows"])}
          />
          {shows.data?.map((s) => (
            <ShowRow
              key={s.id}
              show={s}
              onDeleted={() => invalidate(["admin-shows", "shows"])}
            />
          ))}
        </TabsContent>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-4 space-y-3">
          {bookings.isLoading && <LoadingState label="Loading bookings..." />}
          {bookings.data?.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No bookings yet.</p>
          )}
          {bookings.data?.map((b) => (
            <div key={b.id} className="cine-panel p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono text-xs text-accent">{b.booking_id}</span>
                <span>{formatINR(Number(b.total_amount))}</span>
              </div>
              <p className="mt-1 font-medium">{b.show?.movie?.title}</p>
              <p className="text-muted-foreground">
                {b.show?.theatre?.name} · {b.show && formatShowDate(b.show.show_date)} ·{" "}
                {b.show && formatShowTime(b.show.show_time)}
              </p>
              <p className="text-muted-foreground">
                Seats:{" "}
                {(b.booking_seats ?? [])
                  .map((bs) => bs.seat?.seat_number)
                  .filter(Boolean)
                  .sort()
                  .join(", ")}
              </p>
              <p className="capitalize text-muted-foreground">
                {b.payment_status} · {b.booking_status}
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Gate({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-3xl tracking-wide">{title}</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <div className="mt-5 flex justify-center">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="cine-panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-3xl text-accent">{value}</p>
    </div>
  );
}

type MovieRow = Omit<typeof emptyMovie, "release_date" | "trailer_url"> & {
  release_date: string | null;
  trailer_url: string | null;
};

function MovieDialog({
  movie,
  trigger,
  onSaved,
}: {
  movie?: Partial<MovieRow>;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyMovie, ...movie });

  const save = async () => {
    const payload = {
      title: form.title,
      description: form.description,
      genre: form.genre,
      duration: Number(form.duration),
      rating: Number(form.rating),
      poster: form.poster,
      language: form.language,
      release_date: form.release_date || null,
      trailer_url: form.trailer_url || null,
    };
    const res = movie?.id
      ? await supabase.from("movies").update(payload).eq("id", movie.id)
      : await supabase.from("movies").insert(payload);
    if (res.error) {
            toast.error("Could not save the movie.");
            return;
          }
    toast.success("Movie saved.");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{movie?.id ? "Edit movie" : "Add movie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Genre">
            <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (min)">
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </Field>
            <Field label="Rating">
              <Input
                type="number"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Poster URL">
            <Input
              value={form.poster}
              onChange={(e) => setForm({ ...form, poster: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language">
              <Input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </Field>
            <Field label="Release date">
              <Input
                type="date"
                value={form.release_date ?? ""}
                onChange={(e) => setForm({ ...form, release_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Trailer URL">
            <Input
              value={form.trailer_url ?? ""}
              onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TheatreDialog({
  theatre,
  trigger,
  onSaved,
}: {
  theatre?: { id: string; name: string; location: string; amenity: string };
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: theatre?.name ?? "",
    location: theatre?.location ?? "",
    amenity: theatre?.amenity ?? "",
  });

  const save = async () => {
    const res = theatre?.id
      ? await supabase.from("theatres").update(form).eq("id", theatre.id)
      : await supabase.from("theatres").insert(form);
    if (res.error) {
            toast.error("Could not save the theatre.");
            return;
          }
    toast.success("Theatre saved.");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{theatre?.id ? "Edit theatre" : "Add theatre"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label="Amenity">
            <Input
              value={form.amenity}
              onChange={(e) => setForm({ ...form, amenity: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShowDialog({
  movies,
  theatres,
  onSaved,
}: {
  movies: { id: string; title: string }[];
  theatres: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ movie_id: "", theatre_id: "", show_date: "", show_time: "" });

  const save = async () => {
    if (!form.movie_id || !form.theatre_id || !form.show_date || !form.show_time) {
      toast.error("Please fill in every field.");
      return;
    }
    const { error } = await supabase.from("shows").insert(form);
    if (error) {
            toast.error("Could not create this show. It may already exist.");
            return;
          }
    toast.success("Show created with a fresh set of seats.");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create show
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create show</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Movie">
            <Select
              value={form.movie_id}
              onValueChange={(v) => setForm({ ...form, movie_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a movie" />
              </SelectTrigger>
              <SelectContent>
                {movies.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Theatre">
            <Select
              value={form.theatre_id}
              onValueChange={(v) => setForm({ ...form, theatre_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a theatre" />
              </SelectTrigger>
              <SelectContent>
                {theatres.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input
                type="date"
                value={form.show_date}
                onChange={(e) => setForm({ ...form, show_date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={form.show_time}
                onChange={(e) => setForm({ ...form, show_time: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShowRow({
  show,
  onDeleted,
}: {
  show: {
    id: string;
    show_date: string;
    show_time: string;
    movie: { title: string } | null;
    theatre: { name: string } | null;
  };
  onDeleted: () => void;
}) {
  const seatStats = useQuery({
    queryKey: ["seat-stats", show.id],
    queryFn: async () => {
      const [total, booked] = await Promise.all([
        supabase.from("seats").select("id", { count: "exact", head: true }).eq("show_id", show.id),
        supabase
          .from("seats")
          .select("id", { count: "exact", head: true })
          .eq("show_id", show.id)
          .eq("status", "booked"),
      ]);
      return { total: total.count ?? 0, booked: booked.count ?? 0 };
    },
  });

  return (
    <div className="cine-panel flex items-center gap-4 p-3 text-sm">
      <div className="flex-1">
        <p className="font-medium">{show.movie?.title}</p>
        <p className="text-muted-foreground">
          {show.theatre?.name} · {formatShowDate(show.show_date)} ·{" "}
          {formatShowTime(show.show_time)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {seatStats.data
          ? `${seatStats.data.total - seatStats.data.booked}/${seatStats.data.total} available`
          : "…"}
      </p>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete show"
        onClick={async () => {
          const { error } = await supabase.from("shows").delete().eq("id", show.id);
          if (error) {
            toast.error("Could not delete this show — it may have bookings.");
            return;
          }
          toast.success("Show deleted.");
          onDeleted();
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
