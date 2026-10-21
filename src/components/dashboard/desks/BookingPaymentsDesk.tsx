import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, Download, Landmark, Loader2, Receipt, RefreshCw, Search, Wallet, XCircle } from "lucide-react";
import { getPaymentReportAPI } from "../../../api/client";
import { localISODate } from "../../DateRangeFilter";

/**
 * Booking Payments: every online booking payment and every Paystack payout,
 * read live from the Paystack API and matched to the booking it paid for.
 */

type Tab = "days" | "payouts" | "payments";

const naira = (n: number) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shift = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return localISODate(d);
};

const dayLabel = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";

const timeLabel = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  processing: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  reversed: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  abandoned: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  success: "Paid", failed: "Failed", abandoned: "Not completed", reversed: "Reversed", pending: "Pending", ongoing: "In progress",
};
const PAYOUT_STATUS_LABEL: Record<string, string> = {
  success: "Paid out", processing: "Processing", pending: "Pending", failed: "Failed",
};

const Pill = ({ status, label }: { status: string; label: string }) => (
  <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-black whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE.abandoned}`}>{label}</span>
);

const csvCell = (v: any) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (name: string, header: string[], rows: any[][]) => {
  const text = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const PAGE_SIZE = 25;

export default function BookingPaymentsDesk({ isDarkMode }: { isDarkMode: boolean }) {
  const [from, setFrom] = useState(shift(-29));
  const [to, setTo] = useState(shift(0));
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("days");
  const [hideEmptyDays, setHideEmptyDays] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [payoutFilter, setPayoutFilter] = useState<number | string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (f: string, t: string, refresh = false) => {
    setLoading(true);
    setError("");
    try {
      const res: any = await getPaymentReportAPI(f, t, refresh);
      if (!res || res.error) {
        setError(res?.error || "Couldn't load the payment records. Check your connection and try again.");
      } else {
        setReport(res);
      }
    } catch {
      setError("Couldn't load the payment records. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(from, to); /* first load only; later loads are explicit */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = (f: string, t: string) => {
    setFrom(f); setTo(t); setDayFilter(""); setPayoutFilter(null); setPage(1);
    load(f, t);
  };

  const presets: { label: string; range: [string, string] }[] = [
    { label: "Today", range: [shift(0), shift(0)] },
    { label: "Yesterday", range: [shift(-1), shift(-1)] },
    { label: "Last 7 days", range: [shift(-6), shift(0)] },
    { label: "Last 30 days", range: [shift(-29), shift(0)] },
    { label: "This month", range: [`${shift(0).slice(0, 8)}01`, shift(0)] },
  ];

  const transactions: any[] = report?.transactions || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (dayFilter && t.day !== dayFilter) return false;
      if (payoutFilter != null && String(t.payout?.id) !== String(payoutFilter)) return false;
      if (!q) return true;
      return [t.reference, t.ref_code, t.customer_email, t.booking?.patient_name, t.booking?.patient_phone, t.booking?.clinic, t.booking?.doctor, t.channel, t.bank]
        .some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [transactions, search, statusFilter, dayFilter, payoutFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const days: any[] = (report?.days || []).filter((d: any) => !hideEmptyDays || d.payments || d.failed || d.abandoned);
  const payouts: any[] = report?.payouts || [];
  const totals = report?.totals || {};

  const card = `${isDarkMode ? "bg-slate-900/80 border-sky-500/20" : "bg-white/80 border-sky-100 shadow-xl"} backdrop-blur-xl border rounded-3xl p-6`;
  const field = `px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`;
  const th = `border-b ${isDarkMode ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"} text-[10px] font-black uppercase tracking-wider`;
  const tbody = `divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"} text-xs`;
  const strong = isDarkMode ? "text-white" : "text-slate-900";
  const btn = `px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`;

  const showDay = (iso: string) => { setDayFilter(iso); setPayoutFilter(null); setStatusFilter("all"); setPage(1); setTab("payments"); };
  const showPayout = (id: number | string) => { setPayoutFilter(id); setDayFilter(""); setStatusFilter("all"); setPage(1); setTab("payments"); };

  const exportPayments = () => downloadCsv(`booking-payments_${report.from}_to_${report.to}.csv`,
    ["Payment date", "Paystack reference", "Status", "Amount (NGN)", "Paystack fee (NGN)", "Net (NGN)", "Method", "Card / bank",
      "Booking ref", "Patient", "Phone", "Clinic", "Doctor", "Appointment date", "Booking status", "Payout status", "Payout date", "Payout ID", "Customer email"],
    filtered.map((t) => [t.paid_at || t.created_at, t.reference, PAYMENT_STATUS_LABEL[t.status] || t.status, t.amount, t.fees, t.net, t.channel,
      [t.card, t.bank].filter(Boolean).join(" "), t.ref_code, t.booking?.patient_name, t.booking?.patient_phone, t.booking?.clinic, t.booking?.doctor,
      t.booking?.date, t.booking?.status, t.payout ? PAYOUT_STATUS_LABEL[t.payout.status] || t.payout.status : (t.status === "success" ? "Awaiting payout" : ""),
      t.payout?.date, t.payout?.id, t.customer_email]));
  const exportDays = () => downloadCsv(`booking-payments-daily_${report.from}_to_${report.to}.csv`,
    ["Date", "Payments", "Collected (NGN)", "Paystack fees (NGN)", "Net (NGN)", "Paid out (NGN)", "Awaiting payout (NGN)", "Failed", "Not completed"],
    (report.days || []).map((d: any) => [d.date, d.payments, d.gross, d.fees, d.net, d.paid_out, d.awaiting_payout, d.failed, d.abandoned]));
  const exportPayouts = () => downloadCsv(`paystack-payouts_${report.from}_to_${report.to}.csv`,
    ["Payout date", "Status", "Payout ID", "Booking payments", "Booking amount (NGN)", "Booking fees (NGN)", "Booking net (NGN)",
      "Payout total (NGN)", "Payout fees (NGN)", "Deductions (NGN)", "Amount paid to bank (NGN)"],
    payouts.map((p) => [p.date, PAYOUT_STATUS_LABEL[p.status] || p.status, p.id, p.booking_payments, p.booking_amount, p.booking_fees, p.booking_net,
      p.total_amount, p.total_fees, p.deductions, p.paid_out]));

  const kpis = [
    { label: "Successful payments", value: String(totals.payments ?? 0), sub: `${totals.failed ?? 0} failed · ${totals.abandoned ?? 0} not completed`, icon: Receipt, tone: "text-sky-500 bg-sky-500/10" },
    { label: "Collected", value: naira(totals.gross), sub: "Total paid by patients", icon: Wallet, tone: "text-emerald-500 bg-emerald-500/10" },
    { label: "Paystack fees", value: naira(totals.fees), sub: "Charged by Paystack", icon: Receipt, tone: "text-rose-500 bg-rose-500/10" },
    { label: "Net", value: naira(totals.net), sub: "Collected minus fees", icon: Banknote, tone: "text-indigo-500 bg-indigo-500/10" },
    { label: "Paid out to bank", value: naira(totals.paid_out), sub: "In completed payouts", icon: Landmark, tone: "text-emerald-500 bg-emerald-500/10" },
    { label: "Awaiting payout", value: naira(totals.awaiting_payout), sub: "Not yet in the bank", icon: Landmark, tone: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6" data-testid="booking-payments-desk">
      <div className={card}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-base font-bold ${strong}`}>Booking Payments</h3>
              {report && (
                <span data-testid="paystack-mode" className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${report.mode === "live" ? STATUS_STYLE.success : STATUS_STYLE.pending}`}>
                  {report.mode === "live" ? "Live" : "Test mode"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Online booking payments and payouts, read directly from Paystack and matched to each booking.
              {report && <> Updated {timeLabel(report.fetched_at)}.</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} disabled={loading} onClick={() => load(from, to, true)} data-testid="payments-refresh">
              <span className="inline-flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh from Paystack</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = from === p.range[0] && to === p.range[1];
              return (
                <button key={p.label} type="button" disabled={loading} onClick={() => applyRange(p.range[0], p.range[1])}
                  className={`${btn} ${active ? "!bg-sky-600 !text-white !border-sky-600" : ""}`}>{p.label}</button>
              );
            })}
          </div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); applyRange(from, to); }}>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">From
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${field} block mt-1`} data-testid="payments-from" />
            </label>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">To
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${field} block mt-1`} data-testid="payments-to" />
            </label>
            <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black disabled:opacity-50">Show</button>
          </form>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Up to 92 days at a time. Payments are grouped by the day they were paid (Lagos time).</p>
      </div>

      {error && (
        <div role="alert" data-testid="payments-error" className="flex items-start gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-bold">
          <XCircle className="w-5 h-5 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}
      {report?.warnings?.map((w: string) => (
        <div key={w} className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{w}</span>
        </div>
      ))}

      {loading && !report && (
        <div className={`${card} flex items-center justify-center gap-3 py-16 text-sm text-slate-400`}>
          <Loader2 className="w-5 h-5 animate-spin" /> Reading payments from Paystack…
        </div>
      )}

      {report && (
        <>
          <div className={`grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 ${loading ? "opacity-60" : ""}`} data-testid="payments-kpis">
            {kpis.map((k) => (
              <div key={k.label} className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200 shadow-sm"} border rounded-2xl p-4`}>
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.tone}`}><k.icon className="w-4 h-4" /></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k.label}</span>
                </div>
                <div className={`mt-3 text-lg font-black tabular-nums whitespace-nowrap ${strong}`}>{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className={card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div className={`inline-flex p-1 rounded-2xl ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`} role="tablist">
                {([["days", "Daily summary"], ["payouts", `Payouts (${payouts.length})`], ["payments", `Payments (${transactions.length})`]] as [Tab, string][]).map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key} data-testid={`payments-tab-${key}`} onClick={() => setTab(key)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${tab === key ? "bg-sky-600 text-white shadow" : isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className={btn} onClick={tab === "days" ? exportDays : tab === "payouts" ? exportPayouts : exportPayments}>
                <span className="inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</span>
              </button>
            </div>

            {tab === "days" && (
              <>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3">
                  <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} /> Hide days with no payments
                </label>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[860px]" data-testid="payments-days-table">
                    <thead>
                      <tr className={th}>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Payments</th>
                        <th className="py-3 px-4 text-right">Collected</th>
                        <th className="py-3 px-4 text-right">Paystack fees</th>
                        <th className="py-3 px-4 text-right">Net</th>
                        <th className="py-3 px-4 text-right">Paid out</th>
                        <th className="py-3 px-4 text-right">Awaiting payout</th>
                        <th className="py-3 px-4 text-right">Failed / not completed</th>
                      </tr>
                    </thead>
                    <tbody className={tbody}>
                      {days.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-medium">No booking payments in this period.</td></tr>
                      ) : days.map((d) => (
                        <tr key={d.date} className={`cursor-pointer ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-sky-50/60"}`} onClick={() => showDay(d.date)} title="Show this day's payments">
                          <td className={`py-3 px-4 font-bold ${strong}`}>{dayLabel(d.date)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-bold">{d.payments}</td>
                          <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap font-bold ${strong}`}>{naira(d.gross)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-rose-500">{d.fees ? `−${naira(d.fees)}` : naira(0)}</td>
                          <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap font-black ${strong}`}>{naira(d.net)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-bold">{naira(d.paid_out)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold">{naira(d.awaiting_payout)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-slate-400">{d.failed} / {d.abandoned}</td>
                        </tr>
                      ))}
                    </tbody>
                    {days.length > 0 && (
                      <tfoot>
                        <tr className={`${isDarkMode ? "bg-slate-950/40" : "bg-slate-50"} text-xs font-black ${strong}`}>
                          <td className="py-3 px-4">Total</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{totals.payments}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{naira(totals.gross)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-rose-500">{totals.fees ? `−${naira(totals.fees)}` : naira(0)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{naira(totals.net)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">{naira(totals.paid_out)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400">{naira(totals.awaiting_payout)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-slate-400">{totals.failed} / {totals.abandoned}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Click a day to see its payments. "Paid out" is the net amount already in a completed Paystack payout.</p>
              </>
            )}

            {tab === "payouts" && (
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[900px]" data-testid="payments-payouts-table">
                    <thead>
                      <tr className={th}>
                        <th className="py-3 px-4">Payout date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Booking payments</th>
                        <th className="py-3 px-4 text-right">Booking amount</th>
                        <th className="py-3 px-4 text-right">Booking fees</th>
                        <th className="py-3 px-4 text-right">Booking net</th>
                        <th className="py-3 px-4 text-right">Whole payout to bank</th>
                        <th className="py-3 px-4">Payout ID</th>
                      </tr>
                    </thead>
                    <tbody className={tbody}>
                      {payouts.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-medium">No Paystack payouts in this period yet.</td></tr>
                      ) : payouts.map((p) => (
                        <tr key={p.id} className={`${p.booking_payments ? "cursor-pointer" : ""} ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-sky-50/60"}`}
                          onClick={() => p.booking_payments && showPayout(p.id)} title={p.booking_payments ? "Show the booking payments in this payout" : ""}>
                          <td className={`py-3 px-4 font-bold ${strong}`}>{dayLabel(p.date)}</td>
                          <td className="py-3 px-4"><Pill status={p.status} label={PAYOUT_STATUS_LABEL[p.status] || p.status} /></td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-bold">{p.booking_payments}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{naira(p.booking_amount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-rose-500">{p.booking_fees ? `−${naira(p.booking_fees)}` : naira(0)}</td>
                          <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap font-black ${strong}`}>{naira(p.booking_net)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                            <div className="font-bold">{naira(p.paid_out)}</div>
                            {(p.deductions > 0 || Math.abs(p.paid_out - p.booking_net) > 0.009) && (
                              <div className="text-[10px] text-slate-400">
                                {p.deductions > 0 ? `${naira(p.deductions)} deducted · ` : ""}includes other Paystack payments
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{p.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Paystack pays out on its schedule (usually the next working day), so a payout can include payments from earlier days and
                  other payments on the same Paystack account. "Booking" columns count only booking payments.
                </p>
              </>
            )}

            {tab === "payments" && (
              <>
                <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Search patient, phone, booking ref, Paystack ref, clinic..." data-testid="payments-search"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                  </div>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={field} data-testid="payments-status">
                    <option value="all">All statuses</option>
                    <option value="success">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="abandoned">Not completed</option>
                    <option value="reversed">Reversed</option>
                  </select>
                  {(dayFilter || payoutFilter != null) && (
                    <button type="button" className={`${btn} !border-sky-500/40 !text-sky-600 dark:!text-sky-400`} onClick={() => { setDayFilter(""); setPayoutFilter(null); setPage(1); }}>
                      {dayFilter ? `Paid on ${dayLabel(dayFilter)}` : `Payout ${payoutFilter}`} ✕
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[960px]" data-testid="payments-table">
                    <thead>
                      <tr className={th}>
                        <th className="py-3 px-4">Paid</th>
                        <th className="py-3 px-4">Patient & booking</th>
                        <th className="py-3 px-4">Clinic & appointment</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Fee</th>
                        <th className="py-3 px-4 text-right">Net</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Payout</th>
                      </tr>
                    </thead>
                    <tbody className={tbody}>
                      {pageRows.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          {transactions.length === 0 ? "No booking payments in this period." : "No payments match these filters."}
                        </td></tr>
                      ) : pageRows.map((t) => (
                        <tr key={t.reference} className={isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}>
                          <td className="py-3 px-4">
                            <div className={`font-bold whitespace-nowrap ${strong}`}>{timeLabel(t.paid_at || t.created_at)}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5 break-all max-w-[150px]">{t.reference}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 capitalize">{[String(t.channel || "").replace(/_/g, " "), t.card, t.bank].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="py-3 px-4">
                            {t.booking ? (
                              <>
                                <div className={`font-bold ${strong}`}>{t.booking.patient_name}</div>
                                <div className="text-[11px] text-slate-400">{t.booking.patient_phone}</div>
                                <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">{t.booking.ref_code}</div>
                              </>
                            ) : (
                              <>
                                <div className="text-[11px] text-slate-400">{t.customer_email || "—"}</div>
                                <div className="font-mono text-[10px] text-slate-400 mt-0.5">{t.ref_code || "No booking reference"}</div>
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Booking not found in this system</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {t.booking ? (
                              <>
                                <div className="font-bold">{t.booking.clinic}</div>
                                <div className="text-[11px] text-slate-400">{t.booking.doctor}</div>
                                <div className="text-[11px] text-slate-400">{dayLabel(t.booking.date)} · {t.booking.status}</div>
                              </>
                            ) : "—"}
                          </td>
                          <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap font-bold ${strong}`}>{naira(t.amount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-rose-500">{t.fees ? `−${naira(t.fees)}` : "—"}</td>
                          <td className={`py-3 px-4 text-right tabular-nums whitespace-nowrap font-black ${strong}`}>{t.status === "success" ? naira(t.net) : "—"}</td>
                          <td className="py-3 px-4">
                            <Pill status={t.status} label={PAYMENT_STATUS_LABEL[t.status] || t.status} />
                            {t.status !== "success" && t.gateway_response && <div className="text-[10px] text-slate-400 mt-1 max-w-[120px]">{t.gateway_response}</div>}
                          </td>
                          <td className="py-3 px-4">
                            {t.payout ? (
                              <>
                                <Pill status={t.payout.status} label={PAYOUT_STATUS_LABEL[t.payout.status] || t.payout.status} />
                                <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">{dayLabel(t.payout.date)}</div>
                              </>
                            ) : t.status === "success" ? (
                              <Pill status="pending" label="Awaiting payout" />
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{filtered.length === 0 ? "0" : `${(pageSafe - 1) * PAGE_SIZE + 1}–${Math.min(pageSafe * PAGE_SIZE, filtered.length)}`} of {filtered.length}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className={btn} disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Previous</button>
                    <span className="font-bold">Page {pageSafe} of {pages}</span>
                    <button type="button" className={btn} disabled={pageSafe >= pages} onClick={() => setPage(pageSafe + 1)}>Next</button>
                  </div>
                </div>
                {report.other_transactions_excluded > 0 && (
                  <p className="text-[11px] text-slate-400 mt-3">
                    {report.other_transactions_excluded} other Paystack payment(s) on this account in the same period aren't booking payments and are not listed.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
