import React from "react";
import { useHospital } from "../../context/HospitalContext";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  CreditCard, 
  DollarSign, 
  Monitor, 
  Users, 
  Building2, 
  Calendar, 
  Trash2, 
  LogOut 
} from "lucide-react";

export function Sidebar() {
  const { activeDesk, setActiveDesk, isDeskAllowed, handleLogout } = useHospital();

  const navItems = [
    { id: "helpdesk", label: "Helpdesk Reception", icon: LayoutDashboard },
    { id: "hmo", label: "HMO Pre-Auth Desk", icon: ShieldCheck },
    { id: "cashdesk", label: "Cashdesk Billing", icon: CreditCard },
    { id: "analytics", label: "Executive Analytics", icon: DollarSign },
    { id: "monitor", label: "Live Queue Monitor", icon: Monitor },
    { id: "users", label: "Staff Users & Roles", icon: Users },
    { id: "clinic", label: "Clinics Management", icon: Building2 },
    { id: "create_specialist_schedule", label: "Specialist Schedules", icon: Calendar },
    { id: "disabled_bookings", label: "Disabled / Archive", icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <span className="font-bold text-white text-lg">Isalu Hospitals</span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const allowed = isDeskAllowed ? isDeskAllowed(item.id) : true;
          const isActive = activeDesk === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveDesk(item.id)}
              disabled={!allowed}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                  : allowed
                  ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                  : "opacity-40 cursor-not-allowed text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
