import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

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
      bg: "bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-cyan-50/30 dark:from-teal-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-teal-300/80 dark:border-teal-700/60",
      text: "text-teal-950 dark:text-teal-100",
      glow: "from-teal-500/30 via-emerald-500/15 to-transparent",
      badgeBg: "bg-teal-600 text-white shadow-teal-500/30",
      accent: "text-teal-700 dark:text-teal-300",
      initials: "HYG",
      logoGradient: "from-teal-600 via-emerald-600 to-teal-800",
    };
  }
  if (n.includes("axa") || n.includes("mansard")) {
    return {
      bg: "bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-sky-50/30 dark:from-blue-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-blue-300/80 dark:border-blue-700/60",
      text: "text-blue-950 dark:text-blue-100",
      glow: "from-blue-600/30 via-indigo-500/15 to-transparent",
      badgeBg: "bg-blue-600 text-white shadow-blue-500/30",
      accent: "text-blue-700 dark:text-blue-300",
      initials: "AXA",
      logoGradient: "from-blue-600 via-blue-700 to-indigo-900",
    };
  }
  if (n.includes("reliance")) {
    return {
      bg: "bg-gradient-to-br from-sky-50/90 via-cyan-50/50 to-blue-50/30 dark:from-sky-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-sky-300/80 dark:border-sky-700/60",
      text: "text-sky-950 dark:text-sky-100",
      glow: "from-[#008ac9]/30 via-sky-400/15 to-transparent",
      badgeBg: "bg-[#008ac9] text-white shadow-[#008ac9]/30",
      accent: "text-[#008ac9] dark:text-sky-300",
      initials: "RLN",
      logoGradient: "from-[#008ac9] via-cyan-600 to-sky-800",
    };
  }
  if (n.includes("avon")) {
    return {
      bg: "bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-purple-50/30 dark:from-rose-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-rose-300/80 dark:border-rose-700/60",
      text: "text-rose-950 dark:text-rose-100",
      glow: "from-rose-500/30 via-pink-500/15 to-transparent",
      badgeBg: "bg-rose-600 text-white shadow-rose-500/30",
      accent: "text-rose-700 dark:text-rose-300",
      initials: "AVN",
      logoGradient: "from-rose-600 via-pink-600 to-rose-800",
    };
  }
  if (n.includes("leadway")) {
    return {
      bg: "bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-yellow-50/30 dark:from-amber-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-amber-300/80 dark:border-amber-700/60",
      text: "text-amber-950 dark:text-amber-100",
      glow: "from-amber-500/30 via-yellow-500/15 to-transparent",
      badgeBg: "bg-amber-600 text-white shadow-amber-500/30",
      accent: "text-amber-800 dark:text-amber-300",
      initials: "LWD",
      logoGradient: "from-amber-600 via-yellow-600 to-orange-700",
    };
  }
  if (n.includes("clearline")) {
    return {
      bg: "bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-purple-50/30 dark:from-indigo-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-indigo-300/80 dark:border-indigo-700/60",
      text: "text-indigo-950 dark:text-indigo-100",
      glow: "from-indigo-500/30 via-purple-500/15 to-transparent",
      badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30",
      accent: "text-indigo-700 dark:text-indigo-300",
      initials: "CLR",
      logoGradient: "from-indigo-600 via-purple-600 to-indigo-800",
    };
  }
  if (n.includes("total health") || n.includes("tht")) {
    return {
      bg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-green-50/30 dark:from-emerald-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-emerald-300/80 dark:border-emerald-700/60",
      text: "text-emerald-950 dark:text-emerald-100",
      glow: "from-emerald-600/30 via-teal-500/15 to-transparent",
      badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30",
      accent: "text-emerald-700 dark:text-emerald-300",
      initials: "THT",
      logoGradient: "from-emerald-600 via-teal-600 to-emerald-800",
    };
  }
  if (n.includes("redcare")) {
    return {
      bg: "bg-gradient-to-br from-red-50/90 via-rose-50/50 to-orange-50/30 dark:from-red-950/50 dark:via-slate-900/90 dark:to-slate-950",
      border: "border-red-300/80 dark:border-red-700/60",
      text: "text-red-950 dark:text-red-100",
      glow: "from-red-500/30 via-rose-500/15 to-transparent",
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
    { bg: "bg-gradient-to-br from-sky-50/90 via-indigo-50/50 to-blue-50/30 dark:from-sky-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-sky-300/80 dark:border-sky-700/60", text: "text-sky-950 dark:text-sky-100", glow: "from-sky-500/30 via-blue-500/15 to-transparent", badgeBg: "bg-sky-600 text-white shadow-sky-500/30", accent: "text-sky-700 dark:text-sky-300", logoGradient: "from-sky-600 to-blue-700" },
    { bg: "bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/30 dark:from-indigo-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-indigo-300/80 dark:border-indigo-700/60", text: "text-indigo-950 dark:text-indigo-100", glow: "from-indigo-500/30 via-purple-500/15 to-transparent", badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30", accent: "text-indigo-700 dark:text-indigo-300", logoGradient: "from-indigo-600 to-purple-700" },
    { bg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-cyan-50/30 dark:from-emerald-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-emerald-300/80 dark:border-emerald-700/60", text: "text-emerald-950 dark:text-emerald-100", glow: "from-emerald-500/30 via-teal-500/15 to-transparent", badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30", accent: "text-emerald-700 dark:text-emerald-300", logoGradient: "from-emerald-600 to-teal-700" },
    { bg: "bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-sky-50/30 dark:from-teal-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-teal-300/80 dark:border-teal-700/60", text: "text-teal-950 dark:text-teal-100", glow: "from-teal-500/30 via-cyan-500/15 to-transparent", badgeBg: "bg-teal-600 text-white shadow-teal-500/30", accent: "text-teal-700 dark:text-teal-300", logoGradient: "from-teal-600 to-cyan-700" },
    { bg: "bg-gradient-to-br from-purple-50/90 via-pink-50/50 to-rose-50/30 dark:from-purple-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-purple-300/80 dark:border-purple-700/60", text: "text-purple-950 dark:text-purple-100", glow: "from-purple-500/30 via-pink-500/15 to-transparent", badgeBg: "bg-purple-600 text-white shadow-purple-500/30", accent: "text-purple-700 dark:text-purple-300", logoGradient: "from-purple-600 to-pink-700" },
    { bg: "bg-gradient-to-br from-rose-50/90 via-orange-50/50 to-amber-50/30 dark:from-rose-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-rose-300/80 dark:border-rose-700/60", text: "text-rose-950 dark:text-rose-100", glow: "from-rose-500/30 via-amber-500/15 to-transparent", badgeBg: "bg-rose-600 text-white shadow-rose-500/30", accent: "text-rose-700 dark:text-rose-300", logoGradient: "from-rose-600 to-red-700" },
    { bg: "bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-lime-50/30 dark:from-amber-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-amber-300/80 dark:border-amber-700/60", text: "text-amber-950 dark:text-amber-100", glow: "from-amber-500/30 via-orange-500/15 to-transparent", badgeBg: "bg-amber-600 text-white shadow-amber-500/30", accent: "text-amber-800 dark:text-amber-300", logoGradient: "from-amber-600 to-orange-700" },
    { bg: "bg-gradient-to-br from-blue-50/90 via-cyan-50/50 to-teal-50/30 dark:from-blue-950/50 dark:via-slate-900/90 dark:to-slate-950", border: "border-blue-300/80 dark:border-blue-700/60", text: "text-blue-950 dark:text-blue-100", glow: "from-blue-500/30 via-sky-500/15 to-transparent", badgeBg: "bg-blue-600 text-white shadow-blue-500/30", accent: "text-blue-700 dark:text-blue-300", logoGradient: "from-blue-600 to-sky-700" },
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
      <div className="max-w-4xl mx-auto text-center py-12 px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed border-sky-300/60 dark:border-slate-800 space-y-3 shadow-xl animate-fadeIn">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500 to-[#008ac9] text-white w-14 h-14 mx-auto flex items-center justify-center font-bold shadow-lg shadow-[#008ac9]/30 animate-bounce">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Accredited HMO Partners Directory</h3>
        <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          Isalu Hospitals accepts all accredited HMO insurance providers across Nigeria for seamless cashless consultations and treatments.
        </p>
      </div>
    );
  }

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
      {viewMode === "marquee" && (
        <div className="relative overflow-hidden py-4 rounded-[2.5rem]">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

          <div className={`${marqueeSpeedClass} gap-6 ${isPaused ? "[animation-play-state:paused]" : ""}`}>
            {[...formattedPartners, ...formattedPartners, ...formattedPartners].map((hmo, idx) => (
              <div
                key={`${hmo.name}-${idx}`}
                className="w-72 sm:w-80 flex-shrink-0 transform transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03]"
              >
                <div
                  className={`${hmo.brand.bg} ${hmo.brand.border} border-2 rounded-[2.5rem] p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between items-center text-center h-full group relative overflow-hidden backdrop-blur-md`}
                >
                  <div className={`absolute -right-8 -bottom-8 w-28 h-28 bg-gradient-to-br ${hmo.brand.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

                  <div className="flex flex-col items-center space-y-3 z-10 w-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${hmo.brand.logoGradient} text-white font-bold text-sm shadow-md flex items-center justify-center border-2 border-white/60 dark:border-slate-800 tracking-wider group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300 animate-pulse`}>
                      {hmo.brand.initials}
                    </div>

                    <h3 className={`font-semibold text-base sm:text-lg tracking-normal ${hmo.brand.text}`}>{hmo.name}</h3>
                    <code className={`text-[11px] font-medium px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 border ${hmo.brand.border} ${hmo.brand.accent} shadow-sm tracking-wide`}>
                      {hmo.code}
                    </code>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 z-10">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 animate-spin" /> Cashless Pre-Auth Accepted
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "grid" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-2 border-sky-200/80 dark:border-slate-800 rounded-[2.5rem] p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-2xl">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-sky-600 dark:text-sky-400 pointer-events-none animate-bounce" />
              <input
                type="text"
                placeholder="Search HMO partner name or code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setGridPage(1);
                }}
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm font-normal rounded-2xl border-2 border-sky-200/80 dark:border-slate-700/80 bg-gradient-to-r from-sky-50/50 via-teal-50/30 to-white dark:from-slate-800/60 dark:to-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:border-[#008ac9] transition-all shadow-inner"
              />
            </div>

            <span className="text-xs sm:text-sm font-semibold text-[#008ac9] dark:text-sky-400 px-2 tracking-normal animate-pulse">
              Showing {filteredPartners.length} Accredited Partners
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {paginatedGridItems.map((hmo, i) => (
              <div
                key={hmo.id}
                className={`${hmo.brand.bg} ${hmo.brand.border} border-2 rounded-[2.5rem] p-6 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between items-center text-center group relative overflow-hidden backdrop-blur-md animate-fadeIn`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`absolute -right-8 -bottom-8 w-28 h-28 bg-gradient-to-br ${hmo.brand.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

                <div className="flex flex-col items-center space-y-3 z-10 w-full">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${hmo.brand.logoGradient} text-white font-bold text-sm shadow-md flex items-center justify-center border-2 border-white/60 dark:border-slate-800 tracking-wider group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                    {hmo.brand.initials}
                  </div>

                  <h4 className={`font-semibold text-sm sm:text-base leading-snug tracking-normal ${hmo.brand.text}`}>{hmo.name}</h4>
                  <code className={`text-[11px] font-medium px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 border ${hmo.brand.border} ${hmo.brand.accent} shadow-sm tracking-wide`}>
                    {hmo.code}
                  </code>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 z-10">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Cashless Pre-Auth
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={gridPage === 1}
                onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                className="px-5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-sky-200 dark:border-slate-700 rounded-2xl text-xs font-semibold disabled:opacity-40 hover:border-[#008ac9] hover:scale-105 transition-all shadow-sm"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">
                Page {gridPage} of {totalPages}
              </span>
              <button
                disabled={gridPage === totalPages}
                onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                className="px-5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-sky-200 dark:border-slate-700 rounded-2xl text-xs font-semibold disabled:opacity-40 hover:border-[#008ac9] hover:scale-105 transition-all shadow-sm"
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
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);

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

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const dayNameLong = targetDate.toLocaleDateString("en-US", { weekday: "long" });
      const dayShort = targetDate.toLocaleDateString("en-US", { weekday: "short" });
      const monthShort = targetDate.toLocaleDateString("en-US", { month: "short" });
      const dayNum = targetDate.getDate();

      for (const doc of deptDocs) {
        if (doc.status === false || doc.status === 0 || doc.status === "0" || doc.status === "false") {
          continue;
        }

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

        if (dutyDays.length === 0) {
          if (doc.availableDays && Array.isArray(doc.availableDays) && doc.availableDays.length > 0) {
            dutyDays = doc.availableDays;
          } else if (doc.availability && Array.isArray(doc.availability) && doc.availability.length > 0) {
            dutyDays = doc.availability;
          }
        }

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

        const isAvailableOnDay = dutyDays.some((d) => {
          const cleanD = String(d).toLowerCase().trim();
          const cleanLong = dayNameLong.toLowerCase().trim();
          const cleanShort = dayShort.toLowerCase().trim();
          return cleanD === cleanLong || cleanD === cleanShort || cleanLong.startsWith(cleanD) || cleanD.startsWith(cleanShort);
        });

        if (isAvailableOnDay) {
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
            doctorName: doc.acronym || doc.name || "Specialist",
            doctorAcronym: doc.acronym || doc.name || "Specialist",
          };
        }
      }
    }

    return { dateLabel: "Mon – Fri Duty", timeLabel: "08:00 AM – 02:00 PM", doctorName: "", doctorAcronym: "" };
  };

  useEffect(() => {
    async function syncData() {
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
        }
      });

      getDoctorsAPI().then((remoteDoctors) => {
        if (remoteDoctors && Array.isArray(remoteDoctors) && remoteDoctors.length > 0) {
          const activeDocs = remoteDoctors.filter((d: any) => d.status !== false && (typeof d.status !== "string" || !d.status.includes("Disabled")));
          setAllDoctors(activeDocs.length > 0 ? activeDocs : remoteDoctors);
        }
      });

      getSchedulesAPI().then((remoteScheds) => {
        if (remoteScheds && Array.isArray(remoteScheds)) {
          setSchedulesList(remoteScheds);
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
    } catch { }

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
    window.addEventListener("isalu_clinic_updated", handleCustomEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("focus", handleStorageEvent);
      window.removeEventListener("isalu_clinic_updated", handleCustomEvent);
    };
  }, []);

  const [hmoPartnersList, setHmoPartnersList] = useState<any[]>([]);

  useEffect(() => {
    async function loadHmoData() {
      const remoteHmos = await getHmoCompaniesAPI();
      if (Array.isArray(remoteHmos)) setHmoPartnersList(remoteHmos);
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
    } catch { }

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
    if (dId.includes("gynae") || dName.includes("obgyn") || dName.includes("gynaecol") || dName.includes("women")) return Heart;
    if (dId.includes("surg") || dName.includes("surg")) return Scissors;
    if (dId.includes("oncol") || dName.includes("cancer")) return Ribbon;
    if (dId.includes("endocrin") || dName.includes("diabetes") || dName.includes("hormon")) return Syringe;
    if (dId.includes("urol") || dName.includes("prostate")) return ShieldCheck;

    return Stethoscope;
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans tracking-normal animate-fadeIn">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#011627] to-slate-900 text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent opacity-80" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#008ac9]/40 to-cyan-500/20 blur-3xl animate-pulse" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-gradient-to-br from-teal-500/30 to-sky-500/20 blur-3xl" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-white/10 px-5 py-2 text-xs font-semibold text-sky-300 border border-sky-400/30 shadow-xl backdrop-blur-md animate-bounce">
                <Sparkles className="h-4 w-4 text-cyan-400" /> Premier Specialist Hospital in Ikeja, Lagos
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                Quality Healthcare <br />
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent">You Can Trust Always</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-200 font-normal max-w-2xl mx-auto lg:mx-0 leading-relaxed">
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
                  className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-[#008ac9] via-sky-600 to-cyan-600 hover:from-[#0072b1] hover:to-cyan-700 text-white font-bold rounded-2xl text-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-sm border border-sky-300/40"
                >
                  Book Appointment Now →
                </Link>
                <Link
                  to="/appointments"
                  className="w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-center border border-white/30 transition-all duration-300 text-sm flex items-center justify-center gap-2 backdrop-blur-md hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" /> Reschedule Appointment
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10 text-center lg:text-left">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
                  <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-sky-300 to-cyan-300 bg-clip-text text-transparent">24/7</h3>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-300 mt-1">Emergency OPD & ICU</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
                  <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">{allDoctors.length}+</h3>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-300 mt-1">Lead Specialists</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
                  <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">100%</h3>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-300 mt-1">Verified Ticket</p>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Scrollable Instant Booking Glass Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-b from-slate-900/95 via-[#003957]/95 to-slate-950/95 backdrop-blur-2xl p-6 sm:p-7 rounded-[2.5rem] border border-sky-400/40 shadow-2xl relative overflow-hidden flex flex-col max-h-[540px] transition-all hover:shadow-sky-500/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400/10 rounded-full blur-2xl pointer-events-none animate-pulse" />

                <div className="flex items-center justify-between border-b border-sky-400/20 pb-4 mb-4 shrink-0 relative z-10">
                  <div>
                    <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider block">Instant Booking</span>
                    <h2 className="text-lg font-bold text-white tracking-tight">Select Clinical Department</h2>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#008ac9] to-cyan-500 flex items-center justify-center text-white font-semibold border border-sky-300/40 shadow-md">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar relative z-10">
                  {activeDepartmentsList.map((dept) => {
                    const Icon = resolveIconForDept(dept);
                    const nextSlot = getNextAvailableClinicDateAndTimeForDept(dept.id, dept.name);

                    return (
                      <Link
                        key={dept.id}
                        to={`/book?department=${dept.id}`}
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-gradient-to-r hover:from-[#008ac9] hover:to-cyan-600 border border-white/15 hover:border-sky-300 transition-all duration-300 shadow-sm backdrop-blur-md transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-white to-sky-50 text-[#008ac9] font-bold shadow-md shrink-0 group-hover:scale-110 transition-transform">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs sm:text-sm text-white group-hover:text-white tracking-normal">{dept.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5 text-slate-950" /> {nextSlot ? nextSlot.dateLabel : "Schedule Pending"}
                              </span>
                              <span className="text-[10px] font-normal text-sky-100 bg-white/10 px-1.5 py-0.5 rounded border border-white/15 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5 text-sky-300" /> {nextSlot ? nextSlot.timeLabel : "08:00 AM – 02:00 PM"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-sky-300 group-hover:text-white transition-transform transform group-hover:translate-x-1.5 shrink-0 ml-2" />
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
                  className="mt-4 w-full py-3 bg-gradient-to-r from-[#008ac9] via-sky-600 to-cyan-600 hover:from-[#0072b1] hover:to-cyan-700 text-white font-bold rounded-2xl text-center block transition-all duration-300 shadow-lg text-xs sm:text-sm border border-sky-300/40 shrink-0 relative z-10 hover:scale-[1.02]"
                >
                  Start General Booking Flow →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLINICAL DEPARTMENTS SECTION */}
      <section id="specialized-medical-centers" className="py-24 md:py-32 scroll-mt-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-teal-500/10 text-[#008ac9] dark:text-sky-400 text-xs font-semibold uppercase tracking-wider border border-sky-300/40 shadow-sm backdrop-blur-sm">
              ✨ Isalu Clinical Departments
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Specialized Medical Centers
            </h2>
            <p className="text-sm sm:text-base font-normal text-slate-600 dark:text-slate-300 leading-relaxed">
              Explore our complete range of specialized clinical centers equipped with advanced medical diagnostics and expert consultant physicians.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeDepartmentsList.map((dept, index) => {
              const Icon = resolveIconForDept(dept);
              const specCount = getSpecialistCountForDept(dept.id, dept.name, dept.doctorCount);
              const nextSlot = getNextAvailableClinicDateAndTimeForDept(dept.id, dept.name);

              return (
                <div
                  key={dept.id}
                  className="group relative bg-gradient-to-b from-white via-sky-50/40 to-white dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border border-sky-200/90 dark:border-slate-800 hover:border-[#008ac9] dark:hover:border-sky-400 rounded-[2rem] p-6 shadow-lg hover:shadow-2xl hover:shadow-[#008ac9]/15 transition-all duration-500 flex flex-col justify-between overflow-hidden transform hover:-translate-y-2 animate-fadeIn"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-gradient-to-br from-[#008ac9]/20 via-cyan-400/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                  <div className="absolute top-5 right-5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800 text-[#008ac9] dark:text-sky-300 text-[10px] font-semibold border border-sky-200/80 dark:border-slate-700 shadow-sm z-10">
                    <Users className="h-3 w-3 text-[#008ac9] animate-pulse" />
                    <span>{specCount} {specCount === 1 ? "Specialist" : "Specialists"}</span>
                  </div>

                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#008ac9] via-sky-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-[#008ac9]/30 mb-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 border border-white/50 dark:border-slate-800">
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#008ac9] dark:group-hover:text-sky-400 transition-colors tracking-tight">
                      {dept.name}
                    </h3>

                    <p className="text-xs font-normal text-slate-600 dark:text-slate-300 leading-relaxed mb-5 line-clamp-2">
                      {dept.description}
                    </p>

                    <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-teal-50/30 to-emerald-50/30 dark:from-slate-800/70 dark:to-slate-900/70 border border-sky-200/60 dark:border-slate-700/80 space-y-2 shadow-inner transition-colors group-hover:border-sky-300">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3 w-3 text-[#008ac9]" /> Next Clinic:
                        </span>
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-[10px] px-2.5 py-0.5 rounded-lg shadow-sm border border-emerald-400/30">
                          {nextSlot ? nextSlot.dateLabel : "Schedule Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="h-3 w-3 text-[#008ac9]" /> Duty Hours:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-[10px]">
                          {nextSlot ? nextSlot.timeLabel : "08:00 AM – 02:00 PM"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/book?department=${dept.id}`}
                    className="relative z-10 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#008ac9] via-sky-600 to-cyan-600 hover:from-[#0072b1] hover:to-cyan-700 text-white font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md shadow-[#008ac9]/20 hover:shadow-lg hover:shadow-[#008ac9]/40 border border-white/20 group-hover:scale-[1.02]"
                  >
                    <span>Book Appointment Now</span>
                    <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* OUR HMO PARTNERS SECTION */}
      <section className="relative py-24 md:py-32 border-y border-slate-200 dark:border-slate-800 overflow-hidden bg-gradient-to-b from-sky-50/40 via-white to-sky-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div
          className="absolute inset-0 bg-repeat bg-center opacity-[0.08] dark:opacity-[0.05] mix-blend-multiply dark:mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "url('/health_icons_doodle_bg.jpg')", backgroundSize: "500px 281px" }}
        />

        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-[#008ac9]/20 to-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -right-32 bottom-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-[#008ac9] dark:text-sky-400 text-xs font-semibold uppercase tracking-wider border border-sky-300/40 shadow-sm backdrop-blur-md">
              🤝 Healthcare Insurance Partners
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Our HMO Partners in Nigeria
            </h2>
            <p className="text-sm sm:text-base font-normal text-slate-600 dark:text-slate-300 leading-relaxed">
              Isalu Hospitals partners with leading Health Maintenance Organizations (HMOs) across Nigeria for seamless cashless medical consultations and treatments.
            </p>
          </div>

          <HmoCarousel partners={hmoPartnersList} />
        </div>
      </section>

      {/* PATIENT TESTIMONIALS SECTION */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b border-slate-300 dark:border-slate-800">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 opacity-90"
          style={{ backgroundImage: "url('/doctor_patient_smiling_bg.jpg')" }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#008ac9]/75 via-[#011627]/70 to-[#008ac9]/80 backdrop-blur-[4px]" />

        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[#008ac9]/40 blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/25 text-white text-xs font-semibold uppercase tracking-wider border border-white/50 shadow-xl backdrop-blur-md">
              💬 Patient Feedback & Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              Trusted by Thousands of Patients
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed drop-shadow-sm">
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
                className="bg-white/20 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-white/25 rounded-[2rem] p-7 shadow-2xl hover:bg-white/30 dark:hover:bg-slate-900/80 hover:border-white/70 transition-all duration-500 flex flex-col justify-between group transform hover:-translate-y-2 animate-fadeIn"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-300 mb-3.5 drop-shadow-md">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current text-amber-300 drop-shadow animate-pulse" />
                    ))}
                  </div>

                  <Quote className="h-8 w-8 text-sky-200/90 mb-2.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs sm:text-sm font-normal text-white italic leading-relaxed mb-6 drop-shadow">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-white/25 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white tracking-normal">{t.name}</h4>
                    <p className="text-[11px] font-semibold text-cyan-200">{t.clinic}</p>
                  </div>
                  <span className="text-[10px] font-medium text-sky-100/90 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}