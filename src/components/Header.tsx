import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronDown,
  Users,
  Clock,
  Stethoscope,
  UserCheck,
  CreditCard,
  TrendingUp,
  Monitor,
  Heart,
  Baby,
  Eye,
  Activity,
  LogOut,
  UserCog,
  UserPlus,
  LayoutDashboard,
  Plus,
  Lock,
} from "lucide-react";
import { IsaluLogo } from "./IsaluLogo";

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"users" | "schedule" | "clinic" | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdminView =
    location.pathname.startsWith("/admin") ||
    sessionStorage.getItem("isalu_staff_authenticated") === "true";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (menu: "users" | "schedule" | "clinic") => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const publicNavigation = [
    { href: "/", name: "Home" },
    { href: "/#specialized-medical-centers", name: "Book Appointment", isScroll: true },
    { href: "/appointments", name: "Check Appointment" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to={isAdminView ? "/admin?desk=helpdesk" : "/"}
              onClick={() => {
                if (isAdminView) {
                  window.dispatchEvent(new CustomEvent("isalu_navigate_desk", { detail: "helpdesk" }));
                }
              }}
              className="flex items-center gap-2 hover:opacity-95 transition-transform hover:scale-[1.01]"
            >
              <IsaluLogo size="md" />
            </Link>

            {/* Navigation for Admin Users */}
            {isAdminView ? (
              <nav className="hidden lg:flex" ref={dropdownRef}>
                <ul className="flex items-center gap-3">
                  {/* 0. DASHBOARD DIRECT LINK */}
                  <li>
                    <Link
                      to="/admin?desk=helpdesk"
                      onClick={() => {
                        setActiveDropdown(null);
                        window.dispatchEvent(new CustomEvent("isalu_navigate_desk", { detail: "helpdesk" }));
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800 border border-transparent hover:border-sky-200 dark:hover:border-slate-700"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#008ac9]" />
                      Dashboard
                    </Link>
                  </li>

                  {/* 1. USERS DROPDOWN */}
                  <li className="relative">
                    <button
                      onClick={() => toggleDropdown("users")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        activeDropdown === "users"
                          ? "bg-[#008ac9] text-white shadow-md"
                          : "text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Users className="h-4 w-4 text-[#008ac9] group-hover:text-white" />
                      Users
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === "users" ? "rotate-180" : ""}`} />
                    </button>

                    {activeDropdown === "users" && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 z-50 animate-fadeIn">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Patient & Staff Records
                        </div>
                        <Link
                          to="/admin?desk=all_patients"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <Users className="h-4 w-4 text-[#008ac9]" /> All Patients Directory
                        </Link>
                        <Link
                          to="/admin?desk=checked_in_patients"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <UserCheck className="h-4 w-4 text-emerald-600" /> Reception Checked-In Patients
                        </Link>
                        <Link
                          to="/admin?desk=hmo_enrollees"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <ShieldCheck className="h-4 w-4 text-[#008ac9]" /> HMO Insurance Enrollees
                        </Link>
                        <Link
                          to="/admin?desk=private_patients"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <CreditCard className="h-4 w-4 text-purple-600" /> Private Self-Pay Patients
                        </Link>
                        <Link
                          to="/admin?desk=users"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-[#008ac9] dark:text-sky-400 bg-sky-50 dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 mt-1"
                        >
                          <UserCog className="h-4 w-4 text-[#008ac9]" /> ⚙️ Manage Users & Roles
                        </Link>
                      </div>
                    )}
                  </li>

                  {/* 2. SCHEDULE DROPDOWN */}
                  <li className="relative">
                    <button
                      onClick={() => toggleDropdown("schedule")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        activeDropdown === "schedule"
                          ? "bg-[#008ac9] text-white shadow-md"
                          : "text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Calendar className="h-4 w-4 text-[#008ac9]" />
                      Schedule
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === "schedule" ? "rotate-180" : ""}`} />
                    </button>

                    {activeDropdown === "schedule" && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 z-50 animate-fadeIn">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Queue & Timetable Management
                        </div>
                        <Link
                          to="/admin"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <Calendar className="h-4 w-4 text-[#008ac9]" /> Today's Consultation Schedule
                        </Link>
                        <Link
                          to="/admin"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <Monitor className="h-4 w-4 text-emerald-600" /> Live Room & Monitor Queue
                        </Link>
                        <Link
                          to="/admin"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <TrendingUp className="h-4 w-4 text-sky-500" /> Capacity & Queue Analytics
                        </Link>
                        <Link
                          to="/admin?desk=create_specialist_schedule"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-[#008ac9] dark:text-sky-400 bg-sky-50 dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 mt-1"
                        >
                          <Calendar className="h-4 w-4 text-[#008ac9]" /> 🗓️ Create Specialist Schedule
                        </Link>
                      </div>
                    )}
                  </li>

                  {/* 3. CLINIC DROPDOWN (Admin Restricted) */}
                  <li className="relative">
                    <button
                      onClick={() => toggleDropdown("clinic")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        activeDropdown === "clinic"
                          ? "bg-[#008ac9] text-white shadow-md"
                          : "text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-[#008ac9]" />
                      Clinic
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === "clinic" ? "rotate-180" : ""}`} />
                    </button>

                    {activeDropdown === "clinic" && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 z-50 animate-fadeIn">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Hospital Clinic Directory
                        </div>
                        <Link
                          to="/admin?desk=clinic"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[#008ac9]"
                        >
                          <Building2 className="h-4 w-4 text-[#008ac9]" /> All Clinics Directory
                        </Link>
                        <Link
                          to="/admin?desk=clinic&action=create"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-[#008ac9] dark:text-sky-400 bg-sky-50 dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-slate-800 border border-sky-200 dark:border-slate-700 mt-1"
                        >
                          <Plus className="h-4 w-4 text-[#008ac9]" /> ➕ Create New Clinic
                        </Link>
                      </div>
                    )}
                  </li>
                </ul>
              </nav>
            ) : (
              /* Navigation for Public Patients */
              <nav className="hidden lg:flex">
                <ul className="flex items-center gap-2">
                  {publicNavigation.map((item) => {
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== "/" && location.pathname.startsWith(item.href));

                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={(e) => {
                            if ((item as any).isScroll && location.pathname === "/") {
                              e.preventDefault();
                              const elem = document.getElementById("specialized-medical-centers");
                              if (elem) {
                                elem.scrollIntoView({ behavior: "smooth", block: "start" });
                              }
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                            isActive
                              ? "bg-[#008ac9] text-white shadow-md shadow-[#008ac9]/25"
                              : "text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>

          {/* Right Header Action Buttons */}
          <div className="flex items-center gap-3">
            {isAdminView ? (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/admin?desk=helpdesk"
                  onClick={() => window.dispatchEvent(new CustomEvent("isalu_navigate_desk", { detail: "helpdesk" }))}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-slate-800 border border-sky-300 dark:border-slate-700 flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4 text-[#008ac9]" />
                  Staff Desk Portal
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/appointments"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="h-4 w-4 text-[#008ac9]" />
                  Check Status
                </Link>
                <Link
                  to="/#specialized-medical-centers"
                  onClick={(e) => {
                    if (location.pathname === "/") {
                      e.preventDefault();
                      const elem = document.getElementById("specialized-medical-centers");
                      if (elem) {
                        elem.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#008ac9] hover:bg-[#0076ad] shadow-lg shadow-[#008ac9]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 border border-[#008ac9]"
                >
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  Book Appointment
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
          {isAdminView ? (
            <div className="space-y-3">
              <div className="font-black text-xs uppercase text-[#008ac9] tracking-wider px-2">Admin Portal Menu</div>
              <Link
                to="/admin?desk=helpdesk"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("isalu_navigate_desk", { detail: "helpdesk" }));
                }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black bg-[#008ac9] text-white shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4" /> Hospital Dashboard
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                👥 Users (Patient & Staff Directory)
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                📅 Schedule (Queue & Shift Timetable)
              </Link>
              <Link
                to="/admin?desk=clinic"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                🏥 Clinic Management (Admin Only)
              </Link>
            </div>
          ) : (
            publicNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if ((item as any).isScroll && location.pathname === "/") {
                    e.preventDefault();
                    const elem = document.getElementById("specialized-medical-centers");
                    if (elem) {
                      elem.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }
                }}
                className="block rounded-xl px-4 py-3 text-base font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {item.name}
              </Link>
            ))
          )}
        </div>
      )}
    </header>
  );
}
