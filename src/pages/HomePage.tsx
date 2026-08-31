import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { DEPARTMENTS, DOCTORS } from "../data/doctors";
import { getDepartmentsAPI, getDoctorsAPI, getHmoCompaniesAPI, getSchedulesAPI } from "../api/client";
import {
  Stethoscope,
  HeartPulse,
  Baby,
  Brain,
  Bone,
  Sparkles,
  Eye,
  Activity,
  ShieldCheck,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
  Award,
  CalendarCheck,
  Calendar,
  Quote,
  Building,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Users,
  RefreshCw,
  Heart,
  Wind,
  Ear,
  Droplets,
  Droplet,
  Apple,
  Dumbbell,
  Smile,
  Scissors,
  Ribbon,
  Syringe,
  Lock,
  AlertTriangle,
  Building2,
  Search,
} from "lucide-react";

const getHmoBrandStyles = (nameStr: string) => {
  const n = (nameStr || "").toLowerCase().trim();

  const words = nameStr.trim().split(/\s+/).filter((w) => w.toLowerCase() !== "hmo" && w.toLowerCase() !== "health" && w.toLowerCase() !== "limited" && w.toLowerCase() !== "ltd");
  let initials = "";
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].substring(0, 3).toUpperCase();
  } else {
    initials = nameStr.substring(0, 2).toUpperCase();
  }

  if (n.includes("hygeia")) {
    return {
      bg: "bg-teal-50/90 dark:bg-teal-950/40",
      border: "border-teal-300 dark:border-teal-700/60",
      text: "text-teal-950 dark:text-teal-100",
      glow: "from-teal-500/25 via-emerald-500/10 to-transparent",
      badgeBg: "bg-teal-600 text-white shadow-teal-500/30",
      accent: "text-teal-700 dark:text-teal-300",
      initials: "HYG",
      logoGradient: "from-teal-600 via-emerald-600 to-teal-800",
    };
  }
  if (n.includes("axa") || n.includes("mansard")) {
    return {
      bg: "bg-blue-50/90 dark:bg-blue-950/40",
      border: "border-blue-300 dark:border-blue-700/60",
      text: "text-blue-950 dark:text-blue-100",
      glow: "from-blue-600/25 via-indigo-500/10 to-transparent",
      badgeBg: "bg-blue-600 text-white shadow-blue-500/30",
      accent: "text-blue-700 dark:text-blue-300",
      initials: "AXA",
      logoGradient: "from-blue-600 via-blue-700 to-indigo-900",
    };
  }
  if (n.includes("reliance")) {
    return {
      bg: "bg-sky-50/90 dark:bg-sky-950/40",
      border: "border-sky-300 dark:border-sky-700/60",
      text: "text-sky-950 dark:text-sky-100",
      glow: "from-[#008ac9]/25 via-sky-400/10 to-transparent",
      badgeBg: "bg-[#008ac9] text-white shadow-[#008ac9]/30",
      accent: "text-[#008ac9] dark:text-sky-300",
      initials: "RLN",
      logoGradient: "from-[#008ac9] via-cyan-600 to-sky-800",
    };
  }
  if (n.includes("avon")) {
    return {
      bg: "bg-rose-50/90 dark:bg-rose-950/40",
      border: "border-rose-300 dark:border-rose-700/60",
      text: "text-rose-950 dark:text-rose-100",
      glow: "from-rose-500/25 via-pink-500/10 to-transparent",
      badgeBg: "bg-rose-600 text-white shadow-rose-500/30",
      accent: "text-rose-700 dark:text-rose-300",
      initials: "AVN",
      logoGradient: "from-rose-600 via-pink-600 to-rose-800",
    };
  }
  if (n.includes("leadway")) {
    return {
      bg: "bg-amber-50/90 dark:bg-amber-950/40",
      border: "border-amber-300 dark:border-amber-700/60",
      text: "text-amber-950 dark:text-amber-100",
      glow: "from-amber-500/25 via-yellow-500/10 to-transparent",
      badgeBg: "bg-amber-600 text-white shadow-amber-500/30",
      accent: "text-amber-800 dark:text-amber-300",
      initials: "LWD",
      logoGradient: "from-amber-600 via-yellow-600 to-orange-700",
    };
  }
  if (n.includes("clearline")) {
    return {
      bg: "bg-indigo-50/90 dark:bg-indigo-950/40",
      border: "border-indigo-300 dark:border-indigo-700/60",
      text: "text-indigo-950 dark:text-indigo-100",
      glow: "from-indigo-500/25 via-purple-500/10 to-transparent",
      badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30",
      accent: "text-indigo-700 dark:text-indigo-300",
      initials: "CLR",
      logoGradient: "from-indigo-600 via-purple-600 to-indigo-800",
    };
  }
  if (n.includes("total health") || n.includes("tht")) {
    return {
      bg: "bg-emerald-50/90 dark:bg-emerald-950/40",
      border: "border-emerald-300 dark:border-emerald-700/60",
      text: "text-emerald-950 dark:text-emerald-100",
      glow: "from-emerald-600/25 via-teal-500/10 to-transparent",
      badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30",
      accent: "text-emerald-700 dark:text-emerald-300",
      initials: "THT",
      logoGradient: "from-emerald-600 via-teal-600 to-emerald-800",
    };
  }
  if (n.includes("redcare")) {
    return {
      bg: "bg-red-50/90 dark:bg-red-950/40",
      border: "border-red-300 dark:border-red-700/60",
      text: "text-red-950 dark:text-red-100",
      glow: "from-red-500/25 via-rose-500/10 to-transparent",
      badgeBg: "bg-red-600 text-white shadow-red-500/30",
      accent: "text-red-700 dark:text-red-300",
      initials: "RDC",
      logoGradient: "from-red-600 via-rose-600 to-red-800",
    };
  }

  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: "bg-sky-50/90 dark:bg-sky-950/40", border: "border-sky-300 dark:border-sky-700/60", text: "text-sky-950 dark:text-sky-100", glow: "from-sky-500/25 via-blue-500/10 to-transparent", badgeBg: "bg-sky-600 text-white shadow-sky-500/30", accent: "text-sky-700 dark:text-sky-300", logoGradient: "from-sky-600 to-blue-700" },
    { bg: "bg-indigo-50/90 dark:bg-indigo-950/40", border: "border-indigo-300 dark:border-indigo-700/60", text: "text-indigo-950 dark:text-indigo-100", glow: "from-indigo-500/25 via-purple-500/10 to-transparent", badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30", accent: "text-indigo-700 dark:text-indigo-300", logoGradient: "from-indigo-600 to-purple-700" },
    { bg: "bg-emerald-50/90 dark:bg-emerald-950/40", border: "border-emerald-300 dark:border-emerald-700/60", text: "text-emerald-950 dark:text-emerald-100", glow: "from-emerald-500/25 via-teal-500/10 to-transparent", badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30", accent: "text-emerald-700 dark:text-emerald-300", logoGradient: "from-emerald-600 to-teal-700" },
    { bg: "bg-teal-50/90 dark:bg-teal-950/40", border: "border-teal-300 dark:border-teal-700/60", text: "text-teal-950 dark:text-teal-100", glow: "from-teal-500/25 via-cyan-500/10 to-transparent", badgeBg: "bg-teal-600 text-white shadow-teal-500/30", accent: "text-teal-700 dark:text-teal-300", logoGradient: "from-teal-600 to-cyan-700" },
    { bg: "bg-purple-50/90 dark:bg-purple-950/40", border: "border-purple-300 dark:border-purple-700/60", text: "text-purple-950 dark:text-purple-100", glow: "from-purple-500/25 via-pink-500/10 to-transparent", badgeBg: "bg-purple-600 text-white shadow-purple-500/30", accent: "text-purple-700 dark:text-purple-300", logoGradient: "from-purple-600 to-pink-700" },
    { bg: "bg-rose-50/90 dark:bg-rose-950/40", border: "border-rose-300 dark:border-rose-700/60", text: "text-rose-950 dark:text-rose-100", glow: "from-rose-500/25 via-amber-500/10 to-transparent", badgeBg: "bg-rose-600 text-white shadow-rose-500/30", accent: "text-rose-700 dark:text-rose-300", logoGradient: "from-rose-600 to-red-700" },
    { bg: "bg-amber-50/90 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-700/60", text: "text-amber-950 dark:text-amber-100", glow: "from-amber-500/25 via-orange-500/10 to-transparent", badgeBg: "bg-amber-600 text-white shadow-amber-500/30", accent: "text-amber-800 dark:text-amber-300", logoGradient: "from-amber-600 to-orange-700" },
    { bg: "bg-blue-50/90 dark:bg-blue-950/40", border: "border-blue-300 dark:border-blue-700/60", text: "text-blue-950 dark:text-blue-100", glow: "from-blue-500/25 via-sky-500/10 to-transparent", badgeBg: "bg-blue-600 text-white shadow-blue-500/30", accent: "text-blue-700 dark:text-blue-300", logoGradient: "from-blue-600 to-sky-700" },
  ];

  const p = palettes[Math.abs(hash) % palettes.length];
  return {
    ...p,
    initials,
  };
};

export function HmoCarousel({ partners }: { partners: any[] }) {
  const [viewMode, setViewMode] = useState<"marquee" | "grid">("grid");
  const [speed, setSpeed] = useState<"slow" | "medium" | "fast">("slow");
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const itemsPerPage = 12;

  if (!partners || partners.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10 px-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3 shadow-lg">
        <div className="p-4 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] w-16 h-16 mx-auto flex items-center justify-center font-black">
          <ShieldCheck className="h-8 w-8 text-[#008ac9]" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Accredited HMO Partners Directory</h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Isalu Hospitals accepts all accredited HMO insurance providers across Nigeria for seamless cashless consultations and treatments.
        </p>
      </div>
    );
  }

  // Pre-process HMO items into standardized display objects & filter out disabled partners
  const formattedPartners = partners
    .filter((hmo) => {
      if (!hmo) return false;
      if (typeof hmo === "string") return true;
      const statusStr = String(hmo.status || "").toLowerCase().trim();
      const isActive = hmo.is_active !== false && hmo.isActive !== false;
      if (statusStr.includes("disable") || statusStr.includes("inactive") || !isActive) {
        return false;
      }
      return true;
    })
    .map((hmo, idx) => {
      const name = typeof hmo === "string" ? hmo : hmo.name || "Accredited HMO Provider";
      const code = typeof hmo === "string" ? `HMO-${hmo.substring(0, 3).toUpperCase()}-${100 + (idx % 900)}` : hmo.code || hmo.hmo_id || `HMO-${name.substring(0, 3).toUpperCase()}-${100 + (idx % 900)}`;
      const brand = getHmoBrandStyles(name);

      return {
        id: typeof hmo === "string" ? `hmo-str-${idx}` : hmo.id || hmo.hmo_id || `hmo-${idx}`,
        name,
        code,
        email: typeof hmo === "object" ? hmo.email || hmo.email_address : undefined,
        phone: typeof hmo === "object" ? hmo.phone || hmo.phone_number : undefined,
        contactPerson: typeof hmo === "object" ? hmo.contactPerson || hmo.contact_person : undefined,
        brand,
      };
    });

  const filteredPartners = formattedPartners.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage) || 1;
  const paginatedGridItems = filteredPartners.slice((gridPage - 1) * itemsPerPage, gridPage * itemsPerPage);

  const marqueeSpeedClass = speed === "slow" ? "animate-marquee-slow" : speed === "medium" ? "animate-marquee-medium" : "animate-marquee-fast";

  return (
    <div className="relative max-w-7xl mx-auto px-4 space-y-6">

      {/* VIEW MODE 1: GLIDING MARQUEE CAROUSEL */}
      {viewMode === "marquee" && (
        <div className="relative overflow-hidden py-4 rounded-3xl">
          {/* Edge Gradient Mask Fades */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

          <div className={`${marqueeSpeedClass} gap-6 ${isPaused ? "[animation-play-state:paused]" : ""}`}>
            {[...formattedPartners, ...formattedPartners, ...formattedPartners].map((hmo, idx) => (
              <div
                key={`${hmo.name}-${idx}`}
                className="w-72 sm:w-80 flex-shrink-0 transform transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03]"
              >
                <div
                  className={`${hmo.brand.bg} ${hmo.brand.border} border-2 rounded-3xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between items-center text-center h-full group relative overflow-hidden`}
                >
                  <div className={`absolute -right-8 -bottom-8 w-28 h-28 bg-gradient-to-br ${hmo.brand.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

                  <div className="flex flex-col items-center space-y-3 z-10 w-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${hmo.brand.logoGradient} text-white font-black text-sm shadow-md flex items-center justify-center border-2 border-white/40 dark:border-slate-800 tracking-wider group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                      {hmo.brand.initials}
                    </div>

                    <h3 className={`font-black text-lg ${hmo.brand.text}`}>{hmo.name}</h3>
                    <code className={`text-[11px] font-black px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border ${hmo.brand.border} ${hmo.brand.accent} shadow-sm`}>
                      {hmo.code}
                    </code>
                  </div>
                  <div className="mt-5 pt-3 border-t-2 border-slate-200/60 dark:border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400 z-10">
                    <CheckCircle className="h-4 w-4 text-emerald-600" /> Cashless Pre-Auth Accepted
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: INTERACTIVE SEARCH & GRID VIEW FOR 50-100+ HMOs */}
      {viewMode === "grid" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search HMO partner name or code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setGridPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
              />
            </div>

            <span className="text-xs font-black text-[#008ac9]">
              Showing {filteredPartners.length} Accredited Partners
            </span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {paginatedGridItems.map((hmo) => (
              <div
                key={hmo.id}
                className={`${hmo.brand.bg} ${hmo.brand.border} border-2 rounded-3xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between items-center text-center group relative overflow-hidden`}
              >
                {/* Ambient Glow Aura */}
                <div className={`absolute -right-8 -bottom-8 w-28 h-28 bg-gradient-to-br ${hmo.brand.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

                <div className="flex flex-col items-center space-y-2.5 z-10 w-full">
                  {/* Brand Logo Avatar Badge */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${hmo.brand.logoGradient} text-white font-black text-sm shadow-md flex items-center justify-center border-2 border-white/40 dark:border-slate-800 tracking-wider group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                    {hmo.brand.initials}
                  </div>

                  <h4 className={`font-black text-base leading-snug ${hmo.brand.text}`}>{hmo.name}</h4>
                  <code className={`text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 border ${hmo.brand.border} ${hmo.brand.accent} shadow-sm`}>
                    {hmo.code}
                  </code>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 z-10">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Cashless Pre-Auth
                </div>
              </div>
            ))}
          </div>

          {/* Grid Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={gridPage === 1}
                onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-3">
                Page {gridPage} of {totalPages}
              </span>
              <button
                disabled={gridPage === totalPages}
                onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (window.location.hash === "#specialized-medical-centers") {
      setTimeout(() => {
        const elem = document.getElementById("specialized-medical-centers");
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [location.hash]);
  const [departmentsList, setDepartmentsList] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hospitals_departments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEPARTMENTS;
  });
  const [allDoctors, setAllDoctors] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hospital_doctors");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DOCTORS;
  });
  const [schedulesList, setSchedulesList] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_specialist_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const cleanShiftTimeStr = (rawShift: string): string => {
    if (!rawShift) return "08:00 AM – 02:00 PM";
    let clean = String(rawShift).trim();
    const match = clean.match(/\d{1,2}:\d{2}\s*(?:AM|PM)\s*–\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
    if (match) return match[0];

    clean = clean.replace(/^[A-Za-z]{3,9}:\s*/, "");
    clean = clean.replace(/\s*\(\d+\s*visits\)$/i, "");
    return clean.trim() || "08:00 AM – 02:00 PM";
  };

  const getNextAvailableClinicDateAndTimeForDept = (deptId: string, deptName: string) => {
    // 1. Filter doctors belonging strictly to this department
    const deptDocs = allDoctors.filter((doc) => {
      let rawDeptId = "";
      if (typeof doc.department === "string") rawDeptId = doc.department;
      else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
      if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
      if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

      const cleanDocDept = String(rawDeptId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanDeptId = String(deptId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanDeptName = String(deptName).toLowerCase().replace(/[^a-z0-9]/g, "");

      return cleanDocDept === cleanDeptId || cleanDocDept === cleanDeptName;
    });

    if (deptDocs.length === 0) return null;

    const now = new Date();

    // 2. Loop through upcoming 14 days starting from today (day 0)
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const dayNameLong = targetDate.toLocaleDateString("en-US", { weekday: "long" });
      const dayShort = targetDate.toLocaleDateString("en-US", { weekday: "short" });
      const monthShort = targetDate.toLocaleDateString("en-US", { month: "short" });
      const dayNum = targetDate.getDate();

      // Check each doctor in this department
      for (const doc of deptDocs) {
        if (doc.status === false || doc.status === 0 || doc.status === "0" || doc.status === "false") {
          continue;
        }

        // Find matching active schedule for doctor from DB schedulesList
        const docSched = schedulesList.find((s) => {
          if (s.status === false || s.status === 0 || s.status === "0" || s.status === "false" || s.status === "Inactive") {
            return false;
          }
          const sDocId = String(s.doctorId || s.doctor_id || s.doctor?.doc_id || s.doctor?.id || s.doctor || "").toLowerCase().trim();
          const sDocName = String(s.doctorName || s.doctor_name || s.doctor?.full_name || s.doctor?.name || "").toLowerCase().trim();
          
          const dId = String(doc.id || doc.doc_id || "").toLowerCase().trim();
          const dName = String(doc.fullName || doc.name || "").toLowerCase().trim();
          const dAcro = String(doc.acronym || "").toLowerCase().trim();

          if (sDocId && dId && (sDocId === dId || sDocId === dName)) return true;
          if (sDocName && dName && (sDocName === dName || sDocName === dAcro)) return true;
          return false;
        });

        let dutyDays: string[] = [];
        let shiftTime = "";

        if (docSched) {
          if (docSched.dutyDays && Array.isArray(docSched.dutyDays) && docSched.dutyDays.length > 0) {
            dutyDays = docSched.dutyDays;
          } else if (docSched.duty_days && Array.isArray(docSched.duty_days) && docSched.duty_days.length > 0) {
            dutyDays = docSched.duty_days;
          }

          // Look up day-specific shift in dayConfigs (checking both dayShort and dayNameLong)
          if (docSched.dayConfigs) {
            const dayCfg = docSched.dayConfigs[dayShort] || docSched.dayConfigs[dayNameLong];
            if (dayCfg) {
              if (dayCfg.shiftTimes && Array.isArray(dayCfg.shiftTimes) && dayCfg.shiftTimes.length > 0) {
                shiftTime = cleanShiftTimeStr(dayCfg.shiftTimes.join(", "));
              } else if (dayCfg.shiftTime) {
                shiftTime = cleanShiftTimeStr(dayCfg.shiftTime);
              }
            }
          }

          if (!shiftTime && (docSched.shiftTime || docSched.shift_time)) {
            const raw = docSched.shiftTime || docSched.shift_time;
            const parts = String(raw).split("|").map((p: string) => p.trim());
            const dayPart = parts.find((p: string) => 
              p.toLowerCase().includes(dayShort.toLowerCase()) || p.toLowerCase().includes(dayNameLong.toLowerCase())
            );
            if (dayPart) {
              shiftTime = cleanShiftTimeStr(dayPart);
            } else {
              shiftTime = cleanShiftTimeStr(parts[0]);
            }
          }
        }

        // If doctor has no SpecialistSchedule record in DB, check doc.availableDays from DB
        if (dutyDays.length === 0) {
          if (doc.availableDays && Array.isArray(doc.availableDays) && doc.availableDays.length > 0) {
            dutyDays = doc.availableDays;
          } else if (doc.availability && Array.isArray(doc.availability) && doc.availability.length > 0) {
            dutyDays = doc.availability;
          }
        }

        // Strictly skip doctor if they have no active duty days in DB
        if (dutyDays.length === 0) {
          continue;
        }

        if (!shiftTime) {
          if (doc.timeSlots && Array.isArray(doc.timeSlots) && doc.timeSlots.length > 0) {
            shiftTime = cleanShiftTimeStr(doc.timeSlots[0]);
          } else {
            shiftTime = "08:00 AM – 02:00 PM";
          }
        }

        // Match duty days against BOTH dayShort ("Mon", "Tue") and dayNameLong ("Monday", "Tuesday")
        const isAvailableOnDay = dutyDays.some((d) => {
          const cleanD = String(d).toLowerCase().trim();
          const cleanLong = dayNameLong.toLowerCase().trim();
          const cleanShort = dayShort.toLowerCase().trim();
          return cleanD === cleanLong || cleanD === cleanShort || cleanLong.startsWith(cleanD) || cleanD.startsWith(cleanShort);
        });

        if (isAvailableOnDay) {
          // If target day is TODAY (dayOffset === 0), verify 30-minute cutoff
          if (dayOffset === 0) {
            const match = shiftTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              let hour = parseInt(match[1], 10);
              const minute = parseInt(match[2], 10);
              const ampm = match[3] ? match[3].toUpperCase() : null;
              if (ampm === "PM" && hour < 12) hour += 12;
              else if (ampm === "AM" && hour === 12) hour = 0;

              const clinicStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
              const timeDiffMinutes = (clinicStart.getTime() - now.getTime()) / (1000 * 60);
              if (timeDiffMinutes < 30) {
                // Cutoff reached for today, continue checking future days
                continue;
              }
            }
          }

          let dateLabel = `${dayShort}, ${monthShort} ${dayNum}`;
          if (dayOffset === 0) dateLabel = `Today (${dayShort}, ${monthShort} ${dayNum})`;
          else if (dayOffset === 1) dateLabel = `Tomorrow (${dayShort}, ${monthShort} ${dayNum})`;

          return {
            dateLabel,
            timeLabel: shiftTime,
            doctorName: doc.fullName || doc.name,
            doctorAcronym: doc.acronym || doc.name,
          };
        }
      }
    }

    return { dateLabel: "Mon – Fri Duty", timeLabel: "08:00 AM – 02:00 PM", doctorName: "", doctorAcronym: "" };
  };

  useEffect(() => {
    async function syncData() {
      // 1. Fetch departments immediately for instant UI load
      getDepartmentsAPI().then((remoteDepts) => {
        if (remoteDepts && Array.isArray(remoteDepts) && remoteDepts.length > 0) {
          const mapped = remoteDepts
            .filter((d: any) => d.status !== false && d.status !== 'Disabled' && d.status !== 'Inactive')
            .map((d: any) => ({
              id: d.dept_id || d.id,
              dept_id: d.dept_id || d.id,
              name: d.name,
              description: d.description || "Specialized clinical consultations and medical care.",
              iconName: d.icon_name || d.iconName || "Stethoscope",
              doctorCount: d.doctor_count || d.doctorCount || 0,
              status: d.status !== undefined ? d.status : true,
            }));

          setDepartmentsList(mapped);
          localStorage.setItem("isalu_hospitals_departments", JSON.stringify(mapped));
        } else if (!departmentsList || departmentsList.length === 0) {
          setDepartmentsList(DEPARTMENTS);
        }
      });

      // 2. Fetch doctors directly from database API
      getDoctorsAPI().then((remoteDoctors) => {
        if (remoteDoctors && Array.isArray(remoteDoctors) && remoteDoctors.length > 0) {
          const activeDocs = remoteDoctors.filter((d: any) => d.status !== false && (typeof d.status !== "string" || !d.status.includes("Disabled")));
          setAllDoctors(activeDocs.length > 0 ? activeDocs : remoteDoctors);
          localStorage.setItem("isalu_hospital_doctors", JSON.stringify(remoteDoctors));
        }
      });

      // 3. Fetch specialist schedules for accurate next available date calculation
      getSchedulesAPI().then((remoteScheds) => {
        if (remoteScheds && Array.isArray(remoteScheds)) {
          setSchedulesList(remoteScheds);
          localStorage.setItem("isalu_specialist_schedules", JSON.stringify(remoteScheds));
        }
      });
    }
    syncData();

    const updateFromSource = async (newClinics?: any[]) => {
      if (newClinics && Array.isArray(newClinics) && newClinics.length > 0) {
        const mapped = newClinics
          .filter((d: any) => d.status !== false && d.status !== 'Disabled' && d.status !== 'Inactive')
          .map((d: any) => ({
            id: d.dept_id || d.id,
            dept_id: d.dept_id || d.id,
            name: d.name,
            description: d.description || "Specialized clinical consultations and medical care.",
            iconName: d.icon_name || d.iconName || "Stethoscope",
            doctorCount: d.doctor_count || d.doctorCount || 0,
            status: d.status !== undefined ? d.status : true,
          }));
        setDepartmentsList(mapped);
        return;
      }
      const remote = await getDepartmentsAPI();
      if (remote && Array.isArray(remote)) {
        const mapped = remote
          .filter((d: any) => d.status !== false && d.status !== 'Disabled' && d.status !== 'Inactive')
          .map((d: any) => ({
            id: d.dept_id || d.id,
            dept_id: d.dept_id || d.id,
            name: d.name,
            description: d.description || "Specialized clinical consultations and medical care.",
            iconName: d.icon_name || d.iconName || "Stethoscope",
            doctorCount: d.doctor_count || d.doctorCount || 0,
            status: d.status !== undefined ? d.status : true,
          }));
        setDepartmentsList(mapped);
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("isalu_clinic_channel");
      channel.onmessage = (event) => {
        if (event.data && event.data.type === "CLINIC_UPDATED" && Array.isArray(event.data.clinics)) {
          updateFromSource(event.data.clinics);
        }
      };
    } catch {}

    const handleCustomEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        updateFromSource(e.detail);
      } else {
        updateFromSource();
      }
    };

    const handleStorageEvent = () => {
      updateFromSource();
    };

    window.addEventListener("focus", handleStorageEvent);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("isalu_clinic_updated", handleCustomEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("focus", handleStorageEvent);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("isalu_clinic_updated", handleCustomEvent);
    };
  }, []);

  const [hmoPartnersList, setHmoPartnersList] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hmo_companies");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { name: "Hygeia HMO", code: "HMO-HYG-001" },
      { name: "Reliance HMO", code: "HMO-RLN-002" },
      { name: "AXA Mansard Health", code: "HMO-AXA-003" },
      { name: "Avon HMO", code: "HMO-AVN-004" },
      { name: "Leadway Health", code: "HMO-LWD-005" },
      { name: "Clearline HMO", code: "HMO-CLR-006" },
      { name: "Total Health Trust", code: "HMO-THT-007" },
      { name: "Redcare HMO", code: "HMO-RDC-008" },
    ];
  });

  useEffect(() => {
    async function loadHmoData() {
      const isCleared = localStorage.getItem("isalu_hmo_cleared");
      if (isCleared === "true") {
        setHmoPartnersList([]);
        return;
      }

      const remoteHmos = await getHmoCompaniesAPI();
      if (remoteHmos && Array.isArray(remoteHmos) && remoteHmos.length > 0) {
        setHmoPartnersList(remoteHmos);
        localStorage.setItem("isalu_hmo_companies", JSON.stringify(remoteHmos));
      } else {
        const localStr = localStorage.getItem("isalu_hmo_companies");
        if (localStr) {
          try {
            const parsed = JSON.parse(localStr);
            if (Array.isArray(parsed)) setHmoPartnersList(parsed);
          } catch {}
        }
      }
    }
    loadHmoData();

    let hmoChan: BroadcastChannel | null = null;
    try {
      hmoChan = new BroadcastChannel("isalu_hmo_channel");
      hmoChan.onmessage = (event) => {
        if (event.data?.type === "HMO_UPDATED" && Array.isArray(event.data.hmoCompanies)) {
          setHmoPartnersList(event.data.hmoCompanies);
        }
      };
    } catch {}

    const handleHmoCustomEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setHmoPartnersList(e.detail);
      }
    };

    window.addEventListener("isalu_hmo_updated", handleHmoCustomEvent);

    return () => {
      if (hmoChan) hmoChan.close();
      window.removeEventListener("isalu_hmo_updated", handleHmoCustomEvent);
    };
  }, []);

  const getSpecialistCountForDept = (deptId: string, deptName: string, fallbackCount?: number) => {
    const dId = String(deptId).toLowerCase().trim();
    const dName = String(deptName).toLowerCase().trim();

    const matched = allDoctors.filter((doc: any) => {
      let rawDeptId = "";
      if (typeof doc.department === "string") rawDeptId = doc.department;
      else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
      if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
      if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

      const docDeptId = rawDeptId.toLowerCase().trim();
      const docSpec = String(doc.specialty || "").toLowerCase().trim();

      const cleanDocDeptId = docDeptId.replace(/[^a-z0-9]/g, "");
      const cleanDId = dId.replace(/[^a-z0-9]/g, "");
      const cleanDName = dName.replace(/[^a-z0-9]/g, "");

      if (cleanDocDeptId) {
        return cleanDocDeptId === cleanDId || cleanDocDeptId === cleanDName;
      }
      if (docSpec && (docSpec.includes(dName) || dName.includes(docSpec))) return true;
      return false;
    });

    if (matched.length > 0) return matched.length;
    if (fallbackCount && fallbackCount > 0) return fallbackCount;
    return 1;
  };

  const isSpecialistAvailableInNext24Hours = (deptId: string, deptName: string): boolean => {
    const dId = String(deptId).toLowerCase().trim();
    const dName = String(deptName).toLowerCase().trim();

    const deptDocs = allDoctors.filter((doc: any) => {
      const active = doc.status !== false && (typeof doc.status !== "string" || !doc.status.includes("Disabled"));
      if (!active) return false;

      let rawDeptId = "";
      if (typeof doc.department === "string") rawDeptId = doc.department;
      else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
      if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
      if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

      const docDeptId = rawDeptId.toLowerCase().trim();
      const docSpec = String(doc.specialty || "").toLowerCase().trim();

      const cleanDocDeptId = docDeptId.replace(/[^a-z0-9]/g, "");
      const cleanDId = dId.replace(/[^a-z0-9]/g, "");
      const cleanDName = dName.replace(/[^a-z0-9]/g, "");

      if (cleanDocDeptId) {
        return cleanDocDeptId === cleanDId || cleanDocDeptId === cleanDName;
      }
      if (docSpec && (docSpec.includes(dName) || dName.includes(docSpec))) return true;
      return false;
    });

    if (deptDocs.length === 0) return false;

    let savedSchedules: any[] = [];
    try {
      savedSchedules = JSON.parse(localStorage.getItem("isalu_specialist_schedules") || "[]") || [];
    } catch {}

    // Calculate Tomorrow's Date (Midnight today + 1 day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayNameUpper = tomorrow.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const dayShortUpper = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const tYear = tomorrow.getFullYear();
    const tMonth = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const tDay = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowDateStr = `${tYear}-${tMonth}-${tDay}`;

    for (const doc of deptDocs) {
      const docSchedules = savedSchedules.filter((s: any) => {
        const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
        const docId = String(doc.id || "").toLowerCase().trim();
        const dDocId = String(doc.doc_id || "").toLowerCase().trim();
        if (sDocId && (sDocId === docId || sDocId === dDocId)) return true;

        const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
        const dNameStr = String(doc.name || "").toLowerCase().trim();
        const dFullName = String(doc.fullName || doc.full_name || "").toLowerCase().trim();
        if (sName && dNameStr && (sName.includes(dNameStr) || dNameStr.includes(sName))) return true;
        if (sName && dFullName && (sName.includes(dFullName) || dFullName.includes(sName))) return true;
        return false;
      });

      const rosterDays: string[] = [];
      docSchedules.forEach((s: any) => {
        const days = s.dutyDays || s.duty_days;
        if (Array.isArray(days) && days.length > 0) rosterDays.push(...days);
        else if (typeof days === "string" && days.trim()) rosterDays.push(days.trim());
      });

      let effectiveDays = rosterDays;
      if (effectiveDays.length === 0) {
        const docDays = doc.availableDays || doc.available_days || doc.availability;
        if (Array.isArray(docDays) && docDays.length > 0) effectiveDays = docDays;
        else if (typeof docDays === "string" && docDays.trim()) effectiveDays = [docDays.trim()];
      }

      if (effectiveDays.length === 0) continue;

      const tokens: string[] = [];
      effectiveDays.forEach((item: any) => {
        if (typeof item === "string") {
          item.split(/[,/|]+/).forEach((p) => {
            if (p.trim()) tokens.push(p.trim().toUpperCase());
          });
        }
      });

      const isWorkingTomorrow = tokens.some((token) => {
        if (token.includes(tomorrowDateStr)) return true;
        if (token === dayNameUpper || token === dayShortUpper) return true;
        if (dayNameUpper.startsWith(token) || token.startsWith(dayShortUpper)) return true;
        if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) return true;
        return false;
      });

      if (isWorkingTomorrow) return true;
    }

    return false;
  };

  const getNextAvailableDateForDept = (deptId: string, deptName: string): string => {
    const dId = String(deptId).toLowerCase().trim();
    const dName = String(deptName).toLowerCase().trim();

    const deptDocs = allDoctors.filter((doc: any) => {
      const active = doc.status !== false && (typeof doc.status !== "string" || !doc.status.includes("Disabled"));
      if (!active) return false;

      let rawDeptId = "";
      if (typeof doc.department === "string") rawDeptId = doc.department;
      else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
      if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
      if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

      const docDeptId = rawDeptId.toLowerCase().trim();
      const docSpec = String(doc.specialty || "").toLowerCase().trim();

      const cleanDocDeptId = docDeptId.replace(/[^a-z0-9]/g, "");
      const cleanDId = dId.replace(/[^a-z0-9]/g, "");
      const cleanDName = dName.replace(/[^a-z0-9]/g, "");

      if (cleanDocDeptId) {
        return cleanDocDeptId === cleanDId || cleanDocDeptId === cleanDName;
      }
      if (docSpec && (docSpec.includes(dName) || dName.includes(docSpec))) return true;
      return false;
    });

    if (deptDocs.length === 0) return "No upcoming schedule";

    let savedSchedules: any[] = [];
    try {
      savedSchedules = JSON.parse(localStorage.getItem("isalu_specialist_schedules") || "[]") || [];
    } catch {}

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 1; offset <= 30; offset++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + offset);

      const dayNameUpper = candidate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      const dayShortUpper = candidate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const cYear = candidate.getFullYear();
      const cMonth = String(candidate.getMonth() + 1).padStart(2, "0");
      const cDay = String(candidate.getDate()).padStart(2, "0");
      const candidateDateStr = `${cYear}-${cMonth}-${cDay}`;

      for (const doc of deptDocs) {
        const docSchedules = savedSchedules.filter((s: any) => {
          const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
          const docId = String(doc.id || "").toLowerCase().trim();
          const dDocId = String(doc.doc_id || "").toLowerCase().trim();
          if (sDocId && (sDocId === docId || sDocId === dDocId)) return true;

          const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
          const dNameStr = String(doc.name || "").toLowerCase().trim();
          const dFullName = String(doc.fullName || doc.full_name || "").toLowerCase().trim();
          if (sName && dNameStr && (sName.includes(dNameStr) || dNameStr.includes(sName))) return true;
          if (sName && dFullName && (sName.includes(dFullName) || dFullName.includes(sName))) return true;
          return false;
        });

        const rosterDays: string[] = [];
        docSchedules.forEach((s: any) => {
          const days = s.dutyDays || s.duty_days;
          if (Array.isArray(days) && days.length > 0) rosterDays.push(...days);
          else if (typeof days === "string" && days.trim()) rosterDays.push(days.trim());
        });

        let effectiveDays = rosterDays;
        if (effectiveDays.length === 0) {
          const docDays = doc.availableDays || doc.available_days || doc.availability;
          if (Array.isArray(docDays) && docDays.length > 0) effectiveDays = docDays;
          else if (typeof docDays === "string" && docDays.trim()) effectiveDays = [docDays.trim()];
        }

        if (effectiveDays.length === 0) continue;

        const tokens: string[] = [];
        effectiveDays.forEach((item: any) => {
          if (typeof item === "string") {
            item.split(/[,/|]+/).forEach((p) => {
              if (p.trim()) tokens.push(p.trim().toUpperCase());
            });
          }
        });

        const isWorkingOnCandidate = tokens.some((token) => {
          if (token.includes(candidateDateStr)) return true;
          if (token === dayNameUpper || token === dayShortUpper) return true;
          if (dayNameUpper.startsWith(token) || token.startsWith(dayShortUpper)) return true;
          if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) return true;
          return false;
        });

        if (isWorkingOnCandidate) {
          return candidate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        }
      }
    }

    return "No upcoming schedule";
  };

  // Exclude any clinic/department that is not set as active
  const activeDepartmentsList = departmentsList.filter((dept: any) => {
    if (!dept) return false;
    if (dept.status === false || dept.status === 0 || dept.status === "false" || dept.status === "0") return false;
    if (typeof dept.status === "string") {
      const st = dept.status.toLowerCase().trim();
      if (st.includes("maintenance") || st.includes("disable") || st.includes("inactive") || st.includes("off duty")) {
        return false;
      }
    }
    return true;
  });

  const availableDepartments = activeDepartmentsList.filter((dept) =>
    isSpecialistAvailableInNext24Hours(dept.id, dept.name)
  );

  const departmentIcons: Record<string, any> = {
    Baby,
    Brain,
    Bone,
    Sparkles,
    Stethoscope,
    Eye,
    Activity,
    ShieldCheck,
    Wind,
    Ear,
    Droplets,
    Droplet,
    Apple,
    Dumbbell,
    Smile,
    Scissors,
    Ribbon,
    Syringe,
    Heart,
  };

  const resolveIconForDept = (dept: any) => {
    const iconName = dept.iconName || dept.icon_name;
    if (iconName && departmentIcons[iconName]) {
      return departmentIcons[iconName];
    }

    const dId = String(dept.id || dept.dept_id || "").toLowerCase().trim();
    const dName = String(dept.name || "").toLowerCase().trim();

    if (dId.includes("cardio") || dName.includes("cardio") || dName.includes("heart")) return HeartPulse;
    if (dId.includes("pediatric") || dId.includes("paediatric") || dName.includes("child") || dName.includes("baby")) return Baby;
    if (dId.includes("neuro") || dName.includes("neuro") || dName.includes("brain")) return Brain;
    if (dId.includes("ortho") || dId.includes("rheumat") || dName.includes("bone") || dName.includes("joint")) return Bone;
    if (dId.includes("pulmon") || dName.includes("chest") || dName.includes("lung")) return Wind;
    if (dId.includes("ent") || dName.includes("ear") || dName.includes("throat") || dName.includes("nose")) return Ear;
    if (dId.includes("haemat") || dName.includes("blood")) return Droplets;
    if (dId.includes("nephro") || dName.includes("kidney") || dName.includes("renal")) return Droplet;
    if (dId.includes("diet") || dName.includes("diet") || dName.includes("nutrition")) return Apple;
    if (dId.includes("physio") || dName.includes("rehab") || dName.includes("therapy")) return Dumbbell;
    if (dId.includes("psych") || dName.includes("mental") || dName.includes("counseling")) return Smile;
    if (dId.includes("derma") || dName.includes("skin")) return Sparkles;
    if (dId.includes("gynae") || dId.includes("obgyn") || dName.includes("gynaecol") || dName.includes("women")) return Heart;
    if (dId.includes("surg") || dName.includes("surg")) return Scissors;
    if (dId.includes("oncol") || dName.includes("cancer")) return Ribbon;
    if (dId.includes("endocrin") || dName.includes("diabetes") || dName.includes("hormon")) return Syringe;
    if (dId.includes("urol") || dName.includes("prostate")) return ShieldCheck;

    return Stethoscope;
  };

  const HMO_PARTNERS = [
    {
      name: "Hygeia HMO",
      tag: "National Accredited",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      textColor: "text-emerald-700 dark:text-emerald-300",
      symbol: (
        <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
        </svg>
      ),
    },
    {
      name: "Reliance HMO",
      tag: "Digital Health Care",
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      borderColor: "border-sky-200 dark:border-sky-800",
      textColor: "text-sky-700 dark:text-sky-300",
      symbol: (
        <svg className="w-8 h-8 text-sky-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      ),
    },
    {
      name: "AXA Mansard Health",
      tag: "Tier 1 HMO Provider",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-800 dark:text-blue-300",
      symbol: (
        <svg className="w-8 h-8 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
        </svg>
      ),
    },
    {
      name: "Avon HMO",
      tag: "Comprehensive Care",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-200 dark:border-rose-800",
      textColor: "text-rose-700 dark:text-rose-300",
      symbol: (
        <svg className="w-8 h-8 text-rose-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ),
    },
    {
      name: "Leadway Health",
      tag: "Corporate & Individual",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-orange-200 dark:border-orange-800",
      textColor: "text-orange-700 dark:text-orange-300",
      symbol: (
        <svg className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      name: "Clearline HMO",
      tag: "Nationwide Network",
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      borderColor: "border-sky-200 dark:border-sky-800",
      textColor: "text-sky-800 dark:text-sky-300",
      symbol: (
        <svg className="w-8 h-8 text-sky-700" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-2.33 4.67-3.61 7-3.61s7 1.28 7 3.61V19z" />
        </svg>
      ),
    },
    {
      name: "Total Health Trust",
      tag: "Managed Care Pioneer",
      bgColor: "bg-green-50 dark:bg-green-950/40",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-800 dark:text-green-300",
      symbol: (
        <svg className="w-8 h-8 text-green-700" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      ),
    },
    {
      name: "Redcare HMO",
      tag: "Emergency & OPD Care",
      bgColor: "bg-red-50 dark:bg-red-950/40",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-700 dark:text-red-300",
      symbol: (
        <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-20 lg:py-28">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 opacity-95" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#008ac9]/20 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-black text-sky-300 border-2 border-white/20">
                <Sparkles className="h-4 w-4" /> Premier Specialist Hospital in Ikeja, Lagos
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                Quality Healthcare <br />
                <span className="text-[#008ac9] dark:text-sky-400">You Can Trust Always</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-200 font-semibold max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Book appointment with top specialist physicians at Isalu Hospitals. Experience seamless online scheduling, instant HMO verification, and verified ticket slips.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/#specialized-medical-centers"
                  onClick={(e) => {
                    e.preventDefault();
                    const elem = document.getElementById("specialized-medical-centers");
                    if (elem) {
                      elem.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-200 text-base border-2 border-white/30"
                >
                  Book Appointment Now →
                </Link>
                <Link
                  to="/appointments"
                  className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl text-center border-2 border-white/30 transition-all duration-200 text-base flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-5 w-5 text-amber-400" /> Reschedule Appointment
                </Link>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t-2 border-white/10 text-center lg:text-left">
                <div>
                  <h3 className="text-3xl font-black text-sky-300">24/7</h3>
                  <p className="text-xs font-bold text-slate-200">Emergency OPD & ICU</p>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-sky-300">{allDoctors.length}+</h3>
                  <p className="text-xs font-bold text-slate-200">Lead Specialists</p>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-sky-300">100%</h3>
                  <p className="text-xs font-bold text-slate-200">Verified Ticket</p>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Scrollable Instant Booking Glass Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-b from-slate-900/95 via-[#003957]/90 to-slate-950/95 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border-2 border-sky-400/30 shadow-2xl relative overflow-hidden flex flex-col max-h-[540px]">
                <div className="flex items-center justify-between border-b-2 border-sky-400/20 pb-4 mb-4 shrink-0">
                  <div>
                    <span className="text-xs font-black text-sky-400 uppercase tracking-widest block">Instant Booking</span>
                    <h2 className="text-xl font-black text-white">Select Clinical Department</h2>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-[#008ac9] flex items-center justify-center text-white font-bold border-2 border-sky-300/40 shadow-md">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                </div>

                {/* SCROLLABLE ALL CLINICS INSTANT BOOKING LIST */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {activeDepartmentsList.map((dept) => {
                    const Icon = resolveIconForDept(dept);
                    const specCount = getSpecialistCountForDept(dept.id, dept.name, dept.doctorCount);
                    const nextSlot = getNextAvailableClinicDateAndTimeForDept(dept.id, dept.name);

                    return (
                      <Link
                        key={dept.id}
                        to={`/book?department=${dept.id}`}
                        className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/10 hover:bg-[#008ac9] border-2 border-white/15 hover:border-sky-300 transition-all duration-200 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white text-[#008ac9] font-black shadow-md shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-white group-hover:text-white">{dept.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10.5px] font-black bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-950" /> {nextSlot ? nextSlot.dateLabel : "Schedule Pending"}
                              </span>
                              <span className="text-[10px] font-extrabold text-sky-100 bg-white/10 px-2 py-0.5 rounded-md border border-white/15 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-sky-300" /> {nextSlot ? nextSlot.timeLabel : "08:00 AM – 02:00 PM"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-sky-300 group-hover:text-white transition-transform transform group-hover:translate-x-1 shrink-0 ml-2" />
                      </Link>
                    );
                  })}
                </div>

                <Link
                  to="/#specialized-medical-centers"
                  onClick={(e) => {
                    e.preventDefault();
                    const elem = document.getElementById("specialized-medical-centers");
                    if (elem) {
                      elem.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="mt-4 w-full py-3.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black rounded-2xl text-center block transition-all shadow-lg text-sm border-2 border-sky-300/40 shrink-0"
                >
                  Start General Booking Flow →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLINICAL DEPARTMENTS SECTION */}
      <section id="specialized-medical-centers" className="py-20 md:py-28 scroll-mt-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#008ac9]/10 text-[#008ac9] dark:text-sky-400 text-xs font-black uppercase tracking-widest border-2 border-[#008ac9]/20">
              Isalu Clinical Departments
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
              Specialized Medical Centers
            </h2>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
              Explore our complete range of specialized clinical centers equipped with advanced medical diagnostics and expert consultant physicians.
            </p>
          </div>

          {/* BEAUTIFUL OVAL CARDS GRID */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeDepartmentsList.map((dept) => {
              const Icon = resolveIconForDept(dept);
              const specCount = getSpecialistCountForDept(dept.id, dept.name, dept.doctorCount);
              const nextSlot = getNextAvailableClinicDateAndTimeForDept(dept.id, dept.name);

              return (
                <div
                  key={dept.id}
                  className="group relative bg-gradient-to-b from-white via-sky-50/50 to-sky-100/30 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border-2 border-sky-200/90 dark:border-slate-800 hover:shadow-2xl hover:border-[#008ac9] dark:hover:border-sky-400 transform hover:-translate-y-2 rounded-[2.5rem] p-7 shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Soft Background Glow & Subtle Heart Accent Badge */}
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#008ac9]/10 dark:bg-sky-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                  <div className="absolute right-5 top-5 text-sky-200/80 dark:text-slate-800 group-hover:text-rose-400/40 dark:group-hover:text-rose-400/40 transition-colors">
                    <Heart className="h-6 w-6 fill-current" />
                  </div>

                  <div>
                    {/* Round Oval Icon Badge Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="h-14 w-14 rounded-full flex items-center justify-center font-bold shadow-lg transition-transform bg-[#008ac9] text-white shadow-[#008ac9]/30 group-hover:scale-110">
                        <Icon className="h-7 w-7" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] dark:text-sky-300 text-xs font-black border border-sky-300/80 dark:border-slate-700 shadow-sm flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#008ac9]" /> {specCount} Specialist{specCount > 1 ? "s" : ""}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> 30-Day Active
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-[#008ac9] dark:group-hover:text-sky-400 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                      {dept.description}
                    </p>

                    {/* Next Available Clinic Date & Time Badge - Vibrant Glowing Gradient */}
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-emerald-500/10 dark:from-sky-950/60 dark:to-teal-950/60 border-2 border-sky-300/60 dark:border-sky-800/60 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-black text-slate-900 dark:text-slate-100">
                          <Calendar className="h-3.5 w-3.5 text-[#008ac9] dark:text-sky-400" /> Next Clinic:
                        </span>
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-md border border-emerald-400/40">
                          {nextSlot ? nextSlot.dateLabel : "Schedule Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-[#008ac9] dark:text-sky-400" /> Duty Hours:
                        </span>
                        <span className="font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                          {nextSlot ? nextSlot.timeLabel : "08:00 AM – 02:00 PM"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/book?department=${dept.id}`}
                    className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#008ac9] to-[#0072b1] hover:from-[#0072b1] hover:to-[#005a8e] text-white font-black text-xs transition-all flex items-center justify-between shadow-md hover:shadow-xl border-2 border-white/20 group-hover:scale-[1.02]"
                  >
                    <span>Book Specialist Consultation</span>
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* OUR HMO PARTNERS SECTION WITH HEALTH ICONS DOODLE BACKGROUND */}
      <section className="relative py-24 md:py-32 border-y-2 border-slate-200 dark:border-slate-800 overflow-hidden bg-sky-50/30 dark:bg-slate-950">
        {/* Seamless Health Icons Doodle Background Pattern - Ultra-Transparent Subtlety */}
        <div
          className="absolute inset-0 bg-repeat bg-center opacity-[0.08] dark:opacity-[0.05] mix-blend-multiply dark:mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "url('/health_icons_doodle_bg.jpg')", backgroundSize: "500px 281px" }}
        />

        {/* Subtle Ambient Light Orbs */}
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#008ac9]/15 dark:bg-[#008ac9]/25 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 bottom-1/3 h-96 w-96 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-[#008ac9] dark:text-sky-400 text-xs font-black uppercase tracking-widest border-2 border-[#008ac9]/30 shadow-md backdrop-blur-md">
              Healthcare Insurance Partners
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl lg:text-5xl tracking-tight">
              Our HMO Partners in Nigeria
            </h2>
            <p className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
              Isalu Hospitals partners with leading Health Maintenance Organizations (HMOs) across Nigeria for seamless cashless medical consultations and treatments.
            </p>
          </div>

          {/* HMO Interactive Carousel & Grid */}
          <HmoCarousel partners={hmoPartnersList} />
        </div>
      </section>

      {/* PATIENT TESTIMONIALS SECTION WITH DOCTOR & PATIENT SMILING GLASS BACKGROUND */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b-2 border-slate-300 dark:border-slate-800">
        {/* Doctor and Patient Smiling Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 opacity-90"
          style={{ backgroundImage: "url('/doctor_patient_smiling_bg.jpg')" }}
        />

        {/* Transparent Isalu Brand Color Cover Overlay - Made clear & visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#008ac9]/60 via-[#011627]/55 to-[#008ac9]/65 backdrop-blur-[2px]" />

        {/* Ambient Glowing Orbs */}
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-sky-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[#008ac9]/30 blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-widest border-2 border-white/40 shadow-2xl backdrop-blur-md">
              Patient Feedback & Stories
            </span>
            <h2 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl tracking-tight drop-shadow-md">
              Trusted by Thousands of Patients
            </h2>
            <p className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed drop-shadow-sm">
              Read authentic feedback from patients who booked consultations and received top-tier medical care at Isalu Hospitals.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Adewale O.",
                clinic: "Cardiology Consultation",
                date: "Visited July 2026",
                rating: 5,
                comment:
                  "Booking online was so smooth. The verified ticket slip code made reception check-in instant. Specialist A was very attentive and thorough.",
              },
              {
                name: "Funmi A.",
                clinic: "Obstetrics & Gynaecology",
                date: "Visited August 2026",
                rating: 5,
                comment:
                  "Hygeia HMO verification took less than a minute on the portal. High quality hospital facilities and very friendly medical staff.",
              },
              {
                name: "Chidi N.",
                clinic: "Paediatrics & Child Health",
                date: "Visited August 2026",
                rating: 5,
                comment:
                  "Very impressed with the specialist pediatric care. Prompt appointment without long waiting line. Highly recommended hospital in Lagos!",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="bg-white/15 dark:bg-slate-900/40 backdrop-blur-xl border-2 border-white/30 dark:border-white/20 rounded-3xl p-6 shadow-2xl hover:bg-white/25 dark:hover:bg-slate-900/60 hover:border-white/50 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-300 mb-4 drop-shadow">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>

                  <Quote className="h-8 w-8 text-sky-200/60 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-white italic leading-relaxed mb-6 drop-shadow-sm">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-white/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-base text-white">{t.name}</h4>
                    <p className="text-xs font-bold text-sky-300">{t.clinic}</p>
                  </div>
                  <span className="text-[11px] font-bold text-sky-200/90">{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
