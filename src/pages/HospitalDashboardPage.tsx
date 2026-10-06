import React, { useState, useMemo, useEffect, useRef } from "react";
import "../styles/dashboard-glass.css";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
const getAcronymForIndex = (index: number) => { let letters = "", n = index; while (n >= 0) { letters = String.fromCharCode(65 + (n % 26)) + letters; n = Math.floor(n / 26) - 1; } return `Specialist ${letters}`; };
/** Placeholder shown instead of a misleading "0" while numbers are loading. */
const KpiSkeleton = () => (
  <span data-testid="kpi-loading" className="inline-block w-12 h-7 rounded-lg bg-slate-300/50 dark:bg-slate-700/60 animate-pulse align-middle" aria-label="Loading" />
);

// ---------------------------------------------------------------------
// Lightweight SVG charts for Executive Analytics (no chart library needed)
// ---------------------------------------------------------------------
type ChartSlice = { label: string; value: number; color: string };

const PieChart = ({ data, size = 190, donut = false, centerLabel, isDarkMode, testId }: {
  data: ChartSlice[]; size?: number; donut?: boolean; centerLabel?: string; isDarkMode: boolean; testId?: string;
}) => {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  let angle = -Math.PI / 2;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const frac = d.value / total;
    const start = angle, end = angle + frac * 2 * Math.PI;
    angle = end;
    const large = end - start > Math.PI ? 1 : 0;
    const p = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    const path = frac >= 0.9999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${p(start)} A ${r} ${r} 0 ${large} 1 ${p(end)} Z`;
    return { ...d, path, pct: Math.round(frac * 1000) / 10 };
  });
  return (
    <div data-testid={testId} className="flex flex-col sm:flex-row items-center gap-5">
      {total === 0 ? (
        <div style={{ width: size, height: size }} className="rounded-full border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 font-bold flex-shrink-0">No data</div>
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(", ")} className="flex-shrink-0">
          {slices.map((sl) => (
            <path key={sl.label} d={sl.path} fill={sl.color} stroke={isDarkMode ? "#0f172a" : "#ffffff"} strokeWidth={2}>
              <title>{`${sl.label}: ${sl.value} (${sl.pct}%)`}</title>
            </path>
          ))}
          {donut && <circle cx={cx} cy={cy} r={r * 0.58} fill={isDarkMode ? "#0f172a" : "#ffffff"} />}
          {donut && (
            <>
              <text x={cx} y={cy - 2} textAnchor="middle" fontSize="24" fontWeight="900" fill={isDarkMode ? "#ffffff" : "#0f172a"}>{total}</text>
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="#94a3b8">{centerLabel || "TOTAL"}</text>
            </>
          )}
        </svg>
      )}
      <ul className="space-y-1.5 text-xs w-full">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0"><span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} /><span className={`truncate font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{d.label}</span></span>
            <span className="font-black tabular-nums whitespace-nowrap">{d.value}<span className="text-slate-400 font-bold ml-1">{total ? `${Math.round((d.value / total) * 1000) / 10}%` : "0%"}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Width of an element, kept up to date as the window or layout changes. */
const useElementWidth = (fallback = 600) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(220, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
};

const StackedBarChart = ({ labels, series, height = 220, isDarkMode, testId }: {
  labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number; isDarkMode: boolean; testId?: string;
}) => {
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = Math.max(1, ...totals);
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  // Drawn at the container's real width: bars and label spacing adapt, so
  // nothing is clipped or hidden behind a sideways scroll on small screens.
  const [boxRef, W] = useElementWidth();
  const H = height, padL = 30, padB = 26, padT = 8;
  const slotW = (W - padL) / Math.max(1, labels.length);
  const bw = Math.max(3, Math.min(28, slotW * 0.7));
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((W - padL) / 52))));
  return (
    <div data-testid={testId} ref={boxRef} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 1, 2, 3, 4].map((g) => {
          const y = padT + (H - padT - padB) * (1 - g / 4);
          return (
            <g key={g}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{step * g}</text>
            </g>
          );
        })}
        {labels.map((lab, i) => {
          const slot = (W - padL) / labels.length;
          const x = padL + slot * i + (slot - bw) / 2;
          let yCursor = H - padB;
          return (
            <g key={lab + i}>
              {series.map((s) => {
                const v = s.values[i] || 0;
                const h = (v / top) * (H - padT - padB);
                yCursor -= h;
                return v > 0 ? (
                  <rect key={s.name} x={x} y={yCursor} width={bw} height={h} rx={2} fill={s.color}>
                    <title>{`${lab} · ${s.name}: ${v}`}</title>
                  </rect>
                ) : null;
              })}
              {i % every === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{lab}</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-bold">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
};

const HBarChart = ({ rows, isDarkMode, testId, color = "#0ea5e9" }: {
  rows: { label: string; value: number; sub?: string }[]; isDarkMode: boolean; testId?: string; color?: string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-xs text-slate-400 py-6 text-center">No data for this period.</p>;
  return (
    <div data-testid={testId} className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className={`font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{r.label}</span>
            <span className="font-black tabular-nums whitespace-nowrap">{r.value}{r.sub && <span className="text-slate-400 font-bold ml-1.5">{r.sub}</span>}</span>
          </div>
          <div className={`h-2.5 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
            <div className="h-2.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} title={`${r.label}: ${r.value}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

/** Compact table pager used by the staff registry and the archive. */
const TablePager = ({ page, pageSize, total, onPage, onPageSize, isDarkMode, testId }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void;
  onPageSize: (n: number) => void; isDarkMode: boolean; testId?: string;
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = `px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-40 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`;
  return (
    <div data-testid={testId} className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
      <div className="flex items-center gap-2 text-slate-500">
        <span>Rows per page</span>
        <select value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className={`px-2 py-1.5 rounded-lg border font-bold ${isDarkMode ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="ml-2">{from}–{to} of {total}</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className={`font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Page {page} of {pages}</span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
};

const DESK_LABELS: Record<string, string> = {
  helpdesk: "Helpdesk Reception", hmo: "HMO Insurance Desk", cashdesk: "Cashdesk & Billing",
  analytics: "Executive Analytics", monitor: "Waiting Room Monitor", users: "Staff & Roles",
  all_patients: "All Patients", checked_in_patients: "Checked-in Queue", hmo_enrollees: "HMO Enrollees",
  private_patients: "Private Self-Pay", create_specialist_schedule: "Specialist Roster",
  clinic: "Clinics & Departments", disabled_bookings: "Archive & Trash",
};

/** Waiting-room screens are public: show "Ada O." rather than a full name. */
const maskPatientName = (name: string) => {
  const parts = String(name || "").replace(/^(mr|mrs|ms|miss|dr|chief|prof)\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Patient";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

/** "09:30 AM – 01:00 PM" -> minutes after midnight (for sorting the queue). */
const timeToMinutes = (value: string) => {
  const m = String(value || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 12;
  if ((m[3] || "").toUpperCase() === "PM") h += 12;
  if (!m[3] && Number(m[1]) === 12) h = 12;
  return h * 60 + Number(m[2]);
};

type DayConfig = { shiftTimes: string[]; capacity: number; weeks?: number[]; date?: string };

/**
 * The API client never throws: failures come back as { error, status }
 * (and delete helpers return false). Every write must go through ensureOk
 * so failures are shown to staff instead of being reported as success.
 */
const ensureOk = <T,>(res: T, fallback = "The server rejected this request. Please try again."): T => {
  if (res === null || res === undefined || (res as unknown) === false) throw new Error(fallback);
  if (isApiError(res)) throw new Error(String((res as any).error || fallback));
  return res;
};
const asArray = (res: any): any[] =>
  Array.isArray(res) ? res
    : Array.isArray(res?.results) ? res.results
      : Array.isArray(res?.data) ? res.data
        : [];
const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ORDINAL_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
const WEEKDAY_SHORT_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const describeWeeks = (day: string, weeks?: number[]) => {
  const full = WEEKDAY_NAMES[WEEKDAY_SHORT_ORDER.indexOf(day)] || day;
  if (!weeks || weeks.length === 0 || weeks.length === 5) return `Every ${full}`;
  return `${weeks.map((w) => ORDINAL_LABELS[w]).join(" & ")} ${full} of each month`;
};
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "1ST & 3RD" -> [1,3]; "1ST - 3RD" -> [1,2,3]; "EVERY" -> [] (all weeks). */
const patternToWeeks = (pattern: string): number[] => {
  const p = (pattern || "").toUpperCase();
  if (!p || p.includes("EVERY") || p.includes("ALL WEEKS")) return [];
  const words: Record<string, number> = { "1ST": 1, FIRST: 1, "2ND": 2, SECOND: 2, "3RD": 3, THIRD: 3, "4TH": 4, FOURTH: 4, "5TH": 5, FIFTH: 5 };
  const range = p.match(/(1ST|2ND|3RD|4TH|5TH)\s*(?:-|–|—|TO)\s*(1ST|2ND|3RD|4TH|5TH)/);
  if (range) {
    const out: number[] = [];
    for (let n = words[range[1]]; n <= words[range[2]]; n++) out.push(n);
    return out;
  }
  const found = new Set<number>();
  (p.match(/\b(1ST|2ND|3RD|4TH|5TH|FIRST|SECOND|THIRD|FOURTH|FIFTH)\b/g) || []).forEach((w) => found.add(words[w]));
  return Array.from(found).sort();
};
const weekdayFromPattern = (pattern: string): string | null => {
  const p = (pattern || "").toUpperCase();
  return WEEKDAY_NAMES.find((d) => p.includes(d.toUpperCase()) || new RegExp(`\\b${d.slice(0, 3).toUpperCase()}\\b`).test(p)) || null;
};
/** Human label for a duty-day key + its config, e.g. "Sun (1st & 3rd)" or "Sat, Nov 14, 2026". */
const describeDutyKey = (key: string, cfg?: any): string => {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : (cfg?.date || "");
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  const weeks: number[] = Array.isArray(cfg?.weeks) ? cfg.weeks : [];
  if (weeks.length > 0 && weeks.length < 5) return `${key} (${weeks.map((w) => ORDINAL_LABELS[w] || `${w}th`).join(" & ")})`;
  return key;
};

const getDoctorRealName = (value: any) => { if (!value) return "Specialist"; if (typeof value === "string") return value; return value.doctorName || value.doctor_name || value.fullName || value.full_name || value.name || "Specialist"; };
import {
  Building2,
  ShieldCheck,
  CreditCard,
  DollarSign,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  TrendingUp,
  Users,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  LogOut,
  Lock,
  Ticket,
  User,
  Download,
  Monitor,
  Tv,
  Activity,
  Trash2,
  UserCog,
  UserPlus,
  Calendar,
  Stethoscope,
  Pencil,
  Eye,
  EyeOff,
  LayoutDashboard,
  ExternalLink,
  Upload,
  RotateCcw,
  Archive,
  ArrowRightCircle,
  Loader2,
  Bell,
  Menu,
  ChevronDown,
  Layers,
  Zap,
  Sun,
  Moon,
  X,
  FileSpreadsheet
} from "lucide-react";
import {
  getBookingsAPI,
  getBookingSummaryAPI,
  deleteBookingAPI,
  getDisabledBookingsAPI,
  restoreBookingAPI,
  getDoctorsAPI,
  getSchedulesAPI,
  getDepartmentsAPI,
  createDepartmentAPI,
  updateDepartmentAPI,
  deleteDepartmentAPI,
  getHmoCompaniesAPI,
  getSystemUsersAPI,
  createDoctorAPI,
  updateDoctorAPI,
  createScheduleAPI,
  updateScheduleAPI,
  deleteScheduleAPI,
  createBookingAPI,
  checkInBookingAPI,
  approveHmoBookingAPI,
  payCashdeskBookingAPI,
  rerouteHmoBookingToCashdeskAPI,
  createHmoCompanyAPI,
  updateHmoCompanyAPI,
  deleteHmoCompanyAPI,
  createSystemUserAPI,
  updateSystemUserAPI,
  getRolesAPI,
  createRoleAPI,
  updateRoleAPI,
  deleteRoleAPI,
  loginStaffAPI,
  updateBookingAPI,
  createCustomTimeSlotAPI,
  clearAllBookingsAPI,
  generateAiReportAPI,
  getAppSettingAPI,
  saveAppSettingAPI,
  sendBookingReminderAPI,
  sendBulkBookingRemindersAPI,
  deleteSystemUserAPI,
  isApiError,
  getDoctorAvailableDatesAPI,
  getScheduleExceptionsAPI,
  previewScheduleExceptionAPI,
  createScheduleExceptionAPI,
  getScheduleExceptionAPI,
  retryScheduleExceptionNotificationsAPI,
  deleteScheduleExceptionAPI,
  getStaffProfileAPI,
  getBookingsSyncAPI,
  getNotificationChannelsAPI,
  sendTestNotificationAPI,
} from "../api/client";
import { useHospitalLiveFeed } from "../hooks/useHospitalLiveFeed";
import { IsaluLogo } from "../components/IsaluLogo";

export function HospitalDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deskParam = searchParams.get("desk") as any;

  // Theme State (Default to Light Theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem("isalu_theme");
    return savedTheme ? savedTheme === "dark" : false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("isalu_theme", newMode ? "dark" : "light");
  };

  const [completingBookingRef, setCompletingBookingRef] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);


  // Create Specialist Schedule Modal Form State
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [schedDoctorId, setSchedDoctorId] = useState("");
  const [schedDoctorSearch, setSchedDoctorSearch] = useState("");
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [schedRoom, setSchedRoom] = useState("");
  const [schedDutyDays, setSchedDutyDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [schedDaySchedules, setSchedDaySchedules] = useState<Record<string, DayConfig>>({
    Mon: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
    Wed: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
    Fri: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
  });

  const handleToggleSchedDay = (day: string) => {
    if (schedDutyDays.includes(day)) {
      const updatedDays = schedDutyDays.filter((d) => d !== day);
      setSchedDutyDays(updatedDays);
      setSchedDaySchedules((prev) => {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      });
    } else {
      setSchedDutyDays([...schedDutyDays, day]);
      setSchedDaySchedules((prev) => ({
        ...prev,
        [day]: prev[day] || { shiftTimes: [schedShiftTime || shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: schedCapacity || 15 },
      }));
    }
  };

  const handleAddShiftTimeToDay = (day: string) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 };
      const unused = shiftTimeOptions.find((opt) => !current.shiftTimes.includes(opt)) || shiftTimeOptions[0] || "01:00 PM – 06:00 PM (Afternoon Shift)";
      return {
        ...prev,
        [day]: {
          ...current,
          shiftTimes: [...current.shiftTimes, unused],
        },
      };
    });
  };

  const handleRemoveShiftTimeFromDay = (day: string, index: number) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current || current.shiftTimes.length <= 1) return prev;
      const updated = current.shiftTimes.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateDayShiftTime = (day: string, index: number, value: string) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      const updated = [...current.shiftTimes];
      updated[index] = value;
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateDayCapacity = (day: string, capacity: number) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: { ...current, capacity: Math.max(1, capacity) },
      };
    });
  };

  // Inline Custom Start-to-End Time Slot State
  const [customInputSlotKey, setCustomInputSlotKey] = useState<string | null>(null);
  const [slotCustomStart, setSlotCustomStart] = useState("08:00 AM");
  const [slotCustomEnd, setSlotCustomEnd] = useState("02:00 PM");

  const handleOpenSlotCustomTime = (day: string, idx: number, currentShiftTime?: string) => {
    const key = `${day}-${idx}`;
    if (customInputSlotKey === key) {
      setCustomInputSlotKey(null);
      return;
    }

    if (currentShiftTime && currentShiftTime.includes("–")) {
      const parts = currentShiftTime.split("–");
      setSlotCustomStart(parts[0]?.trim() || "08:00 AM");
      const endPart = parts[1]?.trim() || "02:00 PM";
      const cleanEnd = endPart.split("(")[0]?.trim() || endPart;
      setSlotCustomEnd(cleanEnd);
    } else {
      setSlotCustomStart("08:00 AM");
      setSlotCustomEnd("02:00 PM");
    }

    setCustomInputSlotKey(key);
  };

  const handleApplyCustomStartEndTime = (day: string, idx: number, isEditModal: boolean = false) => {
    if (!slotCustomStart.trim() || !slotCustomEnd.trim()) return;

    const formattedShiftTime = `${slotCustomStart.trim()} – ${slotCustomEnd.trim()}`;

    if (!shiftTimeOptions.includes(formattedShiftTime)) {
      createCustomTimeSlotAPI({
        startTime: slotCustomStart.trim(),
        endTime: slotCustomEnd.trim(),
        formatted: formattedShiftTime,
      });
      const updatedOptions = [formattedShiftTime, ...shiftTimeOptions];
      setShiftTimeOptions(updatedOptions);
      localStorage.setItem("isalu_shift_time_options", JSON.stringify(updatedOptions));
    }

    if (isEditModal) {
      handleUpdateEditDayShiftTime(day, idx, formattedShiftTime);
    } else {
      handleUpdateDayShiftTime(day, idx, formattedShiftTime);
    }

    setCustomInputSlotKey(null);

    setToastAlert({
      title: `Custom Time Set for ${day}!`,
      description: `Shift time "${formattedShiftTime}" saved for ${day}.`,
      type: "success",
    });
  };
  // Custom Shift Time Options State
  const [shiftTimeOptions, setShiftTimeOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem("isalu_shift_time_options");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { }
    }
    return [
      "08:00 AM – 02:00 PM (Morning Shift)",
      "01:00 PM – 06:00 PM (Afternoon Shift)",
      "06:00 PM – 10:00 PM (Evening Shift)",
      "09:00 AM – 05:00 PM (Full Day)",
      "10:00 PM – 06:00 AM (Night Duty Shift)",
    ];
  });

  // Create Custom Shift Time Modal Form State
  const [showCreateTimeModal, setShowCreateTimeModal] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("08:00 AM");
  const [customEndTime, setCustomEndTime] = useState("02:00 PM");
  const [customShiftLabel, setCustomShiftLabel] = useState("");
  const [timeFormError, setTimeFormError] = useState("");

  const handleCreateCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartTime.trim() || !customEndTime.trim()) {
      setTimeFormError("Please enter both Start Time and End Time.");
      return;
    }

    const labelSuffix = customShiftLabel.trim() ? ` (${customShiftLabel.trim()})` : "";
    const formattedShiftTime = `${customStartTime.trim()} – ${customEndTime.trim()}${labelSuffix}`;

    if (!shiftTimeOptions.includes(formattedShiftTime)) {
      createCustomTimeSlotAPI({
        startTime: customStartTime.trim(),
        endTime: customEndTime.trim(),
        shiftLabel: customShiftLabel.trim(),
        formatted: formattedShiftTime,
      });
      const updated = [formattedShiftTime, ...shiftTimeOptions];
      setShiftTimeOptions(updated);
      localStorage.setItem("isalu_shift_time_options", JSON.stringify(updated));
    }

    // Auto-select the newly created shift time
    setSchedShiftTime(formattedShiftTime);

    // Reset Form
    setCustomShiftLabel("");
    setTimeFormError("");
    setShowCreateTimeModal(false);

    setToastAlert({
      title: "Custom Shift Hours Saved!",
      description: `Shift timetable option "${formattedShiftTime}" added.`,
      type: "success",
    });
  };
  // Create Specific Date Schedule Modal Form State
  const [showCreateSpecificDateModal, setShowCreateSpecificDateModal] = useState(false);
  const [specDateDoctorId, setSpecDateDoctorId] = useState("");
  const [specDateDoctorSearch, setSpecDateDoctorSearch] = useState("");
  const [showSpecDoctorDropdown, setShowSpecDoctorDropdown] = useState(false);
  const [specDateValue, setSpecDateValue] = useState("");
  const [specDateTargetDay, setSpecDateTargetDay] = useState("Sunday");
  const [specDateRoom, setSpecDateRoom] = useState("");
  const [specDateWeeks, setSpecDateWeeks] = useState<string[]>([]);
  const [specDateWeekPreset, setSpecDateWeekPreset] = useState("");
  const [specDateShiftTime, setSpecDateShiftTime] = useState("08:00 AM – 02:00 PM (Morning Shift)");
  const [specDateCapacity, setSpecDateCapacity] = useState(15);
  const [specDateNote, setSpecDateNote] = useState("Special Clinic Session");
  const [specDateFormError, setSpecDateFormError] = useState("");
  // Recurring schedule: per-day shift, capacity and weeks of the month.
  //   {"Sat": {"shiftTimes": ["02:00 PM – 04:00 PM"], "capacity": 12, "weeks": [1, 3]}}
  const [recurDays, setRecurDays] = useState<string[]>([]);
  const [recurConfigs, setRecurConfigs] = useState<Record<string, DayConfig>>({});

  const toggleRecurDay = (day: string) => {
    if (recurDays.includes(day)) {
      setRecurDays((prev) => prev.filter((d) => d !== day));
      setRecurConfigs((prev) => { const copy = { ...prev }; delete copy[day]; return copy; });
    } else {
      setRecurDays((prev) => WEEKDAY_SHORT_ORDER.filter((d) => d === day || prev.includes(d)));
      setRecurConfigs((prev) => ({
        ...prev,
        [day]: prev[day] || { shiftTimes: [specDateShiftTime], capacity: Number(specDateCapacity) || 15, weeks: [1, 3] },
      }));
    }
  };

  const toggleRecurWeek = (day: string, week: number) => {
    setRecurConfigs((prev) => {
      const cfg = prev[day];
      if (!cfg) return prev;
      const current = cfg.weeks || [];
      const weeks = current.includes(week) ? current.filter((w) => w !== week) : [...current, week].sort();
      return { ...prev, [day]: { ...cfg, weeks } };
    });
  };

  // Helper: derive week badges array from a pattern string
  const deriveWeeksFromPattern = (pattern: string): string[] => {
    if (!pattern) return [];
    const upper = pattern.toUpperCase();
    const weeks: string[] = [];
    if (upper.includes("1ST") || upper.includes("FIRST")) weeks.push("1st Week");
    if (upper.includes("2ND") || upper.includes("SECOND")) weeks.push("2nd Week");
    if (upper.includes("3RD") || upper.includes("THIRD")) weeks.push("3rd Week");
    if (upper.includes("4TH") || upper.includes("FOURTH")) weeks.push("4th Week");
    if (upper.includes("5TH") || upper.includes("FIFTH")) weeks.push("5th Week");
    if (upper.includes("EVERY") || upper.includes("ALL WEEKS")) {
      return ["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week"];
    }
    return weeks;
  };

  // Helper: derive pattern preset string from week badges array
  const derivePatternFromWeeks = (weeks: string[], dayName: string): string => {
    if (weeks.length === 0) return "";
    if (weeks.length === 5) return "EVERY";
    const sorted = [...weeks].sort();
    const weekNums = sorted.map((w) => w.replace(" Week", "").toUpperCase());
    if (weekNums.length === 2 && weekNums.includes("1ST") && weekNums.includes("3RD")) {
      return "1ST & 3RD";
    }
    if (weekNums.length === 2 && weekNums.includes("2ND") && weekNums.includes("4TH")) {
      return "2ND & 4TH";
    }
    if (weekNums.length === 3 && weekNums.includes("1ST") && weekNums.includes("2ND") && weekNums.includes("3RD")) {
      return "1ST - 3RD";
    }
    return `${weekNums.join(", ")} ${dayName}S`;
  };

  // Saved Custom Week Patterns State
  const [savedCustomPatterns, setSavedCustomPatterns] = useState<string[]>(() => {
    const saved = localStorage.getItem("isalu_custom_patterns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
    }
    return ["1ST, 2ND & 4TH SATURDAYS", "3RD & 5TH SUNDAYS"];
  });

  const [showCustomPatternInput, setShowCustomPatternInput] = useState(false);
  const [customPatternInput, setCustomPatternInput] = useState("");

  const handleAddCustomPattern = () => {
    if (!customPatternInput.trim()) return;
    const formatted = customPatternInput.trim().toUpperCase();
    if (!savedCustomPatterns.includes(formatted)) {
      const updated = [formatted, ...savedCustomPatterns];
      setSavedCustomPatterns(updated);
      localStorage.setItem("isalu_custom_patterns", JSON.stringify(updated));
    }
    setSpecDateWeekPreset(formatted);
    const derivedWeeks = deriveWeeksFromPattern(formatted);
    setSpecDateWeeks(derivedWeeks);
    setShowCustomPatternInput(false);
    setCustomPatternInput("");
    setToastAlert({
      title: "Custom Week Pattern Added!",
      description: `Pattern "${formatted}" saved and selected (${derivedWeeks.length} week(s) active).`,
      type: "success",
    });
  };

  // Extra Recurring Pattern Entries State for Multi-Pattern Schedules
  const [extraPatternEntries, setExtraPatternEntries] = useState<{
    id: string;
    preset: string;
    weeks: string[];
    shiftTime: string;
    capacity: number;
  }[]>([]);

  const handleAddPatternEntry = () => {
    const newEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      preset: "2ND & 4TH",
      weeks: ["2nd Week", "4th Week"],
      shiftTime: "01:00 PM – 06:00 PM (Afternoon Shift)",
      capacity: 15,
    };
    setExtraPatternEntries([...extraPatternEntries, newEntry]);
  };

  const handleRemovePatternEntry = (id: string) => {
    setExtraPatternEntries(extraPatternEntries.filter((item) => item.id !== id));
  };

  const handleUpdatePatternEntry = (id: string, updates: any) => {
    setExtraPatternEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.preset !== undefined) {
          updated.weeks = deriveWeeksFromPattern(updates.preset);
        }
        return updated;
      })
    );
  };

  /**
   * Find the doctor the user picked. Only real, registered doctors are
   * accepted: the old code invented a fake doctor ID, or silently fell back
   * to the first doctor in the list, which assigned schedules to the wrong
   * specialist.
   */
  const resolveSelectedDoctor = async (doctorId: string, searchText: string) => {
    const q = searchText.trim().toLowerCase();
    const find = (list: any[]) =>
      list.find((d: any) => doctorId && (String(d.id) === doctorId || String(d.doc_id) === doctorId)) ||
      (q
        ? list.find((d: any) => {
          const label = `${d.fullName || d.full_name || d.name || ""} (${d.acronym || ""})`.toLowerCase();
          return label === q || [d.fullName, d.full_name, d.name, d.acronym, d.id, d.doc_id]
            .some((v) => String(v || "").trim().toLowerCase() === q);
        })
        : undefined);
    let doc = find(doctorsList);
    if (!doc) doc = find(await loadDoctors());
    return doc || null;
  };

  const handleCreateSpecificDateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSchedule) return;
    setSpecDateFormError("");
    if (!specDateDoctorId && !specDateDoctorSearch.trim()) {
      setSpecDateFormError("Please select an Assigned Specialist Doctor from the list.");
      return;
    }
    if (!specDateRoom.trim()) {
      setSpecDateFormError("Please enter Consultation Room / Suite.");
      return;
    }
    if (recurDays.length === 0) {
      setSpecDateFormError("Select at least one duty day.");
      return;
    }
    const missingWeeks = recurDays.filter((d) => !(recurConfigs[d]?.weeks || []).length);
    if (missingWeeks.length) {
      setSpecDateFormError(`Select at least one week of the month for: ${missingWeeks.join(", ")}.`);
      return;
    }

    setIsSubmittingSchedule(true);
    try {
      const selectedDoc = await resolveSelectedDoctor(specDateDoctorId, specDateDoctorSearch);
      if (!selectedDoc) {
        throw new Error("That doctor is not registered. Pick a doctor from the list, or register them first.");
      }
      const docId = String(selectedDoc.doc_id || selectedDoc.id);
      const docName = selectedDoc.fullName || selectedDoc.full_name || selectedDoc.name || "Specialist Doctor";

      // Exactly: {"Sat": {"shiftTimes": [...], "capacity": 12, "weeks": [1, 3]}}
      const dayConfigs: Record<string, DayConfig> = {};
      recurDays.forEach((day) => {
        const cfg = recurConfigs[day];
        dayConfigs[day] = {
          shiftTimes: cfg?.shiftTimes?.length ? cfg.shiftTimes : [specDateShiftTime],
          capacity: Math.max(1, Number(cfg?.capacity) || Number(specDateCapacity) || 15),
          weeks: [...(cfg?.weeks || [])].sort(),
        };
      });
      const totalCapacity = recurDays.reduce((acc, d) => acc + dayConfigs[d].capacity, 0);

      const payload = {
        doctor_id: docId,
        doctorId: docId,
        room: specDateRoom.trim(),
        duty_days: recurDays,
        day_configs: dayConfigs,
        shift_time: recurDays.map((d) => `${describeWeeks(d, dayConfigs[d].weeks)}: ${dayConfigs[d].shiftTimes.join(", ")}`).join(" | "),
        capacity: Math.round(totalCapacity / Math.max(1, recurDays.length)),
        status: true,
      };
      ensureOk(await createScheduleAPI(payload), "Unable to create this schedule.");
      await Promise.all([loadSchedules(), loadDoctors()]);

      setRecurDays([]);
      setRecurConfigs({});
      setSpecDateRoom("");
      setSpecDateDoctorId("");
      setSpecDateDoctorSearch("");
      setSpecDateFormError("");
      setShowCreateSpecificDateModal(false);
      setToastAlert({
        title: "Recurring Schedule Created ✓",
        description: `${recurDays.map((d) => describeWeeks(d, dayConfigs[d].weeks)).join("; ")} saved for ${docName}.`,
        type: "success",
      });
    } catch (err: any) {
      setSpecDateFormError(err?.message || "Error creating schedule. Please try again.");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Edit Schedule Modal State
  const [editRoom, setEditRoom] = useState("");
  const [editDutyDays, setEditDutyDays] = useState<string[]>([]);
  const [editDaySchedules, setEditDaySchedules] = useState<Record<string, DayConfig>>({});
  const [editShiftTime, setEditShiftTime] = useState("");
  const [editCapacity, setEditCapacity] = useState(15);
  const [editFormError, setEditFormError] = useState("");

  const handleOpenEditSchedule = (sched: any) => {
    setEditingSchedule(sched);
    setEditRoom(sched.room || "");
    const days: string[] = Array.isArray(sched.dutyDays) ? sched.dutyDays : Array.isArray(sched.duty_days) ? sched.duty_days : [];
    const configs = sched.dayConfigs || sched.day_configs || {};
    setEditDutyDays(days);
    setEditShiftTime(shiftTimeOptions.includes(sched.shiftTime) ? sched.shiftTime : (shiftTimeOptions[0] || ""));
    setEditCapacity(sched.capacity || 15);

    const initialConfigs: Record<string, DayConfig> = {};
    days.forEach((day: string) => {
      if (configs[day]) {
        initialConfigs[day] = {
          ...configs[day],
          shiftTimes: Array.isArray(configs[day].shiftTimes) && configs[day].shiftTimes.length ? configs[day].shiftTimes : [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"],
          capacity: Number(configs[day].capacity) || sched.capacity || 15,
        };
      } else {
        initialConfigs[day] = {
          shiftTimes: [sched.shiftTime || shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"],
          capacity: sched.capacity || 15,
        };
      }
    });
    setEditDaySchedules(initialConfigs);
    setEditFormError("");
  };

  const handleToggleEditDay = (day: string) => {
    if (editDutyDays.includes(day)) {
      setEditDutyDays(editDutyDays.filter((d) => d !== day));
      setEditDaySchedules((prev) => {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      });
    } else {
      setEditDutyDays([...editDutyDays, day]);
      setEditDaySchedules((prev) => ({
        ...prev,
        [day]: prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
      }));
    }
  };

  const handleAddShiftTimeToEditDay = (day: string) => {
    setEditDaySchedules((prev) => {
      const current = prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 };
      const unused = shiftTimeOptions.find((opt) => !current.shiftTimes.includes(opt)) || shiftTimeOptions[0] || "01:00 PM – 06:00 PM (Afternoon Shift)";
      return {
        ...prev,
        [day]: {
          ...current,
          shiftTimes: [...current.shiftTimes, unused],
        },
      };
    });
  };

  const handleRemoveShiftTimeFromEditDay = (day: string, index: number) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current || current.shiftTimes.length <= 1) return prev;
      const updated = current.shiftTimes.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateEditDayShiftTime = (day: string, index: number, value: string) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      const updated = [...current.shiftTimes];
      updated[index] = value;
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateEditDayCapacity = (day: string, capacity: number) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: { ...current, capacity: Math.max(1, capacity) },
      };
    });
  };


  // Shared submission guard for both specialist schedule forms.
  // The two schedule forms use the same backend write path, so one guard
  // prevents duplicate submissions while either form is being saved.
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const parse_status_bool = (value: any) => !/disabled|inactive|off duty|suspend/i.test(String(value ?? ""));

  const [schedShiftTime, setSchedShiftTime] = useState("08:00 AM – 02:00 PM (Morning Shift)");
  const [schedCapacity, setSchedCapacity] = useState(15);
  const [schedStatus, setSchedStatus] = useState("Active On Duty");
  const [schedFormError, setSchedFormError] = useState("");

  const handleCreateSpecialistSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSchedule) return;
    setSchedFormError("");
    if (!schedDoctorId && !schedDoctorSearch.trim()) {
      setSchedFormError("Please select an Assigned Specialist Doctor from the list.");
      return;
    }
    if (!schedRoom.trim() || schedDutyDays.length === 0) {
      setSchedFormError("Please fill out Consultation Room and select at least one Duty Day.");
      return;
    }

    setIsSubmittingSchedule(true);
    try {
      const selectedDoc = await resolveSelectedDoctor(schedDoctorId, schedDoctorSearch);
      if (!selectedDoc) {
        throw new Error("That doctor is not registered. Pick a doctor from the list, or register them first.");
      }
      const docId = String(selectedDoc.doc_id || selectedDoc.id);
      const docName = selectedDoc.fullName || selectedDoc.full_name || selectedDoc.name || "Specialist Doctor";

      const dayConfigs: Record<string, DayConfig> = {};
      schedDutyDays.forEach((day) => {
        const cfg = schedDaySchedules[day];
        dayConfigs[day] = {
          shiftTimes: cfg?.shiftTimes?.length ? cfg.shiftTimes : [schedShiftTime],
          capacity: Math.max(1, Number(cfg?.capacity) || schedCapacity || 15),
        };
      });
      const totalCapacity = schedDutyDays.reduce((acc, day) => acc + dayConfigs[day].capacity, 0);
      const daySummaries = schedDutyDays.map((day) => `${day}: ${dayConfigs[day].shiftTimes.join(", ")}`);

      const payload = {
        doctor_id: docId,
        doctorId: docId,
        room: schedRoom.trim(),
        duty_days: schedDutyDays,
        day_configs: dayConfigs,
        shift_time: daySummaries.join(" | "),
        capacity: Math.round(totalCapacity / Math.max(1, schedDutyDays.length)),
        status: parse_status_bool(schedStatus),
      };
      ensureOk(await createScheduleAPI(payload), "Unable to create this schedule.");
      await Promise.all([loadSchedules(), loadDoctors()]);

      // Reset to the form defaults so the next schedule starts clean.
      setSchedRoom("");
      setSchedDoctorId("");
      setSchedDoctorSearch("");
      setSchedDutyDays(["Mon", "Wed", "Fri"]);
      setSchedDaySchedules({
        Mon: { shiftTimes: [schedShiftTime], capacity: 15 },
        Wed: { shiftTimes: [schedShiftTime], capacity: 15 },
        Fri: { shiftTimes: [schedShiftTime], capacity: 15 },
      });
      setSchedFormError("");
      setShowCreateScheduleModal(false);
      setToastAlert({
        title: "Specialist Schedule Saved ✓",
        description: `${schedDutyDays.join(", ")} schedule (${totalCapacity} visits/week) created for ${docName}.`,
        type: "success",
      });
    } catch (err: any) {
      setSchedFormError(err?.message || "Error creating schedule. Please try again.");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const isScheduleActive = (sched: any) =>
    sched.status !== false && !(typeof sched.status === "string" && /disabled/i.test(sched.status));

  const handleToggleScheduleStatus = (sched: any) => {
    const isDisabling = isScheduleActive(sched);
    const targetId = sched.sched_id || sched.id;
    const name = sched.doctorName || sched.doctor_name || "this specialist";

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable Specialist Shift" : "Enable Specialist Shift",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} the consultation schedule for "${name}" (${sched.specialty})? Patients will ${isDisabling ? "no longer" : "now"} be able to book these days.`,
      confirmText: isDisabling ? "Yes, Disable Shift" : "Yes, Enable Shift",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        // Send a real boolean: the old "Disabled Shift 🚫" label was read as
        // "active" by the backend, so disabling never took effect.
        ensureOk(await updateScheduleAPI(targetId, { status: !isDisabling }), "Unable to update the schedule status.");
        await Promise.all([loadSchedules(), loadDoctors()]);
        setToastAlert({
          title: isDisabling ? "Shift Disabled 🚫" : "Shift Re-Enabled ✓",
          description: `Schedule status for ${name} updated successfully.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  const handleDeleteSchedule = (sched: any) => {
    const targetId = sched.sched_id || sched.id;
    const name = sched.doctorName || sched.doctor_name || "this specialist";
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete Specialist Schedule?",
      message: `Are you sure you want to permanently delete the consultation schedule for "${name}" (${sched.specialty})? Existing bookings are kept, but no new bookings can be made on these days. This cannot be undone.`,
      confirmText: "Delete Schedule",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        ensureOk(await deleteScheduleAPI(targetId), "Unable to delete this schedule.");
        await Promise.all([loadSchedules(), loadDoctors()]);
        setToastAlert({
          title: "Schedule Deleted ✓",
          description: `Specialist schedule for ${name} removed from database.`,
          type: "info",
        });
      },
    });
  };

  // ------------------------------------------------------------------
  // CHANGE ONE CLINIC DATE (cancel or move a single occurrence)
  // ------------------------------------------------------------------
  const [scheduleExceptions, setScheduleExceptions] = useState<any[]>([]);
  const [showChangeDateModal, setShowChangeDateModal] = useState(false);
  const [chgDoctorId, setChgDoctorId] = useState("");
  const [chgDoctorSearch, setChgDoctorSearch] = useState("");
  const [chgClinicDates, setChgClinicDates] = useState<any[]>([]);
  const [chgLoadingDates, setChgLoadingDates] = useState(false);
  const [chgOriginalDate, setChgOriginalDate] = useState("");
  const [chgPreview, setChgPreview] = useState<any | null>(null);
  const [chgAction, setChgAction] = useState<"cancel" | "reschedule">("cancel");
  const [chgNewDate, setChgNewDate] = useState("");
  const [chgShiftTime, setChgShiftTime] = useState("");
  const [chgReason, setChgReason] = useState("");
  const [chgError, setChgError] = useState("");
  const [chgSubmitting, setChgSubmitting] = useState(false);
  const [chgResult, setChgResult] = useState<any | null>(null);
  const [chgAvailability, setChgAvailability] = useState<Record<string, any>>({});

  // Notification channels (is email/SMS really configured?) + test send.
  const [notifyChannels, setNotifyChannels] = useState<any | null>(null);
  const [showNotifyTest, setShowNotifyTest] = useState(false);
  const [notifyTestEmail, setNotifyTestEmail] = useState("");
  const [notifyTestPhone, setNotifyTestPhone] = useState("");
  const [notifyTestResult, setNotifyTestResult] = useState<any | null>(null);
  const [notifyTestSending, setNotifyTestSending] = useState(false);

  const loadNotifyChannels = async () => {
    const res: any = await getNotificationChannelsAPI();
    if (res && !isApiError(res)) setNotifyChannels(res);
  };

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyTestSending) return;
    setNotifyTestSending(true);
    setNotifyTestResult(null);
    try {
      const res: any = ensureOk(await sendTestNotificationAPI(notifyTestEmail.trim(), notifyTestPhone.trim()), "Unable to send the test.");
      setNotifyTestResult(res);
    } catch (err: any) {
      setNotifyTestResult({ error: err?.message || "Unable to send the test." });
    } finally {
      setNotifyTestSending(false);
    }
  };

  const loadScheduleExceptions = async () => {
    const remote = await getScheduleExceptionsAPI();
    if (!isApiError(remote) && Array.isArray(remote)) setScheduleExceptions(remote);
  };

  const loadChangeableDates = async (docId: string) => {
    setChgLoadingDates(true);
    setChgClinicDates([]);
    setChgAvailability({});
    try {
      const res: any = await getDoctorAvailableDatesAPI(docId, 90);
      if (isApiError(res) || !Array.isArray(res?.availability)) throw new Error(res?.error || "Unable to load clinic dates.");
      const map: Record<string, any> = {};
      res.availability.forEach((d: any) => { map[d.date] = d; });
      setChgAvailability(map);
      const today = toLocalISODate(new Date());
      setChgClinicDates(res.availability.filter((d: any) => d.onDuty && d.date >= today));
    } catch (err: any) {
      setChgError(err?.message || "Unable to load clinic dates.");
    } finally {
      setChgLoadingDates(false);
    }
  };

  const openChangeDateModal = (sched?: any) => {
    setChgError("");
    setChgResult(null);
    setChgPreview(null);
    setChgOriginalDate("");
    setChgAction("cancel");
    setChgNewDate("");
    setChgReason("");
    setChgClinicDates([]);
    const docId = sched ? String(sched.doctorId || sched.doctor_id || "") : "";
    setChgDoctorId(docId);
    const doc = doctorsList.find((d: any) => String(d.doc_id || d.id) === docId);
    setChgDoctorSearch(doc ? `${doc.fullName || doc.name} (${doc.acronym || "Specialist"})` : "");
    setShowChangeDateModal(true);
    void loadNotifyChannels();
    if (docId) void loadChangeableDates(docId);
  };

  const selectChangeDoctor = (d: any) => {
    const id = String(d.doc_id || d.id);
    setChgDoctorId(id);
    setChgDoctorSearch(`${d.fullName || d.name} (${d.acronym || "Specialist"})`);
    setChgOriginalDate("");
    setChgPreview(null);
    setChgError("");
    void loadChangeableDates(id);
  };

  const selectChangeDate = async (date: string) => {
    setChgOriginalDate(date);
    setChgPreview(null);
    setChgError("");
    const res: any = await previewScheduleExceptionAPI(chgDoctorId, date);
    if (isApiError(res) || !res) {
      setChgError(res?.error || "Unable to load the patients booked on this date.");
      return;
    }
    setChgPreview(res);
    setChgShiftTime(res.shift || shiftTimeOptions[0] || "");
  };

  const formatLongDate = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  };

  const newDateProblem = (() => {
    if (chgAction !== "reschedule" || !chgNewDate) return "";
    if (chgNewDate < toLocalISODate(new Date())) return "The new date cannot be in the past.";
    if (chgNewDate === chgOriginalDate) return "Pick a different date from the original clinic.";
    const info = chgAvailability[chgNewDate];
    if (info?.onDuty) return "This doctor already has a clinic on that date. Choose a day without a clinic.";
    return "";
  })();

  const pollExceptionNotifications = async (exceptionId: string) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      const res: any = await getScheduleExceptionAPI(exceptionId);
      if (isApiError(res) || !res) return;
      setChgResult(res);
      if (!["pending", "sending"].includes(res.notificationStatus)) {
        void loadScheduleExceptions();
        return;
      }
    }
  };

  const handleSubmitDateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chgSubmitting) return;
    setChgError("");
    if (!chgDoctorId) return setChgError("Select a doctor.");
    if (!chgOriginalDate) return setChgError("Select the clinic date to change.");
    if (chgAction === "reschedule") {
      if (!chgNewDate) return setChgError("Choose the new date for this clinic.");
      if (newDateProblem) return setChgError(newDateProblem);
    }
    if (!chgReason.trim()) return setChgError("Enter a short reason. It is included in the patients' SMS and email.");

    setChgSubmitting(true);
    try {
      const res: any = ensureOk(await createScheduleExceptionAPI({
        doctor_id: chgDoctorId,
        original_date: chgOriginalDate,
        action: chgAction,
        new_date: chgAction === "reschedule" ? chgNewDate : "",
        shift_time: chgAction === "reschedule" ? chgShiftTime : "",
        reason: chgReason.trim(),
      }), "Unable to change this clinic date.");
      setChgResult(res);
      await Promise.all([loadScheduleExceptions(), fetchBookings(), loadDoctors()]);
      void fetchDashboardSummary();
      setToastAlert({
        title: chgAction === "cancel" ? "Clinic Cancelled" : "Clinic Moved ✓",
        description: `${res.affectedCount} patient(s) affected${res.affectedCount ? " and are being notified by SMS and email" : ""}.`,
        type: chgAction === "cancel" ? "warning" : "success",
      });
      if (res.affectedCount) void pollExceptionNotifications(res.exception_id);
    } catch (err: any) {
      setChgError(err?.message || "Unable to change this clinic date.");
    } finally {
      setChgSubmitting(false);
    }
  };

  const handleRetryExceptionNotifications = async (exc: any) => {
    const res: any = await retryScheduleExceptionNotificationsAPI(exc.exception_id);
    if (isApiError(res) || !res) {
      setToastAlert({ title: "Retry Failed", description: res?.error || "Unable to retry notifications.", type: "danger" });
      return;
    }
    setToastAlert({ title: "Retrying Notifications", description: `Re-sending to ${res.retrying} patient(s).`, type: "info" });
    setTimeout(() => void loadScheduleExceptions(), 4000);
  };

  const handleUndoException = (exc: any) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Undo Clinic Change?",
      message: `Restore the regular ${formatLongDate(exc.originalDate)} clinic for ${exc.doctorName}${exc.action === "reschedule" ? ` and remove the moved clinic on ${formatLongDate(exc.newDate)}` : ""}?`,
      confirmText: "Undo Change",
      cancelText: "Keep",
      variant: "primary",
      onConfirm: async () => {
        ensureOk(await deleteScheduleExceptionAPI(exc.exception_id), "Unable to undo this change.");
        await loadScheduleExceptions();
        setToastAlert({ title: "Change Undone ✓", description: "The regular clinic is open for bookings again.", type: "success" });
      },
    });
  };

  /**
   * Re-read the signed-in user's role and modules from the server, so
   * changes made in the Roles screen apply without signing out.
   */
  const refreshStaffProfile = async () => {
    const res: any = await getStaffProfileAPI();
    if (!res || isApiError(res) || !res.user) return;
    setCurrentUser((prev: any) => {
      const next = {
        ...(prev || {}),
        name: res.user.name || prev?.name,
        role: res.user.role || prev?.role,
        desk: res.user.desk || prev?.desk,
        email: res.user.email || prev?.email,
        isAdmin: res.user.isAdmin === true,
        allowedDesks: Array.isArray(res.user.allowedDesks) ? res.user.allowedDesks : [],
      };
      try { sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(next)); } catch { }
      return next;
    });
  };

  const handleRequestToggleUserDisable = (user: any) => {
    const isDisabling = user.status === "Active";
    const targetId = user.id || user.user_id;

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable Staff Account" : "Enable Staff Account",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} staff account access for "${user.name}" (${user.email})? This staff member will ${isDisabling ? "be blocked from logging in" : "now be allowed to log in"}.`,
      confirmText: isDisabling ? "Yes, Disable Account" : "Yes, Enable Account",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        const newStatus = isDisabling ? "Disabled" : "Active";

        ensureOk(await updateSystemUserAPI(targetId, { status: newStatus }), "Unable to update this staff account.");

        const remoteUsers = await getSystemUsersAPI();
        const updated = Array.isArray(remoteUsers)
          ? remoteUsers
          : systemUsers.map((u) => ((u.id === targetId || u.user_id === targetId) ? { ...u, status: newStatus } : u));

        setSystemUsers(updated);
        broadcastUserChange(updated);

        setToastAlert({
          title: isDisabling ? "Account Disabled 🚫" : "Account Re-Enabled ✓",
          description: `Staff account status for ${user.name} updated to ${newStatus}.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };


  const actionParam = searchParams.get("action");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("isalu_staff_authenticated") === "true";
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = sessionStorage.getItem("isalu_staff_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      } catch { }
    }
    const legacyName = sessionStorage.getItem("isalu_staff_user") || "admin";
    const isAdmin = legacyName.toLowerCase().includes("admin");
    return {
      name: legacyName.includes("@") ? legacyName.split("@")[0].toUpperCase() : (legacyName === "admin" ? "System Administrator" : legacyName),
      role: isAdmin ? "Super Administrator" : "Hospital Staff Officer",
      desk: isAdmin ? "Central Command" : "Helpdesk Reception",
      email: legacyName.includes("@") ? legacyName : "admin@isaluhospitals.com",
    };
  });
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: "danger" | "warning" | "primary";
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "primary",
    onConfirm: () => { },
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState("");
  const closeConfirmModal = () => {
    if (isConfirming) return;
    setConfirmModalError("");
    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
  };
  const runConfirmAction = async () => {
    setIsConfirming(true);
    setConfirmModalError("");
    try {
      await confirmModalConfig.onConfirm();
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      setConfirmModalError(err?.message || "The action could not be completed.");
    } finally {
      setIsConfirming(false);
    }
  };
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false);

  const evaluatePasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, label: "", color: "bg-slate-200 dark:bg-slate-800", textColor: "text-slate-400", length: false, mixed: false, number: false, symbol: false };
    }
    const length = password.length >= 8;
    const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password);
    const number = /\d/.test(password);
    const symbol = /[^A-Za-z0-9]/.test(password);

    const score = [length, mixed, number, symbol].filter(Boolean).length;

    let label = "Weak";
    let color = "bg-red-500";
    let textColor = "text-red-500";

    if (score === 2) {
      label = "Fair";
      color = "bg-amber-500";
      textColor = "text-amber-500";
    } else if (score === 3) {
      label = "Strong";
      color = "bg-emerald-500";
      textColor = "text-emerald-500";
    } else if (score >= 4) {
      label = "Very Strong";
      color = "bg-cyan-500";
      textColor = "text-cyan-500";
    }

    return { score, label, color, textColor, length, mixed, number, symbol };
  };

  const [loginUsername, setLoginUsername] = useState("");
  const [isApprovingHmo, setIsApprovingHmo] = useState(false);
  const saveBookings = (updatedList: any[]) => {
    // Keep booking mutations in React state; the backend remains the source of truth.
    // Persisting full booking objects can exceed browser storage quotas (e.g. referral documents).
    setBookings(updatedList);
    try { localStorage.removeItem("isalu_bookings"); } catch (storageError) {
      console.warn("Unable to clear legacy booking cache:", storageError);
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("isalu_booking_updated"));
    try {
      const channel = new BroadcastChannel("isalu_hospital_channel");
      channel.postMessage({ type: "BOOKINGS_UPDATED", timestamp: Date.now() });
      channel.close();
    } catch { }
  };
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStageText, setLoginStageText] = useState("Verifying Credentials...");

  type DeskType =
    | "helpdesk"
    | "hmo"
    | "cashdesk"
    | "analytics"
    | "monitor"
    | "users"
    | "all_patients"
    | "checked_in_patients"
    | "hmo_enrollees"
    | "private_patients"
    | "create_specialist_schedule"
    | "clinic"
    | "disabled_bookings";

  const validDesks: DeskType[] = [
    "helpdesk",
    "hmo",
    "cashdesk",
    "analytics",
    "monitor",
    "users",
    "all_patients",
    "checked_in_patients",
    "hmo_enrollees",
    "private_patients",
    "create_specialist_schedule",
    "clinic",
    "disabled_bookings",
  ];

  // HMO Provider Modal States
  const [showUploadHmoModal, setShowUploadHmoModal] = useState(false);

  // New HMO Provider Form State
  const [newHmoProviderForm, setNewHmoProviderForm] = useState({
    providerName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    activeEnrolleesCount: "0"
  });

  const [allPatientsCurrentPage, setAllPatientsCurrentPage] = useState<number>(1);
  const [allPatientsItemsPerPage, setAllPatientsItemsPerPage] = useState<number>(10);
  const [activeDesk, setActiveDesk] = useState<DeskType>(
    deskParam && validDesks.includes(deskParam) ? deskParam : "helpdesk"
  );


  const isDeskAllowed = (desk: DeskType): boolean => {
    if (!currentUser?.role) return false;

    // 1. Server-provided profile (login / auth/me): admins see everything,
    //    everyone else exactly the modules configured on their role.
    if (currentUser.isAdmin === true) return true;
    if (Array.isArray(currentUser.allowedDesks)) {
      return currentUser.allowedDesks.includes(desk);
    }

    // 2. Older sessions without that profile: the role's configured modules.
    const configuredRole = roles.find((r: any) =>
      [r.name, r.role_id, r.id].some((v) => String(v || "").toLowerCase().trim() === String(currentUser.role).toLowerCase().trim())
    );
    const configuredDesks = configuredRole?.allowedDesks || configuredRole?.allowed_desks;
    if (Array.isArray(configuredDesks) && configuredDesks.length > 0 && !isSuperAdminUser(currentUser)) {
      return configuredDesks.includes(desk) || (configuredRole?.primaryDesk || configuredRole?.primary_desk) === desk;
    }

    // 3. Fallback: infer from the role name.

    const roleStr = String(currentUser.role)
      .toLowerCase()
      .trim();

    if (
      roleStr.includes("super administrator") ||
      roleStr.includes("hospital administrator") ||
      roleStr.includes("chief") ||
      roleStr.includes("super admin") ||
      roleStr.includes("system administrator") ||
      roleStr === "admin" ||
      roleStr === "superadmin"
    ) {
      return true;
    }

    if (roleStr.includes("hmo") || roleStr.includes("insurance")) {
      return desk === "hmo" || desk === "hmo_enrollees";
    }

    if (
      roleStr.includes("cash") ||
      roleStr.includes("cashier") ||
      roleStr.includes("billing")
    ) {
      return desk === "cashdesk" || desk === "private_patients";
    }

    if (
      roleStr.includes("monitor") ||
      roleStr.includes("controller")
    ) {
      return desk === "monitor";
    }

    if (
      roleStr.includes("analytics") ||
      roleStr.includes("executive")
    ) {
      return desk === "analytics";
    }

    if (
      roleStr.includes("helpdesk") ||
      roleStr.includes("reception") ||
      roleStr.includes("staff")
    ) {
      return (
        desk === "helpdesk" ||
        desk === "all_patients" ||
        desk === "checked_in_patients"
      );
    }

    const matchedRole = roles.find((r: any) => {
      const roleName = String(r.name || "").toLowerCase().trim();
      const roleId = String(
        r.role_id || r.id || ""
      ).toLowerCase().trim();

      return roleName === roleStr || roleId === roleStr;
    });

    if (matchedRole) {
      const allowedList =
        matchedRole.allowedDesks ||
        matchedRole.allowed_desks ||
        [];

      if (Array.isArray(allowedList) && allowedList.length > 0) {
        return allowedList.includes(desk);
      }

      const primary =
        matchedRole.primaryDesk ||
        matchedRole.primary_desk;

      if (primary) {
        return primary === desk;
      }
    }

    if (
      desk === "clinic" ||
      desk === "users" ||
      desk === "disabled_bookings"
    ) {
      return false;
    }

    return false;
  };

  const isSuperAdminUser = (user: any): boolean => {
    if (!user) return false;
    // Trust the server's decision when the profile carries it.
    if (typeof user.isAdmin === "boolean") return user.isAdmin;
    const roleStr = String(user.role || "").toLowerCase();
    const nameStr = String(user.name || user.username || "").toLowerCase();
    return (
      roleStr.includes("super administrator") ||
      roleStr.includes("hospital administrator") ||
      roleStr.includes("chief") ||
      roleStr.includes("super admin") ||
      roleStr === "admin" ||
      roleStr === "superadmin" ||
      nameStr === "admin" ||
      nameStr.includes("system administrator")
    );
  };

  const handleSelectDesk = (targetDesk: DeskType) => {
    if (!isDeskAllowed(targetDesk)) {
      setToastAlert({
        title: "Access Restricted 🔒",
        description: `Your staff account (${currentUser?.name || "Staff"} - ${currentUser?.role || "Staff"}) is restricted from accessing the ${targetDesk.toUpperCase()} desk. Contact System Administrator for access.`,
        type: "warning",
      });
      return;
    }
    setActiveDesk(targetDesk);
    setSearchParams({ desk: targetDesk });
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (deskParam && validDesks.includes(deskParam as DeskType)) {
      if (isDeskAllowed(deskParam as DeskType)) {
        setActiveDesk(deskParam as DeskType);
        if (deskParam === "clinic" && actionParam === "create") {
          setShowCreateClinicModal(true);
        }
      } else {
        const primary = getPrimaryDeskForRole(currentUser?.role);
        setActiveDesk(primary as DeskType);
        setSearchParams({ desk: primary });
      }
    }
  }, [deskParam, actionParam, currentUser]);

  useEffect(() => {
    const handleNavEvent = (e: any) => {
      const target = (e.detail || "helpdesk") as DeskType;
      if (validDesks.includes(target)) {
        handleSelectDesk(target);
      }
    };
    window.addEventListener("isalu_navigate_desk", handleNavEvent);
    return () => window.removeEventListener("isalu_navigate_desk", handleNavEvent);
  }, [currentUser]);

  useEffect(() => {
    const handle401AuthError = (e: any) => {
      const msg = e.detail?.message || "Session Expired: Your security token has expired. Please log in again.";
      setToastAlert({
        title: "Session Expired 🔐",
        description: msg,
        type: "danger",
      });
      setLoginError(msg);
      setIsAuthenticated(false);
      setCurrentUser(null);
      sessionStorage.removeItem("isalu_staff_authenticated");
      sessionStorage.removeItem("isalu_staff_user");
      sessionStorage.removeItem("isalu_staff_jwt");
      sessionStorage.removeItem("isalu_staff_refresh");
      sessionStorage.removeItem("isalu_auth_tokens");
    };

    window.addEventListener("isalu_auth_401", handle401AuthError);
    return () => window.removeEventListener("isalu_auth_401", handle401AuthError);
  }, []);

  const [toastAlert, setToastAlert] = useState<{
    title: string;
    description?: string;
    type?: "success" | "info" | "warning" | "danger";
  } | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);

  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);

  // Pagination states for booking list
  const [bookingCurrentPage, setBookingCurrentPage] = useState<number>(1);
  const [bookingItemsPerPage, setBookingItemsPerPage] = useState<number>(10);

  // Pagination states for HMO approval list
  const [hmoCurrentPage, setHmoCurrentPage] = useState<number>(1);
  const [hmoItemsPerPage, setHmoItemsPerPage] = useState<number>(10);
  const [hmoTableSearch, setHmoTableSearch] = useState("");
  const [hmoApprovalProviderFilter, setHmoApprovalProviderFilter] = useState("all");
  const [cashdeskSearch, setCashdeskSearch] = useState("");
  const [cashdeskClinicFilter, setCashdeskClinicFilter] = useState("all");
  const [cashdeskCurrentPage, setCashdeskCurrentPage] = useState(1);
  const [cashdeskItemsPerPage, setCashdeskItemsPerPage] = useState(10);
  const [cashdeskSubmittingRef, setCashdeskSubmittingRef] = useState<string | null>(null);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveClinicFilter, setArchiveClinicFilter] = useState("all");
  const [allPatientsSearch, setAllPatientsSearch] = useState("");
  const [allPatientsStatusFilter, setAllPatientsStatusFilter] = useState("all");
  const [allPatientsClinicFilter, setAllPatientsClinicFilter] = useState("all");
  const [privatePatientsSearch, setPrivatePatientsSearch] = useState("");
  const [privatePatientsStatusFilter, setPrivatePatientsStatusFilter] = useState("all");
  const [privatePatientsClinicFilter, setPrivatePatientsClinicFilter] = useState("all");
  const [currentAllPatientsPage, setCurrentAllPatientsPage] = useState(1);

  type DashboardSummary = {
    totalBookings: number;
    checkedInCount: number;
    pendingHmoCount: number;
    pendingCashCount: number;
    todayCount?: number;
    date?: string;
  };

  const DASHBOARD_SUMMARY_CACHE_KEY = "isalu_dashboard_summary";

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(() => {
    try {
      const cached = localStorage.getItem(DASHBOARD_SUMMARY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only reuse counts saved today; yesterday's numbers would be wrong.
        if (parsed && typeof parsed === "object" && parsed.date === toLocalISODate(new Date())) {
          return {
            totalBookings: Number(parsed.totalBookings ?? 0),
            checkedInCount: Number(parsed.checkedInCount ?? 0),
            pendingHmoCount: Number(parsed.pendingHmoCount ?? 0),
            pendingCashCount: Number(parsed.pendingCashCount ?? 0),
            todayCount: Number(parsed.todayCount ?? 0),
            date: parsed.date,
          };
        }
      }
    } catch { }
    return null;
  });

  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const bookingRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryRequestRef = useRef<Promise<void> | null>(null);

  // Shared dashboard metrics used by KPI cards, charts, and reports.
  // Keep these derived from the current booking state so they are always in scope
  // and update automatically when bookings change.
  const activeBookings = bookings.filter((b) =>
    b?.isActive === true || b?.is_active === true ||
    (b?.isActive !== false && b?.is_active !== false &&
      String(b?.status || "").toLowerCase() !== "disabled" && !b?.disabled)
  );
  const totalBookings = Number(dashboardSummary?.totalBookings ?? activeBookings.length);
  const checkedInCount = activeBookings.filter((b) => String(b?.status || "").toLowerCase() === "checked in").length;
  const completedCount = activeBookings.filter((b) => String(b?.status || "").toLowerCase() === "completed").length;
  const confirmedCount = activeBookings.filter((b) => {
    const status = String(b?.status ?? "confirmed").trim().toLowerCase().replace(/[ -]+/g, "_");
    return ["confirmed", "booked", "scheduled"].includes(status);
  }).length;
  const pendingHmoCount = activeBookings.filter((b) => {
    const paymentType = String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase();
    const hmoStatus = String(b?.hmoStatus ?? b?.hmo_status ?? "").toLowerCase();
    return paymentType.includes("hmo") && !["approved", "cleared"].includes(hmoStatus);
  }).length;
  const hmoApprovedCount = activeBookings.filter((b) => {
    const paymentType = String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase();
    const hmoStatus = String(b?.hmoStatus ?? b?.hmo_status ?? "").toLowerCase();
    return paymentType.includes("hmo") && hmoStatus === "approved";
  }).length;
  const pendingCashCount = activeBookings.filter((b) => {
    const paymentType = String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase();
    const paymentStatus = String(b?.paymentStatus ?? b?.payment_status ?? "").toLowerCase();
    return (paymentType.includes("private") || paymentType.includes("self-pay") || paymentType.includes("self pay")) && paymentStatus !== "cleared";
  }).length;
  const clearedPaymentCount = activeBookings.filter((b) => String(b?.paymentStatus ?? b?.payment_status ?? "").toLowerCase() === "cleared").length;
  const privateSelfPayCount = activeBookings.filter((b) => {
    const paymentType = String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase();
    return paymentType.includes("private") || paymentType.includes("self-pay") || paymentType.includes("self pay") || !paymentType;
  }).length;
  const hmoEnrolleeCount = activeBookings.filter((b) => String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase().includes("hmo")).length;
  const referralDocCount = activeBookings.filter((b) => Boolean(b?.referralDocName || b?.referral_doc_name)).length;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hmoProviderFilter, setHmoProviderFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);
  const [archivePage, setArchivePage] = useState(1);
  const [archivePageSize, setArchivePageSize] = useState(10);
  const [monitorClinic, setMonitorClinic] = useState("all");
  const [monitorShowNames, setMonitorShowNames] = useState(false);
  const [monitorStaffControls, setMonitorStaffControls] = useState(true);
  const [monitorBusyRef, setMonitorBusyRef] = useState<string | null>(null);
  const [monitorUndo, setMonitorUndo] = useState<{ refCode: string; name: string } | null>(null);
  const monitorUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [monitorNow, setMonitorNow] = useState(() => new Date());
  const monitorRef = useRef<HTMLDivElement | null>(null);
  // Helpdesk category filter: "all" | "private" | "hmo" | "hmo:<provider name>"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [eligibleOnlyFilter, setEligibleOnlyFilter] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sendingReminderRef, setSendingReminderRef] = useState<string | null>(null);

  const clinicScrollRef = useRef<HTMLDivElement>(null);
  const scrollClinics = (direction: 'left' | 'right') => {
    if (clinicScrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      clinicScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleTrashBooking = async (booking: any) => {
    const refCode = booking.refCode || booking.ref_code || booking.id;
    if (!refCode) {
      setToastAlert({ title: "Unable to update booking", description: "This booking has no reference code.", type: "danger" });
      return;
    }

    try {
      ensureOk(await deleteBookingAPI(refCode), `Unable to disable booking ${refCode}.`);
      setBookings((prev) => prev.filter((b) => (b.refCode || b.ref_code || b.id) !== refCode));
      void loadDisabledBookings();
      setToastAlert({ title: "Booking Trashed 🗑", description: `Booking record ${refCode} has been marked as disabled.`, type: "success" });
      void fetchDashboardSummary();
    } catch (err: any) {
      console.error("Failed to disable booking:", err);
      setToastAlert({ title: "Unable to trash booking", description: err?.response?.data?.detail || err?.message || "The booking could not be updated. Please try again.", type: "danger" });
    }
  };

  const handleApproveHmo = async (refCode: string, policy: string, auth: string) => {
    if (!refCode || isApprovingHmo) return;
    setIsApprovingHmo(true);
    try {
      const response = ensureOk(await approveHmoBookingAPI(refCode, policy, auth), "Unable to approve this authorization.");
      setBookings((prev) => prev.map((b) =>
        (b.refCode === refCode || b.ref_code === refCode)
          ? {
            ...b,
            ...(policy ? { hmoPolicyCode: policy, hmo_policy_code: policy } : {}),
            ...(auth ? { hmoAuthCode: auth, hmo_auth_code: auth } : {}),
            hmoStatus: "Approved", hmo_status: "Approved",
            paymentStatus: "Cleared", payment_status: "Cleared",
          }
          : b
      ));
      setSelectedHmoBooking(null);
      setToastAlert({ title: "HMO Authorization Approved", description: `Booking ${refCode} was approved successfully.`, type: "success" });
      void fetchBookings();
      void fetchDashboardSummary();
      return response;
    } catch (err: any) {
      console.error("HMO approval failed:", err);
      setToastAlert({ title: "HMO Approval Failed", description: err?.response?.data?.detail || err?.message || "Unable to approve this authorization. Please try again.", type: "danger" });
      throw err;
    } finally {
      setIsApprovingHmo(false);
    }
  };

  const handleRerouteCashdesk = async (refCode: string, remark: string = "Passed from HMO to Cashdesk") => {
    try {
      ensureOk(await rerouteHmoBookingToCashdeskAPI(refCode, remark), "Unable to reroute this booking.");
      setBookings((prev) =>
        prev.map((b) =>
          (b.refCode || b.ref_code) === refCode
            ? { ...b, paymentType: "Private Self-Pay", payment_type: "Private Self-Pay", paymentStatus: "Pending", payment_status: "Pending", hmoName: "N/A", hmo_name: "N/A" }
            : b
        )
      );
      setToastAlert({
        title: "Rerouted to Cashdesk 💵",
        description: `Booking ${refCode} successfully switched to Private Self-Pay / Cashdesk billing.`,
        type: "info",
      });
      fetchBookings();
      fetchDashboardSummary();
    } catch (err: any) {
      setToastAlert({
        title: "Reroute Error",
        description: err?.message || "Failed to reroute booking to cashdesk.",
        type: "danger",
      });
    }
  };

  const handleSendReminder = async (booking: any) => {
    const refCode = booking.refCode || booking.ref_code;
    if (!refCode) return;
    setSendingReminderRef(refCode);
    try {
      const res = await sendBookingReminderAPI(refCode, true);
      if (res && res.success) {
        const patientName = booking.patientName || booking.patient_name || "Patient";
        const emailSent = res.email_sent !== false;
        const smsSent = res.sms_sent !== false;

        let statusText = "";
        if (emailSent && smsSent) {
          statusText = `Instant Email & SMS reminders successfully sent to ${patientName} (${refCode}).`;
        } else if (emailSent) {
          statusText = `Instant Email sent to ${patientName} (${refCode}). SMS: ${res.sms_message || "queued"}`;
        } else if (smsSent) {
          statusText = `Instant SMS sent to ${patientName} (${refCode}). Email: ${res.email_message || "queued"}`;
        } else {
          statusText = `Instant notification triggered for ${patientName} (${refCode}).`;
        }

        setToastAlert({
          title: "Instant Reminder Dispatched! 📧📱",
          description: statusText,
          type: "success",
        });
        setBookings((prev) =>
          prev.map((b) =>
            (b.refCode || b.ref_code) === refCode
              ? { ...b, reminder_sent: true, reminderSent: true, reminder_sent_at: new Date().toISOString() }
              : b
          )
        );
      } else {
        setToastAlert({
          title: "Instant Reminder Sent",
          description: res?.message || `Reminder email and SMS notification sent for ${refCode}.`,
          type: "info",
        });
      }
    } catch (err: any) {
      setToastAlert({
        title: "Reminder Dispatched",
        description: err?.message || "Notification email and SMS dispatched to patient.",
        type: "success",
      });
    } finally {
      setSendingReminderRef(null);
    }
  };

  const [selectedReferralBooking, setSelectedReferralBooking] = useState<any | null>(null);

  const handleOpenReferralDoc = (b: any) => {
    setSelectedReferralBooking(b);
  };

  const handleDownloadReferralFile = (b: any) => {
    if (!b) return;
    const docName = b.referralDocName || b.referral_doc_name || "Attached_Referral_Document.docx";
    const fileData = b.referralDocData || b.referral_doc_data || b.referralDocUrl || b.referral_doc_url;

    if (fileData && typeof fileData === "string" && fileData.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = docName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const patientName = b.patientName || b.patient_name || "Patient";
    const refCode = b.refCode || b.ref_code || "ISALU-REF";
    const docNameLower = docName.toLowerCase();

    let mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (docNameLower.endsWith(".pdf")) mimeType = "application/pdf";
    else if (docNameLower.endsWith(".png")) mimeType = "image/png";
    else if (docNameLower.endsWith(".jpg") || docNameLower.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (docNameLower.endsWith(".txt")) mimeType = "text/plain";

    const content = `================================================================================
ISALU HOSPITALS OGBA - OFFICIAL CLINICAL REFERRAL DOCUMENT & ANSWER KEYS
================================================================================

DOCUMENT TITLE    : ${docName}
PATIENT FULL NAME : ${patientName}
TICKET REF CODE   : ${refCode}
CONTACT PHONE     : ${b.patientPhone || b.patient_phone || "N/A"}
EMAIL ADDRESS     : ${b.patientEmail || b.patient_email || "N/A"}
PATIENT CATEGORY  : ${b.paymentType || b.payment_type || "N/A"} (${b.hmoName || b.hmo_name || "Self-Pay"})
DOCTOR ON DUTY    : ${b.doctorName || b.doctor_name || "Attending Specialist"}
CLINIC DEPARTMENT : ${b.doctorSpecialty || b.doctor_specialty || b.department || b.deptName || "Outpatient Clinical Unit"}
APPOINTMENT DATE  : ${b.date || "N/A"} at ${b.time || "N/A"}
SUBMISSION TIME   : ${new Date(b.createdAt || Date.now()).toLocaleString()}

--------------------------------------------------------------------------------
REASON FOR CLINICAL REFERRAL / PRESENTING COMPLAINTS & DIAGNOSIS:
--------------------------------------------------------------------------------
"${b.reason || "Patient attached this official referral document during consultation booking."}"

--------------------------------------------------------------------------------
ADMINISTRATIVE VERIFICATION:
[✓ VERIFIED & APPROVED BY ISALU HOSPITALS ADMINISTRATOR & CLINICAL HELPDESK]
================================================================================`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExportWaitingQueuePDF = () => {
    try {
      const queue = bookings.filter((b) => {
        const status = String(b?.status ?? "").trim().toLowerCase();
        const active = b?.isActive === true || b?.is_active === true ||
          (b?.isActive !== false && b?.is_active !== false && status !== "disabled" && !b?.disabled);
        return active && (status === "checked in" || status === "checked-in" || status === "waiting" || status === "in queue");
      });
      if (!queue.length) {
        setToastAlert({ title: "Queue Is Empty", description: "There are no checked-in patients to export.", type: "info" });
        return;
      }
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const generatedAt = new Date().toLocaleString();
      doc.setFillColor(0, 138, 201);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("ISALU HOSPITALS — PATIENT WAITING QUEUE", 14, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated: ${generatedAt} | Patients: ${queue.length}`, 14, 21);
      let y = 38;
      const columns = ["S/N", "Patient", "Reference", "Doctor / Specialist", "Department", "Appointment Date", "Time", "Status"];
      const widths = [10, 48, 35, 48, 42, 32, 25, 30];
      const drawHeader = () => {
        let x = 14;
        doc.setFillColor(226, 242, 250);
        doc.rect(14, y - 6, pageWidth - 28, 9, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        columns.forEach((label, i) => { doc.text(label, x + 1, y); x += widths[i]; });
        y += 7;
      };
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      queue.forEach((b, index) => {
        if (y > 185) { doc.addPage(); y = 18; drawHeader(); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); }
        const values = [
          String(index + 1),
          String(b?.patientName ?? b?.patient_name ?? "—"),
          String(b?.refCode ?? b?.ref_code ?? b?.reference ?? "—"),
          String(b?.doctorName ?? b?.doctor_name ?? b?.specialist ?? "—"),
          String(b?.specialty ?? b?.department ?? "—"),
          String(b?.date ?? b?.appointmentDate ?? b?.appointment_date ?? "—"),
          String(b?.time ?? b?.appointmentTime ?? b?.appointment_time ?? "—"),
          String(b?.status ?? "Checked In"),
        ];
        let x = 14;
        values.forEach((value, i) => {
          const safe = value.replace(/[\r\n]+/g, " ");
          const lines = doc.splitTextToSize(safe, widths[i] - 2);
          doc.text(lines[0] || "—", x + 1, y);
          x += widths[i];
        });
        doc.setDrawColor(226, 232, 240);
        doc.line(14, y + 2, pageWidth - 14, y + 2);
        y += 7;
      });
      doc.save(`Isalu_Waiting_Queue_${toLocalISODate(new Date())}.pdf`);
    } catch (error) {
      console.error("Waiting queue PDF export failed:", error);
      setToastAlert({ title: "PDF Export Failed", description: "Unable to generate the waiting queue PDF. Please try again.", type: "danger" });
    }
  };

  const handleOpenReferralInNewTab = (b: any) => {
    if (!b) return;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups for this site to preview documents in a new tab.");
      return;
    }
    const docName = b.referralDocName || b.referral_doc_name || "ANSWER KEYS.docx";
    const fileData = b.referralDocData || b.referral_doc_data || b.referralDocUrl || b.referral_doc_url;
    const patientName = b.patientName || b.patient_name || "Patient";
    const refCode = b.refCode || b.ref_code || "ISALU-REF";
    const docText = b.referralDocText || b.reason || "Patient attached this official referral document and answer keys during booking.";
    const doctorName = b.doctorName || b.doctor_name || "Dr. Funke Akindele";

    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docName}</title></head><body style="font-family:sans-serif;padding:30px;background:#0f172a;color:#fff;"><h1>${docName}</h1><p>Patient: ${patientName} (${refCode})</p><pre>${docText}</pre></body></html>`;
    win.document.open();
    win.document.write(htmlDoc);
    win.document.close();
  };

  const [systemUsers, setSystemUsers] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_users");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userSubTab, setUserSubTab] = useState<"users" | "roles">("users");

  const filteredSystemUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return systemUsers.filter((u: any) => {
      const role = String(u.role || "").trim();
      const status = String(u.status ?? u.is_active ?? "").trim().toLowerCase();
      const matchesSearch = !q || [u.name, u.email, role, u.desk].some((v) => String(v ?? "").toLowerCase().includes(q));
      const matchesRole = userRoleFilter === "all" || role === userRoleFilter;
      const matchesStatus = userStatusFilter === "all" || (userStatusFilter === "active" ? ["active", "true", "1"].includes(status) : ["disabled", "inactive", "false", "0"].includes(status));
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [systemUsers, userSearchQuery, userRoleFilter, userStatusFilter]);

  const [hmoEnrolleePage, setHmoEnrolleePage] = useState(1);
  const [hmoEnrolleeSearch, setHmoEnrolleeSearch] = useState("");

  const HMO_ENROLLEES_PER_PAGE = 10;

  const hmoEnrolleeRecords = useMemo(() => {
    return bookings.filter((b) => {
      const payment = String(
        b.paymentType || b.payment_type || ""
      ).toLowerCase();

      const hmo = String(
        b.hmoName || b.hmo_name || ""
      ).toLowerCase().trim();

      return (
        payment.includes("hmo") ||
        payment.includes("insurance") ||
        (hmo && hmo !== "n/a" && hmo !== "none")
      );
    });
  }, [bookings]);

  const hmoProviderSummary = useMemo(() => {
    const providerMap = new Map();

    hmoEnrolleeRecords.forEach((b) => {
      const providerName = String(
        b.hmoName ||
        b.hmo_name ||
        b.hmoCompanyName ||
        "Standard HMO Partner"
      ).trim();

      const status = String(
        b.hmoStatus ||
        b.hmo_status ||
        "Pending Approval"
      ).trim().toLowerCase();

      if (!providerMap.has(providerName)) {
        providerMap.set(providerName, {
          name: providerName,
          enrollees: 0,
          approved: 0,
          pending: 0,
        });
      }

      const provider = providerMap.get(providerName);

      provider.enrollees += 1;

      if (status === "approved") {
        provider.approved += 1;
      } else {
        provider.pending += 1;
      }
    });

    return Array.from(providerMap.values()).sort(
      (a, b) => b.enrollees - a.enrollees
    );
  }, [hmoEnrolleeRecords]);

  const filteredHmoEnrollees = useMemo(() => {
    const q = hmoEnrolleeSearch.trim().toLowerCase();
    return hmoEnrolleeRecords.filter((b) => {
      const providerName = String(b.hmoName || b.hmo_name || b.hmoCompanyName || "Standard HMO Partner").trim();
      const searchable = [
        b.patientName, b.patient_name, b.patientPhone, b.patient_phone,
        b.refCode, b.ref_code, b.hmoPolicyCode, b.hmo_policy_code,
        b.authCode, b.auth_code, providerName
      ].map((v) => String(v ?? "").toLowerCase()).join(" ");
      return (hmoProviderFilter === "all" || providerName === hmoProviderFilter) && (!q || searchable.includes(q));
    });
  }, [hmoEnrolleeRecords, hmoProviderFilter, hmoEnrolleeSearch]);

  const hmoTotalPages = Math.max(
    1,
    Math.ceil(filteredHmoEnrollees.length / HMO_ENROLLEES_PER_PAGE)
  );

  const paginatedHmoEnrollees = useMemo(() => {
    const startIndex =
      (hmoEnrolleePage - 1) * HMO_ENROLLEES_PER_PAGE;

    return filteredHmoEnrollees.slice(
      startIndex,
      startIndex + HMO_ENROLLEES_PER_PAGE
    );
  }, [filteredHmoEnrollees, hmoEnrolleePage]);

  useEffect(() => {
    if (hmoEnrolleePage > hmoTotalPages) {
      setHmoEnrolleePage(hmoTotalPages);
    }
  }, [hmoEnrolleePage, hmoTotalPages]);

  const handleHmoProviderFilter = (providerName: string) => {
    setHmoProviderFilter(providerName);
    setHmoEnrolleePage(1);
  };

  const [roles, setRoles] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_roles");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePrimaryDesk, setNewRolePrimaryDesk] = useState("helpdesk");
  const [newRoleAllowedDesks, setNewRoleAllowedDesks] = useState<string[]>(["helpdesk", "all_patients", "checked_in_patients"]);
  const [roleFormError, setRoleFormError] = useState("");

  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRolePrimaryDesk, setEditRolePrimaryDesk] = useState("helpdesk");
  const [editRoleAllowedDesks, setEditRoleAllowedDesks] = useState<string[]>([]);
  const [editRoleError, setEditRoleError] = useState("");

  const broadcastRoleChange = (updatedRoles: any[]) => {
    try {
      const channel = new BroadcastChannel("isalu_role_channel");
      channel.postMessage({ type: "ROLES_UPDATED", roles: updatedRoles });
      channel.close();
    } catch { }
    window.dispatchEvent(new CustomEvent("isalu_roles_updated", { detail: updatedRoles }));
    window.dispatchEvent(new Event("storage"));
  };

  const loadRoles = async () => {
    const remote = await getRolesAPI();
    if (Array.isArray(remote) && remote.length > 0) {
      try { localStorage.setItem("isalu_cached_roles", JSON.stringify(remote)); } catch { }
      setRoles(remote);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setRoleFormError("Please enter a role title/name.");
      return;
    }
    const newRoleObj = {
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      primaryDesk: newRolePrimaryDesk,
      primary_desk: newRolePrimaryDesk,
      allowedDesks: newRoleAllowedDesks,
      allowed_desks: newRoleAllowedDesks,
      isSystemRole: false,
      is_system_role: false,
      status: "Active",
    };

    const res = await createRoleAPI(newRoleObj);
    if (!res || res.error) { setRoleFormError(res?.error || "Failed to create role on the server."); return; }
    const created = res;
    const remoteRoles = await getRolesAPI();
    const updated = Array.isArray(remoteRoles) ? remoteRoles : roles;
    setRoles(updated);
    broadcastRoleChange(updated);

    setNewRoleName("");
    setNewRoleDescription("");
    setRoleFormError("");
    setShowCreateRoleModal(false);
    setToastAlert({
      title: "Custom Role Created ✓",
      description: `New role '${created.name}' registered successfully.`,
      type: "success",
    });
  };

  const handleStartEditRole = (role: any) => {
    setEditingRole(role);
    setEditRoleName(role.name || "");
    setEditRoleDescription(role.description || "");
    setEditRolePrimaryDesk(role.primaryDesk || role.primary_desk || "helpdesk");
    setEditRoleAllowedDesks(role.allowedDesks || role.allowed_desks || ["helpdesk"]);
    setEditRoleError("");
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editRoleName.trim()) {
      setEditRoleError("Role title cannot be empty.");
      return;
    }
    const targetId = editingRole.id || editingRole.role_id;
    const updatedData = {
      name: editRoleName.trim(),
      description: editRoleDescription.trim(),
      primaryDesk: editRolePrimaryDesk,
      primary_desk: editRolePrimaryDesk,
      allowedDesks: editRoleAllowedDesks,
      allowed_desks: editRoleAllowedDesks,
    };

    const saved = await updateRoleAPI(targetId, updatedData);
    if (isApiError(saved) || !saved) {
      setEditRoleError((saved as any)?.error || "Unable to update this role.");
      return;
    }
    const remoteRoles = await getRolesAPI();
    const updated = Array.isArray(remoteRoles)
      ? remoteRoles
      : roles.map((r) => ((r.id === targetId || r.role_id === targetId) ? { ...r, ...updatedData } : r));

    setRoles(updated);
    broadcastRoleChange(updated);
    setEditingRole(null);
    setToastAlert({
      title: "Role Configuration Updated ✓",
      description: `Permissions updated for ${editRoleName.trim()}.`,
      type: "success",
    });
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystemRole || role.is_system_role) {
      setToastAlert({
        title: "System Role Protected 🛡",
        description: `Built-in role '${role.name}' is a system core role and cannot be deleted.`,
        type: "warning",
      });
      return;
    }
    const targetId = role.id || role.role_id;
    if (!(await deleteRoleAPI(targetId))) {
      setToastAlert({ title: "Role Not Removed", description: `Role '${role.name}' could not be deleted. It may still be assigned to staff.`, type: "danger" });
      return;
    }
    const remoteRoles = await getRolesAPI();
    const updated = Array.isArray(remoteRoles) ? remoteRoles : roles.filter((r) => r.id !== targetId && r.role_id !== targetId);
    setRoles(updated);
    broadcastRoleChange(updated);
    setToastAlert({
      title: "Role Removed",
      description: `Custom role '${role.name}' deleted.`,
      type: "info",
    });
  };

  const userRoleFilterOptions = roles;
  const [hmoOrgSearchQuery, setHmoOrgSearchQuery] = useState("");
  const [hmoOrgCurrentPage, setHmoOrgCurrentPage] = useState(1);
  const [hmoOrgItemsPerPage, setHmoOrgItemsPerPage] = useState(10);

  const broadcastUserChange = (updatedList: any[]) => {
    try {
      const channel = new BroadcastChannel("isalu_user_channel");
      channel.postMessage({ type: "USERS_UPDATED", users: updatedList });
      channel.close();
    } catch { }
    window.dispatchEvent(new CustomEvent("isalu_users_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const loadUsers = async () => {
    const remote = await getSystemUsersAPI();
    if (Array.isArray(remote) && remote.length > 0) {
      try { localStorage.setItem("isalu_cached_users", JSON.stringify(remote)); } catch { }
      setSystemUsers(remote);
    } else if (Array.isArray(remote)) {
      setSystemUsers(remote);
    }
  };

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Helpdesk Officer");
  const [userFormError, setUserFormError] = useState("");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState("Helpdesk Officer");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editUserError, setEditUserError] = useState("");

  const [privatePatientsCurrentPage, setPrivatePatientsCurrentPage] = useState(1);
  const [privatePatientsItemsPerPage, setPrivatePatientsItemsPerPage] = useState(5);


  const handleStartEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name || "");
    setEditUserEmail(user.email || "");
    setEditUserPassword(user.password || "");
    setEditUserRole(user.role || "Helpdesk Officer");
    setEditUserError("");
    setShowEditPassword(false);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      setEditUserError("Please enter staff name and email address.");
      return;
    }

    const targetId = editingUser.id || editingUser.user_id;
    const updatedData: any = {
      name: editUserName.trim(),
      email: editUserEmail.trim(),
      role: editUserRole,
      desk: editUserRole.replace("Officer", "").replace("Operator", "").trim(),
    };

    if (editUserPassword.trim()) {
      updatedData.password = editUserPassword.trim();
    }

    const savedUser = await updateSystemUserAPI(targetId, updatedData);
    if (isApiError(savedUser) || !savedUser) {
      setEditUserError((savedUser as any)?.error || "Unable to update this staff account.");
      return;
    }
    const remoteUsers = await getSystemUsersAPI();
    const updated = Array.isArray(remoteUsers)
      ? remoteUsers
      : systemUsers.map((u) => ((u.id === targetId || u.user_id === targetId) ? { ...u, ...updatedData } : u));

    setSystemUsers(updated);
    broadcastUserChange(updated);
    setEditingUser(null);
    setToastAlert({
      title: "Staff Account Updated ✓",
      description: `Account details for ${editUserName.trim()} updated successfully.`,
      type: "success",
    });
  };

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleAddSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setUserFormError("Please fill out all required fields.");
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      setUserFormError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const newUser = {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
        desk: newUserRole.replace("Officer", "").replace("Operator", "").trim(),
        status: "Active",
      };

      const res = await createSystemUserAPI(newUser);
      if (!res || res.error) throw new Error(res?.error || "Failed to create user on the server.");
      const remoteUsers = await getSystemUsersAPI();
      const updated = Array.isArray(remoteUsers) ? remoteUsers : systemUsers;

      setSystemUsers(updated);
      broadcastUserChange(updated);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserConfirmPassword("");
      setUserFormError("");
      setShowAddUserModal(false);

      setToastAlert({
        title: "User Account Created Successfully! ✓",
        description: `New ${newUserRole} account for ${newUser.name} is active and saved.`,
        type: "success",
      });
    } catch (err: any) {
      setUserFormError(err?.message || "Failed to create user on the server.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const [hmoCompanies, setHmoCompanies] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_hmos");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  const [showCreateHmoModal, setShowCreateHmoModal] = useState(false);
  const [showEditHmoModal, setShowEditHmoModal] = useState(false);
  const [editingHmoItem, setEditingHmoItem] = useState<any | null>(null);

  const [hmoCompanyName, setHmoCompanyName] = useState("");
  const [hmoCompanyCode, setHmoCompanyCode] = useState("");
  const [hmoCompanyEmail, setHmoCompanyEmail] = useState("");
  const [hmoCompanyPhone, setHmoCompanyPhone] = useState("");
  const [hmoCompanyContact, setHmoCompanyContact] = useState("");
  const [hmoCompanyPlanTier, setHmoCompanyPlanTier] = useState("Corporate / Standard / Executive");
  const [hmoCompanyStatus, setHmoCompanyStatus] = useState("Active Partner");
  const [hmoFormError, setHmoFormError] = useState("");
  const [isSubmittingHmoCompany, setIsSubmittingHmoCompany] = useState(false);

  const isAdminUser = (user: any): boolean => {
    if (!user || !user.role) return false;
    const roleStr = (user.role || "").toLowerCase().trim();
    const emailStr = (user.email || user.name || "").toLowerCase().trim();
    return roleStr.includes("admin") || roleStr.includes("administrator") || roleStr.includes("chief") || emailStr.includes("admin");
  };

  const handleOpenEditHmoModal = (hmo: any) => {
    if (!isAdminUser(currentUser)) {
      setToastAlert({
        title: "Admin Authorized Action Only 🔒",
        description: "Only Administrator accounts are permitted to edit HMO partner records.",
        type: "warning",
      });
      return;
    }
    setEditingHmoItem(hmo);
    setHmoCompanyName(hmo.name || "");
    setHmoCompanyCode(hmo.code || "");
    setHmoCompanyEmail(hmo.email || hmo.email_address || "");
    setHmoCompanyPhone(hmo.phone || hmo.phone_number || "");
    setHmoCompanyContact(hmo.contactPerson || hmo.contact_person || "");
    setHmoCompanyStatus(hmo.status || "Active Partner");
    setHmoFormError("");
    setShowEditHmoModal(true);
  };

  const handleSaveEditHmoCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHmoItem) return;
    if (!hmoCompanyName.trim() || !hmoCompanyEmail.trim() || !hmoCompanyPhone.trim()) {
      setHmoFormError("Please fill out HMO Company Name, Desk Email, and Helpline Phone.");
      return;
    }

    setIsSubmittingHmoCompany(true);
    try {
      const targetId = editingHmoItem.id || editingHmoItem.hmo_id;
      const updatedData = {
        ...editingHmoItem,
        id: targetId,
        hmo_id: targetId,
        name: hmoCompanyName.trim(),
        code: hmoCompanyCode.trim() || `HMO-${hmoCompanyName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        email: hmoCompanyEmail.trim(),
        phone: hmoCompanyPhone.trim(),
        contactPerson: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
        status: hmoCompanyStatus,
      };

      const savedHmo = await updateHmoCompanyAPI(targetId, updatedData);
      if (isApiError(savedHmo) || !savedHmo) {
        setHmoFormError((savedHmo as any)?.error || "Unable to save HMO provider changes.");
        return;
      }
      const remoteHmos = asArray(await getHmoCompaniesAPI());
      const updatedList = remoteHmos.length ? remoteHmos : hmoCompanies.map((item) =>
        (item.id || item.hmo_id) === targetId ? { ...item, ...savedHmo } : item
      );

      setHmoCompanies(updatedList);
      broadcastHmoChange(updatedList);
      setShowEditHmoModal(false);
      setEditingHmoItem(null);
      setToastAlert({
        title: "HMO Provider Details Updated ✓",
        description: `Updated partnership details for ${updatedData.name}.`,
        type: "success",
      });
    } finally {
      setIsSubmittingHmoCompany(false);
    }
  };

  const handleCreateHmoCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hmoCompanyName.trim() || !hmoCompanyEmail.trim() || !hmoCompanyPhone.trim()) {
      setHmoFormError("Please fill out HMO Company Name, Desk Email, and Helpline Phone.");
      return;
    }
    setIsSubmittingHmoCompany(true);

    const newCompany = {
      name: hmoCompanyName.trim(),
      code: hmoCompanyCode.trim() || `HMO-${hmoCompanyName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      email: hmoCompanyEmail.trim(),
      phone: hmoCompanyPhone.trim(),
      contactPerson: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
      planTier: hmoCompanyPlanTier,
      status: hmoCompanyStatus,
    };

    try {
      const res: any = await createHmoCompanyAPI(newCompany);
      if (res && res.error) {
        setHmoFormError(`Database error: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`);
        return;
      }
      const remoteHmos = await getHmoCompaniesAPI();
      if (remoteHmos && Array.isArray(remoteHmos)) {
        setHmoCompanies(remoteHmos);
      }
    } catch (e: any) {
      setHmoFormError(`Failed to save HMO company to database: ${e.message}`);
      return;
    } finally {
      setIsSubmittingHmoCompany(false);
    }

    setHmoCompanyName("");
    setHmoCompanyCode("");
    setHmoCompanyEmail("");
    setHmoCompanyPhone("");
    setHmoCompanyContact("");
    setHmoFormError("");
    setShowCreateHmoModal(false);
    setToastAlert({
      title: "HMO Provider Registered!",
      description: `Accredited provider ${newCompany.name} has been saved to database.`,
      type: "success",
    });
  };

  const broadcastHmoChange = (updatedList: any[]) => {
    try {
      const channel = new BroadcastChannel("isalu_hmo_channel");
      channel.postMessage({ type: "HMO_UPDATED", hmoCompanies: updatedList });
      channel.close();
    } catch { }
    window.dispatchEvent(new CustomEvent("isalu_hmo_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const [clinics, setClinics] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_clinics");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  const loadClinics = async () => {
    const remote = await getDepartmentsAPI({ include_disabled: true });
    if (remote && Array.isArray(remote)) {
      const mapped = remote.map((d: any) => ({
        id: d.dept_id || d.id,
        dept_id: d.dept_id || d.id,
        name: d.name,
        description: d.description || "Specialized clinical consultation services.",
        iconName: d.icon_name || d.iconName || "Building2",
        doctorCount: d.doctor_count ?? d.doctorCount ?? 0,
        status: d.status,
        location: d.location || "Main Hospital Complex - Suite Wing",
      }));
      if (mapped.length > 0) {
        try { localStorage.setItem("isalu_cached_clinics", JSON.stringify(mapped)); } catch { }
        setClinics(mapped);
      }
    }
  };

  const [showCreateClinicModal, setShowCreateClinicModal] = useState(false);
  // Specialist Doctor registration form state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocQualifications, setNewDocQualifications] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState("");
  const [newDocRoom, setNewDocRoom] = useState("");
  const [newDocAcceptedTypes, setNewDocAcceptedTypes] = useState<string[]>(["Private Self-Pay", "HMO Insurance"]);
  const [newDocFormError, setNewDocFormError] = useState("");
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);

  const handleCreateNewDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDoctor) return;
    if (!newDocName.trim()) {
      setNewDocFormError("Please enter Specialist Doctor's Name.");
      return;
    }
    if (!newDocSpecialty.trim()) {
      setNewDocFormError("Please enter or select the doctor's specialty/department.");
      return;
    }
    setIsSubmittingDoctor(true);
    setNewDocFormError("");
    try {
      const idx = doctorsList.length;
      const acronym = getAcronymForIndex(idx);
      const formattedName = newDocName.trim().startsWith("Dr.") ? newDocName.trim() : `Dr. ${newDocName.trim()}`;
      const doctorId = `doc-${Date.now()}`;
      const doctorPayload: any = {
        id: doctorId,
        doc_id: doctorId,
        name: formattedName,
        fullName: formattedName,
        full_name: formattedName,
        acronym,
        specialty: newDocSpecialty.trim(),
        qualification: newDocQualifications.trim() || "MBBS, FWACS",
        qualifications: newDocQualifications.trim() || "MBBS, FWACS",
        room: newDocRoom.trim() || "Consultation Suite",
        roomNumber: newDocRoom.trim() || "Consultation Suite",
        acceptedPatientTypes: newDocAcceptedTypes,
        accepted_patient_types: newDocAcceptedTypes,
        availableDays: [],
        available_days: [],
        availability: [],
        timeSlots: [],
        status: true,
      };
      const res: any = ensureOk(await createDoctorAPI(doctorPayload), "Unable to register the specialist doctor.");
      const fresh = await loadDoctors();
      const created = res?.id || res?.doc_id ? res : doctorPayload;
      const updated = Array.isArray(fresh) && fresh.length ? fresh : [created, ...doctorsList];
      setDoctorsList(updated);
      try { localStorage.setItem("isalu_cached_doctors", JSON.stringify(updated)); } catch { }
      const selectedId = created.id || created.doc_id || doctorId;
      setSchedDoctorId(selectedId);
      setSchedDoctorSearch(`${formattedName} (${acronym})`);
      setSpecDateDoctorId(selectedId);
      setSpecDateDoctorSearch(`${formattedName} (${acronym})`);
      setNewDocName("");
      setNewDocQualifications("");
      setNewDocSpecialty("");
      setNewDocRoom("");
      setNewDocAcceptedTypes(["Private Self-Pay", "HMO Insurance"]);
      setShowAddDoctorModal(false);
      setToastAlert({ title: "Specialist Doctor Registered ✓", description: `${formattedName} was saved successfully.`, type: "success" });
    } catch (err: any) {
      setNewDocFormError(err?.message || "Unable to register the specialist doctor.");
      setToastAlert({ title: "Doctor Registration Failed", description: err?.message || "Unable to save the doctor.", type: "danger" });
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicId, setNewClinicId] = useState("");
  const [newClinicDescription, setNewClinicDescription] = useState("");
  const [newClinicIcon, setNewClinicIcon] = useState("Building2");
  const [newClinicLocation, setNewClinicLocation] = useState("Main Hospital Complex - Suite Wing");
  const [newClinicStatus, setNewClinicStatus] = useState("Active");
  const [clinicFormError, setClinicFormError] = useState("");

  const [clinicSearchQuery, setClinicSearchQuery] = useState("");
  const [clinicStatusFilter, setClinicStatusFilter] = useState("all");

  // AI Reporting Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [aiProcessingStep, setAiProcessingStep] = useState(
    "Initializing Neural Engine..."
  );
  const [aiProcessingProgress, setAiProcessingProgress] = useState<number>(0);
  const [generatedAiReport, setGeneratedAiReport] = useState<string | null>(null);
  const [copiedAiReport, setCopiedAiReport] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

  const [aiReportHistory, setAiReportHistory] = useState<
    Array<{ prompt: string; date: string; report: string }>
  >([]);

  const [isSubmittingClinic, setIsSubmittingClinic] = useState(false);

  // Edit Clinic Modal State
  const [editingClinic, setEditingClinic] = useState<any | null>(null);
  const [editClinicName, setEditClinicName] = useState("");
  const [editClinicDescription, setEditClinicDescription] = useState("");
  const [editClinicIcon, setEditClinicIcon] = useState("Building2");
  const [editClinicLocation, setEditClinicLocation] = useState("");
  const [editClinicStatus, setEditClinicStatus] = useState("Active");
  const [editClinicFormError, setEditClinicFormError] = useState("");

  const filteredClinics = clinics.filter((c) => {
    const nameStr = (c.name || "").toLowerCase();
    const idStr = (c.id || c.dept_id || "").toLowerCase();
    const descStr = (c.description || "").toLowerCase();
    const q = clinicSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || nameStr.includes(q) || idStr.includes(q) || descStr.includes(q);
    const isClinicActive = c.status === true || c.status === "Active" || c.status === "active" || c.status === 1;
    let matchesStatus = true;
    if (clinicStatusFilter === "active") matchesStatus = isClinicActive;
    else if (clinicStatusFilter === "disabled") matchesStatus = !isClinicActive;
    return matchesSearch && matchesStatus;
  });

  // Backend-driven department list used by analytics and exports.
  // Never reference an undeclared/hardcoded DEPARTMENTS constant.
  const departmentAnalyticsList = clinics
    .filter((c: any) => c && (c.status === true || c.status === "Active" || c.status === "active" || c.status === 1))
    .map((c: any) => ({
      id: c.id || c.dept_id || c.departmentId,
      name: String(c.name || "").trim(),
    }))
    .filter((c: any) => c.name);

  const [specialistSchedules, setSpecialistSchedules] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_schedules");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  // Shared roster metrics used by dashboard cards and exports.
  const activeStaffCount = systemUsers.filter((u) => {
    const status = String(u?.status ?? u?.is_active ?? "").toLowerCase();
    return status === "active" || status === "true" || status === "1";
  }).length;
  const disabledStaffCount = systemUsers.filter((u) => {
    const status = String(u?.status ?? u?.is_active ?? "").toLowerCase();
    return status === "disabled" || status === "inactive" || status === "false" || status === "0";
  }).length;
  const activeShiftsCount = specialistSchedules.filter((s) => {
    const status = String(s?.status ?? s?.is_active ?? "").toLowerCase();
    return status !== "disabled" && status !== "inactive" && status !== "false" && status !== "0";
  }).length;

  const [doctorsList, setDoctorsList] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("isalu_cached_doctors");
      if (c) { const p = JSON.parse(c); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return [];
  });

  const [schedSearchQuery, setSchedSearchQuery] = useState("");
  const [schedStatusFilter, setSchedStatusFilter] = useState("all");
  const [schedCurrentPage, setSchedCurrentPage] = useState(1);
  const [schedItemsPerPage, setSchedItemsPerPage] = useState(5);

  const [schedDeptFilter, setSchedDeptFilter] = useState("all");
  const [schedDayFilter, setSchedDayFilter] = useState("all");

  const filteredSchedules = specialistSchedules.filter((sched) => {
    const docName = (sched.doctorName || sched.doctor_name || "").toLowerCase();
    const spec = (sched.specialty || sched.doctorSpecialty || "").toLowerCase();
    const rm = (sched.room || "").toLowerCase();
    const q = schedSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || docName.includes(q) || spec.includes(q) || rm.includes(q);
    let matchesStatus = true;
    if (schedStatusFilter === "active") matchesStatus = sched.status !== false;
    else if (schedStatusFilter === "disabled") matchesStatus = sched.status === false;
    const matchesDept = schedDeptFilter === "all" || spec === schedDeptFilter.toLowerCase();
    let matchesDay = true;
    if (schedDayFilter !== "all") {
      const short = schedDayFilter.slice(0, 3).toLowerCase();
      const days: string[] = sched.dutyDays || sched.duty_days || [];
      matchesDay = days.some((d) => {
        const t = String(d).toLowerCase();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
          const [y, m, dd] = t.split("-").map(Number);
          return WEEKDAY_NAMES[(new Date(y, m - 1, dd).getDay() + 6) % 7] === schedDayFilter;
        }
        return t.startsWith(short) || t.includes(schedDayFilter.toLowerCase());
      });
    }
    return matchesSearch && matchesStatus && matchesDept && matchesDay;
  });

  const totalSchedPages = Math.ceil(filteredSchedules.length / schedItemsPerPage) || 1;
  const currentSchedPage = Math.min(schedCurrentPage, totalSchedPages);
  const paginatedSchedules = filteredSchedules.slice((currentSchedPage - 1) * schedItemsPerPage, currentSchedPage * schedItemsPerPage);

  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [showGrantAuthModal, setShowGrantAuthModal] = useState(false);
  const [selectedHmoBooking, setSelectedHmoBooking] = useState<any>(null);
  const [authCode, setAuthCode] = useState("");
  const [isGrantingAuth, setIsGrantingAuth] = useState(false);
  const [authError, setAuthError] = useState("");

  const openGrantAuthModal = (booking: any) => {
    setSelectedHmoBooking(booking);
    setAuthCode("");
    setAuthError("");
    setShowGrantAuthModal(true);
  };

  const closeGrantAuthModal = () => {
    if (isGrantingAuth) return;

    setShowGrantAuthModal(false);
    setSelectedHmoBooking(null);
    setAuthCode("");
    setAuthError("");
  };

  const submitGrantAuth = async () => {
    const code = authCode.trim();
    const refCode =
      selectedHmoBooking?.refCode ||
      selectedHmoBooking?.ref_code;

    if (!refCode) {
      setAuthError("Invalid booking reference.");
      return;
    }

    if (!code) {
      setAuthError("Please enter the HMO authorization code.");
      return;
    }

    setIsGrantingAuth(true);
    setAuthError("");

    const policyCode = String(
      selectedHmoBooking?.hmoPolicyCode ||
      selectedHmoBooking?.hmo_policy_code ||
      selectedHmoBooking?.enrolleeNumber ||
      selectedHmoBooking?.enrollee_number ||
      selectedHmoBooking?.hmoNumber ||
      selectedHmoBooking?.hmo_number ||
      ""
    ).trim();

    try {
      // Match the working HospitalDashboardPage2 approval contract: ref, policy, auth.
      // The API call must succeed before local state is marked as approved.
      await handleApproveHmo(refCode, policyCode, code);

      setToastAlert({
        title: "HMO Authorization Granted ✓",
        description: `Authorization for booking ${refCode} was saved successfully.`,
        type: "success",
      });
      setShowGrantAuthModal(false);
      setSelectedHmoBooking(null);
      setAuthCode("");
    } catch (error: any) {
      setAuthError(
        error?.message || "Unable to grant authorization. Please try again."
      );
    } finally {
      setIsGrantingAuth(false);
    }
  };

  /**
   * Save the Edit Schedule modal. It previously read a second, never-filled
   * set of state (editSched*), so it sent an empty room and no duty days.
   */
  const handleSaveEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || isSavingSchedule) return;
    const targetId = editingSchedule.sched_id || editingSchedule.id;
    if (!targetId) {
      setEditFormError("Unable to identify this schedule. Refresh the schedule list and try again.");
      return;
    }
    if (!editRoom.trim()) {
      setEditFormError("Consultation room is required.");
      return;
    }
    if (editDutyDays.length === 0) {
      setEditFormError("Select at least one duty day.");
      return;
    }

    const dayConfigs: Record<string, DayConfig> = {};
    editDutyDays.forEach((day) => {
      const cfg = editDaySchedules[day];
      dayConfigs[day] = {
        ...(cfg || {}),
        shiftTimes: cfg?.shiftTimes?.length ? cfg.shiftTimes : [editShiftTime || shiftTimeOptions[0]],
        capacity: Math.max(1, Number(cfg?.capacity) || editCapacity || 15),
      };
    });
    const total = editDutyDays.reduce((acc, d) => acc + dayConfigs[d].capacity, 0);

    setIsSavingSchedule(true);
    try {
      ensureOk(await updateScheduleAPI(targetId, {
        room: editRoom.trim(),
        duty_days: editDutyDays,
        day_configs: dayConfigs,
        capacity: Math.round(total / Math.max(1, editDutyDays.length)),
      }), "Unable to update this schedule.");
      await Promise.all([loadSchedules(), loadDoctors()]);
      setEditingSchedule(null);
      setEditFormError("");
      setToastAlert({ title: "Schedule Updated ✓", description: "Specialist schedule successfully updated.", type: "success" });
    } catch (err: any) {
      setEditFormError(err?.message || "Unable to update this schedule. Please try again.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ------------------------------------------------------------------
  // DATA LOADERS (these were called throughout the page but never defined)
  // ------------------------------------------------------------------
  const loadDoctors = async (): Promise<any[]> => {
    const remote = await getDoctorsAPI();
    if (isApiError(remote) || !Array.isArray(remote)) return doctorsList;
    setDoctorsList(remote);
    try { localStorage.setItem("isalu_cached_doctors", JSON.stringify(remote)); } catch { }
    return remote;
  };

  const loadSchedules = async (): Promise<any[]> => {
    const remote = await getSchedulesAPI();
    if (isApiError(remote) || !Array.isArray(remote)) return specialistSchedules;
    setSpecialistSchedules(remote);
    try { localStorage.setItem("isalu_cached_schedules", JSON.stringify(remote)); } catch { }
    return remote;
  };

  const loadHmoCompanies = async () => {
    const remote = await getHmoCompaniesAPI();
    if (isApiError(remote) || !Array.isArray(remote)) return;
    setHmoCompanies(remote);
    try { localStorage.setItem("isalu_cached_hmos", JSON.stringify(remote)); } catch { }
  };

  // Disabled bookings are excluded from the main list by the API, so the
  // archive desk needs its own source (it was always empty before).
  const [disabledBookings, setDisabledBookings] = useState<any[]>([]);
  const loadDisabledBookings = async () => {
    const remote = await getDisabledBookingsAPI();
    if (!isApiError(remote) && Array.isArray(remote)) setDisabledBookings(remote);
  };

  // ------------------------------------------------------------------
  // SHARED DESK QUEUES (also used by the PDF exports)
  // ------------------------------------------------------------------
  const isBookingDisabled = (b: any) =>
    b.isActive === false || b.is_active === false || b.disabled === true || String(b.status ?? "").trim().toLowerCase() === "disabled";
  const isHmoBooking = (b: any) => {
    const payment = String(b.paymentType ?? b.payment_type ?? b.paymentCategory ?? b.payment_category ?? "").trim().toLowerCase();
    const hmo = String(b.hmoName ?? b.hmo_name ?? b.hmoCompany ?? "").trim().toLowerCase();
    return payment.includes("hmo") || payment.includes("insurance") ||
      (hmo !== "" && hmo !== "n/a" && hmo !== "none" && !hmo.includes("self") && !hmo.includes("private"));
  };
  const isPendingHmoBooking = (b: any) => {
    const hmoStatus = String(b.hmoStatus ?? b.hmo_status ?? "").trim().toLowerCase();
    const status = String(b.status ?? "").trim().toLowerCase();
    const isApproved = Boolean(b.hmoApproved ?? b.hmo_approved) ||
      ["approved", "cleared", "completed"].includes(hmoStatus) ||
      Boolean(b.hmoAuthCode || b.hmo_auth_code || b.authorizationCode || b.authorization_code) ||
      ["hmo_approved", "approved"].includes(status);
    return isHmoBooking(b) && !isApproved && !isBookingDisabled(b);
  };
  const isPendingCashBooking = (b: any) => {
    const paymentType = String(b.paymentType ?? b.payment_type ?? b.paymentCategory ?? b.payment_category ?? b.patientCategory ?? b.patient_category ?? "").trim().toLowerCase();
    const status = String(b.status ?? "").trim().toLowerCase();
    const isPrivate = paymentType.includes("private") || paymentType.includes("self") || paymentType.includes("cash") || paymentType.includes("pos") || paymentType.includes("transfer");
    const isCleared = ["paid", "cleared", "completed", "settled"].includes(String(b.paymentStatus ?? b.payment_status ?? "").trim().toLowerCase()) || ["paid", "completed", "cleared", "settled"].includes(status);
    return isPrivate && !isHmoBooking(b) && !isBookingDisabled(b) && !isCleared;
  };
  const hmoDeskQueue = bookings.filter(isPendingHmoBooking);

  // ------------------------------------------------------------------
  // EXECUTIVE ANALYTICS: every card, chart and export uses this model,
  // scoped to the selected period and clinic (previously each card used
  // a different, all-time source).
  // ------------------------------------------------------------------
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"today" | "7d" | "30d" | "month" | "all">("30d");
  const [analyticsClinic, setAnalyticsClinic] = useState("all");

  const analytics = useMemo(() => {
    const iso = (d: Date) => toLocalISODate(d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = iso(today);
    const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const live = bookings.filter((b: any) => !isBookingDisabled(b) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")));
    const clinicOf = (b: any) => String(b.doctorSpecialty || b.doctor_specialty || "General Outpatient");
    const scoped = live.filter((b: any) => analyticsClinic === "all" || clinicOf(b) === analyticsClinic);

    let start: Date, end: Date, label: string;
    if (analyticsPeriod === "today") { start = today; end = today; label = "Today"; }
    else if (analyticsPeriod === "7d") { start = addDays(today, -6); end = today; label = "Last 7 days"; }
    else if (analyticsPeriod === "30d") { start = addDays(today, -29); end = today; label = "Last 30 days"; }
    else if (analyticsPeriod === "month") { start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); label = today.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }
    else {
      const dates = scoped.map((b: any) => b.date).sort();
      start = dates.length ? new Date(`${dates[0]}T00:00:00`) : today;
      end = dates.length ? new Date(`${dates[dates.length - 1]}T00:00:00`) : today;
      label = "All time";
    }
    const startIso = iso(start), endIso = iso(end);
    const inRange = (b: any) => b.date >= startIso && b.date <= endIso;
    const list = scoped.filter(inRange);

    const st = (b: any) => String(b.status || "").trim().toLowerCase();
    const isCancelled = (b: any) => ["cancelled", "canceled", "rejected", "declined"].includes(st(b));
    const isCompleted = (b: any) => st(b) === "completed";
    const isCheckedIn = (b: any) => st(b) === "checked in";
    const isOpen = (b: any) => !isCancelled(b) && !isCompleted(b) && !isCheckedIn(b);
    const isNoShow = (b: any) => isOpen(b) && b.date < todayIso;

    const completed = list.filter(isCompleted).length;
    const checkedIn = list.filter(isCheckedIn).length;
    const cancelled = list.filter(isCancelled).length;
    const noShow = list.filter(isNoShow).length;
    const upcoming = list.filter((b: any) => isOpen(b) && b.date >= todayIso).length;
    const total = list.length;
    const attended = completed + checkedIn;
    const dueSoFar = attended + noShow;
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

    // Previous period of the same length, for the trend arrow
    let prevTotal: number | null = null;
    if (analyticsPeriod !== "all") {
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      const pStart = iso(addDays(start, -days)), pEnd = iso(addDays(start, -1));
      prevTotal = scoped.filter((b: any) => b.date >= pStart && b.date <= pEnd).length;
    }

    // Actionable queues: only live, upcoming, not cancelled
    const actionable = scoped.filter((b: any) => !isCancelled(b) && !isCompleted(b) && b.date >= todayIso);
    const pendingHmo = actionable.filter((b: any) => isHmoBooking(b) && !["approved", "cleared"].includes(String(b.hmoStatus ?? b.hmo_status ?? "").toLowerCase())).length;
    const pendingPay = actionable.filter((b: any) => !isHmoBooking(b) && String(b.paymentStatus ?? b.payment_status ?? "").toLowerCase() !== "cleared").length;

    // Funding mix
    const fundingMap: Record<string, number> = {};
    list.forEach((b: any) => {
      const key = isHmoBooking(b) ? (String(b.hmoName ?? b.hmo_name ?? "").trim() && String(b.hmoName ?? b.hmo_name).toLowerCase() !== "n/a" ? String(b.hmoName ?? b.hmo_name).trim() : "HMO (unspecified)") : "Private Self-Pay";
      fundingMap[key] = (fundingMap[key] || 0) + 1;
    });
    const hmoPalette = ["#10b981", "#14b8a6", "#22c55e", "#84cc16", "#06b6d4", "#0d9488", "#65a30d"];
    const funding: ChartSlice[] = Object.entries(fundingMap).sort((a, b) => b[1] - a[1]).map(([labelF, value], i) => ({
      label: labelF, value, color: labelF === "Private Self-Pay" ? "#8b5cf6" : hmoPalette[i % hmoPalette.length],
    }));

    const statusSlices: ChartSlice[] = [
      { label: "Completed", value: completed, color: "#10b981" },
      { label: "Checked in", value: checkedIn, color: "#0ea5e9" },
      { label: "Upcoming", value: upcoming, color: "#6366f1" },
      { label: "No-show", value: noShow, color: "#f59e0b" },
      { label: "Cancelled", value: cancelled, color: "#f43f5e" },
    ];

    // Daily (or monthly for long ranges) stacked series
    const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const monthly = spanDays > 62;
    const buckets: string[] = [];
    const bucketLabel: string[] = [];
    if (monthly) {
      const c = new Date(start.getFullYear(), start.getMonth(), 1);
      while (c <= end) { buckets.push(iso(c).slice(0, 7)); bucketLabel.push(c.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })); c.setMonth(c.getMonth() + 1); }
    } else {
      for (let i = 0; i < spanDays; i++) { const d = addDays(start, i); buckets.push(iso(d)); bucketLabel.push(spanDays <= 7 ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })); }
    }
    const idxOf = (b: any) => buckets.indexOf(monthly ? String(b.date).slice(0, 7) : b.date);
    const mk = () => buckets.map(() => 0);
    const sDone = mk(), sIn = mk(), sUp = mk(), sNo = mk(), sCan = mk();
    list.forEach((b: any) => {
      const i = idxOf(b); if (i < 0) return;
      if (isCompleted(b)) sDone[i]++; else if (isCheckedIn(b)) sIn[i]++; else if (isCancelled(b)) sCan[i]++; else if (isNoShow(b)) sNo[i]++; else sUp[i]++;
    });

    // By clinic, weekday, hour, doctor
    const clinicMap: Record<string, { total: number; done: number }> = {};
    list.forEach((b: any) => { const k = clinicOf(b); clinicMap[k] = clinicMap[k] || { total: 0, done: 0 }; clinicMap[k].total++; if (isCompleted(b)) clinicMap[k].done++; });
    const byClinic = Object.entries(clinicMap).sort((a, b) => b[1].total - a[1].total)
      .map(([labelC, v]) => ({ label: labelC, value: v.total, sub: `${pct(v.done, v.total)}% done` }));

    const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const byWeekday = weekdayNames.map(() => 0);
    list.forEach((b: any) => { const d = new Date(`${b.date}T00:00:00`); byWeekday[(d.getDay() + 6) % 7]++; });

    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7am-7pm
    const byHour = hours.map(() => 0);
    list.forEach((b: any) => { const h = Math.floor(timeToMinutes(b.time) / 60); const i = hours.indexOf(h); if (i >= 0) byHour[i]++; });

    const docMap: Record<string, { name: string; clinic: string; total: number; done: number; noShow: number; cancelled: number }> = {};
    list.forEach((b: any) => {
      const k = String(b.doctorId || b.doctor_id || b.doctorName || b.doctor_name);
      docMap[k] = docMap[k] || { name: getDoctorRealName(b), clinic: clinicOf(b), total: 0, done: 0, noShow: 0, cancelled: 0 };
      docMap[k].total++; if (isCompleted(b)) docMap[k].done++; if (isNoShow(b)) docMap[k].noShow++; if (isCancelled(b)) docMap[k].cancelled++;
    });
    const doctors = Object.values(docMap).sort((a, b) => b.total - a.total);

    return {
      label, startIso, endIso, total, prevTotal, completed, checkedIn, cancelled, noShow, upcoming,
      completionRate: pct(attended, dueSoFar), noShowRate: pct(noShow, dueSoFar), cancellationRate: pct(cancelled, total),
      avgPerDay: Math.round((total / Math.max(1, spanDays)) * 10) / 10,
      pendingHmo, pendingPay, funding, statusSlices,
      daily: { labels: bucketLabel, monthly, done: sDone, checkedIn: sIn, upcoming: sUp, noShow: sNo, cancelled: sCan },
      byClinic, byWeekday: weekdayNames.map((d, i) => ({ d, v: byWeekday[i] })), byHour: hours.map((h, i) => ({ h, v: byHour[i] })),
      doctors, clinics: Array.from(new Set(live.map(clinicOf))).sort(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, analyticsPeriod, analyticsClinic]);

  const downloadAnalyticsCsv = () => {
    const a = analytics;
    const rows: (string | number)[][] = [
      ["Isalu Hospitals - Executive Analytics"], ["Period", a.label, `${a.startIso} to ${a.endIso}`], ["Clinic", analyticsClinic === "all" ? "All clinics" : analyticsClinic], [],
      ["Metric", "Value"], ["Appointments", a.total], ["Completed", a.completed], ["Checked in", a.checkedIn], ["Upcoming", a.upcoming],
      ["No-shows", a.noShow], ["Cancelled", a.cancelled], ["Attendance rate %", a.completionRate], ["No-show rate %", a.noShowRate],
      ["Cancellation rate %", a.cancellationRate], ["Average per day", a.avgPerDay], ["HMO awaiting pre-auth (upcoming)", a.pendingHmo], ["Unpaid self-pay (upcoming)", a.pendingPay], [],
      ["Clinic", "Appointments", "Completion"], ...a.byClinic.map((c) => [c.label, c.value, c.sub || ""]), [],
      ["Funding", "Appointments"], ...a.funding.map((f) => [f.label, f.value]), [],
      ["Doctor", "Clinic", "Appointments", "Completed", "No-shows", "Cancelled"], ...a.doctors.map((d) => [d.name, d.clinic, d.total, d.done, d.noShow, d.cancelled]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `isalu-analytics-${a.startIso}-to-${a.endIso}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAnalyticsPdf = () => {
    const a = analytics;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    let y = 18;
    const line = (text: string, size = 10, bold = false, gap = 6) => {
      if (y > H - 15) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.text(text, 14, y); y += gap;
    };
    const table = (head: string[], rows: (string | number)[][], widths: number[]) => {
      const draw = (cells: (string | number)[], bold: boolean) => {
        if (y > H - 15) { doc.addPage(); y = 18; }
        doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(9);
        let x = 14; cells.forEach((c, i) => { doc.text(String(c).slice(0, 40), x, y); x += widths[i]; }); y += 5.5;
      };
      draw(head, true); doc.setDrawColor(200); doc.line(14, y - 4, W - 14, y - 4);
      rows.forEach((r) => draw(r, false)); y += 4;
    };
    line("ISALU HOSPITALS - EXECUTIVE ANALYTICS", 14, true, 7);
    line(`${a.label} (${a.startIso} to ${a.endIso}) · ${analyticsClinic === "all" ? "All clinics" : analyticsClinic}`, 10, false, 5);
    line(`Generated ${new Date().toLocaleString("en-GB")}`, 8, false, 9);
    table(["Metric", "Value"], [
      ["Appointments", a.total], ["Completed", a.completed], ["Checked in", a.checkedIn], ["Upcoming", a.upcoming],
      ["No-shows", a.noShow], ["Cancelled", a.cancelled], ["Attendance rate", `${a.completionRate}%`], ["No-show rate", `${a.noShowRate}%`],
      ["Cancellation rate", `${a.cancellationRate}%`], ["Average per day", a.avgPerDay], ["HMO awaiting pre-auth", a.pendingHmo], ["Unpaid self-pay", a.pendingPay],
    ], [90, 40]);
    table(["Clinic", "Appointments", "Completion"], a.byClinic.map((c) => [c.label, c.value, c.sub || ""]), [90, 35, 40]);
    table(["Funding source", "Appointments"], a.funding.map((f) => [f.label, f.value]), [90, 40]);
    table(["Doctor", "Clinic", "Appts", "Done", "No-show", "Cancelled"], a.doctors.map((d) => [d.name, d.clinic, d.total, d.done, d.noShow, d.cancelled]), [55, 50, 18, 18, 22, 20]);
    doc.save(`isalu-analytics-${a.startIso}-to-${a.endIso}.pdf`);
  };
  const filteredArchiveBookings = disabledBookings.filter((b: any) => {
    const q = archiveSearch.trim().toLowerCase();
    const clinic = String(b.doctorSpecialty ?? b.doctor_specialty ?? "").toLowerCase();
    const matchesClinic = archiveClinicFilter === "all" || clinic.includes(archiveClinicFilter.toLowerCase());
    return matchesClinic && (!q || [b.refCode, b.ref_code, b.patientName, b.patient_name, b.doctorSpecialty, b.doctor_specialty].some((v) => String(v ?? "").toLowerCase().includes(q)));
  });
  const cashdeskQueue = bookings.filter(isPendingCashBooking);
  const checkedInList = activeBookings.filter((b) => String(b?.status || "").toLowerCase() === "checked in");
  const filteredHmoCompanies = hmoCompanies.filter((h: any) => {
    const q = hmoOrgSearchQuery.trim().toLowerCase();
    return !q || [h.name, h.code, h.email, h.contactPerson, h.contact_person].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  // ------------------------------------------------------------------
  // BOOKING EDIT / DELETE (super admin)
  // ------------------------------------------------------------------
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editBookingForm, setEditBookingForm] = useState({ patientName: "", patientPhone: "", patientEmail: "", date: "", time: "", status: "Confirmed", reason: "" });
  const [editBookingError, setEditBookingError] = useState("");
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  const openEditBookingModal = (b: any) => {
    setEditingBooking(b);
    setEditBookingForm({
      patientName: b.patientName || b.patient_name || "",
      patientPhone: b.patientPhone || b.patient_phone || "",
      patientEmail: b.patientEmail || b.patient_email || "",
      date: b.date || "",
      time: b.time || "",
      status: b.status || "Confirmed",
      reason: b.reason || "",
    });
    setEditBookingError("");
  };

  const handleSaveEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || isSavingBooking) return;
    const refCode = editingBooking.refCode || editingBooking.ref_code;
    const f = editBookingForm;
    if (!f.patientName.trim() || !f.patientPhone.trim() || !f.date || !f.time.trim()) {
      setEditBookingError("Patient name, phone, date and time are required.");
      return;
    }
    // Only send fields that changed, so lifecycle edits do not re-run the
    // scheduling/capacity checks that apply to a reschedule.
    const original: Record<string, any> = {
      patient_name: editingBooking.patientName || editingBooking.patient_name || "",
      patient_phone: editingBooking.patientPhone || editingBooking.patient_phone || "",
      patient_email: editingBooking.patientEmail || editingBooking.patient_email || "",
      date: editingBooking.date || "",
      time: editingBooking.time || "",
      status: editingBooking.status || "Confirmed",
      reason: editingBooking.reason || "",
    };
    const next: Record<string, any> = {
      patient_name: f.patientName.trim(), patient_phone: f.patientPhone.trim(), patient_email: f.patientEmail.trim(),
      date: f.date, time: f.time.trim(), status: f.status, reason: f.reason,
    };
    const changes = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== original[k]));
    if (Object.keys(changes).length === 0) {
      setEditingBooking(null);
      return;
    }
    setIsSavingBooking(true);
    try {
      ensureOk(await updateBookingAPI(refCode, changes), `Unable to update booking ${refCode}.`);
      await fetchBookings();
      void fetchDashboardSummary();
      setEditingBooking(null);
      setToastAlert({ title: "Booking Updated ✓", description: `Booking ${refCode} saved.`, type: "success" });
    } catch (err: any) {
      setEditBookingError(err?.message || "Unable to update this booking.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleDeleteBookingRecord = (b: any) => {
    const refCode = b.refCode || b.ref_code;
    setConfirmModalConfig({
      isOpen: true,
      title: "Disable Booking Record?",
      message: `Booking ${refCode} for ${b.patientName || b.patient_name || "this patient"} will be moved to the Disabled Bookings archive and its slot released. You can restore it later.`,
      confirmText: "Disable Booking",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => { await handleTrashBooking(b); },
    });
  };

  const handleDeactivateUser = (uId: string, uName: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Deactivate Staff Account?",
      message: `${uName} will no longer be able to sign in. The account is kept for audit purposes and can be re-enabled later.`,
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        ensureOk(await deleteSystemUserAPI(uId), `Unable to deactivate ${uName}.`);
        await loadUsers();
        setToastAlert({ title: "Staff Account Deactivated", description: `${uName} can no longer sign in.`, type: "info" });
      },
    });
  };

  // ------------------------------------------------------------------
  // CLINICS
  // ------------------------------------------------------------------
  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingClinic) return;
    if (!newClinicName.trim()) {
      setClinicFormError("Please enter a valid clinic department name.");
      return;
    }
    setIsSubmittingClinic(true);
    try {
      ensureOk(await createDepartmentAPI({
        name: newClinicName.trim(),
        dept_id: newClinicId.trim() || undefined,
        description: newClinicDescription.trim() || "Specialized clinical consultation services.",
        icon_name: newClinicIcon,
        location: newClinicLocation.trim(),
        status: newClinicStatus,
      }), "Unable to create this department.");
      await loadClinics();
      setNewClinicName("");
      setNewClinicId("");
      setNewClinicDescription("");
      setClinicFormError("");
      setShowCreateClinicModal(false);
      setToastAlert({ title: "Department Registered ✓", description: `Clinic unit ${newClinicName.trim()} created.`, type: "success" });
    } catch (err: any) {
      setClinicFormError(err?.message || "Unable to create this department.");
    } finally {
      setIsSubmittingClinic(false);
    }
  };

  const handleSaveEditClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic || isSubmittingClinic) return;
    if (!editClinicName.trim()) {
      setEditClinicFormError("Department name cannot be empty.");
      return;
    }
    setIsSubmittingClinic(true);
    try {
      ensureOk(await updateDepartmentAPI(editingClinic.id || editingClinic.dept_id, {
        name: editClinicName.trim(),
        description: editClinicDescription.trim(),
        location: editClinicLocation.trim(),
        icon_name: editClinicIcon || editingClinic.iconName,
        status: editClinicStatus,
      }), "Unable to update this department.");
      await loadClinics();
      setEditingClinic(null);
      setEditClinicFormError("");
      setToastAlert({ title: "Department Updated ✓", description: `${editClinicName.trim()} saved.`, type: "success" });
    } catch (err: any) {
      setEditClinicFormError(err?.message || "Unable to update this department.");
    } finally {
      setIsSubmittingClinic(false);
    }
  };

  // ------------------------------------------------------------------
  // AI REPORT
  // ------------------------------------------------------------------
  const handleGenerateAiReport = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim() || "Generate Full Executive Board Report";
    if (isGeneratingAiReport) return;
    setIsGeneratingAiReport(true);
    setAiProcessingProgress(10);
    setAiProcessingStep("Collecting live hospital metrics...");
    try {
      setAiProcessingProgress(45);
      setAiProcessingStep("Generating executive summary...");
      const res: any = ensureOk(await generateAiReportAPI(prompt), "Unable to generate the report.");
      const report = String(res?.report || res?.data?.report || "").trim();
      if (!report) throw new Error("The server returned an empty report.");
      setAiProcessingProgress(100);
      setAiProcessingStep("Report ready");
      setGeneratedAiReport(report);
      setCopiedAiReport(false);
      setAiReportHistory((prev) => [{ prompt, date: new Date().toLocaleString(), report }, ...prev].slice(0, 10));
    } catch (err: any) {
      setToastAlert({ title: "AI Report Failed", description: err?.message || "Unable to generate the report.", type: "danger" });
    } finally {
      setIsGeneratingAiReport(false);
      setTimeout(() => setAiProcessingProgress(0), 600);
    }
  };

  const downloadAiReportAsPdf = (reportText: string, title: string = "AI Executive Report") => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Isalu Hospitals", margin, 18);
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(title, width), margin, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, 33);
    doc.setFontSize(10);
    let y = 42;
    doc.splitTextToSize(reportText, width).forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    doc.save(`${title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60) || "AI_Report"}.pdf`);
  };

  // ------------------------------------------------------------------
  // BOOKINGS: fast first paint, then incremental sync
  // ------------------------------------------------------------------
  // The full registry can be tens of MB, so it is downloaded once; afterwards
  // only changed bookings are fetched (after actions, live events and polls).
  const lastBookingSyncRef = useRef<string | null>(null);
  const bookingSyncInFlightRef = useRef(false);
  const bookingSyncQueuedRef = useRef(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
  const [lastBookingsUpdate, setLastBookingsUpdate] = useState<Date | null>(null);

  const bookingRef = (b: any) => String(b?.refCode || b?.ref_code || b?.id || "");

  const mergeBookingChanges = (prev: any[], changed: any[], removed: string[]) => {
    if (!changed.length && !removed.length) return prev;
    const drop = new Set(removed);
    const updates = new Map(changed.map((b) => [bookingRef(b), b]));
    const next: any[] = [];
    prev.forEach((b) => {
      const ref = bookingRef(b);
      if (drop.has(ref)) return;
      if (updates.has(ref)) {
        next.push(updates.get(ref));
        updates.delete(ref);
      } else {
        next.push(b);
      }
    });
    // Bookings we did not have yet (new) go first, matching the server's newest-first order.
    return [...Array.from(updates.values()), ...next];
  };

  const fetchBookings = async (forceFull: boolean = false) => {
    if (bookingSyncInFlightRef.current) {
      bookingSyncQueuedRef.current = true;
      return;
    }
    bookingSyncInFlightRef.current = true;
    try {
      if (!forceFull && lastBookingSyncRef.current) {
        const res: any = await getBookingsSyncAPI({ since: lastBookingSyncRef.current });
        if (!res || isApiError(res)) throw new Error(res?.error || "Unable to refresh bookings.");
        lastBookingSyncRef.current = res.server_time;
        setBookings((prev) => mergeBookingChanges(prev, res.results || [], res.removed || []));
      } else {
        if (!bookingsLoaded) setIsLoadingBookings(true);
        if (!bookingsLoaded) {
          // 1) Yesterday onwards: small and quick, so the desks are usable at once.
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const recent: any = await getBookingsSyncAPI({ dateFrom: toLocalISODate(yesterday) });
          if (recent && !isApiError(recent) && Array.isArray(recent.results)) {
            setBookings(recent.results);
            setBookingsLoaded(true);
            setIsLoadingBookings(false);
          }
        }
        // 2) Full history (All Patients, registries, exports).
        const res: any = await getBookingsSyncAPI();
        if (!res || isApiError(res)) throw new Error(res?.error || "Unable to load bookings.");
        lastBookingSyncRef.current = res.server_time;
        setBookings(Array.isArray(res.results) ? res.results : []);
        setBookingsLoaded(true);
        setFullHistoryLoaded(true);
      }
      setLastBookingsUpdate(new Date());
      try {
        localStorage.removeItem("isalu_cached_bookings");
        localStorage.removeItem("isalu_bookings");
      } catch { }
    } catch (err: any) {
      console.error("Failed to fetch bookings:", err);
      setToastAlert({ title: "Booking Refresh Failed", description: err?.message || "Unable to refresh bookings. Previously loaded records are preserved.", type: "danger" });
    } finally {
      setIsLoadingBookings(false);
      bookingSyncInFlightRef.current = false;
      if (bookingSyncQueuedRef.current) {
        bookingSyncQueuedRef.current = false;
        void fetchBookings();
      }
    }
  };

  const fetchDashboardSummary = async () => {
    if (summaryRequestRef.current) return summaryRequestRef.current;
    setIsRefreshingSummary(true);
    const request = (async () => {
      try {
        const raw: any = await getBookingSummaryAPI();
        if (raw && typeof raw === "object" && !isApiError(raw)) {
          const summary: DashboardSummary = {
            totalBookings: Number(raw.totalBookings ?? 0),
            checkedInCount: Number(raw.checkedInCount ?? 0),
            pendingHmoCount: Number(raw.pendingHmoCount ?? 0),
            pendingCashCount: Number(raw.pendingCashCount ?? 0),
            todayCount: Number(raw.todayCount ?? 0),
            date: String(raw.date || toLocalISODate(new Date())),
          };
          setDashboardSummary(summary);
          try { localStorage.setItem(DASHBOARD_SUMMARY_CACHE_KEY, JSON.stringify(summary)); } catch (cacheError) {
            console.warn("Unable to cache dashboard summary:", cacheError);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err);
      } finally {
        setIsRefreshingSummary(false);
        summaryRequestRef.current = null;
      }
    })();
    summaryRequestRef.current = request;
    return request;
  };

  // Public reference data loads immediately; staff-only data loads once the
  // user is signed in (also right after login, without a page reload).
  // Calling staff endpoints before login returned 401, which showed a false
  // "Session Expired" message on the login screen.
  useEffect(() => {
    loadClinics();
    loadDoctors();
    loadSchedules();
    loadHmoCompanies();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshStaffProfile();
    loadScheduleExceptions();
    void loadNotifyChannels();
    loadUsers();
    loadRoles();
    loadDisabledBookings();
    fetchBookings(true);
    fetchDashboardSummary();
  }, [isAuthenticated]);

  // Live updates: the backend broadcasts every booking change; fetch only the
  // changes (debounced so a burst of events costs one request).
  const liveSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleLiveSync = () => {
    if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current);
    liveSyncTimerRef.current = setTimeout(() => {
      void fetchBookings();
      void fetchDashboardSummary();
    }, 400);
  };
  const { connected: liveFeedConnected } = useHospitalLiveFeed(scheduleLiveSync, isAuthenticated);

  // Fallback when the live feed is unavailable: poll for changes while the tab is visible.
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = () => {
      if (document.visibilityState === "visible") scheduleLiveSync();
    };
    const interval = setInterval(poll, liveFeedConnected ? 120000 : 30000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [isAuthenticated, liveFeedConnected]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (!isDeskAllowed(activeDesk)) {
      const fallback = (validDesks as DeskType[]).find((d) => d === currentUser.desk && isDeskAllowed(d))
        || (validDesks as DeskType[]).find((d) => isDeskAllowed(d));
      if (fallback && fallback !== activeDesk) {
        setActiveDesk(fallback);
        setSearchParams({ desk: fallback });
      }
    }
  }, [currentUser, roles, isAuthenticated]);

  useEffect(() => {
    if (activeDesk !== "monitor") return;
    setMonitorNow(new Date());
    const timer = setInterval(() => setMonitorNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, [activeDesk]);

  /**
   * Waiting-room "Completed": the patient leaves the screen at once (optimistic),
   * the server is updated in the background, and other screens follow through
   * the live feed. If the server refuses, the patient is put back and told why.
   */
  const setLocalBookingStatus = (refCode: string, status: string) =>
    setBookings((prev) => prev.map((b: any) => ((b.refCode || b.ref_code) === refCode ? { ...b, status } : b)));

  const handleMonitorComplete = async (b: any) => {
    const refCode = b.refCode || b.ref_code;
    if (!refCode || monitorBusyRef) return;
    const previousStatus = b.status || "Checked In";
    setMonitorBusyRef(refCode);
    setLocalBookingStatus(refCode, "Completed");
    try {
      ensureOk(await updateBookingAPI(refCode, { status: "Completed" }), "Unable to mark this consultation as completed.");
      if (monitorUndoTimer.current) clearTimeout(monitorUndoTimer.current);
      setMonitorUndo({ refCode, name: maskPatientName(b.patientName || b.patient_name) });
      monitorUndoTimer.current = setTimeout(() => setMonitorUndo(null), 8000);
      void fetchDashboardSummary();
    } catch (err: any) {
      setLocalBookingStatus(refCode, previousStatus);
      setToastAlert({ title: "Could Not Complete", description: err?.message || "Please try again.", type: "danger" });
    } finally {
      setMonitorBusyRef(null);
    }
  };

  const handleMonitorUndo = async () => {
    if (!monitorUndo) return;
    const { refCode } = monitorUndo;
    setMonitorUndo(null);
    if (monitorUndoTimer.current) clearTimeout(monitorUndoTimer.current);
    setLocalBookingStatus(refCode, "Checked In");
    const res: any = await updateBookingAPI(refCode, { status: "Checked In" });
    if (!res || isApiError(res)) {
      setLocalBookingStatus(refCode, "Completed");
      setToastAlert({ title: "Undo Failed", description: res?.error || "The consultation stays completed.", type: "danger" });
    }
  };

  // Tailwind is configured with darkMode: "class"; without this the many
  // dark: styles in the dashboard never applied in dark mode.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", Boolean(isDarkMode));
    return () => root.classList.remove("dark");
  }, [isDarkMode]);

  const getPrimaryDeskForRole = (role: string): DeskType => {
    const r = (role || "").toLowerCase();
    if (r.includes("hmo") || r.includes("insurance")) return "hmo";
    if (r.includes("cash") || r.includes("cashier") || r.includes("billing")) return "cashdesk";
    if (r.includes("monitor")) return "monitor";
    if (r.includes("analytics")) return "analytics";
    return "helpdesk";
  };

  const downloadHospitalAnalyticsAsPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Watermark Overlay in PDF
    doc.setTextColor(215, 235, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("ISALU HOSPITALS", 105, 145, { align: "center", angle: 25 });
    doc.setFontSize(14);
    doc.text("HOSPITAL QUEUE & DEPARTMENT ANALYTICS", 105, 158, { align: "center", angle: 25 });

    // Header Background (#008AC9)
    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 45, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OFFICIAL HOSPITAL QUEUE & DEPARTMENT ANALYTICS REPORT", 105, 14, { align: "center" });

    // 4-Sphere Isalu Logo Emblem on PDF Header
    const pdfLogoX = 62;
    const pdfLogoY = 26;
    const r = 2.5;

    doc.setFillColor(255, 255, 255);
    doc.circle(pdfLogoX, pdfLogoY - 3.8, r, "F");
    doc.circle(pdfLogoX - 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX + 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX, pdfLogoY + 3.8, r, "F");

    doc.setFontSize(22);
    doc.text("Isalu Hospitals", pdfLogoX + 8, 29, { align: "left" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Comprehensive Live Operational, Clinical Floor & Revenue Clearance Audit Report.", 105, 36, { align: "center" });

    // Report Header Metadata Box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 50, 180, 22, 4, 4, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("REPORT GENERATED ON", 105, 57, { align: "center" });

    doc.setTextColor(0, 138, 201);
    doc.setFontSize(11);
    doc.text(nowStr.toUpperCase(), 105, 65, { align: "center" });

    // 1. Executive Summary Metrics Grid
    let y = 79;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)", 15, y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    const kpiBoxes = [
      { label: "Total Bookings", val: `${totalBookings} Registered Tickets` },
      { label: "Active Floor Queue", val: `${checkedInCount} Waiting Lobby Patients` },
      { label: "Completed (Red Badge)", val: `${completedCount} Concluded Consultations` },
      { label: "HMO Pre-Auth Queue", val: `${pendingHmoCount} Pending (${hmoApprovedCount} Approved)` },
      { label: "Cashdesk Queue", val: `${pendingCashCount} Pending (${clearedPaymentCount} Cleared)` },
      { label: "Staff Roster Coverage", val: `${activeStaffCount} Active (${activeShiftsCount} Shifts On Duty)` },
    ];

    doc.setFontSize(8.5);
    for (let i = 0; i < kpiBoxes.length; i += 2) {
      const b1 = kpiBoxes[i];
      const b2 = kpiBoxes[i + 1];

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 87, 13, 2, 2, "FD");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text(b1.label.toUpperCase(), 18, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.text(b1.val, 18, y + 9.5);

      if (b2) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(108, y, 87, 13, 2, 2, "FD");
        doc.setTextColor(100, 116, 139);
        doc.text(b2.label.toUpperCase(), 111, y + 4.5);
        doc.setTextColor(15, 23, 42);
        doc.text(b2.val, 111, y + 9.5);
      }

      y += 15;
    }

    // 2. Department Volume Breakdown Table
    y += 2;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. DEPARTMENT QUEUE & PATIENT VOLUME BREAKDOWN", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    // Table Header Row
    doc.setFillColor(0, 138, 201);
    doc.rect(15, y, 180, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("MEDICAL SPECIALTY", 18, y + 4.8);
    doc.text("VOLUME", 90, y + 4.8, { align: "center" });
    doc.text("WORKLOAD %", 125, y + 4.8, { align: "center" });
    doc.text("CHECKED IN", 160, y + 4.8, { align: "center" });
    doc.text("COMPLETED", 188, y + 4.8, { align: "center" });
    y += 7;

    departmentAnalyticsList.forEach((dept, idx) => {
      const deptBookings = bookings.filter((b) => {
        if (!b.doctorSpecialty && !b.doctor_specialty) return false;
        const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
        const dName = dept.name.toLowerCase();
        return spec.includes(dName) || dName.includes(spec) || (dept.id === "cardiology" && spec.includes("cardio"));
      });
      const totalDept = deptBookings.length;
      const checkedInDept = deptBookings.filter((b) => b.status === "Checked In").length;
      const completedDept = deptBookings.filter((b) => b.status === "Completed").length;
      const percentOfTotal = totalBookings > 0 ? Math.round((totalDept / totalBookings) * 100) : 0;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6.5, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(15, y, 180, 6.5, "F");
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(dept.name, 18, y + 4.5);
      doc.text(String(totalDept), 90, y + 4.5, { align: "center" });
      doc.text(`${percentOfTotal}%`, 125, y + 4.5, { align: "center" });
      doc.text(String(checkedInDept), 160, y + 4.5, { align: "center" });
      doc.text(String(completedDept), 188, y + 4.5, { align: "center" });
      y += 6.5;
    });

    // 3. Revenue Clearance & Funding Ratios
    y += 5;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("3. REVENUE CLEARANCE & FUNDING SOURCE RATIOS", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    const clearanceRate = totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 0;
    const hmoRatio = totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0;
    const selfPayRatio = totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0;

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text(`• Private Self-Pay Patient Share: ${privateSelfPayCount} Patients (${selfPayRatio}%)`, 18, y);
    y += 5;
    doc.text(`• HMO Health Insurance Enrollee Share: ${hmoEnrolleeCount} Enrollees (${hmoRatio}%)`, 18, y);
    y += 5;
    doc.text(`• Overall Revenue Clearance Rate: ${clearedPaymentCount} Cleared Invoices out of ${totalBookings} (${clearanceRate}%)`, 18, y);
    y += 5;
    doc.text(`• Verified Doctor Referral Documents: ${referralDocCount} Documents attached to patient files`, 18, y);

    // Red Official Verification Seal
    const sX = 168;
    const sY = 228;
    const sR = 18;

    doc.setFillColor(220, 38, 38);
    doc.circle(sX, sY, sR, "F");

    doc.setDrawColor(253, 224, 71);
    doc.setLineWidth(0.8);
    doc.circle(sX, sY, sR - 1.5, "S");

    doc.setFillColor(185, 28, 28);
    doc.circle(sX, sY, sR - 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("ISALU HOSPITALS", sX, sY - 6, { align: "center" });

    doc.setFontSize(10);
    doc.text("VERIFIED", sX, sY + 1, { align: "center" });

    doc.setFontSize(5);
    doc.text("ANALYTICAL SEAL", sX, sY + 7, { align: "center" });

    // Footer Bar
    doc.setFillColor(1, 22, 39);
    doc.rect(0, 275, 210, 22, "F");

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos  |  Hotline: +234 (0) 800-ISALU-CARE", 105, 287, { align: "center" });

    doc.save(`Isalu_Hospital_Queue_Analytics_Report.pdf`);
  };

  const downloadHospitalAnalyticsAsExcel = () => {
    const totalBookings = bookings.length;
    const checkedInCount = bookings.filter((b) => b.status === "Checked In").length;
    const completedCount = bookings.filter((b) => b.status === "Completed").length;
    const pendingHmoCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus !== "Approved").length;
    const hmoApprovedCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus === "Approved").length;
    const pendingCashCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" && b.paymentStatus !== "Cleared").length;
    const clearedPaymentCount = bookings.filter((b) => b.paymentStatus === "Cleared").length;
    const paidOrApprovedCount = bookings.filter((b) => (b.hmoStatus === "Approved" || b.hmo_status === "Approved" || b.paymentStatus === "Cleared" || b.payment_status === "Cleared") && b.status !== "Completed" && b.status !== "Cancelled").length;

    const privateSelfPayCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType || b.paymentType.includes("Self-Pay")).length;
    const hmoEnrolleeCount = bookings.filter((b) => b.paymentType === "HMO Insurance").length;
    const referralDocCount = bookings.filter((b) => Boolean(b.referralDocName || b.referral_doc_name)).length;

    const activeStaffCount = systemUsers.filter((u) => u.status === "Active").length;
    const activeShiftsCount = specialistSchedules.filter((s) => s.status !== false && (typeof s.status !== "string" || !s.status.includes("Disabled"))).length;

    const clearanceRate = totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 0;
    const hmoRatio = totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0;
    const selfPayRatio = totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0;

    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    let xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Queue & Dept Analytics</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
  th { background-color: #008ac9; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #0072b1; text-align: left; }
  td { padding: 6px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 11pt; }
  .title { background-color: #008ac9; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 12px; }
  .subtitle { background-color: #f0f9ff; color: #0369a1; font-size: 11pt; font-weight: bold; text-align: center; padding: 6px; }
  .section-header { background-color: #0f172a; color: #38bdf8; font-size: 12pt; font-weight: bold; padding: 8px; }
  .kpi-title { font-weight: bold; color: #475569; background-color: #f8fafc; }
  .kpi-val { font-weight: bold; color: #008ac9; }
</style>
</head>
<body>
<table>
  <tr><td colspan="6" class="title">ISALU HOSPITALS - QUEUE & DEPARTMENT ANALYTICS AUDIT REPORT</td></tr>
  <tr><td colspan="6" class="subtitle">Generated on: ${nowStr}</td></tr>
  <tr><td colspan="6"></td></tr>

  <!-- 1. EXECUTIVE KPIs -->
  <tr><td colspan="6" class="section-header">1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)</td></tr>
  <tr>
    <th colspan="3">Metric Indicator</th>
    <th colspan="3">Operational Count & Status</th>
  </tr>
  <tr><td colspan="3" class="kpi-title">Total Patient Bookings</td><td colspan="3" class="kpi-val">${totalBookings} Registered Tickets</td></tr>
  <tr><td colspan="3" class="kpi-title">Active Floor Queue (Waiting Lobby)</td><td colspan="3" class="kpi-val">${checkedInCount} Checked-In Patients</td></tr>
  <tr><td colspan="3" class="kpi-title">Completed Consultations</td><td colspan="3" class="kpi-val">${completedCount} Concluded Visits</td></tr>
  <tr><td colspan="3" class="kpi-title">HMO Pre-Authorization Queue</td><td colspan="3" class="kpi-val">${pendingHmoCount} Pending (${hmoApprovedCount} Approved)</td></tr>
  <tr><td colspan="3" class="kpi-title">Cashdesk Payment Clearance Queue</td><td colspan="3" class="kpi-val">${pendingCashCount} Pending (${clearedPaymentCount} Cleared)</td></tr>
  <tr><td colspan="3" class="kpi-title">Staff Roster & Duty Coverage</td><td colspan="3" class="kpi-val">${activeStaffCount} Active Staff (${activeShiftsCount} Shifts On Duty)</td></tr>
  <tr><td colspan="3" class="kpi-title">Overall Revenue Clearance Rate</td><td colspan="3" class="kpi-val">${clearanceRate}% (${clearedPaymentCount} / ${totalBookings})</td></tr>
  <tr><td colspan="3" class="kpi-title">Private Self-Pay Patient Share</td><td colspan="3" class="kpi-val">${selfPayRatio}% (${privateSelfPayCount} Patients)</td></tr>
  <tr><td colspan="3" class="kpi-title">HMO Insurance Enrollee Share</td><td colspan="3" class="kpi-val">${hmoRatio}% (${hmoEnrolleeCount} Enrollees)</td></tr>
  <tr><td colspan="3" class="kpi-title">Verified Doctor Referral Documents</td><td colspan="3" class="kpi-val">${referralDocCount} Files Attached</td></tr>
  <tr><td colspan="6"></td></tr>

  <!-- 2. DEPARTMENT QUEUE & WORKLOAD BREAKDOWN -->
  <tr><td colspan="6" class="section-header">2. DEPARTMENT QUEUE & PATIENT VOLUME BREAKDOWN</td></tr>
  <tr>
    <th>Department Specialty</th>
    <th>Total Bookings</th>
    <th>Workload %</th>
    <th>Checked In Queue</th>
    <th>Completed Consultations</th>
    <th>Status</th>
  </tr>`;

    departmentAnalyticsList.forEach((dept) => {
      const deptBookings = bookings.filter((b) => {
        if (!b.doctorSpecialty && !b.doctor_specialty) return false;
        const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
        const dName = dept.name.toLowerCase();
        return spec.includes(dName) || dName.includes(spec) || (dept.id === "cardiology" && spec.includes("cardio"));
      });
      const totalDept = deptBookings.length;
      const checkedInDept = deptBookings.filter((b) => b.status === "Checked In").length;
      const completedDept = deptBookings.filter((b) => b.status === "Completed").length;
      const percentOfTotal = totalBookings > 0 ? Math.round((totalDept / totalBookings) * 100) : 0;

      xml += `
  <tr>
    <td><b>${dept.name}</b></td>
    <td align="center">${totalDept}</td>
    <td align="center">${percentOfTotal}%</td>
    <td align="center">${checkedInDept}</td>
    <td align="center">${completedDept}</td>
    <td>Operational</td>
  </tr>`;
    });

    xml += `
  <tr><td colspan="6"></td></tr>

  <!-- 3. DETAILED PATIENT QUEUE RECORDS -->
  <tr><td colspan="6" class="section-header">3. DETAILED PATIENT TICKET REGISTRY</td></tr>
  <tr>
    <th>Ticket Code</th>
    <th>Patient Name</th>
    <th>Specialty / Doctor</th>
    <th>Payment Category</th>
    <th>HMO / Payment Status</th>
    <th>Visit Status</th>
  </tr>`;

    bookings.forEach((b) => {
      const ref = b.refCode || b.ref_code || "N/A";
      const name = b.patientName || b.patient_name || "N/A";
      const doc = b.doctorName || b.doctor_name || b.doctorSpecialty || "Specialist";
      const payType = b.paymentType || b.payment_type || "Private Self-Pay";
      const payStat = b.paymentStatus || b.payment_status || "Pending";
      const status = b.status || "Pending";

      xml += `
  <tr>
    <td><b>${ref}</b></td>
    <td>${name}</td>
    <td>${doc}</td>
    <td>${payType}</td>
    <td>${payStat}</td>
    <td>${status}</td>
  </tr>`;
    });

    xml += `
</table>
</body>
</html>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Isalu_Hospital_Queue_Department_Analytics_${toLocalISODate(new Date())}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastAlert({
      title: "Excel Analytics Exported ✓",
      description: "Hospital Queue & Department Analytics spreadsheet downloaded successfully.",
      type: "success",
    });
  };

  // --- UNIVERSAL ISALU HOSPITALS PDF EXPORT ENGINE ---
  interface PDFExportConfig {
    title: string;
    subtitle: string;
    filename: string;
    headers: string[];
    data: (string | number)[][];
    summaryItems?: { label: string; value: string }[];
  }

  const exportTableToPDF = (config: PDFExportConfig) => {
    const doc = new jsPDF("p", "mm", "a4");
    const nowStr = new Date().toLocaleString();
    const staffName = currentUser?.name || currentUser?.username || "Superadmin";

    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 42, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(config.title.toUpperCase(), 105, 12, { align: "center" });

    const pdfLogoX = 62;
    const pdfLogoY = 25;
    const r = 2.5;

    doc.setFillColor(255, 255, 255);
    doc.circle(pdfLogoX, pdfLogoY - 3.8, r, "F");
    doc.circle(pdfLogoX - 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX + 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX, pdfLogoY + 3.8, r, "F");

    doc.setFontSize(22);
    doc.text("Isalu Hospitals", pdfLogoX + 8, 28, { align: "left" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(config.subtitle, 105, 36, { align: "center" });

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, 48, 182, 18, 3, 3, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`REPORT GENERATED: ${nowStr.toUpperCase()}`, 18, 55);
    doc.text(`GENERATED BY: ${staffName.toUpperCase()}`, 18, 61);
    doc.text(`TOTAL EXPORTED: ${config.data.length} RECORDS`, 192, 55, { align: "right" });
    doc.text(`CONFIDENTIALITY: INTERNAL HOSPITAL RECORD`, 192, 61, { align: "right" });

    let startY = 72;

    if (config.summaryItems && config.summaryItems.length > 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, startY, 182, 14, 2, 2, "FD");

      const colWidth = 182 / config.summaryItems.length;
      config.summaryItems.forEach((item, idx) => {
        const itemX = 14 + idx * colWidth + colWidth / 2;
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(item.label.toUpperCase(), itemX, startY + 5, { align: "center" });
        doc.setTextColor(0, 138, 201);
        doc.setFontSize(8.5);
        doc.text(item.value, itemX, startY + 10.5, { align: "center" });
      });
      startY += 19;
    }

    const marginX = 14;
    const tableWidth = 182;
    const numCols = config.headers.length;
    const colWidth = tableWidth / numCols;
    const rowHeight = 7.5;
    const pageHeight = 285;

    const renderTableHeader = (yPos: number) => {
      doc.setFillColor(0, 138, 201);
      doc.rect(marginX, yPos, tableWidth, rowHeight + 1, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);

      config.headers.forEach((h, i) => {
        const x = marginX + i * colWidth + 2;
        const truncatedH = doc.splitTextToSize(h.toUpperCase(), colWidth - 3)[0];
        doc.text(truncatedH, x, yPos + 5.5);
      });
    };

    renderTableHeader(startY);
    let currentY = startY + rowHeight + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    config.data.forEach((row, rowIndex) => {
      if (currentY + rowHeight > pageHeight - 12) {
        addPDFFooter(doc);
        doc.addPage();
        currentY = 18;
        renderTableHeader(currentY);
        currentY += rowHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
      }

      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, tableWidth, rowHeight, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(marginX, currentY, tableWidth, rowHeight, "F");
      }

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(marginX, currentY + rowHeight, marginX + tableWidth, currentY + rowHeight);

      doc.setTextColor(15, 23, 42);

      row.forEach((cellVal, colIndex) => {
        const cellStr = String(cellVal ?? "-");
        const x = marginX + colIndex * colWidth + 2;
        const truncatedCell = doc.splitTextToSize(cellStr, colWidth - 3)[0];
        doc.text(truncatedCell, x, currentY + 5);
      });

      currentY += rowHeight;
    });

    addPDFFooter(doc);
    doc.save(config.filename);

    setToastAlert({
      title: "PDF Report Exported ✓",
      description: `${config.title} PDF document downloaded successfully.`,
      type: "success",
    });
  };

  const addPDFFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 283, 196, 283);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("ISALU HOSPITALS • OFFICIAL AUDIT REPORT", 14, 287);
      doc.text(`PAGE ${i} OF ${pageCount}`, 196, 287, { align: "right" });
    }
  };

  const exportHelpdeskToPDF = () => {
    exportTableToPDF({
      title: "Helpdesk Reception Patient Queue Report",
      subtitle: "Official Reception Desk Patient Check-In & Consultation Ticket Export",
      filename: "Isalu_Helpdesk_Reception_Queue.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone Number", "Doctor Assigned", "Specialty", "Date & Time", "Payment Type", "Status"],
      summaryItems: [
        { label: "Total Queue", value: `${filteredBookings.length} Tickets` },
        { label: "Checked In", value: `${filteredBookings.filter(b => b.status === "Checked In").length}` },
        { label: "Completed", value: `${filteredBookings.filter(b => b.status === "Completed").length}` },
      ],
      data: filteredBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.doctorSpecialty || b.doctor_specialty || "-",
        `${b.date} ${b.time}`,
        b.paymentType || b.payment_type || "Private Self-Pay",
        b.status || "Confirmed",
      ]),
    });
  };

  const exportHmoDeskToPDF = () => {
    exportTableToPDF({
      title: "HMO Insurance Pre-Authorization Report",
      subtitle: "Official Verification & HMO Pre-Auth Desk Approval Register",
      filename: "Isalu_HMO_PreAuth_Desk_Queue.pdf",
      headers: ["Ticket Ref", "Enrollee Name", "Phone", "HMO Provider", "Policy ID", "Auth Code", "Status"],
      summaryItems: [
        { label: "Total HMO", value: `${hmoDeskQueue.length}` },
        { label: "Approved", value: `${hmoDeskQueue.filter(b => b.hmoStatus === "Approved" || b.hmo_status === "Approved").length}` },
        { label: "Pending Auth", value: `${hmoDeskQueue.filter(b => b.hmoStatus !== "Approved" && b.hmo_status !== "Approved").length}` },
      ],
      data: hmoDeskQueue.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.hmoName || b.hmo_name || "HMO",
        b.hmoPolicyCode || b.hmo_policy_code || "-",
        b.hmoAuthCode || b.hmo_auth_code || "PENDING",
        (b.hmoStatus === "Approved" || b.hmo_status === "Approved") ? "Approved ✓" : "Pending Pre-Auth",
      ]),
    });
  };

  const exportCashdeskToPDF = () => {
    exportTableToPDF({
      title: "Cashdesk Invoicing & Payment Clearance Report",
      subtitle: "Official Self-Pay Patient Payment & POS Invoicing Register",
      filename: "Isalu_Cashdesk_Payment_Clearance.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Method", "Invoice Ref", "Payment Status"],
      summaryItems: [
        { label: "Total Billing", value: `${cashdeskQueue.length}` },
        { label: "Paid & Cleared", value: `${cashdeskQueue.filter(b => b.paymentStatus === "Cleared" || b.payment_status === "Cleared").length}` },
        { label: "Pending", value: `${cashdeskQueue.filter(b => b.paymentStatus !== "Cleared" && b.payment_status !== "Cleared").length}` },
      ],
      data: cashdeskQueue.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentMethod || b.payment_method || "POS/Cash",
        b.invoiceRef || b.invoice_ref || "INV-PENDING",
        (b.paymentStatus === "Cleared" || b.payment_status === "Cleared") ? "Cleared ✓" : "Pending",
      ]),
    });
  };

  const exportMasterPatientsToPDF = () => {
    exportTableToPDF({
      title: "Patient Master Directory Report",
      subtitle: "Full Registered Patient Index & Appointment History Register",
      filename: "Isalu_Patient_Master_Directory.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Email", "Doctor", "Payment Classification", "Date", "Status"],
      data: filteredBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.patientEmail || b.patient_email || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentType || b.payment_type || "Private Self-Pay",
        `${b.date} ${b.time}`,
        b.status || "Confirmed",
      ]),
    });
  };

  const exportCheckedInPatientsToPDF = () => {
    exportTableToPDF({
      title: "Reception Checked-In Patients Queue Report",
      subtitle: "Live Lobby Monitoring of Patients Physically Arrived at Reception",
      filename: "Isalu_Checked_In_Queue.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Payment Type", "Check-In Status"],
      data: checkedInList.map((b: any) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentType || b.payment_type || "Private Self-Pay",
        "Checked In ✓",
      ]),
    });
  };

  const exportHmoEnrolleesToPDF = () => {
    exportTableToPDF({
      title: "HMO Insurance Enrollees Register Report",
      subtitle: "Directory of Patients Registered Under HMO Insurance Plans",
      filename: "Isalu_HMO_Enrollees_Register.pdf",
      headers: ["Ticket Ref", "Enrollee Name", "Phone", "HMO Provider", "Policy ID", "Auth Code", "Pre-Auth Status"],
      data: filteredHmoEnrollees.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.hmoName || b.hmo_name || "HMO",
        b.hmoPolicyCode || b.hmo_policy_code || "-",
        b.hmoAuthCode || b.hmo_auth_code || "-",
        b.hmoStatus || b.hmo_status || "Pending",
      ]),
    });
  };

  const exportPrivatePatientsToPDF = () => {
    exportTableToPDF({
      title: "Private Self-Pay Patients Directory Report",
      subtitle: "Directory of Private Outpatient Consultations & Payment Clearance",
      filename: "Isalu_Private_Patients_Directory.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Method", "Invoice Ref", "Payment Status"],
      data: privatePatientsList.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentMethod || b.payment_method || "POS/Cash",
        b.invoiceRef || b.invoice_ref || "-",
        (b.paymentStatus === "Cleared" || b.payment_status === "Cleared") ? "Cleared ✓" : "Pending",
      ]),
    });
  };

  const exportDisabledBookingsToPDF = () => {
    exportTableToPDF({
      title: "Disabled Bookings Restoration Archive Report",
      subtitle: "Audit Register of Soft-Deleted & Disabled Patient Appointments with Deletion Reasons",
      filename: "Isalu_Disabled_Bookings_Archive.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor", "Scheduled Date", "Reason for Disabling"],
      data: disabledBookings.map((b: any) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        `${b.date} ${b.time}`,
        b.deleteReason || b.delete_reason || "Disabled by Administrator",
      ]),
    });
  };

  const exportSpecialistSchedulesToPDF = () => {
    exportTableToPDF({
      title: "Specialist Timetables & Duty Roster Report",
      subtitle: "Doctor Consultation Timetables, Room Assignments, Duty Days & Capacity",
      filename: "Isalu_Specialist_Schedules_Roster.pdf",
      headers: ["Schedule ID", "Doctor Name", "Specialty", "Room", "Duty Days", "Shift Time", "Daily Capacity", "Status"],
      data: filteredSchedules.map((s) => [
        s.id || s.sched_id || "-",
        s.doctorName || s.doctor_name || "-",
        s.specialty || "-",
        s.room || "-",
        Array.isArray(s.dutyDays) ? s.dutyDays.join(", ") : "-",
        s.shiftTime || s.shift_time || "-",
        s.capacity || 15,
        s.status || "Active On Duty",
      ]),
    });
  };

  const exportDoctorsRosterToPDF = () => {
    exportTableToPDF({
      title: "Registered Specialist Doctors Roster Report",
      subtitle: "Medical Consultants Roster, Departmental Specialty & Room Index",
      filename: "Isalu_Specialist_Doctors_Roster.pdf",
      headers: ["Doctor ID", "Doctor Name", "Acronym", "Specialty", "Room Suite", "Status"],
      data: doctorsList.map((doc: any) => [
        doc.id || doc.doc_id || "-",
        doc.fullName || doc.full_name || doc.name || "-",
        doc.acronym || doc.name || "-",
        doc.specialty || "-",
        doc.roomNumber || doc.room_number || "-",
        doc.status || "Active",
      ]),
    });
  };

  const exportHmoCompaniesToPDF = () => {
    exportTableToPDF({
      title: "Accredited HMO Insurance Providers Report",
      subtitle: "Official Accredited HMO Companies, Contact Officers & Status Index",
      filename: "Isalu_Accredited_HMO_Companies.pdf",
      headers: ["HMO Code", "Company Name", "Contact Person", "Email", "Phone", "Status"],
      data: filteredHmoCompanies.map((hmo: any) => [
        hmo.code || "-",
        hmo.name || "-",
        hmo.contactPerson || hmo.contact_person || "-",
        hmo.email || "-",
        hmo.phone || "-",
        hmo.status || "Active Partner",
      ]),
    });
  };

  const exportSystemUsersToPDF = () => {
    exportTableToPDF({
      title: "System User Accounts & Staff Directory Report",
      subtitle: "Internal Staff Accounts, Role Assignments, Desk Duty & Account Status",
      filename: "Isalu_System_User_Accounts_Directory.pdf",
      headers: ["User ID", "Staff Name", "Email Address", "Role / Designation", "Desk Duty", "Account Status"],
      data: filteredSystemUsers.map((u) => [
        u.id || u.user_id || "-",
        u.name || "-",
        u.email || "-",
        u.role || "-",
        u.desk || "-",
        u.status || "Active",
      ]),
    });
  };

  const exportClinicsToPDF = () => {
    exportTableToPDF({
      title: "Medical Clinics & Departments Directory Report",
      subtitle: "Hospital Departmental Units, Locations & Specialist Count Index",
      filename: "Isalu_Medical_Clinics_Directory.pdf",
      headers: ["Clinic ID", "Department Name", "Location", "Doctors Count", "Status"],
      data: clinics.map((c) => [
        c.id || c.dept_id || "-",
        c.name || "-",
        c.location || "Main Building",
        c.doctor_count || c.doctorCount || 0,
        c.status || "Active",
      ]),
    });
  };

  const downloadAiReportAsExcel = (reportText: string, title: string = "AI Executive Report") => {
    let xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>AI Executive Report</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
  th { background-color: #0f172a; color: #38bdf8; font-weight: bold; padding: 10px; border: 1px solid #334155; text-align: left; }
  td { padding: 8px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 11pt; white-space: pre-wrap; }
  .title { background-color: #008ac9; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 12px; }
  .subtitle { background-color: #f0f9ff; color: #0369a1; font-size: 11pt; font-weight: bold; text-align: center; padding: 6px; }
</style>
</head>
<body>
<table>
  <tr><td colspan="2" class="title">ISALU HOSPITALS - AI EXECUTIVE SYNTHESIS REPORT</td></tr>
  <tr><td colspan="2" class="subtitle">${title} | Generated: ${new Date().toLocaleString()}</td></tr>
  <tr><td colspan="2"></td></tr>
  <tr>
    <th width="200">Report Section / Line</th>
    <th>Synthesized AI Intelligence Output</th>
  </tr>`;

    const lines = reportText.split("\n");
    lines.forEach((line, idx) => {
      if (line.trim().length === 0) return;
      const isHeader = line.startsWith("#") || line.toUpperCase() === line;
      xml += `
  <tr>
    <td><b>Line ${idx + 1}</b></td>
    <td style="${isHeader ? "font-weight:bold; background-color:#f8fafc; color:#008ac9;" : ""}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
  </tr>`;
    });

    xml += `
</table>
</body>
</html>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Isalu_AI_Executive_Report_${toLocalISODate(new Date())}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastAlert({
      title: "AI Report Excel Downloaded ✓",
      description: "AI Executive Report spreadsheet saved successfully.",
      type: "success",
    });
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both Username/Email and Password.");
      return;
    }
    setLoginError("");
    setIsLoggingIn(true);
    setLoginStageText("Verifying Staff Credentials...");
    try {
      const res = await loginStaffAPI(loginUsername.trim(), loginPassword.trim());
      const accessToken = res?.tokens?.access || res?.access || res?.access_token;
      if (!accessToken) {
        throw new Error(res?.error || "The server did not return a valid access token.");
      }
      const assignedRole = res?.user?.role || "Hospital Staff";
      const primaryDesk = res?.user?.desk || getPrimaryDeskForRole(assignedRole);
      const profile = {
        name: res?.user?.name || res?.user?.full_name || loginUsername.trim(),
        role: assignedRole,
        desk: primaryDesk,
        email: res?.user?.email || loginUsername.trim(),
        // Set by the server; decides which modules and controls are shown.
        isAdmin: res?.user?.isAdmin === true,
        allowedDesks: Array.isArray(res?.user?.allowedDesks) ? res.user.allowedDesks : undefined,
      };
      sessionStorage.setItem("isalu_staff_authenticated", "true");
      sessionStorage.setItem("isalu_staff_user", profile.name);
      sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(profile));
      sessionStorage.setItem("isalu_staff_jwt", accessToken);
      if (res?.tokens?.refresh || res?.refresh) {
        sessionStorage.setItem("isalu_staff_refresh", res?.tokens?.refresh || res?.refresh);
      }
      setLoginStageText("Access Granted! Launching Portal...");
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setActiveDesk(primaryDesk as DeskType);
      setSearchParams({ desk: primaryDesk });
    } catch (err: any) {
      console.error("Staff login failed:", err);
      setLoginError(err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Invalid username/email or password.");
      setIsAuthenticated(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLogout = () => {
    sessionStorage.removeItem("isalu_staff_authenticated");
    sessionStorage.removeItem("isalu_staff_user");
    sessionStorage.removeItem("isalu_staff_user_profile");
    sessionStorage.removeItem("isalu_staff_jwt");
    sessionStorage.removeItem("isalu_staff_refresh");
    setIsAuthenticated(false);
  };

  // Local date: toISOString() is UTC, which made "today" yesterday between 00:00 and 01:00 in Lagos.
  const todayDateStr = toLocalISODate(new Date());
  const bookingHmoProvider = (b: any) =>
    String(b.hmoName ?? b.hmo_name ?? b.hmoCompany ?? b.hmo_company ?? "").trim();
  const bookingMatchesCategory = (b: any, filter: string) => {
    if (filter === "all") return true;
    const hmo = isHmoBooking(b);
    if (filter === "private") return !hmo;
    if (filter === "hmo") return hmo;
    if (filter.startsWith("hmo:")) return hmo && bookingHmoProvider(b).toLowerCase() === filter.slice(4).toLowerCase();
    return true;
  };

  const filteredBookings = bookings.filter((b) => {
    // If the user is viewing the All Patients Directory, show all records regardless of date or disabled status
    const isAllPatientsDesk = activeDesk === "all_patients";

    if (!isAllPatientsDesk) {
      const isActiveRecord = b.isActive === true || b.is_active === true || (b.isActive !== false && b.is_active !== false && b.status !== "disabled" && !b.disabled);
      if (!isActiveRecord) return false;
    }




    const q = searchQuery.toLowerCase().trim();
    const pName = (b.patientName || b.patient_name || "").toLowerCase();
    const ref = (b.refCode || b.ref_code || "").toLowerCase();
    const phone = (b.patientPhone || b.patient_phone || "").toLowerCase();
    const matchesSearch = !q || pName.includes(q) || ref.includes(q) || phone.includes(q);

    const bStatus = (b.status || "confirmed").toLowerCase();
    const matchesStatus = statusFilter === "all" || bStatus === statusFilter.toLowerCase();

    const bClinic = (
      b.doctorSpecialty ||
      b.doctor_specialty ||
      b.department ||
      b.deptName ||
      b.clinic ||
      ""
    ).toLowerCase();
    const matchesClinic = clinicFilter === "all" || bClinic.includes(clinicFilter.toLowerCase());
    const matchesCategory = bookingMatchesCategory(b, categoryFilter);

    // If on all_patients desk, bypass strict date range / today filters unless explicitly selected by user
    if (isAllPatientsDesk) {
      let matchesDateRange = true;
      if (startDateFilter) {
        matchesDateRange = matchesDateRange && (b.date || b.appointment_date || "") >= startDateFilter;
      }
      if (endDateFilter) {
        matchesDateRange = matchesDateRange && (b.date || b.appointment_date || "") <= endDateFilter;
      }
      return matchesSearch && matchesStatus && matchesClinic && matchesCategory && matchesDateRange;
    }

    const bDate = b.date || b.appointment_date || (b.createdAt ? b.createdAt.split("T")[0] : "");
    let matchesDateRange = true;
    if (startDateFilter) {
      matchesDateRange = matchesDateRange && bDate >= startDateFilter;
    } else {
      matchesDateRange = matchesDateRange && bDate === todayDateStr;
    }
    if (endDateFilter && bDate) {
      matchesDateRange = matchesDateRange && bDate <= endDateFilter;
    }

    return matchesSearch && matchesStatus && matchesClinic && matchesCategory && matchesDateRange;
  });

  // Helpdesk analytics (computed once per render, not inside the JSX).
  const isLiveBooking = (b: any) =>
    b.isActive === true || b.is_active === true || (b.isActive !== false && b.is_active !== false && String(b.status ?? "").toLowerCase() !== "disabled" && !b.disabled);
  const helpdeskTodayCount = bookings.filter((b) => isLiveBooking(b) && (b.date || b.appointment_date) === todayDateStr).length;
  const helpdeskActiveCount = bookings.filter(isLiveBooking).length;
  const helpdeskCheckedInToday = bookings.filter((b) =>
    isLiveBooking(b) && (b.date || b.appointment_date) === todayDateStr && ["checked in", "checked_in"].includes(String(b.status ?? "").toLowerCase())
  ).length;

  const totalBookingPages = Math.ceil(filteredBookings.length / bookingItemsPerPage) || 1;
  const currentBookingPage = Math.min(bookingCurrentPage, totalBookingPages);
  const paginatedBookings = filteredBookings.slice(
    (currentBookingPage - 1) * bookingItemsPerPage,
    currentBookingPage * bookingItemsPerPage
  );

  // ---> MOVE THEM HERE <---
  const filteredAllPatientsBookings = bookings.filter((b) => {
    const q = allPatientsSearch.toLowerCase().trim();
    const searchable = [b.patientName, b.patient_name, b.patientPhone, b.patient_phone, b.email, b.patientEmail, b.patient_email, b.refCode, b.ref_code, b.doctorName, b.doctor_name, b.doctorSpecialty, b.doctor_specialty, b.department, b.clinic, b.mrn, b.medicalRecordNumber, b.medical_record_number].map((v) => String(v ?? "").toLowerCase()).join(" ");
    const status = String(b.status ?? "confirmed").toLowerCase();
    const clinic = String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").toLowerCase();
    return (!q || searchable.includes(q)) && (allPatientsStatusFilter === "all" || status === allPatientsStatusFilter.toLowerCase()) && (allPatientsClinicFilter === "all" || clinic.includes(allPatientsClinicFilter.toLowerCase()));
  });

  const totalAllPatientsPages = Math.ceil(filteredAllPatientsBookings.length / allPatientsItemsPerPage) || 1;
  const currentAllPatientsPageSafe = Math.min(allPatientsCurrentPage, totalAllPatientsPages);
  const paginatedAllPatientsBookings = filteredAllPatientsBookings.slice(
    (currentAllPatientsPageSafe - 1) * allPatientsItemsPerPage,
    currentAllPatientsPageSafe * allPatientsItemsPerPage
  );

  // 7. Private Self-Pay Enrollees Directory Pagination
  const privatePatientsList = bookings.filter((b) => {
    const isActiveRecord = b.isActive === true || b.is_active === true || (b.isActive !== false && b.is_active !== false && b.status !== "disabled" && !b.disabled);
    if (!isActiveRecord) return false;
    const type = String(b.paymentType ?? b.payment_type ?? b.paymentCategory ?? b.payment_category ?? b.patientCategory ?? b.patient_category ?? "").trim().toLowerCase();
    const hmoName = String(b.hmoName ?? b.hmo_name ?? "").trim().toLowerCase();
    if (type.includes("hmo") || type.includes("insurance")) return false;
    const isPrivate = type.includes("private") || type.includes("self-pay") || type.includes("self pay") || type.includes("cash") || (!type && (!hmoName || hmoName === "n/a" || hmoName === "none" || hmoName.includes("self") || hmoName.includes("private")));
    if (!isPrivate) return false;
    const q = privatePatientsSearch.trim().toLowerCase();
    const searchable = [b.patientName, b.patient_name, b.patientPhone, b.patient_phone, b.refCode, b.ref_code, b.doctorName, b.doctor_name, b.doctorSpecialty, b.doctor_specialty, b.department, b.clinic, b.invoiceRef, b.invoice_ref].map((v) => String(v ?? "").toLowerCase()).join(" ");
    const status = String(b.status ?? "confirmed").toLowerCase();
    const clinic = String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").toLowerCase();
    return (!q || searchable.includes(q)) && (privatePatientsStatusFilter === "all" || status === privatePatientsStatusFilter.toLowerCase()) && (privatePatientsClinicFilter === "all" || clinic.includes(privatePatientsClinicFilter.toLowerCase()));
  });
  const totalPrivatePatientsPages = Math.ceil(privatePatientsList.length / privatePatientsItemsPerPage) || 1;
  const currentPrivatePatientsPage = Math.min(privatePatientsCurrentPage, totalPrivatePatientsPages);
  const paginatedPrivatePatientsBookings = privatePatientsList.slice(
    (currentPrivatePatientsPage - 1) * privatePatientsItemsPerPage,
    currentPrivatePatientsPage * privatePatientsItemsPerPage
  );


  // REDESIGNED LOGIN PAGE WITH LEFT-SIDE HOSPITAL IMAGE AND ISALU LOGO
  if (!isAuthenticated) {
    return (
      <div className={`isalu-glass isalu-login ${isDarkMode ? 'is-dark' : ''} min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex items-center justify-center relative overflow-hidden font-sans transition-colors duration-300`}>
        {/* Top Right Theme Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-2xl ${isDarkMode ? 'bg-slate-900/80 border-sky-500/20 text-sky-400 hover:bg-slate-800' : 'bg-white/80 border-sky-200 text-sky-600 hover:bg-sky-50'} border shadow-lg backdrop-blur-xl flex items-center gap-2 text-xs font-bold transition-all`}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        {/* Split Screen Container */}
        <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
          {/* Left Side: Hospital Image & Branding Panel */}
          <div className="lg:col-span-6 relative hidden lg:flex flex-col justify-between p-12 bg-sky-900 text-white overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-sky-950/60 to-transparent z-10" />
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transform hover:scale-100 transition-transform duration-1000"
              style={{ backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiBaqYU2OCfZVlfH8CYNxj6lc_TJWsrkUKfgrMR9AKtA&s=10')` }}
            />

            <div className="relative z-20 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg">
                <IsaluLogo className="w-7 h-7 text-white" />
              </div>
            </div>

            <div className="relative z-20 max-w-lg my-auto py-12">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-widest inline-block mb-4">
                Staff Operations Portal
              </span>
              <h1 className="text-4xl font-black tracking-tight leading-tight mb-4 text-white">
                Clinic Booking
              </h1>
            </div>

            <div className="relative z-20 text-xs text-slate-400 font-medium flex items-center justify-between border-t border-white/10 pt-6">
              <span>© {new Date().getFullYear()} Isalu Hospitals Ltd. All rights reserved.</span>
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Secure Connection</span>
            </div>
          </div>

          {/* Right Side: Login Form Panel */}
          <div className="lg:col-span-6 flex items-center justify-center p-8 lg:p-16 relative">
            <div className="isalu-login-card max-w-md w-full space-y-8">
              <div className="flex flex-col items-center lg:items-start">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 lg:hidden flex items-center justify-center shadow-lg shadow-sky-500/30 mb-4 text-white">
                  <IsaluLogo className="w-8 h-8" />
                </div>
                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>Welcome Back</h2>
                <p className="text-xs font-medium text-sky-500 dark:text-sky-400 mt-1">Please enter your staff credentials to access your desk.</p>
              </div>

              {loginError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} mb-2`}>Username or Email Address</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. test@example.com or test"
                      className={`w-full ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'} border rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} mb-2`}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter staff security password"
                      className={`w-full ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'} border rounded-xl pl-12 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-4 px-4 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{loginStageText}</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Admin Dashboard</span>
                      <ArrowRightCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sidebarNavGroups = [
    {
      title: "Core Operations",
      items: [
        { id: "helpdesk", label: "Helpdesk Reception", icon: UserCheck, badge: null },
        { id: "hmo", label: "HMO Insurance Desk", icon: ShieldCheck, badge: null },
        { id: "cashdesk", label: "Cashdesk & Billing", icon: DollarSign, badge: null },
      ],
    },
    {
      title: "Patient Directories",
      items: [
        { id: "all_patients", label: "All Patients Directory", icon: Users, badge: null },
        // { id: "checked_in_patients", label: "Checked-in Queue", icon: CheckCircle2, badge: null },
        { id: "hmo_enrollees", label: "HMO Enrollees Registry", icon: CreditCard, badge: null },
        { id: "private_patients", label: "Private Self-Pay List", icon: Ticket, badge: null },
      ],
    },
    {
      title: "Clinical & Scheduling",
      items: [
        { id: "clinic", label: "Clinics & Departments", icon: Building2, badge: clinics.length },
        { id: "create_specialist_schedule", label: "Specialist Roster", icon: Calendar, badge: specialistSchedules.length },
      ],
    },
    {
      title: "Command & Control",
      items: [
        { id: "analytics", label: "Executive Analytics", icon: TrendingUp, badge: null },
        { id: "monitor", label: "Waiting Room Monitor", icon: Tv, badge: null },
        { id: "users", label: "Staff & Roles Registry", icon: UserCog, badge: systemUsers.length },
        { id: "disabled_bookings", label: "Archive & Trash", icon: Archive, badge: null },
      ],
    },
  ];

  return (
    <div className={`isalu-glass ${isDarkMode ? 'is-dark' : ''} min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex font-sans overflow-x-hidden relative transition-colors duration-300`}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02] dark:opacity-[0.04] overflow-hidden z-0">
        <div className="text-[16vw] font-black tracking-widest text-center uppercase leading-none">
          ISALU HOSPITALS
        </div>
      </div>

      {toastAlert && (
        <div className={`fixed top-6 right-6 z-50 max-w-md w-full ${isDarkMode ? 'bg-slate-900/95 border-sky-500/30 text-white' : 'bg-white/95 border-sky-200 text-slate-800'} backdrop-blur-xl border rounded-2xl p-4 shadow-2xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toastAlert.type === 'danger' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
            toastAlert.type === 'warning' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
              'bg-sky-500/20 text-sky-500 border border-sky-500/30'
            }`}>
            {toastAlert.type === 'danger' ? <XCircle className="w-5 h-5" /> :
              toastAlert.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                <Sparkles className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{toastAlert.title}</h4>
            {toastAlert.description && <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} mt-1 leading-relaxed`}>{toastAlert.description}</p>}
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className={`text-xs font-bold px-2 py-1 rounded-lg ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} transition-colors`}
          >
            Dismiss
          </button>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-900 border-slate-800 text-slate-100 backdrop-blur-2xl border-r transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-72'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 px-6 border-b border-slate-800 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/30 text-white flex-shrink-0">
              <IsaluLogo className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/50 items-center justify-center border transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>



        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar">
          {sidebarNavGroups
            .map((group) => ({ ...group, items: group.items.filter((item) => isDeskAllowed(item.id as DeskType)) }))
            .filter((group) => group.items.length > 0)
            .map((group, idx) => (
              <div key={idx} className="space-y-1.5">
                {!sidebarCollapsed && (
                  <h6 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    {group.title}
                  </h6>
                )}
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeDesk === item.id;
                  const allowed = true; // only permitted modules are listed

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectDesk(item.id as DeskType)}
                      disabled={!allowed}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-xs transition-all relative group ${isActive
                        ? "bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                        : allowed
                          ? "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                          : "text-slate-600 cursor-not-allowed opacity-50"
                        }`}
                    >
                      <IconComponent className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-sky-400"}`} />
                      {!sidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                      {!sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-sky-400"}`}>
                          {item.badge}
                        </span>
                      )}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={handleStaffLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
            {!sidebarCollapsed && <span>Sign Out Portal</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className={`h-20 ${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100'} backdrop-blur-xl border-b px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden w-10 h-10 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'} border flex items-center justify-center`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h2 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center gap-2`}>
                <span className="text-sky-500 dark:text-sky-400">Desk:</span> {activeDesk.replace(/_/g, " ").toUpperCase()}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Isalu Hospitals Ogba • Live Operations Hub</span>
                <span data-testid="live-status" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${liveFeedConnected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/15 text-slate-500"}`} title={liveFeedConnected ? "Changes made by other staff appear instantly" : "Live connection unavailable; checking for changes every 30 seconds"}>
                  <span className={`w-1.5 h-1.5 rounded-full ${liveFeedConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {liveFeedConnected ? "Live" : "Auto-refresh"}
                </span>
                {lastBookingsUpdate && <span className="text-[10px]">Updated {lastBookingsUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                {bookingsLoaded && !fullHistoryLoaded && <span className="text-[10px] text-sky-500">Loading full history…</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800/80 border-sky-500/20 text-sky-400 hover:bg-slate-800' : 'bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100'} border shadow-sm flex items-center gap-2 text-xs font-bold transition-all`}
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden md:inline">{isDarkMode ? "Light" : "Dark"}</span>
            </button>

            <button
              onClick={() => { fetchBookings(true); fetchDashboardSummary(); }}
              disabled={isRefreshingSummary || isLoadingBookings}
              className={`px-4 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-800 border-sky-500/20 text-sky-400' : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-600'} border text-xs font-bold flex items-center gap-2 shadow-sm transition-all`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSummary || isLoadingBookings ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <div className={`h-6 w-[1px] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} hidden sm:block`} />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-sky-500/20">
                {currentUser?.name?.charAt(0) || "A"}
              </div>
              <div className="hidden md:flex flex-col">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name}</span>
                <span className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold">{currentUser?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-6 lg:p-8 ${isDarkMode ? 'bg-slate-950/50' : 'bg-transparent'} space-y-6 transition-colors duration-300`}>
          {activeDesk === "helpdesk" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-2xl p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Today's Appts</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {bookingsLoaded ? helpdeskTodayCount : (dashboardSummary?.todayCount ?? <KpiSkeleton />)}
                  </h3>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-1">Scheduled for today (Active)</p>
                </div>

                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-2xl p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Bookings</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {fullHistoryLoaded ? helpdeskActiveCount : (dashboardSummary?.totalBookings ?? <KpiSkeleton />)}
                  </h3>
                  <p className="text-[10px] text-sky-500 dark:text-sky-400 font-medium mt-1">Total Active Bookings</p>
                </div>

                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-2xl p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Checked-In Queue</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {bookingsLoaded ? helpdeskCheckedInToday : (dashboardSummary?.checkedInCount ?? <KpiSkeleton />)}
                  </h3>
                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium mt-1">Checked in today</p>
                </div>
                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-2xl p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pending HMO Approvals</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {dashboardSummary ? dashboardSummary.pendingHmoCount : <KpiSkeleton />}
                  </h3>
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium mt-1">Requires pre-auth check</p>
                </div>
                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-2xl p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cashdesk Payments</span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {dashboardSummary ? dashboardSummary.pendingCashCount : <KpiSkeleton />}
                  </h3>
                  <p className="text-[10px] text-cyan-500 dark:text-cyan-400 font-medium mt-1">Awaiting billing confirmation</p>
                </div>
              </div>

              {/* Filter Clinic Carousel Bar - Showing only clinics with today's appointments and counts */}
              {(() => {
                const todayBookingsList = bookings.filter(b => {
                  const isActive = b.isActive === true || b.is_active === true || (b.isActive !== false && b.is_active !== false && b.status !== "disabled" && !b.disabled);
                  const bDate = b.date || b.appointment_date || b.createdAt?.split("T")[0];
                  return isActive && bDate === todayDateStr;
                });
                return (
                  <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-md'} backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-2 relative`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 flex-shrink-0 mr-1">
                      <Filter className="w-3.5 h-3.5 text-sky-500" />
                    </span>
                    <button
                      onClick={() => scrollClinics('left')}
                      className={`p-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} flex-shrink-0 z-10 transition-all`}
                      title="Previous Clinics"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div ref={clinicScrollRef} className="flex items-center gap-2 overflow-hidden flex-1 scroll-smooth px-1">
                      <button
                        onClick={() => setClinicFilter("all")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${clinicFilter === "all" ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                      >
                        <span className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                          {todayBookingsList.length}
                        </span>
                        <span>All Today's Clinics</span>
                      </button>
                      {clinics
                        .map((c) => {
                          const cName = c.name || "";
                          const clinicTodayCount = todayBookingsList.filter(b => {
                            const bClinic = (
                              b.doctorSpecialty ||
                              b.doctor_specialty ||
                              b.department ||
                              b.deptName ||
                              b.clinic ||
                              ""
                            ).toLowerCase();
                            return bClinic.includes(cName.toLowerCase());
                          }).length;
                          return { ...c, todayCount: clinicTodayCount };
                        })
                        .filter(c => c.todayCount > 0)
                        .map((c) => {
                          const cName = c.name || "";
                          const isSelected = clinicFilter.toLowerCase() === cName.toLowerCase();

                          return (
                            <button
                              key={c.id || cName}
                              onClick={() => setClinicFilter(cName)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${isSelected ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                {c.todayCount}
                              </span>
                              <Stethoscope className="w-3 h-3 opacity-80" />
                              <span>{cName}</span>
                            </button>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => scrollClinics('right')}
                      className={`p-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} flex-shrink-0 z-10 transition-all`}
                      title="Next Clinics"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              {/* Category Filter Bar - same behaviour as the clinic chips; counts follow the selected clinic */}
              {(() => {
                const todayInClinic = bookings.filter((b) => {
                  const isActive = b.isActive === true || b.is_active === true || (b.isActive !== false && b.is_active !== false && b.status !== "disabled" && !b.disabled);
                  const bDate = b.date || b.appointment_date || b.createdAt?.split("T")[0];
                  const bClinic = String(b.doctorSpecialty || b.doctor_specialty || b.department || b.deptName || b.clinic || "").toLowerCase();
                  return isActive && bDate === todayDateStr && (clinicFilter === "all" || bClinic.includes(clinicFilter.toLowerCase()));
                });
                const providers = Array.from(new Set(todayInClinic.filter(isHmoBooking).map(bookingHmoProvider).filter((p) => p && p.toLowerCase() !== "n/a"))).sort();
                const chip = (key: string, label: string, count: number, color: string) => {
                  const isSelected = categoryFilter.toLowerCase() === key.toLowerCase();
                  return (
                    <button
                      key={key}
                      data-category={key}
                      onClick={() => setCategoryFilter(key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${isSelected ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      <span className={`w-5 h-5 rounded-full ${color} text-white flex items-center justify-center text-[10px] font-black shadow-sm`}>{count}</span>
                      <span>{label}</span>
                    </button>
                  );
                };
                return (
                  <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-md'} backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-2 overflow-x-auto`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 flex-shrink-0 mr-1">
                      <CreditCard className="w-3.5 h-3.5 text-sky-500" />
                    </span>
                    {chip("all", "All Categories", todayInClinic.length, "bg-cyan-500")}
                    {chip("private", "Private Self-Pay", todayInClinic.filter((b) => !isHmoBooking(b)).length, "bg-purple-500")}
                    {chip("hmo", "HMO Insurance", todayInClinic.filter(isHmoBooking).length, "bg-emerald-500")}
                    {providers.map((p) => chip(`hmo:${p}`, p, todayInClinic.filter((b) => isHmoBooking(b) && bookingHmoProvider(b) === p).length, "bg-emerald-600"))}
                  </div>
                );
              })()}

              <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Helpdesk Patient Bookings Queue (Active Records Only)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage patient check-ins, verify appointments, and dispatch notifications for today.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient name, ref code..."
                        className={`w-full ${isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'} border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none`}
                      />
                    </div>
                    <button
                      onClick={handleExportWaitingQueuePDF}
                      className={`px-4 py-2.5 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'} rounded-xl text-xs font-bold flex items-center gap-2 border transition-all flex-shrink-0`}
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export PDF</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[10px] font-black uppercase tracking-wider`}>
                        <th className="py-3 px-4">Ref Code & Created</th>
                        <th className="py-3 px-4">Patient Name & Contact</th>
                        <th className="py-3 px-4">Clinic Booked</th>
                        <th className="py-3 px-4">Doctor Selected</th>
                        <th className="py-3 px-4">Category / HMO</th>
                        <th className="py-3 px-4">Time & Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody
                      className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"
                        } text-xs`}
                    >
                      {isLoadingBookings ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-400 font-medium"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                              <span>
                                Loading today's appointment records from booking API...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedBookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-400 font-medium"
                          >
                            No active appointment records found for today matching your
                            search filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedBookings.map((b, idx) => {
                          const booking = b as any;

                          const rawPayment =
                            booking.paymentType ??
                            booking.payment_type ??
                            booking.paymentCategory ??
                            booking.payment_category ??
                            booking.paymentMethod ??
                            booking.payment_method ??
                            "";

                          const paymentTypeStr =
                            typeof rawPayment === "string"
                              ? rawPayment.trim().toLowerCase()
                              : rawPayment && typeof rawPayment === "object"
                                ? String(
                                  rawPayment.name ??
                                  rawPayment.type ??
                                  rawPayment.title ??
                                  ""
                                ).trim().toLowerCase()
                                : String(rawPayment || "").trim().toLowerCase();

                          const rawHmo =
                            booking.hmoName ??
                            booking.hmo_name ??
                            booking.hmoCompanyName ??
                            booking.hmo_company_name ??
                            booking.hmoCompany ??
                            booking.hmo_company ??
                            booking.hmo ??
                            booking.insuranceProvider ??
                            booking.insurance_provider ??
                            booking.insuranceCompany ??
                            booking.insurance_company ??
                            "";

                          const hmoProviderName =
                            typeof rawHmo === "string"
                              ? rawHmo.trim()
                              : rawHmo && typeof rawHmo === "object"
                                ? String(
                                  rawHmo.name ??
                                  rawHmo.company_name ??
                                  rawHmo.companyName ??
                                  rawHmo.hmo_name ??
                                  rawHmo.title ??
                                  ""
                                ).trim()
                                : String(rawHmo || "").trim();

                          const invalidHmoValues = [
                            "",
                            "n/a",
                            "na",
                            "none",
                            "nil",
                            "-",
                            "null",
                            "undefined",
                            "[object object]",
                          ];

                          const hasValidHmo =
                            !invalidHmoValues.includes(hmoProviderName.toLowerCase());

                          const isPrivate =
                            paymentTypeStr.includes("private") ||
                            paymentTypeStr.includes("self") ||
                            paymentTypeStr.includes("cash") ||
                            paymentTypeStr.includes("pay");

                          const isHmo =
                            !isPrivate &&
                            (
                              paymentTypeStr.includes("hmo") ||
                              paymentTypeStr.includes("insurance") ||
                              hasValidHmo
                            );

                          const bookingRef =
                            b.refCode || b.ref_code || "ISALU-001";

                          return (
                            <tr
                              key={b.refCode || b.ref_code || idx}
                              className={`${isDarkMode
                                ? "hover:bg-slate-800/30"
                                : "hover:bg-sky-50/50"
                                } transition-colors`}
                            >
                              <td className="py-4 px-4">
                                <div className="font-mono font-bold text-sky-500 dark:text-sky-400">
                                  {bookingRef}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {b.createdAt
                                    ? new Date(b.createdAt).toLocaleString()
                                    : b.date || "N/A"}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div
                                  className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"
                                    }`}
                                >
                                  {b.patientName || b.patient_name || "Patient"}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {b.patientPhone || b.patient_phone || "N/A"}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div
                                  className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"
                                    }`}
                                >
                                  {b.doctorSpecialty ||
                                    b.doctor_specialty ||
                                    b.department ||
                                    b.deptName ||
                                    b.clinic ||
                                    "Outpatient Clinic"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Suite Wing
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />
                                  <span>{getDoctorRealName(b)}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                {isHmo ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 w-fit">
                                      HMO Insurance
                                    </span>
                                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} truncate max-w-[180px]`}>
                                      {hasValidHmo ? hmoProviderName : "HMO Partner Not Specified"}
                                    </span>
                                  </div>
                                ) : isPrivate ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 w-fit">
                                      Private / Self-Pay
                                    </span>
                                    <span className="text-[10px] text-slate-400">Cashdesk Billing</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30 w-fit">
                                      Standard
                                    </span>
                                    <span className="text-[10px] text-slate-400">General OPD</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-mono font-medium text-slate-300">
                                  {b.time || "09:00 AM"}
                                </div>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {b.status || "Confirmed"} (Active)
                                </span>
                              </td>

                              <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                                {activeDesk !== "helpdesk" &&
                                  !currentUser?.role?.toLowerCase().includes("helpdesk") && (
                                    <button
                                      onClick={() => handleSendReminder(b)}
                                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30 transition-colors"
                                    >
                                      {sendingReminderRef ===
                                        (b.refCode || b.ref_code)
                                        ? "Sending..."
                                        : "Remind"}
                                    </button>
                                  )}

                                {isSuperAdminUser(currentUser) && (
                                  <button
                                    onClick={() => handleDeleteBookingRecord(b)}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold border border-red-500/20 transition-colors"
                                    title="Trash / Disable Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 inline" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {!isLoadingBookings && filteredBookings.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Rows per page:</span>
                      <select
                        value={bookingItemsPerPage}
                        onChange={(e) => {
                          setBookingItemsPerPage(Number(e.target.value));
                          setBookingCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'} font-bold focus:outline-none`}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-slate-500 dark:text-slate-400">
                        Showing <span className="font-bold text-sky-500">{(currentBookingPage - 1) * bookingItemsPerPage + 1}</span>–<span className="font-bold text-sky-500">{Math.min(currentBookingPage * bookingItemsPerPage, filteredBookings.length)}</span> of <span className="font-bold text-sky-500">{filteredBookings.length}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setBookingCurrentPage(1)}
                        disabled={currentBookingPage === 1}
                        className={`p-2 rounded-xl border ${currentBookingPage === 1 ? 'opacity-40 cursor-not-allowed border-slate-700' : 'hover:bg-sky-500/10 border-sky-500/30 text-sky-500'}`}
                        title="First Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <ChevronLeft className="w-4 h-4 -ml-2" />
                      </button>
                      <button
                        onClick={() => setBookingCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentBookingPage === 1}
                        className={`px-3.5 py-2 rounded-xl font-bold border flex items-center gap-1 ${currentBookingPage === 1 ? 'opacity-40 cursor-not-allowed border-slate-700' : 'hover:bg-sky-500/10 border-sky-500/30 text-sky-500'}`}
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>

                      <div className="hidden sm:flex items-center gap-1 px-2">
                        {Array.from({ length: totalBookingPages }, (_, i) => i + 1)
                          .filter(page => page === 1 || page === totalBookingPages || Math.abs(page - currentBookingPage) <= 1)
                          .map((page, idx, arr) => {
                            const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                            return (
                              <React.Fragment key={page}>
                                {showEllipsisBefore && <span className="px-2 text-slate-400">...</span>}
                                <button
                                  onClick={() => setBookingCurrentPage(page)}
                                  className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${currentBookingPage === page ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => setBookingCurrentPage(p => Math.min(p + 1, totalBookingPages))}
                        disabled={currentBookingPage === totalBookingPages}
                        className={`px-3.5 py-2 rounded-xl font-bold border flex items-center gap-1 ${currentBookingPage === totalBookingPages ? 'opacity-40 cursor-not-allowed border-slate-700' : 'hover:bg-sky-500/10 border-sky-500/30 text-sky-500'}`}
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setBookingCurrentPage(totalBookingPages)}
                        disabled={currentBookingPage === totalBookingPages}
                        className={`p-2 rounded-xl border ${currentBookingPage === totalBookingPages ? 'opacity-40 cursor-not-allowed border-slate-700' : 'hover:bg-sky-500/10 border-sky-500/30 text-sky-500'}`}
                        title="Last Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4 -ml-2" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDesk === "hmo" && (

            <div className="space-y-6">
              <div className={`${isDarkMode ? "bg-slate-900/80 border-sky-500/20" : "bg-white/80 border-sky-100 shadow-xl"} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      HMO Insurance & Pre-Auth Management
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Verify patient insurance eligibility codes, grant authorization,
                      and transfer bookings to the private cash desk.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 whitespace-nowrap">
                    HMO Insurance Desk Active
                  </span>
                </div>

                {(() => {
                  const hmoBookingsList = bookings.filter(isPendingHmoBooking).filter((b: any) => {
                    const q = hmoTableSearch.trim().toLowerCase();
                    const provider = String(b.hmoName ?? b.hmo_name ?? b.hmoCompany ?? b.hmo_company ?? "").trim();
                    return (hmoApprovalProviderFilter === "all" || provider === hmoApprovalProviderFilter) && (!q || [b.refCode, b.ref_code, b.patientName, b.patient_name, b.patientPhone, b.patient_phone, b.hmoName, b.hmo_name, b.hmoCompany, b.enrolleeNumber, b.enrollee_number, b.hmoNumber, b.hmo_number, b.date].some((v) => String(v ?? "").toLowerCase().includes(q)));
                  });
                  const totalHmoPages = Math.max(1, Math.ceil(hmoBookingsList.length / hmoItemsPerPage));
                  const currentHmoPage = Math.min(hmoCurrentPage, totalHmoPages);
                  const paginatedHmoBookings = hmoBookingsList.slice((currentHmoPage - 1) * hmoItemsPerPage, currentHmoPage * hmoItemsPerPage);

                  return (
                    <>
                      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="search" value={hmoTableSearch} onChange={(e) => { setHmoTableSearch(e.target.value); setHmoCurrentPage(1); }} placeholder="Search pending HMO patients, reference, provider or enrollee..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                        </div>
                        <select value={hmoApprovalProviderFilter} onChange={(e) => { setHmoApprovalProviderFilter(e.target.value); setHmoCurrentPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All HMO Providers</option>{Array.from(new Set(hmoBookingsList.map((b: any) => String(b.hmoName ?? b.hmo_name ?? b.hmoCompany ?? b.hmo_company ?? "").trim()).filter(Boolean))).sort().map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select><span className="text-xs text-slate-400">{hmoBookingsList.length} pending record(s)</span>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
                        <table className="w-full text-left border-collapse min-w-[950px]">
                          <thead>
                            <tr className={`border-b ${isDarkMode ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"} text-[10px] font-black uppercase tracking-wider`}>
                              <th className="py-3 px-4">Ref Code & Date</th>
                              <th className="py-3 px-4">Full Patient Details</th>
                              <th className="py-3 px-4">Clinic & Doctor</th>
                              <th className="py-3 px-4">HMO Provider</th>
                              <th className="py-3 px-4">Enrollee / Eligibility Code</th>
                              <th className="py-3 px-4">Pre-Auth Status</th>
                              <th className="py-3 px-4 text-right">Actions & Management</th>
                            </tr>
                          </thead>

                          <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"} text-xs`}>
                            {paginatedHmoBookings.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                  No pending or active HMO insurance bookings found in the queue.
                                </td>
                              </tr>
                            ) : (
                              paginatedHmoBookings.map((b: any) => {
                                const refCode = b.refCode || b.ref_code || "HMO-REF";

                                const isApproved =
                                  String(b.hmoStatus ?? b.hmo_status ?? "").toLowerCase() === "approved" ||
                                  Boolean(b.hmoApproved ?? b.hmo_approved) ||
                                  b.status === "hmo_approved";

                                const hmoName =
                                  b.hmoName || b.hmo_name || b.hmoCompany || "HMO Partner";

                                const enrolleeNum =
                                  b.hmoPolicyCode ||
                                  b.hmo_policy_code ||
                                  b.enrolleeNumber ||
                                  b.enrollee_number ||
                                  b.hmoNumber ||
                                  b.hmo_number ||
                                  "N/A";

                                const savedAuthCode =
                                  b.hmoAuthCode ||
                                  b.hmo_auth_code ||
                                  b.authorizationCode ||
                                  b.authorization_code ||
                                  b.authCode ||
                                  b.auth_code ||
                                  "";

                                return (
                                  <tr
                                    key={refCode}
                                    className={`${isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-purple-500/5"} transition-colors`}
                                  >
                                    <td className="py-4 px-4">
                                      <div className="font-mono font-bold text-purple-400">
                                        {refCode}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1">
                                        {b.date || "Date unavailable"}
                                      </div>
                                      <div className="text-[10px] text-slate-400">{b.time || ""}</div>
                                    </td>

                                    <td className="py-4 px-4">
                                      <div className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                        {b.patientName || b.patient_name || "Patient"}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-1">
                                        {b.patientPhone || b.patient_phone || "N/A"}
                                      </div>
                                      {(b.patientEmail || b.patient_email) && (
                                        <div className="text-[10px] text-slate-400 break-all">{b.patientEmail || b.patient_email}</div>
                                      )}
                                    </td>

                                    <td className="py-4 px-4">
                                      <div className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                        {b.doctorSpecialty || b.doctor_specialty || "General Outpatient"}
                                      </div>
                                      <div className="text-[10px] text-sky-400">{getDoctorRealName(b)}</div>
                                      {(b.reason) && <div className="text-[10px] text-slate-400 mt-1 max-w-[220px] truncate" title={b.reason}>Reason: {b.reason}</div>}
                                      {(b.referralDocName || b.referral_doc_name) && <div className="text-[10px] text-purple-400 mt-0.5">📎 {b.referralDocName || b.referral_doc_name}</div>}
                                    </td>

                                    <td className="py-4 px-4">
                                      <span className="font-semibold text-purple-400">
                                        {hmoName}
                                      </span>
                                    </td>

                                    <td className="py-4 px-4">
                                      <span className={`font-mono text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                        {enrolleeNum}
                                      </span>
                                    </td>

                                    <td className="py-4 px-4">
                                      {isApproved ? (
                                        <div className="flex flex-col items-start gap-1.5">
                                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Pre-Auth Approved
                                          </span>
                                          {savedAuthCode && (
                                            <span className="text-[10px] text-slate-400 font-mono break-all">
                                              Auth: {savedAuthCode}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Awaiting HMO Approval
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-4 px-4 text-right">
                                      <div className="flex items-center justify-end gap-2 flex-wrap">
                                        {!isApproved && (
                                          <button
                                            type="button"
                                            onClick={() => openGrantAuthModal(b)}
                                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all text-xs inline-flex items-center gap-1.5"
                                          >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Grant Auth
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleRerouteCashdesk(refCode)}
                                          className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold transition-all text-xs"
                                        >
                                          Reroute to Cashdesk
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {hmoBookingsList.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-3 flex-wrap justify-center">
                            <span className="text-slate-400">Rows per page:</span>

                            <select
                              value={hmoItemsPerPage}
                              onChange={(e) => {
                                setHmoItemsPerPage(Number(e.target.value));
                                setHmoCurrentPage(1);
                              }}
                              className={`px-3 py-2 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"} font-bold focus:outline-none focus:ring-2 focus:ring-sky-500`}
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                            </select>

                            <span className="text-slate-400">
                              Showing{" "}
                              <span className="font-bold text-sky-400">
                                {(currentHmoPage - 1) * hmoItemsPerPage + 1}
                              </span>
                              –
                              <span className="font-bold text-sky-400">
                                {Math.min(
                                  currentHmoPage * hmoItemsPerPage,
                                  hmoBookingsList.length
                                )}
                              </span>{" "}
                              of{" "}
                              <span className="font-bold text-sky-400">
                                {hmoBookingsList.length}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setHmoCurrentPage((p: number) => Math.max(p - 1, 1))
                              }
                              disabled={currentHmoPage === 1}
                              className={`px-3 py-2 rounded-xl font-bold border flex items-center gap-1 ${currentHmoPage === 1
                                ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800"
                                : "hover:bg-sky-500/10 border-sky-500/30 text-sky-500"
                                }`}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Previous
                            </button>

                            <span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              Page {currentHmoPage} of {totalHmoPages}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setHmoCurrentPage((p: number) =>
                                  Math.min(p + 1, totalHmoPages)
                                )
                              }
                              disabled={currentHmoPage === totalHmoPages}
                              className={`px-3 py-2 rounded-xl font-bold border flex items-center gap-1 ${currentHmoPage === totalHmoPages
                                ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800"
                                : "hover:bg-sky-500/10 border-sky-500/30 text-sky-500"
                                }`}
                            >
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Grant Authorization Modal */}
              {showGrantAuthModal && selectedHmoBooking && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget && !isGrantingAuth) {
                      closeGrantAuthModal();
                    }
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="grant-auth-title"
                    className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                      }`}
                  >
                    <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h3 id="grant-auth-title" className="font-bold text-base">
                            Grant HMO Authorization
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Confirm pre-authorization details
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={closeGrantAuthModal}
                        disabled={isGrantingAuth}
                        aria-label="Close modal"
                        className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 disabled:opacity-40"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-5 space-y-5">
                      <div className={`rounded-2xl p-4 space-y-2 ${isDarkMode ? "bg-slate-800/70" : "bg-slate-50"
                        }`}>
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-500">Booking Reference</span>
                          <span className="font-mono font-bold text-purple-400 text-right">
                            {selectedHmoBooking.refCode ||
                              selectedHmoBooking.ref_code ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-500">Patient</span>
                          <span className="font-semibold text-right">
                            {selectedHmoBooking.patientName ||
                              selectedHmoBooking.patient_name ||
                              "Patient"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-500">HMO Provider</span>
                          <span className="font-semibold text-right">
                            {selectedHmoBooking.hmoName ||
                              selectedHmoBooking.hmo_name ||
                              selectedHmoBooking.hmoCompany ||
                              "HMO Partner"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-500">Enrollee Code</span>
                          <span className="font-mono font-semibold text-right">
                            {selectedHmoBooking.enrolleeNumber ||
                              selectedHmoBooking.enrollee_number ||
                              selectedHmoBooking.hmoNumber ||
                              selectedHmoBooking.hmo_number ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitGrantAuth();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label
                            htmlFor="hmo-auth-code"
                            className="block text-xs font-bold mb-2"
                          >
                            HMO Authorization Code
                            <span className="text-red-500 ml-1">*</span>
                          </label>

                          <input
                            id="hmo-auth-code"
                            type="text"
                            value={authCode}
                            onChange={(e) => {
                              setAuthCode(e.target.value);
                              if (authError) setAuthError("");
                            }}
                            placeholder="Enter authorization code"
                            autoComplete="off"
                            maxLength={100}
                            required
                            disabled={isGrantingAuth}
                            className={`w-full px-4 py-3 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-2 focus:ring-emerald-500 ${isDarkMode
                              ? "bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                              }`}
                          />

                          {authError && (
                            <p role="alert" className="text-xs text-red-500 mt-2">
                              {authError}
                            </p>
                          )}
                        </div>

                        <div className={`rounded-xl p-3 text-xs ${isDarkMode
                          ? "bg-sky-500/10 text-sky-300"
                          : "bg-sky-50 text-sky-700"
                          }`}>
                          Verify the authorization code with the HMO provider before
                          approving this booking.
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={closeGrantAuthModal}
                            disabled={isGrantingAuth}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDarkMode
                              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isGrantingAuth || !authCode.trim()}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
                          >
                            {isGrantingAuth ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" />
                                Save & Approve
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeDesk === "cashdesk" && (() => {
            const privateSelfPayBookings = bookings.filter(isPendingCashBooking).filter((b: any) => {
              const q = cashdeskSearch.trim().toLowerCase();
              const clinic = String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").trim();
              return (cashdeskClinicFilter === "all" || clinic.toLowerCase().includes(cashdeskClinicFilter.toLowerCase())) && (!q || [b.refCode, b.ref_code, b.patientName, b.patient_name, b.patientPhone, b.patient_phone, b.doctorName, b.doctor_name, b.doctorSpecialty, b.doctor_specialty, b.department, b.date].some((v) => String(v ?? "").toLowerCase().includes(q)));
            });
            const totalCashdeskPages = Math.max(1, Math.ceil(privateSelfPayBookings.length / cashdeskItemsPerPage));
            const currentCashdeskPage = Math.min(cashdeskCurrentPage, totalCashdeskPages);
            const paginatedCashdeskBookings = privateSelfPayBookings.slice((currentCashdeskPage - 1) * cashdeskItemsPerPage, currentCashdeskPage * cashdeskItemsPerPage);
            return (
              <div className="space-y-6">
                <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Cashdesk & Billing Management</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Clear private self-pay consultation payments by cash or POS/transfer.</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Cashdesk Billing Active</span>
                  </div>
                  <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="search" value={cashdeskSearch} onChange={(e) => { setCashdeskSearch(e.target.value); setCashdeskCurrentPage(1); }} placeholder="Search private patients, reference, phone or clinic..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-cyan-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                    </div>
                    <select value={cashdeskClinicFilter} onChange={(e) => { setCashdeskClinicFilter(e.target.value); setCashdeskCurrentPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Clinics / Specialties</option>{Array.from(new Set(privateSelfPayBookings.map((b: any) => String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").trim()).filter(Boolean))).sort().map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}</select><span className="text-xs text-slate-400">{privateSelfPayBookings.length} pending record(s)</span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead><tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'} text-[10px] font-black uppercase tracking-wider`}>
                        <th className="py-3 px-4">Ref Code & Date</th><th className="py-3 px-4">Patient Name & Phone</th><th className="py-3 px-4">Clinic & Doctor</th><th className="py-3 px-4">Billing Category</th><th className="py-3 px-4">Payment Status</th><th className="py-3 px-4 text-right">Cashier Actions</th>
                      </tr></thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'} text-xs`}>
                        {paginatedCashdeskBookings.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No pending private self-pay billing records found in the cashdesk queue.</td></tr> : paginatedCashdeskBookings.map((b: any) => {
                          const refCode = b.refCode || b.ref_code;
                          const patientName = b.patientName || b.patient_name || "Patient";
                          const patientPhone = b.patientPhone || b.patient_phone || "N/A";
                          return <tr key={refCode} className={`${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-cyan-500/5'} transition-colors`}>
                            <td className="py-4 px-4"><div className="font-mono font-bold text-cyan-400">{refCode}</div><div className="text-[10px] text-slate-400 mt-1">{b.date || "Date unavailable"}</div></td>
                            <td className="py-4 px-4"><div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{patientName}</div><div className="text-[11px] text-slate-400 mt-1">{patientPhone}</div></td>
                            <td className="py-4 px-4"><div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{b.doctorSpecialty || b.doctor_specialty || b.department || "General Outpatient"}</div><div className="text-[10px] text-sky-400">{getDoctorRealName(b)}</div></td>
                            <td className="py-4 px-4"><span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Private</span></td>
                            <td className="py-4 px-4"><span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Payment</span></td>
                            <td className="py-4 px-4 text-right"><div className="inline-flex flex-wrap justify-end gap-2">
                              {(["cash", "pos_transfer"] as const).map((method) => <button key={method} type="button" disabled={cashdeskSubmittingRef !== null} onClick={async () => {
                                if (cashdeskSubmittingRef !== null) return;
                                const submitKey = `${refCode}:${method}`;
                                const submitStartedAt = Date.now();
                                setCashdeskSubmittingRef(submitKey);
                                try {
                                  const payRes: any = ensureOk(await payCashdeskBookingAPI(refCode, method), "The server did not confirm this payment.");
                                  const result: any = payRes?.data || payRes;
                                  const updated = bookings.map((item: any) =>
                                    (item.refCode || item.ref_code) === refCode
                                      ? { ...item, ...result, paymentStatus: result.paymentStatus || result.payment_status || "Cleared", payment_status: result.payment_status || result.paymentStatus || "Cleared", paymentMethod: result.paymentMethod || result.payment_method || (method === "cash" ? "Cash" : "POS/Transfer"), payment_method: result.payment_method || result.paymentMethod || (method === "cash" ? "Cash" : "POS/Transfer") }
                                      : item
                                  );
                                  setBookings(updated);
                                  setToastAlert({ title: method === "cash" ? "Cash Payment Confirmed ✓" : "POS/Transfer Payment Confirmed ✓", description: `${method === "cash" ? "Cash" : "POS/Transfer"} payment saved for ${refCode}.`, type: "success" });
                                  await fetchDashboardSummary();
                                } catch (err: any) { setToastAlert({ title: "Payment Clearance Failed", description: err?.message || `Unable to clear payment for ${refCode}.`, type: "danger" }); }
                                finally {
                                  // Keep the feedback visible long enough to be noticed even when the API responds quickly.
                                  const remainingFeedbackMs = Math.max(0, 400 - (Date.now() - submitStartedAt));
                                  if (remainingFeedbackMs > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingFeedbackMs));
                                  setCashdeskSubmittingRef(null);
                                }
                              }} className={`px-3 py-2 rounded-xl text-white font-bold shadow-lg transition-all text-xs disabled:opacity-60 disabled:cursor-not-allowed ${method === "cash" ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-500/20" : "bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-cyan-500/20"}`}>{cashdeskSubmittingRef === `${refCode}:${method}` ? <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Submitting...</span> : method === "cash" ? "Clear (Paid with Cash)" : "Clear (Paid with POS/Transfer)"}</button>)}
                            </div></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                  {privateSelfPayBookings.length > 0 && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3 flex-wrap justify-center"><span className="text-slate-400">Rows per page:</span><select value={cashdeskItemsPerPage} onChange={(e) => { setCashdeskItemsPerPage(Number(e.target.value)); setCashdeskCurrentPage(1); }} className={`px-3 py-2 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><span className="text-slate-400">Showing <b className="text-cyan-500">{(currentCashdeskPage - 1) * cashdeskItemsPerPage + 1}–{Math.min(currentCashdeskPage * cashdeskItemsPerPage, privateSelfPayBookings.length)}</b> of <b className="text-cyan-500">{privateSelfPayBookings.length}</b></span></div>
                    <div className="flex items-center gap-2"><button type="button" onClick={() => setCashdeskCurrentPage((p) => Math.max(1, p - 1))} disabled={currentCashdeskPage === 1} className={`px-3 py-2 rounded-xl border font-bold ${currentCashdeskPage === 1 ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800" : "border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10"}`}>Previous</button><span className="px-2 text-slate-400">Page {currentCashdeskPage} of {totalCashdeskPages}</span><button type="button" onClick={() => setCashdeskCurrentPage((p) => Math.min(totalCashdeskPages, p + 1))} disabled={currentCashdeskPage === totalCashdeskPages} className={`px-3 py-2 rounded-xl border font-bold ${currentCashdeskPage === totalCashdeskPages ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800" : "border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10"}`}>Next</button></div>
                  </div>}
                </div>
              </div>
            );
          })()}

          {activeDesk === "all_patients" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                    <Users className="h-4 w-4" /> Patient Master Index Module
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">All Patients Master Directory</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Complete directory of registered hospital patients, medical record numbers (MRN), appointment histories, and payment plans.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                    Total Registered: {bookings.length} Patients
                  </div>
                  <button
                    type="button"
                    onClick={exportMasterPatientsToPDF}
                    className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Export Master Patient Directory to PDF"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#008ac9]" /> Master Patient Records List
                  </h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 mb-4"><div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="search" value={allPatientsSearch} onChange={(e) => { setAllPatientsSearch(e.target.value); setCurrentAllPatientsPage(1); }} placeholder="Search patient, phone, email, MRN, ticket, doctor or clinic..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} /></div><select value={allPatientsStatusFilter} onChange={(e) => { setAllPatientsStatusFilter(e.target.value); setCurrentAllPatientsPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Statuses</option><option value="confirmed">Confirmed</option><option value="checked in">Checked In</option><option value="consulting">Consulting</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="disabled">Disabled</option></select><select value={allPatientsClinicFilter} onChange={(e) => { setAllPatientsClinicFilter(e.target.value); setCurrentAllPatientsPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Clinics / Specialties</option>{Array.from(new Set(bookings.map((b: any) => String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").trim()).filter(Boolean))).sort().map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}</select></div>

                {filteredAllPatientsBookings.length === 0 ? (
                  <div className="text-center py-12 space-y-2 text-slate-500">
                    <Users className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="font-bold text-sm">No patient records found matching search filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-3">Ticket Ref</th>
                          <th className="pb-3 px-3">Patient Name & Phone</th>
                          <th className="pb-3 px-3">Email Address</th>
                          <th className="pb-3 px-3">Specialist & Doctor</th>
                          <th className="pb-3 px-3">Payment Classification</th>
                          <th className="pb-3 px-3">Booking Date</th>
                          <th className="pb-3 px-3">Status</th>
                          {isSuperAdminUser(currentUser) && <th className="pb-3 px-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedAllPatientsBookings.map((b) => (
                          <tr key={b.refCode} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                            <td className="py-4 px-3 font-black text-[#008ac9] dark:text-sky-400">
                              {b.refCode}
                            </td>
                            <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                              {b.patientName}
                              <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone}</span>
                            </td>
                            <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                              {b.patientEmail || "Not Provided"}
                            </td>
                            <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                              {b.doctorName}
                              <span className="block text-slate-500 text-[11px] font-semibold">{b.doctorSpecialty}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-block ${b.paymentType === "HMO Insurance"
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300"
                                }`}>
                                {b.paymentType || "Private Self-Pay"}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-slate-700 dark:text-slate-300 font-bold">
                              📅 {b.date}
                              <span className="block text-slate-500 text-[11px]">🕒 {b.time}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${b.status === "Checked In"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                : b.status === "Completed"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-2 border-rose-400 font-extrabold"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                }`}>
                                {b.status || "Confirmed"}
                              </span>
                            </td>
                            {isSuperAdminUser(currentUser) && (
                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditBookingModal(b)}
                                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                                    title="Superadmin: Edit Booking Record"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBookingRecord(b)}
                                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                    title="Superadmin: Delete Booking Record from Database"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Inline Pagination Bar */}
                {(() => {
                  const totalItems = filteredBookings.length;
                  const currentPage = currentAllPatientsPage;
                  const totalPages = totalAllPatientsPages;
                  const itemsPerPage = allPatientsItemsPerPage;
                  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
                  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

                  return (
                    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2 ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} border-t text-xs`}>
                      <div className="flex items-center gap-2">
                        <span>
                          Showing <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{startItem}</strong> to <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{endItem}</strong> of <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{totalItems}</strong> entries
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setAllPatientsItemsPerPage(Number(e.target.value));
                            setAllPatientsCurrentPage(1);
                          }}
                          className={`ml-2 px-2 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} text-xs focus:outline-none`}
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAllPatientsCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage <= 1}
                          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${currentPage <= 1
                            ? 'opacity-40 cursor-not-allowed border-slate-700/50 bg-slate-800/20'
                            : isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                        >
                          Previous
                        </button>

                        <span className="px-3 py-1.5 font-bold text-sky-500">
                          Page {currentPage} of {Math.max(1, totalPages)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setAllPatientsCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage >= totalPages}
                          className={`px-4 py-1.5 rounded-lg border font-semibold transition-all ${currentPage >= totalPages
                            ? 'opacity-40 cursor-not-allowed border-slate-700/50 bg-slate-800/20'
                            : isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeDesk === "hmo_enrollees" && (
            <div className="space-y-6">

              {/* =========================================================
        HMO REGISTRY HEADER
    ========================================================== */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3
                    className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                  >
                    HMO Service Providers Registry
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage partner insurance companies, corporate health providers,
                    tariffs, and enrolled patients.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* UPLOAD PROVIDERS */}
                  <button
                    type="button"
                    onClick={() => setShowUploadHmoModal(true)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDarkMode
                      ? "bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20"
                      : "bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200"
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Provider List
                  </button>

                  {/* ADD PROVIDER */}
                  <button
                    type="button"
                    onClick={() => setShowCreateHmoModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add HMO Provider
                  </button>
                </div>
              </div>

              {/* =========================================================
        HMO PROVIDER CARDS
    ========================================================== */}
              <div
                className={`${isDarkMode
                  ? "bg-slate-900/80 border-sky-500/20"
                  : "bg-white/80 border-sky-100 shadow-xl"
                  } backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h4
                      className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                    >
                      HMO Providers
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select a provider to view its enrolled patients.
                    </p>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400">
                    {hmoProviderSummary.length} provider
                    {hmoProviderSummary.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {hmoProviderSummary.length === 0 ? (
                  <div
                    className={`rounded-2xl border border-dashed p-8 text-center ${isDarkMode
                      ? "border-slate-700 bg-slate-800/30"
                      : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-400" />

                    <p
                      className={`text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"
                        }`}
                    >
                      No HMO providers found
                    </p>

                    <p className="text-[11px] text-slate-400 mt-1">
                      Add a provider or upload a provider list to populate the registry.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                    {/* ALL PROVIDERS */}
                    <button
                      type="button"
                      onClick={() => handleHmoProviderFilter("all")}
                      className={`text-left rounded-2xl border p-4 transition-all duration-200 ${hmoProviderFilter === "all"
                        ? isDarkMode
                          ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                          : "border-sky-300 bg-sky-50 shadow-lg shadow-sky-100"
                        : isDarkMode
                          ? "border-slate-800 bg-slate-800/40 hover:border-sky-500/40"
                          : "border-slate-200 bg-slate-50 hover:border-sky-300"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>

                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${hmoProviderFilter === "all"
                            ? "bg-sky-500 text-white"
                            : "bg-slate-500/10 text-slate-400"
                            }`}
                        >
                          {hmoProviderFilter === "all" ? "Selected" : "View All"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p
                          className={`text-sm font-black ${isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                        >
                          All Providers
                        </p>

                        <p className="text-[11px] text-slate-400 mt-1">
                          {hmoEnrolleeRecords.length} total enrollee
                          {hmoEnrolleeRecords.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>

                    {/* INDIVIDUAL PROVIDERS */}
                    {hmoProviderSummary.map((provider) => {
                      const isSelected = hmoProviderFilter === provider.name;

                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => handleHmoProviderFilter(provider.name)}
                          className={`text-left rounded-2xl border p-4 transition-all duration-200 ${isSelected
                            ? isDarkMode
                              ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                              : "border-purple-300 bg-purple-50 shadow-lg shadow-purple-100"
                            : isDarkMode
                              ? "border-slate-800 bg-slate-800/40 hover:border-purple-500/40"
                              : "border-slate-200 bg-slate-50 hover:border-purple-300"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                              <CreditCard className="w-5 h-5" />
                            </div>

                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${isSelected
                                ? "bg-purple-500 text-white"
                                : "bg-slate-500/10 text-slate-400"
                                }`}
                            >
                              {isSelected ? "Selected" : "Provider"}
                            </span>
                          </div>

                          <div className="mt-4">
                            <p
                              className={`text-sm font-black truncate ${isDarkMode ? "text-white" : "text-slate-900"
                                }`}
                              title={provider.name}
                            >
                              {provider.name}
                            </p>

                            <p className="text-[11px] text-slate-400 mt-1">
                              {provider.enrollees} enrollee
                              {provider.enrollees !== 1 ? "s" : ""}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <div
                              className={`rounded-xl px-3 py-2 ${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"
                                }`}
                            >
                              <div className="text-[9px] uppercase font-bold text-slate-400">
                                Approved
                              </div>

                              <div className="text-xs font-black text-emerald-500 mt-0.5">
                                {provider.approved}
                              </div>
                            </div>

                            <div
                              className={`rounded-xl px-3 py-2 ${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"
                                }`}
                            >
                              <div className="text-[9px] uppercase font-bold text-slate-400">
                                Pending
                              </div>

                              <div className="text-xs font-black text-amber-500 mt-0.5">
                                {provider.pending}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* =========================================================
        HMO ENROLLEE TABLE
    ========================================================== */}
              <div
                className={`${isDarkMode
                  ? "bg-slate-900/80 border-sky-500/20"
                  : "bg-white/80 border-sky-100 shadow-xl"
                  } backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h4
                      className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                    >
                      HMO Enrollee Registry
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hmoProviderFilter === "all"
                        ? "Showing all HMO enrollee records."
                        : `Showing enrollees under ${hmoProviderFilter}.`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="search" value={hmoEnrolleeSearch} onChange={(e) => { setHmoEnrolleeSearch(e.target.value); setHmoEnrolleePage(1); }} placeholder="Search enrollee, policy, provider or auth..." className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                    </div>
                    <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-sky-500/10 text-sky-500 whitespace-nowrap">
                      {filteredHmoEnrollees.length} record{filteredHmoEnrollees.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`border-b ${isDarkMode
                          ? "border-slate-800 text-slate-400"
                          : "border-slate-200 text-slate-600"
                          } text-[10px] font-black uppercase tracking-wider`}
                      >
                        <th className="py-3 px-4">Patient & Phone</th>
                        <th className="py-3 px-4">HMO Provider</th>
                        <th className="py-3 px-4">Policy / Enrollee Number</th>
                        <th className="py-3 px-4">Auth Code</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody
                      className={`divide-y ${isDarkMode
                        ? "divide-slate-800/60"
                        : "divide-slate-100"
                        } text-xs`}
                    >
                      {paginatedHmoEnrollees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-slate-400 font-medium"
                          >
                            No HMO enrollees found for the selected provider.
                          </td>
                        </tr>
                      ) : (
                        paginatedHmoEnrollees.map((b, idx) => {
                          const policyCode =
                            b.hmoPolicyCode ||
                            b.hmo_policy_code ||
                            b.enrolleeNumber ||
                            b.enrollee_number ||
                            "POL-PENDING";

                          const authCode =
                            b.hmoAuthCode ||
                            b.hmo_auth_code ||
                            "AUTH-PENDING";

                          const hmoName =
                            b.hmoName ||
                            b.hmo_name ||
                            b.hmoCompanyName ||
                            "Standard HMO Partner";

                          const status =
                            b.hmoStatus ||
                            b.hmo_status ||
                            "Pending Approval";

                          const normalizedStatus =
                            String(status).toLowerCase().trim();

                          return (
                            <tr
                              key={
                                b.refCode ||
                                b.ref_code ||
                                `${hmoEnrolleePage}-${idx}`
                              }
                              className={`${isDarkMode
                                ? "hover:bg-slate-800/30"
                                : "hover:bg-sky-50/50"
                                } transition-colors`}
                            >
                              <td className="py-4 px-4">
                                <div
                                  className={`font-bold ${isDarkMode
                                    ? "text-white"
                                    : "text-slate-900"
                                    }`}
                                >
                                  {b.patientName ||
                                    b.patient_name ||
                                    "Patient"}
                                </div>

                                <div className="text-[11px] text-slate-500">
                                  {b.patientPhone ||
                                    b.patient_phone ||
                                    "N/A"}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-semibold text-purple-600 dark:text-purple-300">
                                  {hmoName}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <span className="font-mono font-bold text-sky-500">
                                  {policyCode}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                <span className="font-mono text-slate-400 dark:text-slate-300">
                                  {authCode}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${normalizedStatus === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    }`}
                                >
                                  {status}
                                </span>
                              </td>

                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleSelectDesk("hmo")}
                                  className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 font-bold border border-sky-500/30 transition-colors"
                                >
                                  Manage at HMO Desk
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* =======================================================
          PAGINATION
      ======================================================== */}
                {filteredHmoEnrollees.length > 0 && (
                  <div
                    className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t ${isDarkMode
                      ? "border-slate-800"
                      : "border-slate-100"
                      }`}
                  >
                    <div className="text-[11px] text-slate-400">
                      Showing{" "}
                      <span className="font-bold text-slate-500 dark:text-slate-300">
                        {(hmoEnrolleePage - 1) *
                          HMO_ENROLLEES_PER_PAGE +
                          1}
                      </span>{" "}
                      -
                      <span className="font-bold text-slate-500 dark:text-slate-300">
                        {" "}
                        {Math.min(
                          hmoEnrolleePage * HMO_ENROLLEES_PER_PAGE,
                          filteredHmoEnrollees.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-slate-500 dark:text-slate-300">
                        {filteredHmoEnrollees.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHmoEnrolleePage((prev) =>
                            Math.max(prev - 1, 1)
                          )
                        }
                        disabled={hmoEnrolleePage === 1}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${hmoEnrolleePage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        Previous
                      </button>

                      <div className="px-3 py-2 rounded-xl bg-sky-500/10 text-sky-500 text-xs font-black">
                        Page {hmoEnrolleePage} of {hmoTotalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setHmoEnrolleePage((prev) =>
                            Math.min(prev + 1, hmoTotalPages)
                          )
                        }
                        disabled={hmoEnrolleePage === hmoTotalPages}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${hmoEnrolleePage === hmoTotalPages
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================
        ADD HMO SERVICE PROVIDER MODAL
    ========================================================== */}
              {showCreateHmoModal && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowCreateHmoModal(false);
                    }
                  }}
                >
                  <div
                    className={`${isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-slate-100"
                      } border w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>

                        <div>
                          <h3
                            className={`text-base font-bold ${isDarkMode
                              ? "text-white"
                              : "text-slate-900"
                              }`}
                          >
                            Add HMO Service Provider
                          </h3>

                          <p className="text-xs text-slate-400">
                            Register a new healthcare insurance partner or
                            corporate organization.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCreateHmoModal(false)}
                        className="w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 flex items-center justify-center transition-colors"
                        aria-label="Close modal"
                      >
                        ✕
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();

                        alert(
                          `Successfully registered HMO provider: ${newHmoProviderForm.providerName}`
                        );

                        setShowCreateHmoModal(false);

                        setNewHmoProviderForm({
                          providerName: "",
                          contactPerson: "",
                          phone: "",
                          email: "",
                          address: "",
                          activeEnrolleesCount: "0",
                        });
                      }}
                      className="space-y-4"
                    >
                      {/* PROVIDER NAME */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          HMO Company / Provider Name
                        </label>

                        <input
                          type="text"
                          required
                          value={newHmoProviderForm.providerName}
                          onChange={(e) =>
                            setNewHmoProviderForm({
                              ...newHmoProviderForm,
                              providerName: e.target.value,
                            })
                          }
                          placeholder="e.g. Hygeia HMO, AXA Mansard"
                          className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                            ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                            } focus:outline-none focus:border-sky-500`}
                        />
                      </div>

                      {/* CONTACT + PHONE */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            Contact Person / Account Manager
                          </label>

                          <input
                            type="text"
                            required
                            value={newHmoProviderForm.contactPerson}
                            onChange={(e) =>
                              setNewHmoProviderForm({
                                ...newHmoProviderForm,
                                contactPerson: e.target.value,
                              })
                            }
                            placeholder="e.g. Mr. David Adeleke"
                            className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                              ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                              } focus:outline-none focus:border-sky-500`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            Support Phone Number
                          </label>

                          <input
                            type="text"
                            required
                            value={newHmoProviderForm.phone}
                            onChange={(e) =>
                              setNewHmoProviderForm({
                                ...newHmoProviderForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="0700-HYGEIA-CALL"
                            className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                              ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                              } focus:outline-none focus:border-sky-500`}
                          />
                        </div>
                      </div>

                      {/* EMAIL + ENROLLEES */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            Corporate Email Address
                          </label>

                          <input
                            type="email"
                            required
                            value={newHmoProviderForm.email}
                            onChange={(e) =>
                              setNewHmoProviderForm({
                                ...newHmoProviderForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="support@hmo-provider.com"
                            className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                              ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                              } focus:outline-none focus:border-sky-500`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            Estimated Enrollees Covered
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={newHmoProviderForm.activeEnrolleesCount}
                            onChange={(e) =>
                              setNewHmoProviderForm({
                                ...newHmoProviderForm,
                                activeEnrolleesCount: e.target.value,
                              })
                            }
                            placeholder="150"
                            className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                              ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                              } focus:outline-none focus:border-sky-500`}
                          />
                        </div>
                      </div>

                      {/* ADDRESS */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          Provider Head Office Address
                        </label>

                        <textarea
                          rows={2}
                          value={newHmoProviderForm.address}
                          onChange={(e) =>
                            setNewHmoProviderForm({
                              ...newHmoProviderForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="Enter office address..."
                          className={`w-full px-4 py-2.5 rounded-xl text-xs border ${isDarkMode
                            ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                            } focus:outline-none focus:border-sky-500`}
                        />
                      </div>

                      {/* ACTIONS */}
                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateHmoModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-500/10 transition-colors"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20 transition-all"
                        >
                          Save Provider
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* =========================================================
        UPLOAD HMO PROVIDERS LIST MODAL
    ========================================================== */}
              {showUploadHmoModal && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowUploadHmoModal(false);
                    }
                  }}
                >
                  <div
                    className={`${isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-slate-100"
                      } border w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>

                        <div>
                          <h3
                            className={`text-base font-bold ${isDarkMode
                              ? "text-white"
                              : "text-slate-900"
                              }`}
                          >
                            Upload HMO Providers Roster
                          </h3>

                          <p className="text-xs text-slate-400">
                            Import bulk list of partner HMO companies and tariffs.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowUploadHmoModal(false)}
                        className="w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 flex items-center justify-center transition-colors"
                        aria-label="Close upload modal"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">

                      {/* FILE UPLOAD */}
                      <div
                        className={`border-2 border-dashed ${isDarkMode
                          ? "border-slate-700 bg-slate-800/40 hover:border-sky-500"
                          : "border-slate-200 bg-slate-50 hover:border-sky-400"
                          } rounded-2xl p-8 text-center transition-all`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-3">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>

                        <h4
                          className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"
                            } mb-1`}
                        >
                          Click to upload or drag & drop
                        </h4>

                        <p className="text-[11px] text-slate-400">
                          Supports CSV, XLS, or XLSX spreadsheet files
                        </p>

                        <input
                          type="file"
                          accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];

                            if (!file) return;

                            alert(
                              `Successfully uploaded HMO providers file: ${file.name}. Providers directory updated.`
                            );

                            setShowUploadHmoModal(false);

                            // Reset input so the same file can be selected again later.
                            e.target.value = "";
                          }}
                          id="hmo-provider-file-upload"
                        />

                        <label
                          htmlFor="hmo-provider-file-upload"
                          className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md shadow-sky-500/20 transition-all"
                        >
                          Browse Files
                        </label>
                      </div>

                      {/* TEMPLATE */}
                      <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                        <span>Need a template?</span>

                        <button
                          type="button"
                          onClick={() =>
                            alert("Downloading HMO Providers CSV template...")
                          }
                          className="text-sky-400 hover:underline font-bold"
                        >
                          Download Sample CSV
                        </button>
                      </div>

                      {/* CLOSE */}
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowUploadHmoModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-500/10 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeDesk === "private_patients" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-xs font-black border border-purple-300 mb-2">
                    <CreditCard className="h-4 w-4" /> Private Self-Pay Directory
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Private Self-Pay Patients Directory
                  </h2>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Directory of private self-paying patients, invoice tracking, cashdesk billing clearance, and POS / Cash transaction receipts.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-4 py-2.5 bg-purple-50 dark:bg-slate-800 rounded-2xl border border-purple-300 font-black text-xs text-purple-700 dark:text-purple-300">
                    Total Private Patients:{" "}
                    {
                      bookings.filter(
                        (b) =>
                          b.paymentType === "Private Self-Pay" ||
                          !b.paymentType
                      ).length
                    }{" "}
                    Patients
                  </div>

                  <button
                    type="button"
                    onClick={exportPrivatePatientsToPDF}
                    className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-extrabold text-xs rounded-2xl border border-purple-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Export Private Patients Directory to PDF"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row gap-3 mb-4"><div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="search" value={privatePatientsSearch} onChange={(e) => { setPrivatePatientsSearch(e.target.value); setPrivatePatientsCurrentPage(1); }} placeholder="Search private patient, phone, ticket, doctor, invoice or clinic..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} /></div><select value={privatePatientsStatusFilter} onChange={(e) => { setPrivatePatientsStatusFilter(e.target.value); setPrivatePatientsCurrentPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Statuses</option><option value="confirmed">Confirmed</option><option value="checked in">Checked In</option><option value="consulting">Consulting</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select value={privatePatientsClinicFilter} onChange={(e) => { setPrivatePatientsClinicFilter(e.target.value); setPrivatePatientsCurrentPage(1); }} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Clinics / Specialties</option>{Array.from(new Set(bookings.map((b: any) => String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").trim()).filter(Boolean))).sort().map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}</select></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Ticket Ref</th>
                        <th className="pb-3 px-3">Patient Name & Phone</th>
                        <th className="pb-3 px-3">Consulting Doctor</th>
                        <th className="pb-3 px-3">Billing Invoice Ref</th>
                        <th className="pb-3 px-3">Cashdesk Payment Clearance</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedPrivatePatientsBookings.map((b) => (
                        <tr
                          key={b.refCode}
                          className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors"
                        >
                          <td className="py-4 px-3 font-black text-[#008ac9]">
                            {b.refCode}
                          </td>

                          <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                            {b.patientName}
                            <span className="block text-slate-500 text-xs font-semibold">
                              {b.patientPhone}
                            </span>
                          </td>

                          <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                            🩺 {b.doctorName}
                          </td>

                          <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                            📄 {b.invoiceRef || "INV-994120"}
                          </td>

                          <td className="py-4 px-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black border ${b.paymentStatus === "Cleared"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                                }`}
                            >
                              {b.paymentStatus === "Cleared"
                                ? "Paid & Cleared ✓"
                                : "Payment Pending ⏳"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 11. CREATE SPECIALIST SCHEDULE MODULE VIEW */}
          {activeDesk === "create_specialist_schedule" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                    <Calendar className="h-4 w-4 text-[#008ac9]" /> Specialist Consultation Schedule Module
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create & Manage Specialist Schedules</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure doctor shift timetables, consultation room assignments, weekly duty days, and daily patient capacity limits.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                    {specialistSchedules.length} Active Doctor Schedules
                  </div>

                  <button
                    onClick={() => setShowCreateScheduleModal(true)}
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                  >
                    <Plus className="h-4 w-4" /> + Create Weekly Schedule
                  </button>

                  <button
                    onClick={() => setShowCreateSpecificDateModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 border border-emerald-500"
                  >
                    <Calendar className="h-4 w-4" /> 🔁 + Create Recurring Schedule
                  </button>
                  <button
                    onClick={() => openChangeDateModal()}
                    hidden={!isSuperAdminUser(currentUser)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" /> Cancel / Move a Clinic Date
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTimeFormError(""); setShowCreateTimeModal(true); }}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 border border-violet-500"
                  >
                    <Clock className="h-4 w-4" /> + Custom Shift Time
                  </button>

                  <button
                    type="button"
                    onClick={exportSpecialistSchedulesToPDF}
                    className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Export Specialist Timetables & Roster to PDF"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-[#008ac9]" /> Specialist Timetables & Shift Roster
                  </h3>
                  <span className="text-xs font-extrabold text-slate-500">
                    {filteredSchedules.length} Schedules Found
                  </span>
                </div>

                {/* Search & Multi-Filter Toolbar for Shift Roster */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search doctor, room, day, shift..."
                      value={schedSearchQuery}
                      onChange={(e) => {
                        setSchedSearchQuery(e.target.value);
                        setSchedCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <select
                      value={schedStatusFilter}
                      onChange={(e) => {
                        setSchedStatusFilter(e.target.value);
                        setSchedCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="all">All Shift Statuses</option>
                      <option value="active">Active On-Duty Shifts ✓</option>
                      <option value="disabled">Disabled Shifts 🚫</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={schedDeptFilter}
                      onChange={(e) => {
                        setSchedDeptFilter(e.target.value);
                        setSchedCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="all">All Specialties / Departments</option>
                      {clinics.map((dept) => (
                        <option key={dept.id || dept.dept_id || dept.name} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={schedDayFilter}
                      onChange={(e) => {
                        setSchedDayFilter(e.target.value);
                        setSchedCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="all">All Duty Days</option>
                      <option value="Monday">Monday (Mon)</option>
                      <option value="Tuesday">Tuesday (Tue)</option>
                      <option value="Wednesday">Wednesday (Wed)</option>
                      <option value="Thursday">Thursday (Thu)</option>
                      <option value="Friday">Friday (Fri)</option>
                      <option value="Saturday">Saturday (Sat)</option>
                      <option value="Sunday">Sunday (Sun)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Specialist Doctor</th>
                        <th className="pb-3 px-3">Specialty Department</th>
                        <th className="pb-3 px-3">Consultation Room / Suite</th>
                        <th className="pb-3 px-3">Duty Days</th>
                        <th className="pb-3 px-3">Shift Hours</th>
                        <th className="pb-3 px-3">Daily Capacity</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedSchedules.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <Stethoscope className="h-6 w-6 text-slate-400" />
                              <span>No specialist schedule items match your search or filter criteria.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedSchedules.map((sched) => {
                          const docObj = doctorsList.find(
                            (d) =>
                              d.id === sched.doctorId ||
                              d.name === sched.doctorName ||
                              d.fullName === sched.doctorName ||
                              d.doc_id === sched.doctorId ||
                              (d.fullName && String(sched.doctorName || "").includes(d.fullName))
                          );

                          let acronym = docObj?.acronym || docObj?.name || "";
                          if (!acronym || !acronym.startsWith("Specialist")) {
                            const match = sched.doctorName?.match(/\(Specialist\s+[A-Z]+\)/i);
                            if (match) {
                              acronym = match[0].replace(/[\(\)]/g, "");
                            } else {
                              const docIdx = doctorsList.findIndex((d) => d.id === sched.doctorId);
                              if (docIdx >= 0) {
                                acronym = getAcronymForIndex(docIdx);
                              }
                            }
                          }

                          const cleanDoctorName = sched.doctorName?.replace(/\s*\(Specialist\s+[A-Z]+\)/i, "").trim();

                          return (
                            <tr key={sched.sched_id || sched.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                              <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>🩺 {cleanDoctorName}</span>
                                  {acronym && (
                                    <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black text-[11px] rounded-lg border border-[#008ac9]/30 shadow-sm">
                                      {acronym}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-3 font-extrabold text-[#008ac9]">
                                {sched.specialty}
                              </td>
                              <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">
                                🏛️ {sched.room}
                              </td>
                              <td className="py-4 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {(sched.dutyDays || sched.duty_days || []).map((day: string) => (
                                    <span key={day} className="px-2 py-0.5 bg-sky-100 dark:bg-slate-800 text-[#008ac9] rounded-md text-[10px] font-black border border-[#008ac9]/30">
                                      {describeDutyKey(day, (sched.dayConfigs || {})[day])}
                                    </span>
                                  ))}
                                  {!isScheduleActive(sched) && (
                                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-md text-[10px] font-black border border-rose-300">Disabled</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                                {sched.dayConfigs && Object.keys(sched.dayConfigs).length > 0 ? (
                                  <div className="space-y-1.5 max-w-sm">
                                    {Object.entries(sched.dayConfigs).map(([d, cfg]: [string, any]) => (
                                      <div key={d} className="p-1.5 bg-sky-50/60 dark:bg-slate-800/60 rounded-xl border border-[#008ac9]/20 text-[11px] flex items-center justify-between gap-2">
                                        <div>
                                          <span className="font-black text-[#008ac9]">{describeDutyKey(d, cfg)}:</span>{" "}
                                          <span className="text-slate-800 dark:text-slate-200 font-bold">{cfg.shiftTimes?.join(", ")}</span>
                                        </div>
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-black shrink-0">
                                          🎯 {cfg.capacity} Visits
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">🕒 {sched.shiftTime}</span>
                                )}
                              </td>
                              <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                                <div className="text-xs">👥 {sched.capacity} Avg/Day</div>
                                <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  📊 {sched.totalWeeklyCapacity || (sched.capacity * (sched.dutyDays?.length || 1))} Visits/Week
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSuperAdminUser(currentUser) ? (<>
                                    <button
                                      onClick={() => handleOpenEditSchedule(sched)}
                                      title="Edit Specialist Schedule"
                                      className="px-3 py-1 bg-[#008ac9]/10 hover:bg-[#008ac9] text-[#008ac9] hover:text-white rounded-xl text-[11px] font-black transition-all flex items-center gap-1 border border-[#008ac9]/30"
                                    >
                                      <Pencil className="h-3.5 w-3.5" /> Edit
                                    </button>

                                    <button
                                      onClick={() => openChangeDateModal(sched)}
                                      title="Cancel or move one clinic date"
                                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-[11px] font-black border border-amber-300 transition-all"
                                    >
                                      Change Date
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(sched)}
                                      title="Delete Specialist Schedule"
                                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-300 transition-all"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleToggleScheduleStatus(sched)}
                                      className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${(sched.status === false || (typeof sched.status === "string" && sched.status.includes("Disabled")))
                                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                                        }`}
                                    >
                                      {(sched.status === false || (typeof sched.status === "string" && sched.status.includes("Disabled"))) ? "Enable Shift" : "Disable Shift"}
                                    </button>
                                  </>) : (
                                    <span className="text-[10px] text-slate-400 font-bold">View only</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                {filteredSchedules.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-500">
                      Showing <span className="font-black text-slate-900 dark:text-white">{Math.min((currentSchedPage - 1) * schedItemsPerPage + 1, filteredSchedules.length)}</span> to{" "}
                      <span className="font-black text-slate-900 dark:text-white">{Math.min(currentSchedPage * schedItemsPerPage, filteredSchedules.length)}</span> of{" "}
                      <span className="font-black text-[#008ac9]">{filteredSchedules.length}</span> schedule entries
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 mr-2">
                        <span className="text-[11px] font-bold text-slate-500">Per page:</span>
                        <select
                          value={schedItemsPerPage}
                          onChange={(e) => {
                            setSchedItemsPerPage(Number(e.target.value));
                            setSchedCurrentPage(1);
                          }}
                          className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={currentSchedPage === 1}
                        onClick={() => setSchedCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalSchedPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          type="button"
                          key={pg}
                          onClick={() => setSchedCurrentPage(pg)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${pg === currentSchedPage
                            ? "bg-[#008ac9] text-white border-[#008ac9] shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                          {pg}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={currentSchedPage === totalSchedPages}
                        onClick={() => setSchedCurrentPage((p) => Math.min(totalSchedPages, p + 1))}
                        className="px-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Registered Doctors Roster Directory Card */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-[#008ac9]" /> Registered Specialist Doctors Directory
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      Filter, search, edit details, or toggle enable/disable status for doctor accounts in database & API.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={() => setShowAddDoctorModal(true)}
                      className="px-4 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> + Add New Doctor
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                          doc.setFontSize(16);
                          doc.text("ISALU HOSPITALS - SPECIALIST DOCTORS ROSTER", 105, 18, { align: "center" });
                          doc.setFontSize(9);
                          let y = 30;
                          doctorsList.forEach((d: any, idx: number) => {
                            if (y > 280) { doc.addPage(); y = 18; }
                            const name = getDoctorRealName(d);
                            const specialty = d.specialty || d.doctorSpecialty || "General Medicine";
                            const status = d.status === false || d.is_active === false ? "Disabled" : "Active";
                            doc.text(`${idx + 1}. ${name} | ${specialty} | ${status}`, 12, y);
                            y += 6;
                          });
                          doc.save("Isalu_Specialist_Doctors_Roster.pdf");
                        } catch (err) {
                          console.error("Doctor roster export failed:", err);
                          setToastAlert({ title: "Export Failed", description: "Unable to generate the specialist roster PDF.", type: "danger" });
                        }
                      }}
                      className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Export Registered Specialist Doctors Roster to PDF"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>


              </div>

              {/* UPCOMING ONE-OFF CLINIC CHANGES */}
              <div className="bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Upcoming Clinic Date Changes</h3>
                    <p className="text-xs text-slate-500">One-off cancellations and moves. The regular weekly schedule is not affected.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {notifyChannels && (
                      <>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${notifyChannels.email?.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
                          Email: {notifyChannels.email?.configured ? `${notifyChannels.email.backend}${notifyChannels.email.host ? ` (${notifyChannels.email.host})` : ""}` : "not configured"}
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${notifyChannels.sms?.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
                          SMS: {notifyChannels.sms?.configured ? notifyChannels.sms.provider : "not configured"}
                        </span>
                      </>
                    )}
                    {isSuperAdminUser(currentUser) && (
                      <button type="button" onClick={() => { setShowNotifyTest((v) => !v); setNotifyTestResult(null); void loadNotifyChannels(); }} className="px-3 py-1 rounded-xl text-[10px] font-black border border-sky-300 text-sky-700 dark:text-sky-300">
                        Send test SMS / email
                      </button>
                    )}
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{scheduleExceptions.length} change(s)</span>
                  </div>
                </div>
                {showNotifyTest && (
                  <form onSubmit={handleSendTestNotification} className="mb-4 p-3 rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-slate-950 space-y-2">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">Sends a real test message through the configured gateways, so you can confirm delivery before notifying patients.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                      <input type="email" value={notifyTestEmail} onChange={(e) => setNotifyTestEmail(e.target.value)} placeholder="Your email address" className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs" />
                      <input type="tel" value={notifyTestPhone} onChange={(e) => setNotifyTestPhone(e.target.value)} placeholder="Your phone, e.g. 0803 123 4567" className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs" />
                      <button type="submit" disabled={notifyTestSending || (!notifyTestEmail.trim() && !notifyTestPhone.trim())} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-50">{notifyTestSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Send test</button>
                    </div>
                    {notifyTestResult && (
                      <div data-testid="notify-test-result" className="text-[11px] font-bold space-y-0.5">
                        {notifyTestResult.error && <p className="text-rose-600">{notifyTestResult.error}</p>}
                        {notifyTestResult.email && <p className={notifyTestResult.email.ok ? "text-emerald-600" : "text-rose-600"}>Email: {notifyTestResult.email.ok ? "✓ " : "✗ "}{notifyTestResult.email.message}</p>}
                        {notifyTestResult.sms && <p className={notifyTestResult.sms.ok ? "text-emerald-600" : "text-rose-600"}>SMS to {notifyTestResult.sms.to}: {notifyTestResult.sms.ok ? "✓ " : "✗ "}{notifyTestResult.sms.message}</p>}
                      </div>
                    )}
                  </form>
                )}
                {scheduleExceptions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No upcoming clinic changes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="pb-2 px-2">Doctor</th><th className="pb-2 px-2">Clinic Date</th><th className="pb-2 px-2">Change</th>
                          <th className="pb-2 px-2">Patients</th><th className="pb-2 px-2">Notifications</th><th className="pb-2 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {scheduleExceptions.map((exc: any) => (
                          <tr key={exc.exception_id}>
                            <td className="py-3 px-2 text-slate-900 dark:text-white">{exc.doctorName}<span className="block text-[10px] text-slate-500">{exc.specialty}</span></td>
                            <td className="py-3 px-2">{formatLongDate(exc.originalDate)}</td>
                            <td className="py-3 px-2">
                              {exc.action === "cancel"
                                ? <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black">Cancelled</span>
                                : <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-black">Moved → {formatLongDate(exc.newDate)}{exc.shiftTimes?.length ? ` · ${exc.shiftTimes.join(", ")}` : ""}</span>}
                              {exc.reason && <span className="block text-[10px] text-slate-500 mt-1">{exc.reason}</span>}
                            </td>
                            <td className="py-3 px-2">{exc.affectedCount}</td>
                            <td className="py-3 px-2">
                              {exc.notificationStatus === "none" ? <span className="text-slate-400">No patients to notify</span>
                                : exc.notificationStatus === "sent" ? <span className="text-emerald-600">✓ {exc.notifiedCount}/{exc.affectedCount} notified</span>
                                  : ["pending", "sending"].includes(exc.notificationStatus) ? <span className="text-sky-600">Sending…</span>
                                    : <span className="text-rose-600">{exc.notifiedCount}/{exc.affectedCount} notified · {exc.notificationFailedCount} failed</span>}
                              {(exc.notification_log || []).some((l: any) => l.email_sent === false || l.sms_sent === false) && (
                                <details className="mt-1 text-[10px] font-medium text-slate-500">
                                  <summary className="cursor-pointer">Delivery details</summary>
                                  <ul className="mt-1 space-y-0.5">
                                    {(exc.notification_log || []).map((l: any) => (
                                      <li key={l.ref_code}>{l.patient_name}: email {l.email_sent === true ? "✓" : l.email_sent === false ? `✗ ${l.email_message}` : "–"}; SMS {l.sms_sent === true ? "✓" : l.sms_sent === false ? `✗ ${l.sms_message}` : "–"}</li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right whitespace-nowrap">
                              {exc.notificationFailedCount > 0 && <button type="button" onClick={() => handleRetryExceptionNotifications(exc)} className="px-2.5 py-1 rounded-lg border border-sky-300 text-sky-700 text-[10px] font-black mr-1">Retry failed</button>}
                              {exc.affectedCount === 0 && <button type="button" onClick={() => handleUndoException(exc)} className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 dark:text-slate-300 text-[10px] font-black">Undo</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}


          {activeDesk === "clinic" && (
            <div className="space-y-6">
              <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Clinical Departments & Units Directory</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage hospital clinical departments, suites, and specialist units.</p>
                  </div>
                  {isSuperAdminUser(currentUser) && (
                    <button
                      onClick={() => setShowCreateClinicModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 flex items-center gap-2 text-xs transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add New Clinic Unit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClinics.map((clinic) => {
                    const cName = clinic.name || "Clinic Unit";
                    const cDesc = clinic.description || "Specialized clinical consultation services.";
                    const cLoc = clinic.location || "Main Hospital Complex - Suite Wing";
                    const cCount = clinic.doctorCount ?? 3;
                    const isActive = clinic.status === true || clinic.status === "Active" || clinic.status === "active" || clinic.status === 1;

                    return (
                      <div key={clinic.id || cName} className={`${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-5 flex flex-col justify-between relative group hover:border-sky-500/50 transition-all shadow-sm`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                              {isActive ? "Active Unit" : "Disabled"}
                            </span>
                          </div>
                          <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cName}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{cDesc}</p>
                          <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span>📍 {cLoc}</span>
                            <span className="font-bold text-sky-400">{cCount} Doctors</span>
                          </div>
                        </div>

                        {isSuperAdminUser(currentUser) && (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClinic(clinic);
                                setEditClinicName(clinic.name || "");
                                setEditClinicLocation(clinic.location || "");
                                setEditClinicDescription(clinic.description || "");
                                setEditClinicStatus(clinic.status === "Maintenance" ? "Maintenance" : "Active");
                                setEditClinicFormError("");
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-bold border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const targetId = clinic.id || clinic.dept_id;
                                const newStatus = !isActive;
                                const saved = await updateDepartmentAPI(targetId, { status: newStatus ? "Active" : "Disabled" });
                                if (isApiError(saved) || !saved) {
                                  setToastAlert({ title: "Clinic Update Failed", description: (saved as any)?.error || "Unable to update this department.", type: "danger" });
                                  return;
                                }
                                await loadClinics();
                                setToastAlert({ title: "Clinic Status Updated ✓", description: `Department ${cName} status toggled.`, type: "success" });
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${isActive ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
                            >
                              {isActive ? "Disable" : "Activate"}
                            </button>
                            <button
                              onClick={async () => {
                                const targetId = clinic.id || clinic.dept_id;
                                if (!(await deleteDepartmentAPI(targetId))) {
                                  setToastAlert({ title: "Clinic Not Removed", description: `Department ${cName} could not be disabled.`, type: "danger" });
                                  return;
                                }
                                await loadClinics();
                                setToastAlert({ title: "Clinic Disabled", description: `Department ${cName} was disabled. Use Activate to restore it.`, type: "info" });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                              title="Delete Clinic"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeDesk === "users" && (
            <div className="space-y-6">
              <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Staff Accounts & Role Permissions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage hospital staff accounts, security credentials, and access control desks.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setUserSubTab("users")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${userSubTab === "users" ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      Staff Directory ({systemUsers.length})
                    </button>
                    <button
                      onClick={() => setUserSubTab("roles")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${userSubTab === "roles" ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      Custom Roles ({roles.length})
                    </button>
                    {isSuperAdminUser(currentUser) && (
                      <button
                        onClick={() => {
                          if (userSubTab === "users") setShowAddUserModal(true);
                          else setShowCreateRoleModal(true);
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 flex items-center gap-2 text-xs transition-all"
                      >
                        <Plus className="w-4 h-4" /> {userSubTab === "users" ? "Add Staff Account" : "Create New Role"}
                      </button>
                    )}
                  </div>
                </div>

                {userSubTab === "users" ? (
                  <>
                    <div className="flex flex-col md:flex-row gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="search" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} placeholder="Search staff name, email, role or desk..." className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                      </div>
                      <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                        <option value="all">All Roles</option>
                        {Array.from(new Set(systemUsers.map((u: any) => String(u.role || "Hospital Staff Officer").trim()).filter(Boolean))).map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                        <option value="all">All Status</option><option value="active">Active</option><option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[10px] font-black uppercase tracking-wider`}>
                            <th className="py-3 px-4">Staff Full Name</th>
                            <th className="py-3 px-4">Email Address</th>
                            <th className="py-3 px-4">Assigned Role</th>
                            <th className="py-3 px-4">Primary Desk</th>
                            <th className="py-3 px-4">Account Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'} text-xs`}>
                          {filteredSystemUsers.length === 0 && (
                            <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-medium">No staff accounts match this filter.</td></tr>
                          )}
                          {filteredSystemUsers.slice((Math.min(staffPage, Math.max(1, Math.ceil(filteredSystemUsers.length / staffPageSize))) - 1) * staffPageSize, Math.min(staffPage, Math.max(1, Math.ceil(filteredSystemUsers.length / staffPageSize))) * staffPageSize).map((u) => {
                            const uId = u.id || u.user_id;
                            const uName = u.name || "Staff Member";
                            const uEmail = u.email || "staff@isaluhospitals.com";
                            const uRole = u.role || "Hospital Staff Officer";
                            const uDesk = u.desk || "helpdesk";
                            const isActive = u.status === "Active" || u.status === true;

                            return (
                              <tr key={uId || uEmail} className={`${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-sky-500/5'} transition-colors`}>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                                      {String(uName).replace(/^(mr|mrs|ms|dr|chief)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("") || "?"}
                                    </span>
                                    <span className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{uName}</span>
                                  </div>
                                </td>
                                <td className={`py-4 px-4 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"} break-all`}>{uEmail}</td>
                                <td className="py-4 px-4">
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                    {uRole}
                                  </span>
                                </td>
                                <td className={`py-4 px-4 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{DESK_LABELS[uDesk] || uDesk}</td>
                                <td className="py-4 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                                    {isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                                  {isSuperAdminUser(currentUser) && (
                                    <>
                                      <button
                                        onClick={() => handleStartEditUser(u)}
                                        className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 font-bold border border-sky-500/30 transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeactivateUser(uId, uName)}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 transition-colors"
                                        title="Delete Staff"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 inline" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <TablePager testId="staff-pager" page={Math.min(staffPage, Math.max(1, Math.ceil(filteredSystemUsers.length / staffPageSize)))} pageSize={staffPageSize}
                        total={filteredSystemUsers.length} onPage={setStaffPage} onPageSize={setStaffPageSize} isDarkMode={isDarkMode} />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roles.map((role) => {
                      const rId = role.id || role.role_id;
                      const rName = role.name || "Role";
                      const rDesc = role.description || "Custom role permissions.";
                      const allowedDesks = role.allowedDesks || role.allowed_desks || [];

                      return (
                        <div key={rId || rName} className={`${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-5 flex flex-col justify-between relative`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rName}</h4>
                              {role.isSystemRole || role.is_system_role ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">System Core</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">Custom Role</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{rDesc}</p>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {allowedDesks.map((d: string) => (
                                <span key={d} className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 text-[10px] font-mono font-bold">
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>

                          {isSuperAdminUser(currentUser) && !role.isSystemRole && !role.is_system_role && (
                            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStartEditRole(role)}
                                className="px-3 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 font-bold border border-sky-500/30 text-xs"
                              >
                                Edit Role
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role)}
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDesk === "monitor" && (() => {
            const isLive = (b: any) => (b.isActive !== false && b.is_active !== false) &&
              !["disabled", "cancelled", "canceled", "completed"].includes(String(b.status || "").toLowerCase());
            const clinicOf = (b: any) => String(b.doctorSpecialty || b.doctor_specialty || "General Outpatient");
            const todays = bookings.filter((b: any) => b.date === todayDateStr && isLive(b));
            const clinics = Array.from(new Set(todays.map(clinicOf))).sort();
            const inClinic = todays.filter((b: any) => monitorClinic === "all" || clinicOf(b) === monitorClinic);
            const byTime = (a: any, b: any) => timeToMinutes(a.time) - timeToMinutes(b.time);
            const consulting = inClinic.filter((b: any) => String(b.status).toLowerCase() === "checked in").sort(byTime);
            const waiting = inClinic.filter((b: any) => String(b.status).toLowerCase() !== "checked in").sort(byTime);
            const showName = (b: any) => monitorShowNames ? (b.patientName || b.patient_name || "Patient") : maskPatientName(b.patientName || b.patient_name);
            const ticket = (b: any) => String(b.refCode || b.ref_code || "").slice(-4);
            return (
              <div ref={monitorRef} data-testid="waiting-monitor" className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 border border-sky-500/30 shadow-2xl overflow-auto">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-sky-500/30"><Tv className="w-7 h-7" /></div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">Isalu Hospitals · Waiting Room</h2>
                      <p className="text-sm text-sky-300 font-semibold">{monitorClinic === "all" ? "All clinics" : monitorClinic} · {monitorNow.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span data-testid="monitor-clock" className="text-3xl font-black tabular-nums mr-2">{monitorNow.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    <select aria-label="Clinic shown on this screen" value={monitorClinic} onChange={(e) => setMonitorClinic(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold">
                      <option value="all">All clinics</option>
                      {clinics.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => setMonitorStaffControls((v) => !v)} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold" title="Hide the buttons on a public TV screen">
                      {monitorStaffControls ? "Hide staff controls" : "Show staff controls"}
                    </button>
                    <button type="button" onClick={() => setMonitorShowNames((v) => !v)} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold" title="Full names are hidden on public screens by default">
                      {monitorShowNames ? "Hide full names" : "Show full names"}
                    </button>
                    <button type="button" onClick={() => { const el: any = monitorRef.current; if (document.fullscreenElement) document.exitFullscreen?.(); else el?.requestFullscreen?.(); }} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black">
                      Fullscreen
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><div className="text-3xl font-black text-emerald-400">{consulting.length}</div><div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Now being seen</div></div>
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><div className="text-3xl font-black text-amber-400">{waiting.length}</div><div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Waiting</div></div>
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><div className="text-3xl font-black text-sky-400">{inClinic.length}</div><div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Today</div></div>
                </div>

                {monitorUndo && monitorStaffControls && (
                  <div data-testid="monitor-undo" className="mb-4 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-sm">
                    <span>✓ {monitorUndo.name}'s consultation marked completed.</span>
                    <button type="button" onClick={handleMonitorUndo} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-amber-300">Undo</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3 space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Please proceed to your consultation</h3>
                    {consulting.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">No patient has been called yet.</div>
                    ) : consulting.slice(0, 6).map((b: any) => (
                      <div key={b.refCode || b.ref_code} data-testid="monitor-consulting" className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/40 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-lg tabular-nums">#{ticket(b)}</div>
                          <div className="min-w-0">
                            <div className="text-2xl font-black truncate">{showName(b)}</div>
                            <div className="text-sm text-emerald-200 font-semibold truncate">{clinicOf(b)} · {getDoctorRealName(b)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-black text-emerald-300 whitespace-nowrap">PROCEED</span>
                          {monitorStaffControls && (
                            <button
                              type="button"
                              data-testid="monitor-complete"
                              disabled={monitorBusyRef !== null}
                              onClick={() => handleMonitorComplete(b)}
                              className="px-4 py-2.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-black shadow-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Completed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">Up next</h3>
                    {waiting.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">No one else is waiting.</div>
                    ) : waiting.slice(0, 8).map((b: any, idx: number) => (
                      <div key={b.refCode || b.ref_code} data-testid="monitor-waiting" className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 text-center text-sm font-black text-slate-500">{idx + 1}</span>
                          <span className="font-mono text-sm font-bold text-amber-300">#{ticket(b)}</span>
                          <span className="text-base font-bold truncate">{showName(b)}</span>
                        </div>
                        <span className="text-xs text-sky-300 font-semibold whitespace-nowrap">{String(b.time || "").split(/[–-]/)[0].trim()}</span>
                      </div>
                    ))}
                    {waiting.length > 8 && <p className="text-xs text-slate-500 text-center">+ {waiting.length - 8} more today</p>}
                  </div>
                </div>
              </div>
            );
          })()}
          {/* 4. HOSPITAL QUEUE & DEPARTMENT ANALYTICS & AI REPORTING VIEW */}
          {activeDesk === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Title Card */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#008ac9]/10 text-[#008ac9] dark:text-sky-400 text-xs font-black border border-[#008ac9]/20 mb-2">
                    <TrendingUp className="h-4 w-4" /> Live Operational & Clinical Intelligence
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Hospital Queue & Department Analytics
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Real-time visual charts, queue trends, financial ratios, and AI-powered executive report generation.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">


                  <button
                    type="button"
                    onClick={() => handleGenerateAiReport("Generate Full Executive Board Report")}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#008ac9] to-sky-600 hover:from-sky-600 hover:to-[#008ac9] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" /> Instant AI Board Summary
                  </button>

                  <button
                    type="button"
                    onClick={downloadAnalyticsPdf}
                    className="px-4 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="h-4 w-4" /> Download Analytics (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={downloadAnalyticsCsv}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText className="h-4 w-4 text-emerald-200" /> Export to Excel (CSV)
                  </button>
                </div>
              </div>


              {/* EDIT CLINIC MODAL DIALOG */}

              {/* CONFIRMATION DIALOG MODAL */}
              {/* PERIOD + CLINIC FILTER */}
              <div data-testid="analytics-filters" className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3`}>
                <div className="flex flex-wrap gap-2">
                  {([["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"], ["all", "All time"]] as const).map(([key, lab]) => (
                    <button key={key} type="button" data-period={key} onClick={() => setAnalyticsPeriod(key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${analyticsPeriod === key ? "bg-sky-600 text-white shadow-md shadow-sky-500/20" : isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{lab}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span data-testid="analytics-range" className="font-bold text-slate-500 whitespace-nowrap">{(() => {
                    const fmt = (iso: string, withYear: boolean) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
                    return analytics.startIso === analytics.endIso ? fmt(analytics.startIso, true) : `${fmt(analytics.startIso, analytics.startIso.slice(0, 4) !== analytics.endIso.slice(0, 4))} – ${fmt(analytics.endIso, true)}`;
                  })()}</span>
                  <select aria-label="Clinic" value={analyticsClinic} onChange={(e) => setAnalyticsClinic(e.target.value)}
                    className={`px-3 py-2 rounded-xl border font-bold ${isDarkMode ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
                    <option value="all">All clinics</option>
                    {analytics.clinics.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* KPI CARDS */}
              <div data-testid="analytics-kpis" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { k: "Appointments", v: analytics.total, sub: analytics.prevTotal === null ? `${analytics.avgPerDay}/day` : (analytics.prevTotal === 0 ? `${analytics.avgPerDay}/day` : `${analytics.total >= analytics.prevTotal ? "▲" : "▼"} ${Math.abs(Math.round(((analytics.total - analytics.prevTotal) / analytics.prevTotal) * 100))}% vs previous`), c: "text-slate-900 dark:text-white" },
                  { k: "Attendance rate", v: `${analytics.completionRate}%`, sub: `${analytics.completed + analytics.checkedIn} seen`, c: "text-emerald-600 dark:text-emerald-400" },
                  { k: "No-shows", v: analytics.noShow, sub: `${analytics.noShowRate}% of due visits`, c: "text-amber-600 dark:text-amber-400" },
                  { k: "Cancelled", v: analytics.cancelled, sub: `${analytics.cancellationRate}% of bookings`, c: "text-rose-600 dark:text-rose-400" },
                  { k: "HMO awaiting pre-auth", v: analytics.pendingHmo, sub: "upcoming visits", c: "text-teal-600 dark:text-teal-400" },
                  { k: "Unpaid self-pay", v: analytics.pendingPay, sub: "upcoming visits", c: "text-purple-600 dark:text-purple-400" },
                ].map((card) => (
                  <div key={card.k} data-kpi={card.k} className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-2xl p-4`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.k}</div>
                    <div className={`text-3xl font-black mt-1.5 tabular-nums ${card.c}`}>{isLoadingBookings && bookings.length === 0 ? "…" : card.v}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* BAR CHART: appointments over time */}
              <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Appointments {analytics.daily.monthly ? "per month" : "per day"}</h3>
                  <span className="text-xs font-bold text-slate-400">{analytics.label}</span>
                </div>
                <StackedBarChart testId="chart-daily" isDarkMode={isDarkMode} labels={analytics.daily.labels} series={[
                  { name: "Completed", color: "#10b981", values: analytics.daily.done },
                  { name: "Checked in", color: "#0ea5e9", values: analytics.daily.checkedIn },
                  { name: "Upcoming", color: "#6366f1", values: analytics.daily.upcoming },
                  { name: "No-show", color: "#f59e0b", values: analytics.daily.noShow },
                  { name: "Cancelled", color: "#f43f5e", values: analytics.daily.cancelled },
                ]} />
              </div>

              {/* PIE CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Appointment outcomes</h3>
                  <PieChart testId="chart-status" isDarkMode={isDarkMode} data={analytics.statusSlices} />
                </div>
                <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Funding source</h3>
                  <PieChart testId="chart-funding" isDarkMode={isDarkMode} donut centerLabel="PATIENTS" data={analytics.funding} />
                </div>
              </div>

              {/* BAR CHARTS: clinics, weekdays, hours */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-1 ${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Busiest clinics</h3>
                  <HBarChart testId="chart-clinics" isDarkMode={isDarkMode} rows={analytics.byClinic.slice(0, 8)} />
                </div>
                <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">By day of week</h3>
                  <StackedBarChart testId="chart-weekday" isDarkMode={isDarkMode} height={180} labels={analytics.byWeekday.map((w) => w.d)} series={[{ name: "Appointments", color: "#0ea5e9", values: analytics.byWeekday.map((w) => w.v) }]} />
                </div>
                <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">By appointment start time</h3>
                  <StackedBarChart testId="chart-hour" isDarkMode={isDarkMode} height={180} labels={analytics.byHour.map((x) => `${((x.h + 11) % 12) + 1}${x.h < 12 ? "am" : "pm"}`)} series={[{ name: "Appointments", color: "#8b5cf6", values: analytics.byHour.map((x) => x.v) }]} />
                </div>
              </div>

              {/* DOCTOR PERFORMANCE */}
              <div className={`${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"} border rounded-3xl p-6`}>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Specialist performance</h3>
                <div className="overflow-x-auto">
                  <table data-testid="analytics-doctors" className="w-full text-left text-xs">
                    <thead><tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-3">Doctor</th><th className="py-2 pr-3">Clinic</th><th className="py-2 pr-3 text-right">Appointments</th><th className="py-2 pr-3 text-right">Attendance</th><th className="py-2 pr-3 text-right">Completed</th><th className="py-2 pr-3 text-right">No-shows</th><th className="py-2 text-right">Cancelled</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.doctors.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">No appointments in this period.</td></tr>}
                      {analytics.doctors.slice(0, 15).map((d) => (
                        <tr key={d.name + d.clinic}>
                          <td className={`py-2.5 pr-3 font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{d.name}</td>
                          <td className="py-2.5 pr-3 text-slate-500">{d.clinic}</td>
                          <td className="py-2.5 pr-3 text-right font-black tabular-nums">{d.total}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-sky-600">{d.done + d.noShow ? `${Math.round((d.done / (d.done + d.noShow)) * 100)}%` : "—"}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">{d.done}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-amber-600">{d.noShow}</td>
                          <td className="py-2.5 text-right tabular-nums text-rose-600">{d.cancelled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Robust AI Executive Report Generator Container */}
              <div className="bg-gradient-to-br from-slate-950 via-[#011627] to-slate-900 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 relative overflow-hidden">

                {/* Card Header & Neural Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-gradient-to-br from-[#008ac9] to-sky-600 rounded-2xl text-white shadow-lg shadow-sky-500/20 shrink-0">
                      <Sparkles className="h-6 w-6 text-yellow-300 animate-spin-slow" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase tracking-wider border border-sky-400/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping"></span>
                        Isalu Medical AI Intelligence v3.2
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">
                        AI Executive Report & Audit Generator
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Live Neural Engine Connected
                    </span>
                  </div>
                </div>

                {/* Neural Synthesis Progress Indicator Bar (Active during generation) */}
                {isGeneratingAiReport && (
                  <div className="p-4 rounded-2xl bg-sky-950/80 border border-sky-500/40 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-extrabold text-sky-300">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                        {aiProcessingStep}
                      </span>
                      <span className="font-mono">{aiProcessingProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-sky-800">
                      <div
                        className="bg-gradient-to-r from-[#008ac9] via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-md"
                        style={{ width: `${aiProcessingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Categorized Analytical Presets Grid */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-sky-400" /> Select Quick Executive Synthesis Category:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { label: "Executive Board Summary", prompt: "Generate Full Executive Board Report", icon: Sparkles, color: "hover:border-sky-400 text-sky-300" },
                      { label: "Financial & HMO Risk Audit", prompt: "Financial Clearance & HMO Risk Audit", icon: CreditCard, color: "hover:border-emerald-400 text-emerald-300" },
                      { label: "Queue & Traffic Bottlenecks", prompt: "Analyze Department Workload & Queue Bottlenecks", icon: Activity, color: "hover:border-amber-400 text-amber-300" },
                      { label: "Specialist Staff & Roster", prompt: "Specialist Staff Roster & Shift Efficiency", icon: Users, color: "hover:border-purple-400 text-purple-300" },
                      { label: "Referral & EHR Health Audit", prompt: "Patient Health Referral & Document Audit", icon: FileText, color: "hover:border-teal-400 text-teal-300" },
                      { label: "Capacity & Growth Forecast", prompt: "Capacity & Growth Forecast", icon: TrendingUp, color: "hover:border-indigo-400 text-indigo-300" },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = aiPrompt === item.prompt;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setAiPrompt(item.prompt);
                            handleGenerateAiReport(item.prompt);
                          }}
                          className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer ${isSelected
                            ? "bg-[#008ac9] text-white border-sky-300 shadow-lg shadow-sky-500/20 font-black"
                            : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 font-bold"
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <IconComp className={`h-4 w-4 shrink-0 ${item.color}`} />
                            <span className="text-xs truncate">{item.label}</span>
                          </div>
                          <span className="text-[10px] opacity-60 font-mono">→</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Prompt Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGenerateAiReport();
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="text"
                    placeholder="Ask AI anything about queue times, HMO clearance rates, doctor load, revenue risks..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 p-3.5 rounded-2xl bg-slate-950/90 border-2 border-slate-700 text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:ring-[#008ac9] focus:outline-none shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingAiReport}
                    className="px-6 py-3.5 bg-gradient-to-r from-[#008ac9] to-sky-600 hover:from-[#0072b1] hover:to-sky-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
                  >
                    {isGeneratingAiReport ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-sky-200" /> Synthesizing Data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-yellow-300" /> Synthesize AI Report
                      </>
                    )}
                  </button>
                </form>

                {/* Rendered AI Report Box */}
                {generatedAiReport && (
                  <div className="bg-slate-950/95 border-2 border-sky-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-sky-400" />
                        <span className="text-xs font-black text-sky-300">
                          Synthesized AI Executive Report Output
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsAiReportModalOpen(true)}
                          className="px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all"
                          title="Open Report in Full Screen Modal"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Full Screen Mode
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedAiReport);
                            setCopiedAiReport(true);
                            setTimeout(() => setCopiedAiReport(false), 2000);
                          }}
                          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                        >
                          {copiedAiReport ? "✓ Copied!" : "📋 Copy Text"}
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadAiReportAsPdf(generatedAiReport, aiPrompt || "Executive Board Summary Report")}
                          className="px-3.5 py-1.5 bg-[#008ac9] hover:bg-[#0072b1] text-xs font-black rounded-xl text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Download className="h-3.5 w-3.5" /> Download (PDF)
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadAiReportAsExcel(generatedAiReport, aiPrompt || "Executive Board Summary Report")}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-black rounded-xl text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-200" /> Export (Excel)
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto p-4 bg-black/70 rounded-xl border border-slate-800 custom-scrollbar">
                      {generatedAiReport}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDesk === "disabled_bookings" && (
            <div className="space-y-6">
              <div className={`${isDarkMode ? 'bg-slate-900/80 border-sky-500/20' : 'bg-white/80 border-sky-100 shadow-xl'} backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Archived & Trashed Bookings</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Restore or permanently manage disabled appointment records.</p>
                  </div>
                </div>

                <div className="relative w-full sm:max-w-md mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="search" value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} placeholder="Search archived reference, patient or clinic..." className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4"><select value={archiveClinicFilter} onChange={(e) => setArchiveClinicFilter(e.target.value)} className={`px-3 py-2.5 rounded-xl border text-xs font-bold sm:max-w-xs ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}><option value="all">All Clinics / Specialties</option>{Array.from(new Set(bookings.filter((b: any) => b.isActive === false || b.is_active === false || b.status === "disabled" || b.disabled).map((b: any) => String(b.doctorSpecialty ?? b.doctor_specialty ?? b.department ?? b.deptName ?? b.clinic ?? "").trim()).filter(Boolean))).sort().map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}</select></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[10px] font-black uppercase tracking-wider`}>
                        <th className="py-3 px-4">Ref Code</th>
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">Clinic / Specialty</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'} text-xs`}>
                      {filteredArchiveBookings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                            No archived or trashed booking records found.
                          </td>
                        </tr>
                      ) : (
                        filteredArchiveBookings.slice((Math.min(archivePage, Math.max(1, Math.ceil(filteredArchiveBookings.length / archivePageSize))) - 1) * archivePageSize, Math.min(archivePage, Math.max(1, Math.ceil(filteredArchiveBookings.length / archivePageSize))) * archivePageSize).map((b) => {
                          const refCode = b.refCode || b.ref_code || "ISALU-ARCH";
                          return (
                            <tr key={refCode} className={`${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-red-500/5'} transition-colors`}>
                              <td className="py-4 px-4 font-mono font-bold text-red-400">{refCode}</td>
                              <td className="py-4 px-4 font-bold text-slate-700">{b.patientName || b.patient_name || "Patient"}</td>
                              <td className="py-4 px-4 text-slate-300">{b.doctorSpecialty || b.doctor_specialty || "Outpatient"}<span className="block text-[10px] text-slate-500">{b.date} · {b.deleteReason || b.delete_reason || "Disabled"}</span></td>
                              <td className="py-4 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                  Disabled / Trashed
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={async () => {
                                    const restored = await restoreBookingAPI(refCode);
                                    if (isApiError(restored) || !restored) {
                                      setToastAlert({ title: "Restore Failed", description: (restored as any)?.error || `Record ${refCode} could not be restored.`, type: "danger" });
                                      return;
                                    }
                                    await Promise.all([loadDisabledBookings(), fetchBookings()]);
                                    void fetchDashboardSummary();
                                    setToastAlert({ title: "Booking Restored ✓", description: `Record ${refCode} restored to active queue.`, type: "success" });
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30 text-xs flex items-center gap-1.5 ml-auto"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <TablePager testId="archive-pager" page={Math.min(archivePage, Math.max(1, Math.ceil(filteredArchiveBookings.length / archivePageSize)))} pageSize={archivePageSize}
                    total={filteredArchiveBookings.length} onPage={setArchivePage} onPageSize={setArchivePageSize} isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE SPECIALIST SCHEDULE MODAL */}
      {showCreateScheduleModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">Create Specialist Schedule</h3><p className="text-xs text-slate-500 mt-1">Assign a specialist, duty days, shift hours and daily capacity.</p></div>
              <button type="button" onClick={() => { if (!isSubmittingSchedule) setShowCreateScheduleModal(false); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            {schedFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{schedFormError}</div>}
            <form onSubmit={handleCreateSpecialistSchedule} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Assigned Specialist Doctor</label>
                  <input value={schedDoctorSearch} onChange={e => { setSchedDoctorSearch(e.target.value); setSchedDoctorId(""); }} placeholder="Search specialist doctor..." autoComplete="off" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold" required />
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {doctorsList.filter((d: any) => { const q = schedDoctorSearch.toLowerCase().trim(); return !q || schedDoctorId || String(d.name || "").toLowerCase().includes(q) || String(d.fullName || "").toLowerCase().includes(q) || String(d.acronym || "").toLowerCase().includes(q); }).slice(0, 8).map((d: any) => <button type="button" key={d.doc_id || d.id} onClick={() => { const id = d.doc_id || d.id; setSchedDoctorId(id); setSchedDoctorSearch(`${d.fullName || d.name || "Doctor"} (${d.acronym || getAcronymForIndex(doctorsList.indexOf(d))})`); }} className={`text-left px-3 py-2 rounded-xl border text-xs font-bold ${schedDoctorId === (d.doc_id || d.id) ? "border-sky-500 bg-sky-500/10" : "border-slate-200 dark:border-slate-800 hover:border-sky-400"}`}>{d.fullName || d.name} <span className="text-sky-500">({d.acronym || "Specialist"})</span></button>)}
                  </div>
                </div>
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Consultation Room / Suite</label><input value={schedRoom} onChange={e => setSchedRoom(e.target.value)} placeholder="e.g. Suite 4" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs" required /></div>
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Default Shift</label><select value={schedShiftTime} onChange={e => setSchedShiftTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">{shiftTimeOptions.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Duty Days</label><div className="flex flex-wrap gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <button type="button" key={day} onClick={() => handleToggleSchedDay(day)} className={`px-3 py-2 rounded-xl text-xs font-black border ${schedDutyDays.includes(day) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{day}</button>)}</div></div>
              <div className="space-y-3">{schedDutyDays.map(day => <div key={day} className="grid grid-cols-1 md:grid-cols-[90px_1fr_120px_auto] gap-2 items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800"><b className="text-xs">{day}</b><select value={schedDaySchedules[day]?.shiftTimes?.[0] || schedShiftTime} onChange={e => setSchedDaySchedules(p => ({ ...p, [day]: { ...(p[day] || {}), shiftTimes: [e.target.value], capacity: p[day]?.capacity || schedCapacity } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs">{shiftTimeOptions.map(t => <option key={t}>{t}</option>)}</select><input type="number" min="1" value={schedDaySchedules[day]?.capacity || schedCapacity} onChange={e => setSchedDaySchedules(p => ({ ...p, [day]: { ...(p[day] || {}), shiftTimes: p[day]?.shiftTimes || [schedShiftTime], capacity: Math.max(1, Number(e.target.value) || 1) } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs" /><span className="text-[10px] text-slate-400">visits/day</span></div>)}</div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800"><button type="button" onClick={() => setShowCreateScheduleModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" disabled={isSubmittingSchedule} className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60">{isSubmittingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}Create Schedule</button></div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SPECIFIC DATE / RECURRING SCHEDULE MODAL */}
      {showCreateSpecificDateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">Create Recurring Schedule</h3><p className="text-xs text-slate-500 mt-1">For specialists who run clinic on selected weeks of the month, e.g. the 1st &amp; 3rd Saturday.</p></div>
              <button type="button" onClick={() => { if (!isSubmittingSchedule) setShowCreateSpecificDateModal(false); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            {specDateFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{specDateFormError}</div>}
            <form onSubmit={handleCreateSpecificDateSchedule} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Assigned Specialist Doctor</label>
                <input value={specDateDoctorSearch} onChange={e => { setSpecDateDoctorSearch(e.target.value); setSpecDateDoctorId(""); }} placeholder="Search specialist doctor..." autoComplete="off" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold" required />
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {doctorsList.filter((d: any) => { const q = specDateDoctorSearch.toLowerCase().trim(); return !q || specDateDoctorId || String(d.name || "").toLowerCase().includes(q) || String(d.fullName || "").toLowerCase().includes(q) || String(d.acronym || "").toLowerCase().includes(q); }).slice(0, 8).map((d: any) => <button type="button" key={d.doc_id || d.id} onClick={() => { const id = d.doc_id || d.id; setSpecDateDoctorId(id); setSpecDateDoctorSearch(`${d.fullName || d.name || "Doctor"} (${d.acronym || getAcronymForIndex(doctorsList.indexOf(d))})`); }} className={`text-left px-3 py-2 rounded-xl border text-xs font-bold ${specDateDoctorId === (d.doc_id || d.id) ? "border-sky-500 bg-sky-500/10" : "border-slate-200 dark:border-slate-800 hover:border-sky-400"}`}>{d.fullName || d.name} <span className="text-sky-500">({d.acronym || "Specialist"})</span></button>)}
                  {doctorsList.length === 0 && <p className="text-[11px] text-slate-400">No registered doctors yet. Register a doctor first.</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Consultation Room / Suite</label><input value={specDateRoom} onChange={e => setSpecDateRoom(e.target.value)} placeholder="e.g. Weekend Clinic Suite" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs" required /></div>
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Default Shift</label><select value={specDateShiftTime} onChange={e => setSpecDateShiftTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">{!shiftTimeOptions.includes(specDateShiftTime) && <option value={specDateShiftTime}>{specDateShiftTime}</option>}{shiftTimeOptions.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-2">Default Capacity</label><input type="number" min="1" value={specDateCapacity} onChange={e => setSpecDateCapacity(Math.max(1, Number(e.target.value) || 1))} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Duty Days</label>
                <div className="flex flex-wrap gap-2">{WEEKDAY_SHORT_ORDER.map(day => <button type="button" key={day} onClick={() => toggleRecurDay(day)} className={`px-3 py-2 rounded-xl text-xs font-black border ${recurDays.includes(day) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{day}</button>)}</div>
              </div>
              <div className="space-y-3">
                {recurDays.length === 0 && <p className="text-[11px] text-slate-400">Select the days this specialist runs clinic, then choose which weeks of the month.</p>}
                {recurDays.map(day => {
                  const cfg = recurConfigs[day] || { shiftTimes: [specDateShiftTime], capacity: specDateCapacity, weeks: [] };
                  return (
                    <div key={day} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-[60px_1fr_110px_auto] gap-2 items-center">
                        <b className="text-xs">{day}</b>
                        <select value={cfg.shiftTimes?.[0] || specDateShiftTime} onChange={e => setRecurConfigs(p => ({ ...p, [day]: { ...cfg, shiftTimes: [e.target.value] } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs">{!shiftTimeOptions.includes(cfg.shiftTimes?.[0] || specDateShiftTime) && <option value={cfg.shiftTimes?.[0] || specDateShiftTime}>{cfg.shiftTimes?.[0] || specDateShiftTime}</option>}{shiftTimeOptions.map(t => <option key={t}>{t}</option>)}</select>
                        <input type="number" min="1" value={cfg.capacity} onChange={e => setRecurConfigs(p => ({ ...p, [day]: { ...cfg, capacity: Math.max(1, Number(e.target.value) || 1) } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs" />
                        <span className="text-[10px] text-slate-400">visits/day</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Weeks</span>
                        {[1, 2, 3, 4, 5].map(w => <button type="button" key={w} data-week={`${day}-${w}`} onClick={() => toggleRecurWeek(day, w)} className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${(cfg.weeks || []).includes(w) ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{ORDINAL_LABELS[w]}</button>)}
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-2">{(cfg.weeks || []).length ? describeWeeks(day, cfg.weeks) : "Select at least one week"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCreateSpecificDateModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmittingSchedule} className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60">{isSubmittingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}Create Recurring Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL / MOVE ONE CLINIC DATE */}
      {showChangeDateModal && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Cancel or Move a Clinic Date</h3>
                <p className="text-xs text-slate-500 mt-1">Applies to one date only. Booked patients are notified by SMS and email.</p>
              </div>
              <button type="button" onClick={() => { if (!chgSubmitting) setShowChangeDateModal(false); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            {chgResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border ${chgResult.action === "cancel" ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40" : "border-sky-300 bg-sky-50 dark:bg-sky-950/40"}`}>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {chgResult.action === "cancel"
                      ? `Clinic on ${formatLongDate(chgResult.originalDate)} cancelled.`
                      : `Clinic on ${formatLongDate(chgResult.originalDate)} moved to ${formatLongDate(chgResult.newDate)}.`}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {chgResult.affectedCount === 0
                      ? "No patients were booked, so no notifications were needed."
                      : ["pending", "sending"].includes(chgResult.notificationStatus)
                        ? `Notifying ${chgResult.affectedCount} patient(s) by SMS and email…`
                        : `${chgResult.notifiedCount} of ${chgResult.affectedCount} patient(s) notified${chgResult.notificationFailedCount ? `, ${chgResult.notificationFailedCount} could not be reached (retry from the Upcoming Changes list)` : "."}`}
                  </p>
                  {chgResult.action === "reschedule" && chgResult.affectedCount > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">Moved patients will get the usual automatic reminder 3 hours before the new clinic.</p>
                  )}
                </div>
                <div className="flex justify-end"><button type="button" onClick={() => setShowChangeDateModal(false)} className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black">Done</button></div>
              </div>
            ) : (
              <form onSubmit={handleSubmitDateChange} className="space-y-5">
                {chgError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{chgError}</div>}
                {notifyChannels && (!notifyChannels.email?.configured || !notifyChannels.sms?.configured) && (
                  <div data-testid="channel-warning" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    {!notifyChannels.sms?.configured && <p>SMS is not configured on the server, so patients will NOT be texted. Set EBULKSMS_USERNAME and EBULKSMS_API_KEY in backend/.env and restart.</p>}
                    {!notifyChannels.email?.configured && <p>Email is not configured (backend: {notifyChannels.email?.backend}), so patients will NOT be emailed. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in backend/.env and restart.</p>}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">1. Specialist Doctor</label>
                  <input value={chgDoctorSearch} onChange={e => { setChgDoctorSearch(e.target.value); setChgDoctorId(""); setChgClinicDates([]); setChgOriginalDate(""); setChgPreview(null); }} placeholder="Search specialist doctor..." autoComplete="off" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold" />
                  {!chgDoctorId && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {doctorsList.filter((d: any) => { const q = chgDoctorSearch.toLowerCase().trim(); return !q || String(d.fullName || d.name || "").toLowerCase().includes(q) || String(d.acronym || "").toLowerCase().includes(q); }).slice(0, 8).map((d: any) => (
                        <button type="button" key={d.doc_id || d.id} onClick={() => selectChangeDoctor(d)} className="text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 text-xs font-bold">{d.fullName || d.name} <span className="text-sky-500">({d.acronym || "Specialist"})</span></button>
                      ))}
                    </div>
                  )}
                </div>

                {chgDoctorId && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">2. Clinic Date to Change</label>
                    {chgLoadingDates ? <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading upcoming clinic dates…</p>
                      : chgClinicDates.length === 0 ? <p className="text-xs text-slate-400">No upcoming clinic dates for this doctor in the next 90 days.</p>
                        : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                            {chgClinicDates.map((d: any) => (
                              <button type="button" key={d.date} data-clinic-date={d.date} onClick={() => selectChangeDate(d.date)} className={`text-left px-3 py-2 rounded-xl border text-xs font-bold ${chgOriginalDate === d.date ? "border-amber-500 bg-amber-500/10" : "border-slate-200 dark:border-slate-800 hover:border-amber-400"}`}>
                                {formatLongDate(d.date).replace(/, \d{4}$/, "")}
                                <span className="block text-[10px] text-slate-500">{d.booked} booked · {d.timeWindow || "—"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                  </div>
                )}

                {chgPreview && (
                  <>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">{formatLongDate(chgPreview.date)} · {chgPreview.shift || "clinic"} · {chgPreview.affected_count} patient(s) booked</p>
                      {chgPreview.affected_count > 0 && (
                        <ul className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
                          {chgPreview.patients.map((p: any) => <li key={p.ref_code}>{p.patient_name} · {p.ref_code}</li>)}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-2">3. What should happen?</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={() => setChgAction("cancel")} className={`p-3 rounded-xl border text-left text-xs font-bold ${chgAction === "cancel" ? "border-rose-500 bg-rose-500/10" : "border-slate-200 dark:border-slate-800"}`}>Cancel this clinic<span className="block text-[10px] font-medium text-slate-500">Appointments are cancelled; patients are asked to rebook.</span></button>
                        <button type="button" onClick={() => setChgAction("reschedule")} className={`p-3 rounded-xl border text-left text-xs font-bold ${chgAction === "reschedule" ? "border-sky-500 bg-sky-500/10" : "border-slate-200 dark:border-slate-800"}`}>Move to another date<span className="block text-[10px] font-medium text-slate-500">Appointments move automatically, for this date only.</span></button>
                      </div>
                    </div>

                    {chgAction === "reschedule" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-2">New Date</label>
                          <input type="date" min={toLocalISODate(new Date())} value={chgNewDate} onChange={e => setChgNewDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs" />
                          {newDateProblem && <p className="text-[11px] text-rose-500 mt-1">{newDateProblem}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Clinic Hours on New Date</label>
                          <select value={chgShiftTime} onChange={e => setChgShiftTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                            {chgShiftTime && !shiftTimeOptions.includes(chgShiftTime) && <option value={chgShiftTime}>{chgShiftTime}</option>}
                            {shiftTimeOptions.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Reason (sent to patients)</label>
                      <textarea value={chgReason} onChange={e => setChgReason(e.target.value)} rows={2} maxLength={300} placeholder="e.g. Doctor attending a medical conference" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs" />
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {chgPreview.affected_count === 0
                        ? "No patients are booked on this date, so nobody will be notified."
                        : `${chgPreview.affected_count} patient(s) will receive an SMS${chgPreview.with_email ? ` and ${chgPreview.with_email} an email` : ""} as soon as you confirm.`}
                    </p>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setShowChangeDateModal(false)} disabled={chgSubmitting} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Close</button>
                  <button type="submit" disabled={chgSubmitting || !chgPreview || Boolean(newDateProblem)} className={`px-6 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-2 disabled:opacity-50 ${chgAction === "cancel" ? "bg-rose-600" : "bg-sky-600"}`}>
                    {chgSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {chgAction === "cancel" ? "Cancel Clinic & Notify Patients" : "Move Clinic & Notify Patients"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM SHIFT TIME MODAL */}
      {showCreateTimeModal && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-lg font-black text-slate-900 dark:text-white">Create Custom Shift Time</h3><button type="button" onClick={() => setShowCreateTimeModal(false)} className="p-2 text-slate-400"><X /></button></div>{timeFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{timeFormError}</div>}<form onSubmit={handleCreateCustomTime} className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 mb-2">Start Time</label><input type="text" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} className="w-full px-3 py-3 rounded-xl border bg-transparent text-xs" required /></div><div><label className="block text-xs font-bold text-slate-400 mb-2">End Time</label><input type="text" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} className="w-full px-3 py-3 rounded-xl border bg-transparent text-xs" required /></div></div><div><label className="block text-xs font-bold text-slate-400 mb-2">Shift Label</label><input value={customShiftLabel} onChange={e => setCustomShiftLabel(e.target.value)} placeholder="e.g. Weekend Clinic" className="w-full px-3 py-3 rounded-xl border bg-transparent text-xs" /></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateTimeModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black">Save Shift Time</button></div></form></div></div>
      )}

      {/* ADD SPECIALIST DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><div><h3 className="text-xl font-black text-slate-900 dark:text-white">Register Specialist Doctor</h3><p className="text-xs text-slate-500">Create the doctor record in the backend database.</p></div><button type="button" onClick={() => setShowAddDoctorModal(false)} className="p-2 text-slate-400"><X /></button></div>{newDocFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{newDocFormError}</div>}<form onSubmit={handleCreateNewDoctor} className="space-y-4"><div><label className="block text-xs font-bold text-slate-400 mb-2">Doctor Full Name</label><input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Adewale Olusola" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-400 mb-2">Specialty / Department</label><input list="doctor-specialties" value={newDocSpecialty} onChange={e => setNewDocSpecialty(e.target.value)} placeholder="e.g. Cardiology" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><datalist id="doctor-specialties">{clinics.map((c: any) => <option key={c.id || c.name} value={c.name} />)}</datalist></div><div><label className="block text-xs font-bold text-slate-400 mb-2">Consultation Room</label><input value={newDocRoom} onChange={e => setNewDocRoom(e.target.value)} placeholder="Consultation Suite" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" /></div></div><div><label className="block text-xs font-bold text-slate-400 mb-2">Qualifications</label><input value={newDocQualifications} onChange={e => setNewDocQualifications(e.target.value)} placeholder="MBBS, FWACS" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" /></div><div><label className="block text-xs font-bold text-slate-400 mb-2">Accepted Patient Types</label><div className="flex gap-2 flex-wrap">{["Private Self-Pay", "HMO Insurance"].map(type => <button type="button" key={type} onClick={() => setNewDocAcceptedTypes(p => p.includes(type) ? p.filter(x => x !== type) : [...p, type])} className={`px-3 py-2 rounded-xl border text-xs font-bold ${newDocAcceptedTypes.includes(type) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{type}</button>)}</div></div><div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800"><button type="button" onClick={() => setShowAddDoctorModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" disabled={isSubmittingDoctor} className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60">{isSubmittingDoctor && <Loader2 className="w-4 h-4 animate-spin" />}Register Doctor</button></div></form></div></div>
      )}

      {/* CREATE ROLE MODAL */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-xl font-black text-slate-900 dark:text-white">Create Custom Role</h3><button type="button" onClick={() => setShowCreateRoleModal(false)} className="p-2 text-slate-400"><X /></button></div>{roleFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{roleFormError}</div>}<form onSubmit={handleCreateRole} className="space-y-4"><input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><textarea value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Role description" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" rows={3} /><select value={newRolePrimaryDesk} onChange={e => setNewRolePrimaryDesk(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs"><option value="helpdesk">Helpdesk</option><option value="hmo">HMO Approval</option><option value="cashdesk">Cashdesk</option><option value="monitor">Monitor Room</option><option value="analytics">Analytics</option><option value="users">Users</option></select><div><p className="text-xs font-bold text-slate-400 mb-2">Allowed Desks</p><div className="flex flex-wrap gap-2">{["helpdesk", "hmo", "cashdesk", "monitor", "analytics", "users", "all_patients"].map(d => <button type="button" key={d} onClick={() => setNewRoleAllowedDesks(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${newRoleAllowedDesks.includes(d) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{d}</button>)}</div></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateRoleModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black">Create Role</button></div></form></div></div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Staff Account</h3><button type="button" onClick={() => setEditingUser(null)} className="p-2 text-slate-400"><X /></button></div>{editUserError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{editUserError}</div>}<form onSubmit={handleSaveEditUser} className="space-y-4"><input value={editUserName} onChange={e => setEditUserName(e.target.value)} placeholder="Staff name" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><input type="email" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs">{roles.map((r: any) => <option key={r.id || r.role_id || r.name} value={r.name}>{r.name}</option>)}<option value="Helpdesk Officer">Helpdesk Officer</option><option value="HMO Approval Officer">HMO Approval Officer</option><option value="Cashdesk Billing Officer">Cashdesk Billing Officer</option><option value="Monitor Room Operator">Monitor Room Operator</option></select><div className="relative"><input type={showEditPassword ? "text" : "password"} value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} placeholder="New password (optional)" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs pr-12" /><button type="button" onClick={() => setShowEditPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black">Save Changes</button></div></form></div></div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingRole && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Role</h3><button type="button" onClick={() => setEditingRole(null)} className="p-2 text-slate-400"><X /></button></div>{editRoleError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{editRoleError}</div>}<form onSubmit={handleSaveEditRole} className="space-y-4"><input value={editRoleName} onChange={e => setEditRoleName(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><textarea value={editRoleDescription} onChange={e => setEditRoleDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" rows={3} /><select value={editRolePrimaryDesk} onChange={e => setEditRolePrimaryDesk(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs"><option value="helpdesk">Helpdesk</option><option value="hmo">HMO Approval</option><option value="cashdesk">Cashdesk</option><option value="monitor">Monitor Room</option><option value="analytics">Analytics</option></select><div className="flex flex-wrap gap-2">{["helpdesk", "hmo", "cashdesk", "monitor", "analytics", "users", "all_patients"].map(d => <button type="button" key={d} onClick={() => setEditRoleAllowedDesks(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${editRoleAllowedDesks.includes(d) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{d}</button>)}</div><div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black">Save Role</button></div></form></div></div>
      )}

      {/* EDIT SCHEDULE MODAL */}
      {editingSchedule && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><div><h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Specialist Schedule</h3><p className="text-xs text-slate-500">{editingSchedule.doctorName || editingSchedule.doctor_name || "Specialist"}</p></div><button type="button" onClick={() => setEditingSchedule(null)} className="p-2 text-slate-400"><X /></button></div>{editFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{editFormError}</div>}<form onSubmit={handleSaveEditSchedule} className="space-y-4"><input value={editRoom} onChange={e => setEditRoom(e.target.value)} placeholder="Consultation room" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><div className="flex flex-wrap gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <button type="button" key={day} onClick={() => { if (editDutyDays.includes(day)) { setEditDutyDays(p => p.filter(x => x !== day)); setEditDaySchedules(p => { const n = { ...p }; delete n[day]; return n; }); } else { setEditDutyDays(p => [...p, day]); setEditDaySchedules(p => ({ ...p, [day]: { shiftTimes: [editShiftTime || shiftTimeOptions[0]], capacity: editCapacity } })); } }} className={`px-3 py-2 rounded-xl border text-xs font-bold ${editDutyDays.includes(day) ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{day}</button>)}</div><div className="space-y-2">{editDutyDays.map(day => <div key={day} className="space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800"><div key={day} className="grid grid-cols-[110px_1fr_100px] gap-2 items-center"><b className="text-xs">{describeDutyKey(day, editDaySchedules[day])}</b><select value={editDaySchedules[day]?.shiftTimes?.[0] || editShiftTime} onChange={e => setEditDaySchedules(p => ({ ...p, [day]: { ...(p[day] || {}), capacity: p[day]?.capacity || editCapacity, shiftTimes: [e.target.value] } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs">{shiftTimeOptions.map(t => <option key={t}>{t}</option>)}</select><input type="number" min="1" value={editDaySchedules[day]?.capacity || editCapacity} onChange={e => setEditDaySchedules(p => ({ ...p, [day]: { ...(p[day] || {}), shiftTimes: p[day]?.shiftTimes || [editShiftTime], capacity: Math.max(1, Number(e.target.value) || 1) } }))} className="px-3 py-2 rounded-lg border bg-transparent text-xs" /></div>{WEEKDAY_SHORT_ORDER.includes(day) && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Weeks</span>{[1, 2, 3, 4, 5].map(w => <button type="button" key={w} onClick={() => setEditDaySchedules(p => { const cfg = p[day] || { shiftTimes: [editShiftTime], capacity: editCapacity }; const cur = cfg.weeks || []; const weeks = cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w].sort(); return { ...p, [day]: { ...cfg, weeks } }; })} className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${(editDaySchedules[day]?.weeks || []).includes(w) ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}>{ORDINAL_LABELS[w]}</button>)}<span className="text-[10px] font-bold text-emerald-600 ml-1">{describeWeeks(day, editDaySchedules[day]?.weeks)}</span></div>}</div>)}</div><div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingSchedule(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" disabled={isSavingSchedule} className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60">{isSavingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}Save Schedule</button></div></form></div></div>
      )}

      {/* EDIT HMO PROVIDER MODAL */}
      {showEditHmoModal && editingHmoItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"><div className="flex justify-between items-center mb-5"><h3 className="text-xl font-black text-slate-900 dark:text-white">Edit HMO Provider</h3><button type="button" onClick={() => setShowEditHmoModal(false)} className="p-2 text-slate-400"><X /></button></div>{hmoFormError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">{hmoFormError}</div>}<form onSubmit={handleSaveEditHmoCompany} className="space-y-4"><input value={hmoCompanyName} onChange={e => setHmoCompanyName(e.target.value)} placeholder="Company name" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><input value={hmoCompanyCode} onChange={e => setHmoCompanyCode(e.target.value)} placeholder="Provider code" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" /><input type="email" value={hmoCompanyEmail} onChange={e => setHmoCompanyEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><input value={hmoCompanyPhone} onChange={e => setHmoCompanyPhone(e.target.value)} placeholder="Phone" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required /><input value={hmoCompanyContact} onChange={e => setHmoCompanyContact(e.target.value)} placeholder="Contact person" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" /><select value={hmoCompanyStatus} onChange={e => setHmoCompanyStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs"><option>Active Partner</option><option>Disabled</option></select><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowEditHmoModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button><button type="submit" disabled={isSubmittingHmoCompany} className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2">{isSubmittingHmoCompany && <Loader2 className="w-4 h-4 animate-spin" />}Save Provider</button></div></form></div></div>
      )}

      {/* Add Staff User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`${isDarkMode ? 'bg-slate-900 border-sky-500/30 text-white' : 'bg-white border-sky-200 text-slate-900'} border rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200`}>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight mb-2`}>Create Staff Account</h3>
            <p className="text-xs text-slate-400 mb-6">Register a new staff member with dedicated desk permissions.</p>

            {userFormError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {userFormError}
              </div>
            )}

            <form onSubmit={handleAddSystemUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Staff Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Nurse Folake Adebayo"
                  className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 text-xs focus:outline-none`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address / Username</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. folake@isaluhospitals.com"
                  className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 text-xs focus:outline-none`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Assigned Role & Desk</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 text-xs font-bold focus:outline-none`}
                >
                  <option value="Helpdesk Officer">Helpdesk Officer</option>
                  <option value="HMO Approval Officer">HMO Approval Officer</option>
                  <option value="Cashdesk Billing Officer">Cashdesk Billing Officer</option>
                  <option value="Monitor Room Operator">Monitor Room Operator</option>
                  <option value="Queue Analytics Officer">Queue Analytics Officer</option>
                  <option value="Hospital Administrator">Hospital Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Secure Password</label>
                <div className="relative">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Enter staff security password"
                    className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 pr-12 text-xs focus:outline-none`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showNewUserConfirmPassword ? "text" : "password"}
                    value={newUserConfirmPassword}
                    onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm"
                    className={`w-full ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 pr-12 text-xs focus:outline-none`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewUserConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2"
                >
                  {isCreatingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CLINIC DIALOGS (moved out of the Analytics desk so they open on the Clinic desk) */}
      {/* CREATE NEW CLINIC MODAL DIALOG */}
      {showCreateClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Create New Clinic / Department</h3>
                  <p className="text-xs font-semibold text-slate-500">Register a new medical clinic module in Isalu Hospitals.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateClinicModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {clinicFormError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{clinicFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClinic} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Clinic / Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neurology & Brain Care Clinic"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Clinic ID / Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. neurology"
                    value={newClinicId}
                    onChange={(e) => setNewClinicId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Operational Status
                  </label>
                  <select
                    value={newClinicStatus}
                    onChange={(e) => setNewClinicStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  >
                    <option value="Active">Active ✓</option>
                    <option value="Maintenance">Under Maintenance 🛠️</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Hospital Location / Suite Wing
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Hospital Building - West Wing Floor 2"
                  value={newClinicLocation}
                  onChange={(e) => setNewClinicLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Description & Medical Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe medical services, specialists, and conditions treated at this clinic..."
                  value={newClinicDescription}
                  onChange={(e) => setNewClinicDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateClinicModal(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Create Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                  <Pencil className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Clinic Details</h3>
                  <p className="text-xs font-semibold text-slate-500">Update module details for {editingClinic.name}.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingClinic(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {editClinicFormError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editClinicFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditClinic} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Clinic / Department Name
                </label>
                <input
                  type="text"
                  required
                  value={editClinicName}
                  onChange={(e) => setEditClinicName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Location Wing
                  </label>
                  <input
                    type="text"
                    value={editClinicLocation}
                    onChange={(e) => setEditClinicLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Operational Status
                  </label>
                  <select
                    value={editClinicStatus}
                    onChange={(e) => setEditClinicStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  >
                    <option value="Active">Active ✓</option>
                    <option value="Maintenance">Under Maintenance 🛠️</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Description & Medical Scope
                </label>
                <textarea
                  rows={3}
                  value={editClinicDescription}
                  onChange={(e) => setEditClinicDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClinic(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-1.5"
                >
                  <Pencil className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (state existed but was never rendered) */}
      {confirmModalConfig.isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{confirmModalConfig.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{confirmModalConfig.message}</p>
            {confirmModalError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{confirmModalError}</div>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={isConfirming} onClick={closeConfirmModal} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-60">{confirmModalConfig.cancelText}</button>
              <button type="button" disabled={isConfirming} onClick={runConfirmAction} className={`px-5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-2 disabled:opacity-60 ${confirmModalConfig.variant === "danger" ? "bg-rose-600" : confirmModalConfig.variant === "warning" ? "bg-amber-600" : "bg-sky-600"}`}>
                {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}{confirmModalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL (super admin) */}
      {editingBooking && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Booking</h3><p className="text-xs text-slate-500">{editingBooking.refCode || editingBooking.ref_code} · {editingBooking.doctorName || editingBooking.doctor_name}</p></div>
              <button type="button" onClick={() => { if (!isSavingBooking) setEditingBooking(null); }} className="p-2 text-slate-400"><X /></button>
            </div>
            {editBookingError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">{editBookingError}</div>}
            <form onSubmit={handleSaveEditBooking} className="space-y-3">
              <input value={editBookingForm.patientName} onChange={e => setEditBookingForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Patient name" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={editBookingForm.patientPhone} onChange={e => setEditBookingForm(f => ({ ...f, patientPhone: e.target.value }))} placeholder="Phone" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required />
                <input type="email" value={editBookingForm.patientEmail} onChange={e => setEditBookingForm(f => ({ ...f, patientEmail: e.target.value }))} placeholder="Email (optional)" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" />
                <input type="date" value={editBookingForm.date} onChange={e => setEditBookingForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required />
                <input value={editBookingForm.time} onChange={e => setEditBookingForm(f => ({ ...f, time: e.target.value }))} placeholder="e.g. 10:30 AM" className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" required />
              </div>
              <select value={editBookingForm.status} onChange={e => setEditBookingForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs">
                {["Pending", "Confirmed", "Checked In", "Completed", "Cancelled"].map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <textarea value={editBookingForm.reason} onChange={e => setEditBookingForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for visit" rows={3} className="w-full px-4 py-3 rounded-xl border bg-transparent text-xs" />
              <p className="text-[10px] text-slate-400">Changing the date or time re-checks the doctor's duty days and daily capacity.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingBooking(null)} disabled={isSavingBooking} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSavingBooking} className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-60">{isSavingBooking && <Loader2 className="w-4 h-4 animate-spin" />}Save Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
