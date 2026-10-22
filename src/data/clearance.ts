/**
 * Which patients are "cleared" to be seen.
 *
 * - Private Self-Pay: payment cleared, either online with Paystack or at the
 *   cashdesk.
 * - HMO and Company: approved at the HMO approval desk. Older HMO records
 *   were cleared without an approval status (payment "Cleared", HMO status
 *   "N/A"); those count as approved too.
 *
 * Cancelled, archived, declined and unpaid online holds are never cleared.
 */

export type ClearanceKind = "online" | "cashdesk" | "hmo" | "company";

export interface Clearance {
  kind: ClearanceKind;
  label: string;   // short, e.g. "Paid online"
  detail: string;  // e.g. "₦15,000 · Paystack ISALU-…", "Auth A-123"
}

const lower = (v: unknown) => String(v ?? "").trim().toLowerCase();

export const CLEARANCE_LABELS: Record<ClearanceKind, string> = {
  online: "Paid online",
  cashdesk: "Paid at cashdesk",
  hmo: "HMO approved",
  company: "Company approved",
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export const isCompanyBookingRecord = (b: any) => lower(b?.paymentType ?? b?.payment_type).includes("company");
export const isHmoBookingRecord = (b: any) => {
  const pay = lower(b?.paymentType ?? b?.payment_type);
  return pay.includes("hmo") || pay.includes("insurance");
};

export function clearanceOf(b: any): Clearance | null {
  if (!b) return null;
  if (b.isActive === false || b.is_active === false) return null;
  const status = lower(b.status);
  if (["cancelled", "canceled", "disabled", "awaiting payment", "payment expired"].includes(status)) return null;
  const pay = lower(b.paymentStatus ?? b.payment_status);
  const hmo = lower(b.hmoStatus ?? b.hmo_status);
  if (hmo === "declined") return null;

  const company = isCompanyBookingRecord(b);
  if (company || isHmoBookingRecord(b)) {
    if (hmo === "approved" || pay === "cleared") {
      const auth = String(b.hmoAuthCode ?? b.hmo_auth_code ?? "").trim();
      const sponsor = String(b.companyName || b.hmoName || b.hmo_name || "").trim();
      return {
        kind: company ? "company" : "hmo",
        label: company ? CLEARANCE_LABELS.company : CLEARANCE_LABELS.hmo,
        detail: [sponsor, auth ? `Auth ${auth}` : ""].filter(Boolean).join(" · "),
      };
    }
    return null;
  }

  if (["cleared", "paid", "settled"].includes(pay)) {
    const method = lower(b.paymentMethod ?? b.payment_method);
    const reference = String(b.paymentReference ?? b.payment_reference ?? "").trim();
    const amount = Number(b.amountPaid ?? b.amount_paid ?? 0);
    const online = method.includes("paystack") || method.includes("online") || (amount > 0 && reference !== "");
    if (online) {
      return { kind: "online", label: CLEARANCE_LABELS.online, detail: [amount > 0 ? naira(amount) : "", reference ? `Paystack ${reference}` : ""].filter(Boolean).join(" · ") };
    }
    const invoice = String(b.invoiceRef ?? b.invoice_ref ?? "").trim();
    return { kind: "cashdesk", label: CLEARANCE_LABELS.cashdesk, detail: [String(b.paymentMethod ?? b.payment_method ?? "").trim(), invoice ? `Invoice ${invoice}` : ""].filter(Boolean).join(" · ") };
  }
  return null;
}

export const isClearedBooking = (b: any) => clearanceOf(b) !== null;
