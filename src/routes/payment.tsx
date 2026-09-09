import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "@/components/PageState";
import { computeTotals, formatINR, parseSeatIds } from "@/lib/booking";

type PaymentSearch = { show: string; seats: string; discount: number };

export const Route = createFileRoute("/payment")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch => ({
    show: String(search['show'] ?? ""),
    seats: String(search['seats'] ?? ""),
    discount: Number(search['discount'] ?? 0) || 0,
  }),
  head: () => ({
    meta: [
      { title: "Payment — CineBook" },
      {
        name: "description",
        content: "Choose UPI, card, net banking or wallet to complete your CineBook ticket purchase.",
      },
      { property: "og:title", content: "Payment — CineBook" },
      { property: "og:description", content: "Complete your ticket purchase securely." },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { show: showId, seats, discount } = Route.useSearch();
  const seatIds = parseSeatIds(seats);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [bank, setBank] = useState("");
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please sign in to complete your booking.");
      void navigate({
        to: "/login",
        search: { next: `/payment?show=${showId}&seats=${seats}&discount=${discount}` },
      });
    }
  }, [loading, user, navigate, showId, seats, discount]);

  const query = useQuery({
    queryKey: ["payment", showId, seats],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number, price, status")
        .in("id", seatIds)
        .eq("show_id", showId);
      if (error) throw error;
      return data;
    },
  });

  if (loading || query.isLoading) return <LoadingState label="Loading payment details..." />;
  if (query.isError) return <ErrorState label="Unable to load payment details." />;
  if (!query.data || query.data.length !== seatIds.length)
    return <EmptyState label="Show is no longer available." />;

  const totals = computeTotals(
    query.data.map((s) => Number(s.price)),
    discount,
  );

  const validate = () => {
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) {
        toast.error("Enter a valid UPI ID (example: name@bank).");
        return false;
      }
    }
    if (method === "card") {
      if (card.number.replace(/\s/g, "").length < 12) {
        toast.error("Enter a valid card number.");
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
        toast.error("Enter expiry as MM/YY.");
        return false;
      }
      if (!/^\d{3,4}$/.test(card.cvv)) {
        toast.error("Enter a valid CVV.");
        return false;
      }
    }
    if (method === "netbanking" && !bank) {
      toast.error("Please select your bank.");
      return false;
    }
    if (method === "wallet" && !wallet) {
      toast.error("Please select a wallet.");
      return false;
    }
    return true;
  };

  const pay = async () => {
    if (!validate()) return;
    setProcessing(true);
    const toastId = toast.loading("Processing payment...");
    await new Promise((r) => setTimeout(r, 1800));

    const { data, error } = await supabase.rpc("create_booking", {
      p_show_id: showId,
      p_seat_ids: seatIds,
      p_discount: discount,
    });

    setProcessing(false);

    if (error) {
      toast.error(error.message || "Payment failed.", { id: toastId });
      return;
    }

    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking) {
      toast.error("Payment failed.", { id: toastId });
      return;
    }

    toast.success("Payment successful!", { id: toastId });
    void navigate({
      to: "/confirmation/$bookingId",
      params: { bookingId: booking.booking_uuid as string },
    });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-4xl tracking-wide">Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo payment flow — no real money is charged.
        </p>

        <Tabs value={method} onValueChange={setMethod} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="upi">UPI</TabsTrigger>
            <TabsTrigger value="card">Card</TabsTrigger>
            <TabsTrigger value="netbanking">Net Banking</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="upi" className="cine-panel mt-4 space-y-3 p-5">
            <Label htmlFor="upi">UPI ID</Label>
            <Input
              id="upi"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="yourname@okhdfcbank"
            />
          </TabsContent>

          <TabsContent value="card" className="cine-panel mt-4 space-y-3 p-5">
            <div>
              <Label htmlFor="cardnum">Card number</Label>
              <Input
                id="cardnum"
                inputMode="numeric"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="4111 1111 1111 1111"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  placeholder="123"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="netbanking" className="cine-panel mt-4 space-y-3 p-5">
            <Label>Select bank</Label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your bank" />
              </SelectTrigger>
              <SelectContent>
                {["HDFC Bank", "State Bank of India", "ICICI Bank", "Federal Bank", "Axis Bank"].map(
                  (b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="wallet" className="cine-panel mt-4 space-y-3 p-5">
            <Label>Select wallet</Label>
            <Select value={wallet} onValueChange={setWallet}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent>
                {["Paytm", "PhonePe", "Amazon Pay", "Mobikwik"].map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="cine-panel h-max space-y-3 p-5 text-sm">
        <h2 className="font-display text-2xl tracking-wide">Order</h2>
        <div className="flex justify-between text-muted-foreground">
          <span>Tickets ({query.data.length})</span>
          <span>{formatINR(totals.tickets)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Convenience fee</span>
          <span>{formatINR(totals.fee)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>GST (5%)</span>
          <span>{formatINR(totals.gst)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-success">
            <span>Coupon</span>
            <span>- {formatINR(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-3 font-display text-xl">
          <span>Total</span>
          <span className="text-accent">{formatINR(totals.total)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={processing} onClick={pay}>
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing payment...
            </>
          ) : (
            `Pay ${formatINR(totals.total)}`
          )}
        </Button>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Seats are held only once payment succeeds
        </p>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/book/$showId" params={{ showId }}>
            Back to seats
          </Link>
        </Button>
      </aside>
    </div>
  );
}
