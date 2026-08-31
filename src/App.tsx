import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { AutoScrollWidget } from "./components/AutoScrollWidget";
import { GynaecologyPopup } from "./components/GynaecologyPopup";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const DoctorsPage = lazy(() => import("./pages/DoctorsPage").then((m) => ({ default: m.DoctorsPage })));
const BookAppointmentPage = lazy(() => import("./pages/BookAppointmentPage").then((m) => ({ default: m.BookAppointmentPage })));
const CheckAppointmentsPage = lazy(() => import("./pages/CheckAppointmentsPage").then((m) => ({ default: m.CheckAppointmentsPage })));
const HospitalDashboardPage = lazy(() => import("./pages/HospitalDashboardPage").then((m) => ({ default: m.HospitalDashboardPage })));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh] p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-[#008ac9] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-black text-[#008ac9] tracking-wider uppercase">Loading Booking Services...</span>
    </div>
  </div>
);

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      <Header />
      <main className="flex-1 flex flex-col">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/book" element={<BookAppointmentPage />} />
            <Route path="/appointments" element={<CheckAppointmentsPage />} />
            <Route path="/check-appointment" element={<CheckAppointmentsPage />} />
            <Route path="/admin" element={<HospitalDashboardPage />} />
          </Routes>
        </Suspense>
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
