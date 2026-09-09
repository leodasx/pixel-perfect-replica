export const CONVENIENCE_FEE_PER_TICKET = 25;
export const GST_RATE = 0.05;
export const MAX_SEATS = 8;
export const COUPON_CODE = "CINE50";
export const COUPON_VALUE = 50;

const round2 = (n: number) => Math.round(n * 100) / 100;

export type Totals = {
  tickets: number;
  fee: number;
  gst: number;
  discount: number;
  total: number;
};

export function computeTotals(seatPrices: number[], discount = 0): Totals {
  const tickets = round2(seatPrices.reduce((sum, p) => sum + Number(p), 0));
  const fee = CONVENIENCE_FEE_PER_TICKET * seatPrices.length;
  const gst = round2((tickets + fee) * GST_RATE);
  const safeDiscount = Math.max(discount, 0);
  const total = Math.max(round2(tickets + fee + gst - safeDiscount), 0);
  return { tickets, fee, gst, discount: safeDiscount, total };
}

export function formatINR(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShowDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatShowTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function parseSeatIds(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}
