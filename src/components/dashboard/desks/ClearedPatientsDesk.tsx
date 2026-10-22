import React, { useMemo, useState } from "react";
import { BadgeCheck, Building2, CreditCard, Download, Search, ShieldCheck, Wallet } from "lucide-react";
import { CLEARANCE_LABELS, clearanceOf, type ClearanceKind } from "../../../data/clearance";
import { localISODate } from "../../DateRangeFilter";

/**
 * Cleared Patients: everyone cleared to be seen. HMO and Company patients
 * approved at the HMO approval desk, and private patients who paid online
 * (Paystack). Private patients who paid at the cashdesk can be added with
 * the filter.
 */

const PAGE_SIZE = 20;
const KINDS: { kind: ClearanceKind; icon: any; tone: string; pill: string }[] = [
  { kind: "hmo", icon: ShieldCheck, tone: "text-sky-500 bg-sky-500/10", pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { kind: "company", icon: Building2, tone: "text-indigo-500 bg-indigo-500/10", pill: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  { kind: "online", icon: CreditCard, tone: "text-emerald-500 bg-emerald-500/10", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { kind: "cashdesk", icon: Wallet, tone: "text-teal-500 bg-teal-500/10", pill: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
];
const PILL: Record<ClearanceKind, string> = Object.fromEntries(KINDS.map((k) => [k.kind, k.pill])) as any;

const shift = (days: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return localISODate(d); };
const minutesOf = (time: string) => {
  const m = String(time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 9999;
  let h = Number(m[1]) % 12;
  if (m[3] && m[3].toUpperCase() === "PM") h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
};
const dayLabel = (iso: string) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
const visitLabel = (status: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "checked in") return "Checked in";
  if (s === "completed") return "Completed";
  if (s === "consulting") return "Consulting";
  return "Booked";
};
const csvCell = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const downloadCsv = (name: string, rows: any[][]) => {
  const url = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function ClearedPatientsDesk({ isDarkMode, bookings = [] }: { isDarkMode: boolean; bookings?: any[] }) {
  const [from, setFrom] = useState(shift(0));
  const [to, setTo] = useState(shift(0));
  // HMO-desk approvals and online payments are shown by default; cashdesk payments on request.
  const [kinds, setKinds] = useState<Record<ClearanceKind, boolean>>({ hmo: true, company: true, online: true, cashdesk: false });
  const [clinic, setClinic] = useState("all");
  const [visit, setVisit] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const clinicOf = (b: any) => String(b.doctorSpecialty || b.doctor_specialty || "General Outpatient");
  const inRange = (b: any) => {
    const d = String(b.date || "").slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  };

  // Cleared bookings in the date range (before the type / clinic / search filters).
  const cleared = useMemo(() => bookings
    .filter(inRange)
    .map((b) => ({ b, c: clearanceOf(b) }))
    .filter((x) => x.c !== null) as { b: any; c: NonNullable<ReturnType<typeof clearanceOf>> }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, from, to]);

  const counts = useMemo(() => {
    const out: Record<ClearanceKind, number> = { hmo: 0, company: 0, online: 0, cashdesk: 0 };
    cleared.forEach((x) => { if (clinic === "all" || clinicOf(x.b) === clinic) out[x.c.kind] += 1; });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared, clinic]);

  const clinicCounts = useMemo(() => {
    const m = new Map<string, number>();
    cleared.filter((x) => kinds[x.c.kind]).forEach((x) => m.set(clinicOf(x.b), (m.get(clinicOf(x.b)) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared, kinds]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return cleared
      .filter((x) => kinds[x.c.kind])
      .filter((x) => clinic === "all" || clinicOf(x.b) === clinic)
      .filter((x) => visit === "all" || visitLabel(x.b.status).toLowerCase() === visit)
      .filter((x) => {
        if (!q) return true;
        const b = x.b;
        const hay = [b.patientName, b.patient_name, b.refCode, b.ref_code, b.doctorName, b.doctor_name, clinicOf(b), b.hmoName, b.hmo_name,
          b.companyName, b.hmoPolicyCode, b.hmo_policy_code, b.hmoAuthCode, b.hmo_auth_code, b.paymentReference, b.payment_reference, b.invoiceRef, b.invoice_ref]
          .map((v) => String(v ?? "").toLowerCase()).join(" ");
        const phone = String(b.patientPhone || b.patient_phone || "").replace(/\D/g, "");
        return hay.includes(q) || (qDigits.length >= 3 && phone.includes(qDigits));
      })
      .sort((a, b) => String(a.b.date).localeCompare(String(b.b.date)) || minutesOf(a.b.time) - minutesOf(b.b.time)
        || String(a.b.patientName || a.b.patient_name || "").localeCompare(String(b.b.patientName || b.b.patient_name || "")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared, kinds, clinic, visit, search]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const pageRows = rows.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const presets: { label: string; range: [string, string] }[] = [
    { label: "Today", range: [shift(0), shift(0)] },
    { label: "Tomorrow", range: [shift(1), shift(1)] },
    { label: "Next 7 days", range: [shift(0), shift(6)] },
    { label: "Last 7 days", range: [shift(-6), shift(0)] },
    { label: "All dates", range: ["", ""] },
  ];

  const card = `${isDarkMode ? "bg-slate-900/80 border-sky-500/20" : "bg-white/80 border-sky-100 shadow-xl"} backdrop-blur-xl border rounded-3xl p-6`;
  const field = `px-3 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`;
  const th = `border-b ${isDarkMode ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"} text-[10px] font-black uppercase tracking-wider`;
  const strong = isDarkMode ? "text-white" : "text-slate-900";
  const btn = `px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`;
  const reset = () => setPage(1);

  const exportCsv = () => downloadCsv(`cleared-patients_${from || "all"}_to_${to || "all"}.csv`, [
    ["Appointment date", "Time", "Ref", "Patient", "Phone", "Clinic", "Doctor", "Patient type", "Cleared by", "Clearance details", "Visit status"],
    ...rows.map(({ b, c }) => [b.date, b.time, b.refCode || b.ref_code, b.patientName || b.patient_name, b.patientPhone || b.patient_phone, clinicOf(b),
      b.doctorName || b.doctor_name, b.paymentType || b.payment_type, c.label, c.detail, visitLabel(b.status)]),
  ]);

  return (
    <div className="space-y-6" data-testid="cleared-patients-desk">
      <div className={card}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold ${strong} flex items-center gap-2`}><BadgeCheck className="w-5 h-5 text-emerald-500" /> Cleared Patients</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Patients cleared to be seen: HMO and Company patients approved at the HMO approval desk, and Private Self-Pay patients who paid online.
              Tick "Paid at cashdesk" to add private patients who paid at the hospital.
            </p>
          </div>
          <button type="button" className={`${btn} inline-flex items-center gap-1.5 self-start`} onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="mt-5 flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = from === p.range[0] && to === p.range[1];
              return (
                <button key={p.label} type="button" onClick={() => { setFrom(p.range[0]); setTo(p.range[1]); setClinic("all"); reset(); }}
                  className={`${btn} ${active ? "!bg-sky-600 !text-white !border-sky-600" : ""}`}>{p.label}</button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">From
              <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); reset(); }} className={`${field} block mt-1`} data-testid="cleared-from" />
            </label>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">To
              <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); reset(); }} className={`${field} block mt-1`} data-testid="cleared-to" />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="cleared-kpis">
        {KINDS.map(({ kind, icon: Icon, tone }) => (
          <button key={kind} type="button" aria-pressed={kinds[kind]} data-testid={`cleared-kind-${kind}`}
            onClick={() => { setKinds((k) => ({ ...k, [kind]: !k[kind] })); reset(); }}
            className={`text-left border rounded-2xl p-4 transition-all ${kinds[kind]
              ? (isDarkMode ? "bg-slate-900/80 border-sky-500/50 ring-2 ring-sky-500/30" : "bg-white border-sky-300 ring-2 ring-sky-200 shadow-sm")
              : (isDarkMode ? "bg-slate-900/40 border-slate-800 opacity-60" : "bg-white/60 border-slate-200 opacity-70")}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></span>
              <input type="checkbox" readOnly checked={kinds[kind]} tabIndex={-1} aria-hidden className="pointer-events-none" />
            </div>
            <div className={`mt-3 text-2xl font-black tabular-nums ${strong}`}>{counts[kind]}</div>
            <div className="text-[11px] font-bold text-slate-500">{CLEARANCE_LABELS[kind]}</div>
          </button>
        ))}
      </div>

      <div className={card}>
        {clinicCounts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" data-testid="cleared-clinics">
            <button type="button" onClick={() => { setClinic("all"); reset(); }} className={`${btn} ${clinic === "all" ? "!bg-sky-600 !text-white !border-sky-600" : ""}`}>
              All clinics ({clinicCounts.reduce((n, [, v]) => n + v, 0)})
            </button>
            {clinicCounts.map(([name, n]) => (
              <button key={name} type="button" onClick={() => { setClinic(name); reset(); }} className={`${btn} ${clinic === name ? "!bg-sky-600 !text-white !border-sky-600" : ""}`}>
                {name} ({n})
              </button>
            ))}
          </div>
        )}
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} data-testid="cleared-search"
              placeholder="Search patient, phone, reference, doctor, HMO, company, auth code..." className={`${field} w-full pl-10 font-semibold`} />
          </div>
          <select value={visit} onChange={(e) => { setVisit(e.target.value); reset(); }} className={field} aria-label="Visit status">
            <option value="all">All visit statuses</option>
            <option value="booked">Booked (not arrived)</option>
            <option value="checked in">Checked in</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[940px]" data-testid="cleared-table">
            <thead>
              <tr className={th}>
                <th className="py-3 px-4">Appointment</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Clinic & doctor</th>
                <th className="py-3 px-4">Cleared by</th>
                <th className="py-3 px-4">Visit</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"} text-xs`}>
              {pageRows.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                  {cleared.length === 0 ? "No cleared patients for these dates." : "No cleared patients match these filters."}
                </td></tr>
              ) : pageRows.map(({ b, c }) => (
                <tr key={b.refCode || b.ref_code} className={isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}>
                  <td className="py-3 px-4">
                    <div className={`font-bold whitespace-nowrap ${strong}`}>{dayLabel(String(b.date || "").slice(0, 10))}</div>
                    <div className="text-[11px] text-slate-400">{b.time}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`font-bold ${strong}`}>{b.patientName || b.patient_name}</div>
                    <div className="text-[11px] text-slate-400">{b.patientPhone || b.patient_phone}</div>
                    <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400">{b.refCode || b.ref_code}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{clinicOf(b)}</div>
                    <div className="text-[11px] text-slate-400">{b.doctorName || b.doctor_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span data-testid="cleared-by" className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-black whitespace-nowrap ${PILL[c.kind]}`}>✓ {c.label}</span>
                    {c.detail && <div className="text-[10px] text-slate-400 mt-1 max-w-[240px] break-words">{c.detail}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-semibold">{visitLabel(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span data-testid="cleared-count">{rows.length === 0 ? "0" : `${(pageSafe - 1) * PAGE_SIZE + 1}–${Math.min(pageSafe * PAGE_SIZE, rows.length)}`} of {rows.length} cleared patients</span>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Previous</button>
            <span className="font-bold">Page {pageSafe} of {pages}</span>
            <button type="button" className={btn} disabled={pageSafe >= pages} onClick={() => setPage(pageSafe + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
