import React from "react";
import { useHospital } from "../../../context/HospitalContext";

export function PlaceholderDesk({ deskName }: { deskName: string }) {
  const { activeDesk } = useHospital();
  return (
    <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center">
      <h2 className="text-xl font-bold text-white mb-2">{deskName} View</h2>
      <p className="text-slate-400 text-sm">
        Modularized component container for <code className="text-cyan-400 font-mono">{activeDesk}</code>. Plug in your original subview logic here.
      </p>
    </div>
  );
}
