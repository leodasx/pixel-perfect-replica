import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { formatINR, formatShowDate, formatShowTime } from "@/lib/booking";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — CineBook" },
      {
        name: "description",
        content: "Every CineBook ticket you have booked, newest first, with seats and totals.",
      },
      { property: "og:title", content: "My Bookings — CineBook" },
      { property: "og:description", content: "Your CineBook ticket history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const { user, loading } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_id, total_amount, payment_status, booking_status, created_at, show:shows(show_date, show_time, movie:movies(title, poster), theatre:theatres(name, location)), booking_seats(seat:seats(seat_number))",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState label="Loading..." />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">My Bookings</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see your tickets.</p>
        <Button asChild className="mt-5">
          <Link to="/login" search={{ next: "/my-bookings" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">My Bookings</h1>

      {isLoading && <LoadingState label="Loading bookings..." />}
      {isError && <ErrorState label="Unable to load your bookings." />}
      {data && data.length === 0 && <EmptyState label="You have no bookings yet." />}

      <div className="mt-6 space-y-4">
        {data?.map((b) => (
          <Link
            key={b.id}
            to="/booking/$bookingId"
            params={{ bookingId: b.id }}
            className="cine-panel flex gap-4 p-4 transition-colors hover:border-primary/60"
          >
            <img
              src={b.show?.movie?.poster}
              alt={`${b.show?.movie?.title} poster`}
              loading="lazy"
              className="h-32 w-22 w-[88px] rounded-lg object-cover"
            />
            <div className="flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl tracking-wide">{b.show?.movie?.title}</h2>
                <Badge variant="outline" className="capitalize">
                  {b.booking_status}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {b.payment_status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {b.show?.theatre?.name} · {b.show?.theatre?.location}
              </p>
              <p className="text-accent">
                {b.show && formatShowDate(b.show.show_date)} ·{" "}
                {b.show && formatShowTime(b.show.show_time)}
              </p>
              <p className="text-muted-foreground">
                Seats:{" "}
                <span className="text-foreground">
                  {(b.booking_seats ?? [])
                    .map((bs) => bs.seat?.seat_number)
                    .filter(Boolean)
                    .sort()
                    .join(", ")}
                </span>
              </p>
              <p className="flex flex-wrap gap-3">
                <span className="font-mono text-xs text-muted-foreground">{b.booking_id}</span>
                <span>{formatINR(Number(b.total_amount))}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
