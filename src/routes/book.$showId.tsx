import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { formatINR, formatShowDate, formatShowTime, MAX_SEATS } from "@/lib/booking";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

export const Route = createFileRoute("/book/$showId")({
  head: () => ({
    meta: [
      { title: "Select Your Seats — CineBook" },
      {
        name: "description",
        content:
          "Pick from live seat availability for your show. Premium and standard seats, up to eight per booking.",
      },
      { property: "og:title", content: "Select Your Seats — CineBook" },
      { property: "og:description", content: "Live seat availability for your chosen show." },
    ],
  }),
  component: SeatSelection,
});

function SeatSelection() {
  const { showId } = Route.useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);

  const showQuery = useQuery({
    queryKey: ["show", showId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select(
          "id, show_date, show_time, movie:movies(id, title, poster), theatre:theatres(id, name, location)",
        )
        .eq("id", showId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const seatsQuery = useQuery({
    queryKey: ["seats", showId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number, seat_type, price, status")
        .eq("show_id", showId);
      if (error) throw error;
      return data;
    },
  });

  const seatMap = useMemo(() => {
    const map = new Map<string, (typeof seats)[number]>();
    const seats = seatsQuery.data ?? [];
    for (const s of seats) map.set(s.seat_number, s);
    return map;
  }, [seatsQuery.data]);

  const selectedSeats = useMemo(
    () => (seatsQuery.data ?? []).filter((s) => selected.includes(s.id)),
    [seatsQuery.data, selected],
  );
  const subtotal = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);

  const toggleSeat = (seatId: string, status: string) => {
    if (status === "booked") return;
    setSelected((prev) => {
      if (prev.includes(seatId)) return prev.filter((id) => id !== seatId);
      if (prev.length >= MAX_SEATS) {
        toast.error(`You can select up to ${MAX_SEATS} seats.`);
        return prev;
      }
      return [...prev, seatId];
    });
  };

  if (showQuery.isLoading || seatsQuery.isLoading) return <LoadingState label="Loading seats..." />;
  if (showQuery.isError || seatsQuery.isError) return <ErrorState label="Unable to load seats." />;
  if (!showQuery.data) return <EmptyState label="Show is no longer available." />;

  const show = showQuery.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32">
      <div className="cine-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide">{show.movie?.title}</h1>
          <p className="text-sm text-muted-foreground">
            {show.theatre?.name} · {show.theatre?.location}
          </p>
        </div>
        <p className="text-sm text-accent">
          {formatShowDate(show.show_date)} · {formatShowTime(show.show_time)}
        </p>
      </div>

      <div className="mt-8">
        <div className="cine-screen mx-auto h-6 w-3/4 rounded-t-[100%]" />
        <p className="mb-8 text-center text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Screen this way
        </p>

        <div className="overflow-x-auto pb-2">
          <div className="mx-auto w-max space-y-2">
            {ROWS.map((row) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground">{row}</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                    const seat = seatMap.get(`${row}${n}`);
                    if (!seat) return <span key={n} className="h-8 w-8" />;
                    const isSelected = selected.includes(seat.id);
                    const booked = seat.status === "booked";
                    const premium = seat.seat_type === "premium";
                    const classes = booked
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-40"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : premium
                          ? "border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground";
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={booked}
                        onClick={() => toggleSeat(seat.id, seat.status)}
                        aria-label={`Seat ${seat.seat_number} ${booked ? "sold" : formatINR(Number(seat.price))}`}
                        className={`h-8 w-8 rounded-md border text-[11px] font-medium transition-colors ${classes} ${
                          n === 7 ? "ml-6" : ""
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
          <Legend className="border-border" label="Available" />
          <Legend className="border-primary bg-primary" label="Selected" />
          <Legend className="border-border bg-muted opacity-40" label="Sold" />
          <Legend className="border-accent/60" label={`Premium ${formatINR(280)}`} />
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="text-sm">
            <p className="font-medium">
              {selectedSeats.length > 0
                ? selectedSeats
                    .map((s) => s.seat_number)
                    .sort()
                    .join(", ")
                : "No seats selected"}
            </p>
            <p className="text-muted-foreground">
              {selectedSeats.length} seat{selectedSeats.length === 1 ? "" : "s"} ·{" "}
              {formatINR(subtotal)}
            </p>
          </div>
          <Button
            size="lg"
            disabled={selectedSeats.length === 0}
            onClick={() => {
              if (selectedSeats.length === 0) {
                toast.error("Please select at least one seat.");
                return;
              }
              void navigate({
                to: "/summary",
                search: { show: showId, seats: selected.join(",") },
              });
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${className}`} />
      {label}
    </span>
  );
}
