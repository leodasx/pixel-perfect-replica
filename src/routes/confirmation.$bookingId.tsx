import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { formatINR, formatShowDate, formatShowTime } from "@/lib/booking";

export const Route = createFileRoute("/confirmation/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking Confirmed — CineBook" },
      {
        name: "description",
        content: "Your CineBook tickets are confirmed. View your booking reference and seats.",
      },
      { property: "og:title", content: "Booking Confirmed — CineBook" },
      { property: "og:description", content: "Your CineBook tickets are confirmed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const { bookingId } = Route.useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_id, total_amount, payment_status, booking_status, created_at, show:shows(show_date, show_time, movie:movies(title, poster), theatre:theatres(name, location)), booking_seats(price, seat:seats(seat_number))",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <LoadingState label="Loading your ticket..." />;
  if (isError) return <ErrorState label="Unable to load this booking." />;
  if (!data) return <EmptyState label="Booking not found." />;

  const seatNumbers = (data.booking_seats ?? [])
    .map((bs) => bs.seat?.seat_number)
    .filter(Boolean)
    .sort()
    .join(", ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-3 font-display text-4xl tracking-wide">Booking Confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Show this ticket at the theatre entrance.
        </p>
      </div>

      <div className="cine-panel mt-8 overflow-hidden">
        <div className="flex gap-4 border-b border-dashed border-border p-5">
          <img
            src={data.show?.movie?.poster}
            alt={`${data.show?.movie?.title} poster`}
            className="h-36 w-24 rounded-lg object-cover"
          />
          <div className="space-y-1 text-sm">
            <h2 className="font-display text-2xl tracking-wide">{data.show?.movie?.title}</h2>
            <p className="text-muted-foreground">
              {data.show?.theatre?.name} · {data.show?.theatre?.location}
            </p>
            <p className="text-accent">
              {data.show && formatShowDate(data.show.show_date)} ·{" "}
              {data.show && formatShowTime(data.show.show_time)}
            </p>
            <p className="text-muted-foreground">
              Seats: <span className="text-foreground">{seatNumbers}</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
          <div>
            <dt className="text-muted-foreground">Booking ID</dt>
            <dd className="font-mono text-base text-accent">{data.booking_id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total paid</dt>
            <dd className="text-base">{formatINR(Number(data.total_amount))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="capitalize">{data.payment_status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{data.booking_status}</dd>
          </div>
        </dl>
      </div>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" /> Download Ticket
        </Button>
        <Button asChild variant="outline">
          <Link to="/my-bookings">My Bookings</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
