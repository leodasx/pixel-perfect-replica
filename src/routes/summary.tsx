import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import {
  COUPON_CODE,
  COUPON_VALUE,
  computeTotals,
  formatINR,
  formatShowDate,
  formatShowTime,
  parseSeatIds,
} from "@/lib/booking";

type SummarySearch = { show: string; seats: string };

export const Route = createFileRoute("/summary")({
  validateSearch: (search: Record<string, unknown>): SummarySearch => ({
    show: String(search['show'] ?? ""),
    seats: String(search['seats'] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Booking Summary — CineBook" },
      {
        name: "description",
        content: "Review your movie, seats and price breakdown, apply a coupon, then pay.",
      },
      { property: "og:title", content: "Booking Summary — CineBook" },
      { property: "og:description", content: "Review your seats and price breakdown before paying." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const { show: showId, seats } = Route.useSearch();
  const seatIds = parseSeatIds(seats);
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const query = useQuery({
    queryKey: ["summary", showId, seats],
    queryFn: async () => {
      const [showRes, seatRes] = await Promise.all([
        supabase
          .from("shows")
          .select(
            "id, show_date, show_time, movie:movies(id, title, poster), theatre:theatres(name, location)",
          )
          .eq("id", showId)
          .maybeSingle(),
        supabase
          .from("seats")
          .select("id, seat_number, price, status")
          .in("id", seatIds)
          .eq("show_id", showId),
      ]);
      if (showRes.error) throw showRes.error;
      if (seatRes.error) throw seatRes.error;
      return { show: showRes.data, seats: seatRes.data };
    },
  });

  if (query.isLoading) return <LoadingState label="Loading booking summary..." />;
  if (query.isError) return <ErrorState label="Unable to load your booking summary." />;
  if (!query.data?.show || query.data.seats.length !== seatIds.length)
    return <EmptyState label="Show is no longer available." />;

  const { show, seats: seatRows } = query.data;
  const totals = computeTotals(
    seatRows.map((s) => Number(s.price)),
    discount,
  );

  const applyCoupon = () => {
    if (discount > 0) {
      toast.error("Coupon already applied.");
      return;
    }
    if (coupon.trim().toUpperCase() === COUPON_CODE) {
      setDiscount(COUPON_VALUE);
      toast.success(`Coupon applied! ${formatINR(COUPON_VALUE)} discount.`);
    } else {
      toast.error("Invalid coupon.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-wide">Booking Summary</h1>

      <div className="cine-panel mt-6 flex gap-4 p-5">
        <img
          src={show.movie?.poster}
          alt={`${show.movie?.title} poster`}
          className="h-40 w-28 rounded-lg object-cover"
        />
        <div className="space-y-1 text-sm">
          <h2 className="font-display text-2xl tracking-wide">{show.movie?.title}</h2>
          <p className="text-muted-foreground">
            {show.theatre?.name} · {show.theatre?.location}
          </p>
          <p className="text-accent">
            {formatShowDate(show.show_date)} · {formatShowTime(show.show_time)}
          </p>
          <p className="text-muted-foreground">
            Seats:{" "}
            <span className="text-foreground">
              {seatRows
                .map((s) => s.seat_number)
                .sort()
                .join(", ")}
            </span>
          </p>
        </div>
      </div>

      <div className="cine-panel mt-5 space-y-3 p-5 text-sm">
        <Row label={`Tickets (${seatRows.length})`} value={formatINR(totals.tickets)} />
        <Row label="Convenience fee" value={formatINR(totals.fee)} />
        <Row label="GST (5%)" value={formatINR(totals.gst)} />
        {totals.discount > 0 && (
          <Row label="Coupon discount" value={`- ${formatINR(totals.discount)}`} />
        )}
        <div className="border-t border-border pt-3">
          <Row
            label={<span className="font-display text-xl">Total</span>}
            value={<span className="font-display text-xl text-accent">{formatINR(totals.total)}</span>}
          />
        </div>
      </div>

      <div className="cine-panel mt-5 flex flex-wrap items-center gap-3 p-5">
        <Input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          placeholder="Have a coupon? Try CINE50"
          className="max-w-xs"
          aria-label="Coupon code"
          disabled={discount > 0}
        />
        <Button variant="secondary" onClick={applyCoupon} disabled={discount > 0}>
          Apply
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          size="lg"
          onClick={() =>
            navigate({
              to: "/payment",
              search: { show: showId, seats, discount: totals.discount },
            })
          }
        >
          Proceed to Pay {formatINR(totals.total)}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/book/$showId" params={{ showId }}>
            Change seats
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
