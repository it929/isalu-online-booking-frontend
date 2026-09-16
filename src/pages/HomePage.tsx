import React, { useState, useEffect } from "react";
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
  ThumbsUp,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
  CalendarCheck,
  Calendar,
  Quote,
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
  Search,
  X,
  Phone,
  Mail,
  ArrowUp,
  Compass,
  PhoneCall,
  Info,
  HelpCircle,
  ExternalLink,
  Video,
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
      bg: "bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 dark:from-teal-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-teal-200 dark:border-teal-800/80 hover:border-teal-400 dark:hover:border-teal-400",
      text: "text-teal-950 dark:text-teal-100",
      glow: "from-teal-500/30 via-emerald-500/20 to-transparent",
      badgeBg: "bg-teal-600 text-white shadow-teal-500/30",
      accent: "text-teal-800 dark:text-teal-300",
      initials: "HYG",
      logoGradient: "from-teal-600 via-emerald-600 to-teal-800",
      ringColor: "ring-teal-500/30",
    };
  }
  if (n.includes("axa") || n.includes("mansard")) {
    return {
      bg: "bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-sky-500/10 dark:from-blue-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-blue-200 dark:border-blue-800/80 hover:border-blue-400 dark:hover:border-blue-400",
      text: "text-blue-950 dark:text-blue-100",
      glow: "from-blue-600/30 via-indigo-500/20 to-transparent",
      badgeBg: "bg-blue-600 text-white shadow-blue-500/30",
      accent: "text-blue-800 dark:text-blue-300",
      initials: "AXA",
      logoGradient: "from-blue-600 via-blue-700 to-indigo-900",
      ringColor: "ring-blue-500/30",
    };
  }
  if (n.includes("reliance")) {
    return {
      bg: "bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-blue-500/10 dark:from-sky-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-sky-200 dark:border-sky-800/80 hover:border-sky-400 dark:hover:border-sky-400",
      text: "text-sky-950 dark:text-sky-100",
      glow: "from-[#008ac9]/30 via-sky-400/20 to-transparent",
      badgeBg: "bg-[#008ac9] text-white shadow-[#008ac9]/30",
      accent: "text-[#008ac9] dark:text-sky-300",
      initials: "RLN",
      logoGradient: "from-[#008ac9] via-cyan-600 to-sky-800",
      ringColor: "ring-sky-500/30",
    };
  }
  if (n.includes("avon")) {
    return {
      bg: "bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-purple-500/10 dark:from-rose-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-rose-200 dark:border-rose-800/80 hover:border-rose-400 dark:hover:border-rose-400",
      text: "text-rose-950 dark:text-rose-100",
      glow: "from-rose-500/30 via-pink-500/20 to-transparent",
      badgeBg: "bg-rose-600 text-white shadow-rose-500/30",
      accent: "text-rose-800 dark:text-rose-300",
      initials: "AVN",
      logoGradient: "from-rose-600 via-pink-600 to-rose-800",
      ringColor: "ring-rose-500/30",
    };
  }
  if (n.includes("leadway")) {
    return {
      bg: "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 dark:from-amber-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-amber-200 dark:border-amber-800/80 hover:border-amber-400 dark:hover:border-amber-400",
      text: "text-amber-950 dark:text-amber-100",
      glow: "from-amber-500/30 via-yellow-500/20 to-transparent",
      badgeBg: "bg-amber-600 text-white shadow-amber-500/30",
      accent: "text-amber-900 dark:text-amber-300",
      initials: "LWD",
      logoGradient: "from-amber-600 via-yellow-600 to-orange-700",
      ringColor: "ring-amber-500/30",
    };
  }
  if (n.includes("clearline")) {
    return {
      bg: "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-violet-500/10 dark:from-indigo-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-400",
      text: "text-indigo-950 dark:text-indigo-100",
      glow: "from-indigo-500/30 via-purple-500/20 to-transparent",
      badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30",
      accent: "text-indigo-800 dark:text-indigo-300",
      initials: "CLR",
      logoGradient: "from-indigo-600 via-purple-600 to-indigo-800",
      ringColor: "ring-indigo-500/30",
    };
  }
  if (n.includes("total health") || n.includes("tht")) {
    return {
      bg: "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-green-500/10 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-400 dark:hover:border-emerald-400",
      text: "text-emerald-950 dark:text-emerald-100",
      glow: "from-emerald-600/30 via-teal-500/20 to-transparent",
      badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30",
      accent: "text-emerald-800 dark:text-emerald-300",
      initials: "THT",
      logoGradient: "from-emerald-600 via-teal-600 to-emerald-800",
      ringColor: "ring-emerald-500/30",
    };
  }
  if (n.includes("redcare")) {
    return {
      bg: "bg-gradient-to-br from-red-500/10 via-rose-500/5 to-orange-500/10 dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950",
      border: "border-red-200 dark:border-red-800/80 hover:border-red-400 dark:hover:border-red-400",
      text: "text-red-950 dark:text-red-100",
      glow: "from-red-500/30 via-rose-500/20 to-transparent",
      badgeBg: "bg-red-600 text-white shadow-red-500/30",
      accent: "text-red-800 dark:text-red-300",
      initials: "RDC",
      logoGradient: "from-red-600 via-rose-600 to-red-800",
      ringColor: "ring-red-500/30",
    };
  }

  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: "bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-blue-500/10 dark:from-sky-950/80 dark:via-slate-900 dark:to-slate-950", border: "border-sky-200 dark:border-sky-800/80 hover:border-sky-400 dark:hover:border-sky-400", text: "text-sky-950 dark:text-sky-100", glow: "from-sky-500/30 via-blue-500/20 to-transparent", badgeBg: "bg-sky-600 text-white shadow-sky-500/30", accent: "text-sky-800 dark:text-sky-300", logoGradient: "from-sky-600 to-blue-700", ringColor: "ring-sky-500/30" },
    { bg: "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 dark:from-indigo-950/80 dark:via-slate-900 dark:to-slate-950", border: "border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-400", text: "text-indigo-950 dark:text-indigo-100", glow: "from-indigo-500/30 via-purple-500/20 to-transparent", badgeBg: "bg-indigo-600 text-white shadow-indigo-500/30", accent: "text-indigo-800 dark:text-indigo-300", logoGradient: "from-indigo-600 to-purple-700", ringColor: "ring-indigo-500/30" },
    { bg: "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/80 dark:via-slate-900 dark:to-slate-950", border: "border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-400 dark:hover:border-emerald-400", text: "text-emerald-950 dark:text-emerald-100", glow: "from-emerald-500/30 via-teal-500/20 to-transparent", badgeBg: "bg-emerald-600 text-white shadow-emerald-500/30", accent: "text-emerald-800 dark:text-emerald-300", logoGradient: "from-emerald-600 to-teal-700", ringColor: "ring-emerald-500/30" },
  ];

  const p = palettes[Math.abs(hash) % palettes.length];
  return {
    ...p,
    initials,
  };
};

export function HmoCarousel({ partners }: { partners: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const itemsPerPage = 12;

  if (!partners || partners.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#008ac9] to-sky-600 text-white w-16 h-16 mx-auto flex items-center justify-center font-bold shadow-xl shadow-sky-500/30">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Accredited HMO Partners</h3>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed font-normal">
          Isalu Hospitals accepts all accredited Health Maintenance Organizations across Nigeria for seamless cashless consultations and treatments.
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

  return (
    <div className="relative max-w-7xl mx-auto px-4 space-y-8">
      {/* Search Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-1/2 lg:w-96">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search HMO provider or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setGridPage(1);
            }}
            className="w-full pl-12 pr-10 py-3 text-sm sm:text-base rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008ac9] transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setGridPage(1);
              }}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <span className="text-xs sm:text-sm font-extrabold text-[#008ac9] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-4 py-2.5 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 shrink-0 flex items-center gap-2 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-[#008ac9] dark:text-sky-400" />
          {filteredPartners.length} Accredited Providers
        </span>
      </div>

      {filteredPartners.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <Search className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">No HMO provider matches your search</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try searching with a different provider name or code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {paginatedGridItems.map((hmo) => (
            <div
              key={hmo.id}
              className={`bg-white dark:bg-slate-900 ${hmo.brand.border} border-2 rounded-[2rem] p-6 shadow-lg shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:shadow-sky-500/15 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between items-center text-center group relative overflow-hidden backdrop-blur-lg`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${hmo.brand.logoGradient}`} />
              <div className={`absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-gradient-to-br ${hmo.brand.glow} opacity-20 group-hover:opacity-70 group-hover:scale-125 transition-all duration-500 blur-2xl pointer-events-none`} />

              <div className="w-full flex items-center justify-between mb-4 z-10">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Verified
                </span>
                <code className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border ${hmo.brand.border} ${hmo.brand.accent} shadow-inner`}>
                  {hmo.code}
                </code>
              </div>

              <div className="flex flex-col items-center space-y-3 z-10 w-full my-2">
                <div className="relative group-hover:scale-110 transition-transform duration-300">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${hmo.brand.logoGradient} text-white font-black text-xl shadow-xl shadow-sky-900/20 flex items-center justify-center border-4 border-white dark:border-slate-800 ring-2 ${hmo.brand.ringColor} tracking-wider`}>
                    {hmo.brand.initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-md">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                  </div>
                </div>

                <h4 className={`font-black text-base sm:text-lg leading-snug tracking-tight text-slate-900 dark:text-white line-clamp-2`}>
                  {hmo.name}
                </h4>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200 z-10 group-hover:text-[#008ac9] dark:group-hover:text-sky-300 transition-colors">
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> Instant Verification
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            disabled={gridPage === 1}
            onClick={() => setGridPage((p) => Math.max(1, p - 1))}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 disabled:opacity-40 hover:border-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800 transition-all shadow-md"
          >
            Previous
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300">
            Page {gridPage} of {totalPages}
          </span>
          <button
            disabled={gridPage === totalPages}
            onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 disabled:opacity-40 hover:border-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800 transition-all shadow-md"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const location = useLocation();

  // Scrollspy & Navigation state
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Interactive Transparent UI Modal State
  const [isNavModalOpen, setIsNavModalOpen] = useState<boolean>(false);
  const [activeGuideStep, setActiveGuideStep] = useState<number>(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 120);
      setShowBackToTop(scrollY > 400);

      const heroEl = document.getElementById("hero-section");
      const specsEl = document.getElementById("specialized-medical-centers");
      const hmoEl = document.getElementById("hmo-partners");
      const reviewsEl = document.getElementById("patient-testimonials");

      const offsets = [
        { id: "hero", top: heroEl ? heroEl.offsetTop - 200 : 0 },
        { id: "specialized-medical-centers", top: specsEl ? specsEl.offsetTop - 200 : 0 },
        { id: "hmo-partners", top: hmoEl ? hmoEl.offsetTop - 200 : 0 },
        { id: "patient-testimonials", top: reviewsEl ? reviewsEl.offsetTop - 200 : 0 },
      ];

      for (let i = offsets.length - 1; i >= 0; i--) {
        if (scrollY >= offsets[i].top) {
          setActiveSection(offsets[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (window.location.hash === "#specialized-medical-centers") {
      setTimeout(() => {
        scrollToSection("specialized-medical-centers");
      }, 150);
    }
  }, [location.hash]);

  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [clinicSearchQuery, setClinicSearchQuery] = useState("");

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
            .filter((d: any) => d.status !== false && d.status !== "Disabled" && d.status !== "Inactive")
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
          .filter((d: any) => d.status !== false && d.status !== "Disabled" && d.status !== "Inactive")
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
          .filter((d: any) => d.status !== false && d.status !== "Disabled" && d.status !== "Inactive")
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

  const filteredDepartments = activeDepartmentsList.filter((dept: any) => {
    if (!clinicSearchQuery.trim()) return true;
    const q = clinicSearchQuery.toLowerCase().trim();
    return (
      (dept.name && dept.name.toLowerCase().includes(q)) ||
      (dept.description && dept.description.toLowerCase().includes(q))
    );
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

  const navGuideSteps = [
    {
      step: 1,
      title: "Hero & Quick Clinic Selector",
      targetId: "hero-section",
      description: "Quickly view available specialist slots and issue an instant online ticket directly from the hero dashboard.",
      icon: Compass,
      color: "from-sky-500 to-blue-600",
    },
    {
      step: 2,
      title: "Specialized Medical Centers",
      targetId: "specialized-medical-centers",
      description: "Browse or search through our active clinical specialty departments, physician schedules, and duty hours.",
      icon: Stethoscope,
      color: "from-teal-500 to-emerald-600",
    },
    {
      step: 3,
      title: "Accredited HMO Partners",
      targetId: "hmo-partners",
      description: "Filter and verify accredited Health Maintenance Organizations across Nigeria for pre-authorized cashless care.",
      icon: ShieldCheck,
      color: "from-indigo-500 to-purple-600",
    },
    {
      step: 4,
      title: "Verified Testimonials",
      targetId: "patient-testimonials",
      description: "Read real feedback and verified check-in experiences from thousands of treated patients.",
      icon: Star,
      color: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 font-sans tracking-normal animate-fadeIn text-slate-900 dark:text-slate-100 relative">

      {/* 1. FLOATING MODERN SCROLLSPY NAVIGATION DOCK WITH INTERACTIVE MODAL BUTTON */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 max-w-2xl w-[94%] sm:w-auto ${isScrolled ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-8 pointer-events-none"
          }`}
      >
        <div className="bg-slate-900/85 dark:bg-slate-950/90 text-white backdrop-blur-2xl border border-slate-700/80 px-3 py-2 rounded-full shadow-2xl flex items-center justify-between gap-1 sm:gap-2 text-xs font-bold ring-1 ring-white/10">
          <button
            onClick={() => scrollToSection("hero-section")}
            className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 ${activeSection === "hero" ? "bg-[#008ac9] text-white shadow-lg shadow-sky-500/30" : "hover:bg-slate-800/80 text-slate-300"
              }`}
          >
            <Compass className="h-3.5 w-3.5 text-sky-300" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <button
            onClick={() => scrollToSection("specialized-medical-centers")}
            className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 ${activeSection === "specialized-medical-centers" ? "bg-[#008ac9] text-white shadow-lg shadow-sky-500/30" : "hover:bg-slate-800/80 text-slate-300"
              }`}
          >
            <Stethoscope className="h-3.5 w-3.5 text-teal-300" />
            <span>Specialties</span>
          </button>

          <button
            onClick={() => scrollToSection("hmo-partners")}
            className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 ${activeSection === "hmo-partners" ? "bg-[#008ac9] text-white shadow-lg shadow-sky-500/30" : "hover:bg-slate-800/80 text-slate-300"
              }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>HMO Care</span>
          </button>

          <button
            onClick={() => scrollToSection("patient-testimonials")}
            className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 ${activeSection === "patient-testimonials" ? "bg-[#008ac9] text-white shadow-lg shadow-sky-500/30" : "hover:bg-slate-800/80 text-slate-300"
              }`}
          >
            <Star className="h-3.5 w-3.5 text-amber-300" />
            <span className="hidden sm:inline">Reviews</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Interactive Guide Trigger */}
          <button
            onClick={() => setIsNavModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-sky-500/20 to-teal-500/20 hover:from-sky-500/40 hover:to-teal-500/40 text-sky-300 rounded-full transition-all flex items-center gap-1.5 border border-sky-400/30"
            title="Open Interactive Navigation Guide"
          >
            <HelpCircle className="h-3.5 w-3.5 text-sky-300 animate-pulse" />
            <span className="hidden md:inline">Guide</span>
          </button>
        </div>
      </div>

      {/* 2. FLOATING QUICK ACTION ASSISTANT & BACK TO TOP (BOTTOM RIGHT) */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 transition-all duration-300 ${showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
          }`}
      >
        <a
          href="tel:08000000000"
          className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl shadow-rose-600/40 border border-rose-400/40 hover:scale-110 transition-all flex items-center justify-center group"
          title="24/7 Emergency Medical Dispatch"
        >
          <PhoneCall className="h-5 w-5 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-black pl-0 group-hover:pl-2">
            Emergency Dispatch
          </span>
        </a>

        <button
          onClick={() => scrollToSection("hero-section")}
          className="p-3.5 bg-slate-900/90 hover:bg-[#008ac9] text-white rounded-full shadow-2xl backdrop-blur-md border border-slate-700/80 hover:border-sky-300 hover:scale-110 transition-all flex items-center justify-center"
          title="Back to Top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      {/* 3. INTERACTIVE GLASSMORPISM MODAL WITH VIDEO PLAYER */}
      {isNavModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          {/* Transparent Glassmorphism Overlay */}
          <div
            onClick={() => setIsNavModalOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 dark:border-slate-800 shadow-2xl shadow-sky-950/50 p-6 sm:p-8 overflow-hidden z-10 transition-all">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#008ac9] to-teal-500 text-white shadow-lg shadow-sky-500/20">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h6 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    Book an Appointment in Less than 2 minutes
                  </h6>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">
                    Watch this short video to see how easy it is to book an appointment with us.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNavModalOpen(false)}
                type="button"
                aria-label="Close modal"
                className="p-2.5 rounded-2xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Embedded Responsive Video Player */}
            <div className="my-4 max-w-xl mx-auto relative aspect-video w-full rounded-2xl overflow-hidden bg-sky-150/40 border border-sky-100/30 shadow-lg shadow-sky-100/10 z-10">
              <video
                src="/vid.mp4"
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-2xl border-0"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Footer Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 relative z-10">
              <p className="text-xs text-slate-400 text-center sm:text-left">
                Need specialized care? Our emergency medical teams are active 24/7.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsNavModalOpen(false);
                  if (typeof scrollToSection === "function") {
                    scrollToSection("appointment");
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-extrabold text-white bg-[#008ac9] hover:bg-[#0072b1] rounded-2xl transition-all shadow-lg shadow-sky-500/25 shrink-0 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                <span>Book Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="hero-section" className="relative overflow-hidden bg-slate-950 text-white py-4 lg:py-1">
        {/* Ambient Mesh Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/20 via-slate-950 to-slate-950 opacity-90 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center min-h-[340px]">

            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">

              {/* Dynamic Assistance Pill with Thumbs Right/Point Icon */}
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3.5 py-1 text-xs font-semibold text-sky-300 border border-slate-800/80 backdrop-blur-xl shadow-md">
                <PhoneCall className="h-5.5 w-5.5 text-white animate-bounce" />
                <span>Need help?</span>
                <ThumbsUp className="h-3.5 w-3.5 text-amber-400 transform rotate-90" />
                <span>Call</span>
                <a
                  href="tel:+2348062287502"
                  className="text-white hover:text-sky-300 transition-colors font-bold underline decoration-sky-400/50 underline-offset-2"
                >
                  08062287502
                </a>
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                <span className="block mb-2 sm:mb-3">Quality Healthcare</span>
                <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-sky-200 bg-clip-text text-transparent drop-shadow-sm block">
                  You Can Trust.
                </span>
              </h1>

              {/* Beautified & Animated Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
                {/* Primary CTA */}
                <button
                  onClick={() => scrollToSection("specialized-medical-centers")}
                  className="group relative w-full sm:w-auto px-6 py-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#008ac9] via-sky-500 to-[#0072b1] text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 border border-sky-400/30"
                >
                  <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
                  <span className="relative z-10 tracking-wide">Book Appointment</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>

                {/* Secondary CTA */}
                <button
                  onClick={() => setIsNavModalOpen(true)}
                  className="group relative w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md shadow-md hover:shadow-sky-500/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5"
                >
                  <Compass className="h-4 w-4 text-sky-400 transition-transform duration-500 group-hover:rotate-45" />
                  <span className="tracking-wide">Navigation Guide</span>
                </button>
              </div>

              {/* Sleek Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-900/80">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <h3 className="text-base sm:text-lg font-black text-[#008ac9]">24/7</h3>
                  <p className="text-[10px] font-medium text-slate-400">Emergency Care</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <h3 className="text-base sm:text-lg font-black text-sky-400">{allDoctors.length}+</h3>
                  <p className="text-[10px] font-medium text-slate-400">Lead Specialists</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <h3 className="text-base sm:text-lg font-black text-teal-400">100%</h3>
                  <p className="text-[10px] font-medium text-slate-400">Verified Booking</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 relative flex items-center justify-center h-[300px] sm:h-[340px] w-full">

              {/* Tilted Accent Shape Card */}
              <div className="absolute w-[85%] h-[75%] bg-amber-400 rounded-[2.2rem] transform -rotate-12 translate-y-3 shadow-2xl" />

              {/* Ambient Glow */}
              <div className="absolute w-[80%] h-[70%] bg-sky-500/20 rounded-[2.2rem] transform rotate-6 blur-xl pointer-events-none" />

              {/* Maximized Cutout Subject Image */}
              <img
                src="/isalu-hero.png"
                alt="Healthcare professional"
                className="relative z-10 max-h-[140%] w-auto object-contain object-bottom filter brightness-105 contrast-[1.02] drop-shadow-2xl pointer-events-none transform scale-130 translate-y-3 transition-transform duration-500 hover:scale-135"
              />

              {/* Floating Status Badge */}
              <div className="absolute top-8 -left-2 sm:-left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-sky-300 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xl shadow-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Dedicated Patient Care
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* SPECIALIZED CLINICAL DEPARTMENTS SECTION WITH SUBTLE BACKGROUND ACCENT & GLASS CARDS */}
      <section id="specialized-medical-centers" className="relative py-10 md:py-8 scroll-mt-20 overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
        {/* Subtle, Scaled-Down Background Image Accent */}
        <div className="absolute top-0 right-0 w-full md:w-2/3 h-96 opacity-15 dark:opacity-10 pointer-events-none overflow-hidden select-none">
          <img
            src="/health_icons_doodle_bg.jpg"
            alt=""
            className="w-full h-full object-cover object-right-top filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-slate-950/80 dark:to-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 dark:from-slate-950 via-transparent to-transparent" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-3 space-y-3">
            <span className="inline-block px-2 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-[#008ac9] dark:text-sky-300 text-xs sm:text-sm font-bold uppercase tracking-wider border border-sky-400/30 dark:border-sky-500/30 backdrop-blur-md shadow-xs">
              Our Clinics
            </span>
          </div>

          {/* Glass Search Bar */}
          <div className="relative group max-w-2xl mx-auto mb-10">
            {/* Gradient Backlight Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 via-teal-400 to-amber-400 rounded-[2rem] opacity-75 blur-md group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none" />

            {/* Main Glass Shell */}
            <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-slate-700/60 rounded-[1.75rem] p-2 shadow-xl flex items-center justify-between gap-2.5 transition-all">

              {/* Input Field Wrapper */}
              <div className="relative w-full flex items-center">
                {/* Search Icon */}
                <Search className="absolute left-3.5 h-4 w-4 text-sky-500 dark:text-sky-400 pointer-events-none transition-colors group-focus-within:text-teal-500 z-10" />

                <input
                  type="text"
                  placeholder="Search specialty clinic..."
                  value={clinicSearchQuery}
                  onChange={(e) => setClinicSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border-2 border-sky-400/20 dark:border-sky-500/20 bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-sky-400 dark:focus:border-teal-400 focus:ring-4 focus:ring-sky-500/15 dark:focus:ring-teal-400/15 transition-all duration-300 font-medium shadow-inner"
                />

                {/* Clear Button */}
                {clinicSearchQuery && (
                  <button
                    onClick={() => setClinicSearchQuery("")}
                    className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all z-10"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Live Clinic Counter Badge */}
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-emerald-500/10 border border-sky-400/30 text-sky-600 dark:text-sky-300 font-extrabold text-xs shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span>{filteredDepartments.length}</span>
                <span className="hidden sm:inline">Clinics</span>
              </div>

            </div>
          </div>

          {/* Empty State */}
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 dark:border-slate-800/80 max-w-md mx-auto shadow-xl">
              <Search className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">No specialty clinic found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                No clinic matches "{clinicSearchQuery}". Try searching another keyword.
              </p>
              <button
                onClick={() => setClinicSearchQuery("")}
                className="mt-4 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#008ac9] bg-sky-50/80 dark:bg-slate-800/80 rounded-2xl hover:bg-sky-100 transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Clinic Grid */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDepartments.map((dept) => {
                const Icon = resolveIconForDept(dept);
                const specCount = getSpecialistCountForDept(dept.id, dept.name, dept.doctorCount);

                // Collect schedules and available days with times for doctors in this department
                const deptDocs = allDoctors.filter((doc) => {
                  let rawDeptId = "";
                  if (typeof doc.department === "string") rawDeptId = doc.department;
                  else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
                  if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
                  if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

                  const cleanDocDept = String(rawDeptId).toLowerCase().replace(/[^a-z0-9]/g, "");
                  const cleanDeptId = String(dept.id).toLowerCase().replace(/[^a-z0-9]/g, "");
                  const cleanDeptName = String(dept.name).toLowerCase().replace(/[^a-z0-9]/g, "");

                  return cleanDocDept === cleanDeptId || cleanDocDept === cleanDeptName;
                });

                const dayScheduleMap = new Map<string, string>();

                deptDocs.forEach((doc) => {
                  if (doc.status === false || doc.status === 0 || doc.status === "0" || doc.status === "false") return;

                  const docSched = schedulesList.find((s) => {
                    if (s.status === false || s.status === 0 || s.status === "0" || s.status === "false" || s.status === "Inactive") return false;
                    const sDocId = String(s.doctorId || s.doctor_id || s.doctor?.doc_id || s.doctor?.id || s.doctor || "").toLowerCase().trim();
                    const sDocName = String(s.doctorName || s.doctor_name || s.doctor?.full_name || s.doctor?.name || "").toLowerCase().trim();
                    const dId = String(doc.id || doc.doc_id || "").toLowerCase().trim();
                    const dName = String(doc.fullName || doc.name || "").toLowerCase().trim();
                    return (sDocId && dId && sDocId === dId) || (sDocName && dName && sDocName === dName);
                  });

                  let dutyDays: string[] = [];
                  if (docSched) {
                    dutyDays = docSched.dutyDays || docSched.duty_days || [];
                  }
                  if (dutyDays.length === 0) {
                    dutyDays = doc.availableDays || doc.availability || [];
                  }

                  dutyDays.forEach((day: string) => {
                    let shiftTime = "";
                    if (docSched?.dayConfigs && docSched.dayConfigs[day]) {
                      const cfg = docSched.dayConfigs[day];
                      shiftTime = cleanShiftTimeStr(Array.isArray(cfg.shiftTimes) ? cfg.shiftTimes.join(", ") : cfg.shiftTime);
                    } else if (docSched?.shiftTime || docSched?.shift_time) {
                      shiftTime = cleanShiftTimeStr(docSched.shiftTime || docSched.shift_time);
                    } else if (doc.timeSlots && doc.timeSlots.length > 0) {
                      shiftTime = cleanShiftTimeStr(doc.timeSlots[0]);
                    }

                    if (shiftTime && !dayScheduleMap.has(day)) {
                      dayScheduleMap.set(day, shiftTime);
                    }
                  });
                });

                const scheduleEntries = Array.from(dayScheduleMap.entries());

                return (
                  <div
                    key={dept.id}
                    className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] border border-white/80 dark:border-slate-800 hover:border-[#008ac9]/70 dark:hover:border-sky-500/70 transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-sky-500/15 hover:-translate-y-2 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Glass Highlights */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#008ac9] via-sky-400 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 group-hover:scale-150 transition-all duration-500 pointer-events-none" />

                    <div className="p-6 sm:p-7 relative z-10 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/15 via-sky-500/10 to-teal-500/15 dark:from-sky-500/25 dark:to-teal-500/25 border border-sky-300/40 dark:border-sky-700/50 text-[#008ac9] dark:text-sky-300 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#008ac9] group-hover:to-teal-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-sky-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                              <Icon className="h-7 w-7" />
                            </div>
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 dark:bg-sky-950/80 text-[#008ac9] dark:text-sky-300 text-xs font-extrabold border border-sky-300/30 dark:border-sky-800/80 shadow-2xs backdrop-blur-md">
                            <Users className="h-3.5 w-3.5 text-[#008ac9] dark:text-sky-400" />
                            {specCount} {specCount === 1 ? "Specialist" : "Specialists"}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-[#008ac9] dark:group-hover:text-sky-300 transition-colors leading-snug tracking-tight">
                          {dept.name}
                        </h3>
                      </div>

                      {/* Glass Schedule Card */}
                      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-3.5 border border-white/60 dark:border-slate-700/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#008ac9] dark:text-sky-400 border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Clinic Days & Hours</span>
                        </div>

                        {scheduleEntries.length > 0 ? (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {scheduleEntries.map(([day, time]) => (
                              <div
                                key={day}
                                className="group flex items-center justify-between rounded-md bg-gradient-to-r from-sky-500/5 via-purple-500/5 to-pink-500/5 px-2 py-1 text-xs font-medium transition-all hover:from-sky-500/10 hover:to-pink-500/10"
                              >
                                {/* Compact Day Label */}
                                <span className="font-bold bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-purple-400">
                                  {day}
                                </span>

                                {/* Compact Time Badge */}
                                <span className="flex items-center gap-1 rounded border border-sky-200/50 bg-sky-50/80 px-1.5 py-0.5 text-[11px] text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100">
                                  <Clock className="h-2.5 w-2.5 text-sky-500 dark:text-sky-400" />
                                  <span>{time}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 py-1 italic text-center">
                            Schedule to be announced
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 pt-2 relative z-10">
                      <Link
                        to={`/book?department=${dept.id}`}
                        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#008ac9] via-sky-600 to-[#0072b1] hover:from-[#0072b1] hover:to-sky-700 text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>Book Appointment</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="hmo-partners" className="py-20 md:py-8 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 scroll-mt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 text-[#008ac9] dark:text-sky-400 text-xs sm:text-sm font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-800 shadow-xs">
              Healthcare Insurance
            </span>
            <h2 className="text-2xl sm:text-2xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Our HMO Partners in Nigeria
            </h2>
          </div>

          <HmoCarousel partners={hmoPartnersList} />
        </div>
      </section>

      {/* PATIENT TESTIMONIALS SECTION WITH ENHANCED CARDS */}
      <section id="patient-testimonials" className="py-20 md:py-28 border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-white relative overflow-hidden scroll-mt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-slate-800/80 text-sky-400 text-xs sm:text-sm font-bold uppercase tracking-wider border border-slate-700">
              Patient Feedback
            </span>
            <h2 className="text-2xl sm:text-2xl lg:text-2xl font-black text-white tracking-tight">
              Trusted by Thousands of Patients
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Real feedback from patients who received specialized medical care at Isalu Hospitals.
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
                  "Booking online was fast and smooth. The verified ticket code made reception check-in instant. Specialist was very attentive and thorough.",
              },
              {
                name: "Funmi A.",
                clinic: "Obstetrics & Gynaecology",
                date: "Visited August 2026",
                rating: 5,
                comment:
                  "Hygeia HMO verification took less than a minute. Clean facilities and friendly, attentive medical staff.",
              },
              {
                name: "Chidi N.",
                clinic: "Paediatrics & Child Health",
                date: "Visited August 2026",
                rating: 5,
                comment:
                  "Very impressed with the specialist pediatric care. Prompt appointment without long waiting lines.",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-sky-500/60 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-400" />
                      ))}
                      <span className="text-xs font-black text-amber-300 ml-1">5.0</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified Patient
                    </span>
                  </div>

                  <Quote className="h-9 w-9 text-sky-400 mb-3 opacity-90" />
                  <p className="text-sm sm:text-base font-medium text-slate-200 italic leading-relaxed mb-6">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#008ac9] via-sky-600 to-teal-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">{t.name}</h4>
                      <p className="text-xs font-bold text-sky-400">{t.clinic}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700/60 shrink-0">
                    {t.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}