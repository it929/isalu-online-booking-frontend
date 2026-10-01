import React from "react";
import { useHospital } from "../../context/HospitalContext";
import { Bell, User } from "lucide-react";

export function HeaderNavbar() {
  const { currentUser, activeDesk } = useHospital();

  const deskTitles: Record<string, string> = {
    helpdesk: "Helpdesk Reception & Booking",
    hmo: "HMO Pre-Authorization Desk",
    cashdesk: "Cashdesk & Billing",
    analytics: "Executive Analytics & Revenue",
    monitor: "Live Queue Monitor",
    users: "Staff Users & Roles",
    clinic: "Clinics Management",
    create_specialist_schedule: "Specialist Doctor Schedules",
    disabled_bookings: "Disabled & Archived Bookings"
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">
          {deskTitles[activeDesk] || "Hospital Management Dashboard"}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
            {currentUser?.name ? currentUser.name.charAt(0) : "A"}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{currentUser?.name || "Administrator"}</p>
            <p className="text-xs text-slate-400">{currentUser?.role || "Super Admin"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
