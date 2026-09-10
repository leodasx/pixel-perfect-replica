import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { formatINR, formatShowDate, formatShowTime } from "@/lib/booking";

export const Route = createFileRoute("/booking/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking Details — CineBook" },
      { name: "description", content: "Full details of your CineBook ticket booking." },
      { property: "og:title", content: "Booking Details — CineBook" },
      { property: "og:description", content: "Full details of your CineBook ticket booking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingDetails,
});

function BookingDetails() {
  const { bookingId } = Route.useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_id, total_amount, payment_status, booking_status, created_at, show:shows(show_date, show_time, movie:movies(title, poster), theatre:theatres(name, location)), booking_seats(price, seat:seats(seat_number, seat_type))",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <LoadingState label="Loading booking..." />;
  if (isError) return <ErrorState label="Unable to load this booking." />;
  if (!data) return <EmptyState label="Booking not found." />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">Booking Details</h1>

      <div className="cine-panel mt-6 p-5">
        <div className="flex gap-4">
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
            <p className="font-mono text-xs text-muted-foreground">{data.booking_id}</p>
          </div>
        </div>

        <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          {(data.booking_seats ?? []).map((bs, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-muted-foreground">
                Seat {bs.seat?.seat_number} · {bs.seat?.seat_type}
              </span>
              <span>{formatINR(Number(bs.price))}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-border pt-3 font-display text-xl">
            <span>Total paid</span>
            <span className="text-accent">{formatINR(Number(data.total_amount))}</span>
          </li>
        </ul>

        <div className="mt-4 flex gap-4 text-sm capitalize text-muted-foreground">
          <span>Payment: {data.payment_status}</span>
          <span>Status: {data.booking_status}</span>
        </div>
      </div>

      <div className="no-print mt-6 flex gap-3">
        <Button onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" /> Download Ticket
        </Button>
        <Button asChild variant="outline">
          <Link to="/my-bookings">Back to My Bookings</Link>
        </Button>
      </div>
    </div>
  );
}
