import React from "react";
import { CalendarRange, X } from "lucide-react";

/** yyyy-mm-dd in the browser's local time zone. */
export const localISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shiftDays = (n: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return localISODate(d);
};

/** The appointment date of a booking record (yyyy-mm-dd), or "". */
export const bookingDateOf = (b: any): string =>
    String(b?.date || b?.appointment_date || b?.appointmentDate || "").slice(0, 10);

/** True when the booking's appointment date is inside [from, to]; empty bounds are open. */
export const bookingInDateRange = (b: any, from: string, to: string): boolean => {
    if (!from && !to) return true;
    const d = bookingDateOf(b);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
};

/** Sentinel "from" date meaning "every date", for views whose empty range means "today". */
export const ALL_DATES_FROM = "0000-01-01";

type Preset = { key: string; label: string; range: () => [string, string] };

interface Props {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    isDarkMode?: boolean;
    /**
     * "all"   – an empty range shows every date (most tables).
     * "today" – an empty range shows today only (helpdesk queue); "All dates" is offered separately.
     */
    emptyMeans?: "all" | "today";
    /** Optional number of records matching, shown next to the control. */
    count?: number;
    className?: string;
    testId?: string;
}

/**
 * Compact date filter: quick presets (Today, Tomorrow, This week, …) plus a
 * custom From / To range. Purely a filter control; the table decides how to
 * apply it (see bookingInDateRange).
 */
export function DateRangeFilter({ from, to, onChange, isDarkMode, emptyMeans = "all", count, className = "", testId }: Props) {
    const presets: Preset[] = [
        emptyMeans === "today"
            ? { key: "today", label: "Today", range: () => ["", ""] }
            : { key: "all", label: "All dates", range: () => ["", ""] },
        ...(emptyMeans === "today"
            ? [{ key: "all", label: "All dates", range: () => [ALL_DATES_FROM, ""] as [string, string] }]
            : [{ key: "today", label: "Today", range: () => [shiftDays(0), shiftDays(0)] as [string, string] }]),
        { key: "tomorrow", label: "Tomorrow", range: () => [shiftDays(1), shiftDays(1)] },
        { key: "yesterday", label: "Yesterday", range: () => [shiftDays(-1), shiftDays(-1)] },
        { key: "next7", label: "Next 7 days", range: () => [shiftDays(0), shiftDays(6)] },
        { key: "last7", label: "Last 7 days", range: () => [shiftDays(-6), shiftDays(0)] },
        {
            key: "month", label: "This month", range: () => {
                const n = new Date();
                return [localISODate(new Date(n.getFullYear(), n.getMonth(), 1)), localISODate(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
            },
        },
        { key: "upcoming", label: "Upcoming", range: () => [shiftDays(0), ""] },
    ];

    const current = presets.find((p) => {
        const [f, t] = p.range();
        return f === from && t === to;
    });
    const presetKey = current ? current.key : "custom";
    const isDefault = !from && !to;
    const shownFrom = from === ALL_DATES_FROM ? "" : from;

    const field = `px-2.5 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"}`;
    const isToday = presetKey === "today";

    return (
        <div className={`isalu-daterange flex flex-wrap items-center gap-2 ${className}`} data-testid={testId}>
            <button
                type="button"
                onClick={() => {
                    const p = presets.find((x) => x.key === "today")!;
                    const [f, t] = p.range();
                    onChange(f, t);
                }}
                aria-pressed={isToday}
                className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all ${isToday
                    ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/20"
                    : isDarkMode ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-sky-500" : "bg-white border-slate-200 text-slate-700 hover:border-sky-500"
                    }`}
                title="Show today's appointments"
            >
                <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : "bg-emerald-500"}`} />
                Today's appointments
            </button>

            <div className="flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
                <select
                    aria-label="Date range"
                    value={presetKey}
                    onChange={(e) => {
                        const p = presets.find((x) => x.key === e.target.value);
                        if (p) {
                            const [f, t] = p.range();
                            onChange(f, t);
                        }
                    }}
                    className={field}
                >
                    {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    <option value="custom" disabled={presetKey !== "custom"}>Custom range</option>
                </select>
            </div>

            <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={testId ? `${testId}-from` : undefined}>From</label>
                <input
                    id={testId ? `${testId}-from` : undefined}
                    type="date"
                    value={shownFrom}
                    max={to || undefined}
                    onChange={(e) => onChange(e.target.value || (emptyMeans === "today" && to ? ALL_DATES_FROM : ""), to)}
                    className={field}
                    title="From date"
                    data-testid={testId ? `${testId}-from` : undefined}
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <label className="sr-only" htmlFor={testId ? `${testId}-to` : undefined}>To</label>
                <input
                    id={testId ? `${testId}-to` : undefined}
                    type="date"
                    value={to}
                    min={shownFrom || undefined}
                    onChange={(e) => onChange(from, e.target.value)}
                    className={field}
                    title="To date"
                    data-testid={testId ? `${testId}-to` : undefined}
                />
            </div>

            {!isDefault && (
                <button
                    type="button"
                    onClick={() => onChange("", "")}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 flex items-center gap-1"
                    title={emptyMeans === "today" ? "Back to today" : "Clear date filter"}
                >
                    <X className="w-3.5 h-3.5" /> {emptyMeans === "today" ? "Back to today" : "Clear"}
                </button>
            )}

            {typeof count === "number" && (
                <span className="text-xs font-bold text-slate-400">{count} match{count === 1 ? "" : "es"}</span>
            )}
        </div>
    );
}
