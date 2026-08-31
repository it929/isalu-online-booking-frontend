import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  Baby,
  CalendarCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  X,
  Stethoscope,
  CheckCircle2,
  Star,
  Award,
  Zap,
  CreditCard,
} from "lucide-react";

export function GynaecologyPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Do not display popup on admin portal pages
    if (location.pathname.startsWith("/admin")) {
      setIsOpen(false);
      return;
    }

    // Trigger popup exactly 3 seconds after page load
    const timer = setTimeout(() => {
      const isDismissed = sessionStorage.getItem("isalu_gynae_popup_dismissed") === "true";
      if (!isDismissed) {
        setIsOpen(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("isalu_gynae_popup_dismissed", "true");
  };

  const handleBookNow = () => {
    setIsOpen(false);
    sessionStorage.setItem("isalu_gynae_popup_dismissed", "true");
    navigate("/book?department=gynaecology");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/30 dark:bg-slate-950/40 backdrop-blur-xs animate-fadeIn overflow-y-auto overflow-x-hidden w-full max-w-full">
      {/* Visual Backdrop Overlay (Clicking outside does NOT close popup) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Main Fascinating Modal Card (Fully Responsive & No Horizontal Scroll) */}
      <div className="relative w-full max-w-md my-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white/95 dark:bg-slate-900/95 bg-gradient-to-b from-white via-rose-50/40 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40 border-2 border-rose-300 dark:border-rose-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-rose-950/30 z-10 animate-scaleUp transform transition-all flex flex-col justify-between box-border">
        {/* Ambient Decorative Background Glow Spheres */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-[#008ac9]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge & Close Button */}
        <div className="flex items-center justify-between gap-2 mb-3 relative z-10 w-full min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 text-[10px] sm:text-[11px] font-black border border-rose-300 dark:border-rose-800 shadow-sm shrink min-w-0 truncate">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="uppercase tracking-wider truncate">● 24/7 Daily Specialist Care</span>
          </div>

          {/* Close Button ('X') */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all border border-slate-200 dark:border-slate-700 shadow-sm group shrink-0"
            title="Close Notification"
          >
            <X className="h-4 w-4 transform group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Main Content Hero (Centered) */}
        <div className="text-center space-y-3 relative z-10 my-auto w-full min-w-0">
          {/* Floating Emblem */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 border-3 border-white dark:border-slate-800 transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 fill-current animate-pulse text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-amber-400 text-slate-950 font-black shadow-sm border-2 border-white dark:border-slate-800">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>

          <div className="w-full min-w-0">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words">
              Obstetrics & Gynaecology Consultations Are <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent underline decoration-rose-400/50">Always Available Everyday!</span>
            </h2>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed break-words">
              At Isalu Hospitals, our Obstetrics & Gynaecology specialists are on duty <strong>7 days a week (including Thursdays)</strong> for comprehensive women's healthcare, prenatal consultations, and fertility evaluations.
            </p>
          </div>

          {/* Key Feature Benefits & Schedule Block */}
          <div className="text-left pt-1 w-full min-w-0">
            {/* Consultation Hours Featured Schedule Block */}
            <div className="w-full p-3 rounded-2xl bg-gradient-to-br from-sky-50/90 via-indigo-50/40 to-rose-50/40 dark:from-slate-800/90 dark:to-slate-800/60 border-2 border-sky-300/80 dark:border-sky-700/60 shadow-sm flex flex-col gap-2.5 min-w-0">
              {/* Header with Title & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0 border-b border-sky-200/50 dark:border-sky-800/50 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-xl bg-sky-500 text-white shrink-0 font-black shadow-xs">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      Consultation Hours & Schedule
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">Outpatient duty & specialist consultation times</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <span className="flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800">
                    <CreditCard className="h-3 w-3 text-indigo-500" /> Private Paying Client
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> Cashless HMO
                  </span>
                </div>
              </div>

              {/* Day Schedule Clean Rows */}
              <div className="space-y-1.5 text-[11px] font-bold">
                <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-sky-200/80 dark:border-sky-900/80 flex items-center justify-between gap-2 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 font-black">Mon, Tue, Thu, Fri, Sat</span>
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">10:00 AM – 5:00 PM</span>
                </div>

                <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-purple-200/80 dark:border-purple-900/80 flex items-center justify-between gap-2 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-black">Wednesday</span>
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">2:00 PM – 5:00 PM</span>
                </div>

                <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-900/80 flex items-center justify-between gap-2 shadow-2xs">
                  <span className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-black">Sunday</span>
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">4:00 PM – 8:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
            <button
              onClick={handleBookNow}
              className="w-full sm:flex-1 py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-rose-400/40 cursor-pointer min-w-0"
            >
              <CalendarCheck className="h-4 w-4 text-rose-200 shrink-0" />
              <span className="truncate">Book Gynaecology Consultation Now</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </button>

            {/* Dismiss Button ('Remind Me Later') */}
            <button
              onClick={handleClose}
              className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all border border-slate-300 dark:border-slate-700 shrink-0 text-center"
            >
              Remind Me Later
            </button>
          </div>

          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-0.5 break-words">
            🌸 Emergency Walk-Ins & Scheduled Outpatient Consultations Welcome • Isalu Hospitals Ogba, Ikeja
          </p>
        </div>
      </div>
    </div>
  );
}
