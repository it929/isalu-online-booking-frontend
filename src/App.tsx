import React from "react";
import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { AutoScrollWidget } from "./components/AutoScrollWidget";
import { GynaecologyPopup } from "./components/GynaecologyPopup";
import { HomePage } from "./pages/HomePage";
import { DoctorsPage } from "./pages/DoctorsPage";
import { BookAppointmentPage } from "./pages/BookAppointmentPage";
import { CheckAppointmentsPage } from "./pages/CheckAppointmentsPage";
import { HospitalDashboardPage } from "./pages/HospitalDashboardPage";

export function App() {
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const isCleared = localStorage.getItem("isalu_cache_v5_cleared");
        if (!isCleared) {
          localStorage.removeItem("isalu_hospital_doctors");
          localStorage.removeItem("isalu_hospital_departments");
          localStorage.removeItem("isalu_clinics_list");
          localStorage.setItem("isalu_cache_v5_cleared", "true");
          console.log("[Cache Reset] Cleared stale localStorage doctor and department caches.");
        }
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      <Header />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/book" element={<BookAppointmentPage />} />
          <Route path="/appointments" element={<CheckAppointmentsPage />} />
          <Route path="/check-appointment" element={<CheckAppointmentsPage />} />
          <Route path="/admin" element={<HospitalDashboardPage />} />
        </Routes>
      </main>
      <Footer />
      {/* Global Auto Scroll Controller (Top, Bottom, and Auto Scroll Loop) */}
      <AutoScrollWidget />
      {/* Fascinating 3-Second Gynaecology 24/7 Everyday Consultation Popup */}
      <GynaecologyPopup />
    </div>
  );
}

export default App;
