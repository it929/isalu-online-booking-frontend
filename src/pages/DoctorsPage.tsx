import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DOCTORS, DEPARTMENTS } from "../data/doctors";
import { Search, Star, Clock, MapPin, ArrowRight, Calendar, Flame } from "lucide-react";
import { SpecialistAvatar } from "../components/SpecialistAvatar";
import { getDoctorsAPI, getDepartmentsAPI } from "../api/client";

export function DoctorsPage() {
  const [departmentsList, setDepartmentsList] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hospital_departments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEPARTMENTS;
  });

  const [selectedDept, setSelectedDept] = useState(departmentsList[0]?.id || "endocrinology");
  const [searchQuery, setSearchQuery] = useState("");
  const [allDoctors, setAllDoctors] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hospital_doctors");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    localStorage.removeItem("isalu_hospital_doctors");
    return [];
  });

  useEffect(() => {
    async function syncData() {
      const remoteDepts = await getDepartmentsAPI();
      if (remoteDepts && remoteDepts.length > 0) {
        const mapped = remoteDepts.map((d: any) => ({
          id: d.dept_id || d.id,
          name: d.name,
          description: d.description || "",
          iconName: d.icon_name || d.iconName || "Stethoscope",
          doctorCount: d.doctor_count || d.doctorCount || 0,
        }));
        setDepartmentsList(mapped);
        localStorage.setItem("isalu_hospital_departments", JSON.stringify(mapped));
      }
      const remoteDoctors = await getDoctorsAPI();
      if (remoteDoctors && Array.isArray(remoteDoctors)) {
        setAllDoctors(remoteDoctors);
        localStorage.setItem("isalu_hospital_doctors", JSON.stringify(remoteDoctors));
      }
    }
    syncData();
  }, []);

  const getDoctorSlotStats = (doctorId: string, timeSlotsCount: number) => {
    const existingBookings = (JSON.parse(localStorage.getItem("isalu_bookings") || localStorage.getItem("medicare_bookings") || "[]") || []) as any[];
    const bookedForDoc = existingBookings.filter((b) => b.doctorId === doctorId && b.status !== "Cancelled").length;
    const totalCapacity = Math.max(8, timeSlotsCount * 2);
    const remaining = Math.max(1, totalCapacity - bookedForDoc);
    return { bookedCount: bookedForDoc, totalCapacity, remaining };
  };

  const filteredDoctors = allDoctors.filter((doc: any) => {
    const isNotDisabled = !doc.status || doc.status === "Active" || !doc.status.includes("Disabled");
    const deptObj = DEPARTMENTS.find((d) => d.id === selectedDept);
    const matchesDept =
      doc.departmentId === selectedDept ||
      (deptObj && doc.specialty?.toLowerCase().includes(deptObj.name.toLowerCase())) ||
      (deptObj && deptObj.name.toLowerCase().includes(doc.specialty?.toLowerCase()));
    const matchesSearch =
      (doc.name && doc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()));
    return isNotDisabled && matchesDept && matchesSearch;
  });

  const doctorsGridRef = React.useRef<HTMLDivElement>(null);

  const handleSelectDept = (deptId: string) => {
    setSelectedDept(deptId);
    setTimeout(() => {
      doctorsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#008ac9]/10 text-[#008ac9] dark:text-sky-400 text-xs font-black uppercase tracking-widest border-2 border-[#008ac9]/20">
            Consultant Directory
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Our Specialist Doctors
          </h1>
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">
            Select a specific clinic department below to view its assigned specialists, available days, and remaining slot countdowns.
          </p>

          {/* Search Bar */}
          <div className="pt-2 max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search specialist by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-[#008ac9] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Department Specific Tabs */}
        <div className="mb-10 flex flex-wrap gap-2.5 justify-center">
          {departmentsList.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleSelectDept(dept.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md ${
                selectedDept === dept.id
                  ? "bg-[#008ac9] text-white border-2 border-[#008ac9]"
                  : "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-[#008ac9]"
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Doctor Grid */}
        <div ref={doctorsGridRef} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 scroll-mt-24">
          {filteredDoctors.map((doc: any) => {
            const safeTimeSlots = Array.isArray(doc.timeSlots) ? doc.timeSlots : ["08:00 AM – 12:00 PM", "01:00 PM – 05:00 PM"];
            const savedSchedules = (JSON.parse(localStorage.getItem("isalu_specialist_schedules") || "[]") || []) as any[];
            const docSched = savedSchedules.find((s: any) => {
              const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
              const dId = String(doc.id || "").toLowerCase().trim();
              const dDocId = String(doc.doc_id || "").toLowerCase().trim();
              if (sDocId && (sDocId === dId || sDocId === dDocId)) return true;
              const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
              const dName = String(doc.name || "").toLowerCase().trim();
              const dFullName = String(doc.fullName || doc.full_name || "").toLowerCase().trim();
              if (sName && dName && (sName.includes(dName) || dName.includes(sName))) return true;
              if (sName && dFullName && (sName.includes(dFullName) || dFullName.includes(sName))) return true;
              return false;
            });
            const safeDays = docSched && Array.isArray(docSched.dutyDays || docSched.duty_days) && (docSched.dutyDays || docSched.duty_days).length > 0
              ? (docSched.dutyDays || docSched.duty_days)
              : Array.isArray(doc.availableDays) && doc.availableDays.length > 0
              ? doc.availableDays
              : Array.isArray(doc.available_days) && doc.available_days.length > 0
              ? doc.available_days
              : Array.isArray(doc.availability) && doc.availability.length > 0
              ? doc.availability
              : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

            const { bookedCount, totalCapacity, remaining } = getDoctorSlotStats(
              doc.id,
              safeTimeSlots.length
            );
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#008ac9] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex gap-4 items-start">
                    <SpecialistAvatar name={doc.acronym || doc.name} imageUrl={doc.image} size="md" />
                    <div className="flex-1">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">{doc.acronym || doc.name}</h3>
                      <p className="text-xs font-extrabold text-[#008ac9] dark:text-sky-400 uppercase tracking-wide">{doc.specialty}</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">{doc.qualification || doc.qualifications}</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {doc.bio || "Senior Medical Consultant specializing in high-quality clinical care at Isalu Hospitals."}
                  </p>

                  <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#008ac9]" />
                      <span>Available on: <strong className="text-slate-900 dark:text-white font-black">{safeDays.join(", ")}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800">
                  <Link
                    to={`/book?doctor=${doc.id}`}
                    className="w-full py-3 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md border border-[#008ac9]"
                  >
                    Book Appointment <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
