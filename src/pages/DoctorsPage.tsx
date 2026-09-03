import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { Search, Star, Clock, MapPin, ArrowRight, Calendar, Flame, Users, XCircle } from "lucide-react";
import { SpecialistAvatar } from "../components/SpecialistAvatar";
import { getDoctorsAPI, getDepartmentsAPI, getSchedulesAPI, getBookingsAPI } from "../api/client";

export function DoctorsPage() {
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [activeBookingsList, setActiveBookingsList] = useState<any[]>([]);
  const [doctorsAvailabilityCache, setDoctorsAvailabilityCache] = useState<Record<string, any>>({});

  useEffect(() => {
    async function syncData() {
      const remoteDepts = await getDepartmentsAPI();
      if (remoteDepts && remoteDepts.length > 0) {
        const mapped = remoteDepts
          .filter((d: any) => d.status !== false && d.status !== 'Disabled' && d.status !== 'Inactive')
          .map((d: any) => ({
            id: d.dept_id || d.id,
            dept_id: d.dept_id || d.id,
            name: d.name,
            description: d.description || "",
            iconName: d.icon_name || d.iconName || "Stethoscope",
            doctorCount: d.doctor_count || d.doctorCount || 0,
            status: d.status !== undefined ? d.status : true,
          }));
        setDepartmentsList(mapped);
        if (!selectedDept || selectedDept === "all") {
          setSelectedDept(mapped[0]?.id || "all");
        }
      }
      const [remoteDoctors, remoteSchedules, remoteBookings] = await Promise.all([
        getDoctorsAPI(),
        getSchedulesAPI(),
        getBookingsAPI().catch(() => [])
      ]);
      if (remoteDoctors && Array.isArray(remoteDoctors)) {
        setAllDoctors(remoteDoctors);

        // Fetch live availability summary for each doctor to power the Full badges accurately
        remoteDoctors.forEach(async (doc: any) => {
          const docKey = String(doc.doc_id || doc.id);
          try {
            const res = await fetch(`/api/doctors/${docKey}/available-dates/?days=30`);
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.availability)) {
                const todayStr = new Date().toISOString().split("T")[0];
                const todayStats = data.availability.find((item: any) => item.date === todayStr) || data.availability[0];
                if (todayStats) {
                  setDoctorsAvailabilityCache(prev => ({
                    ...prev,
                    [doc.id]: todayStats,
                    [doc.doc_id]: todayStats
                  }));
                }
              }
            }
          } catch (e) {
            // fallback silently to local calculation
          }
        });
      }
      if (remoteSchedules && Array.isArray(remoteSchedules)) {
        setSchedulesList(remoteSchedules);
      }
      if (remoteBookings && Array.isArray(remoteBookings)) {
        setActiveBookingsList(remoteBookings);
      }

      // Also check offline bookings cache
      const stored = localStorage.getItem("isalu_offline_bookings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setActiveBookingsList((prev) => {
              const combined = [...prev, ...parsed];
              return Array.from(new Map(combined.map(item => [item.refCode || item.ref_code || item.id, item])).values());
            });
          }
        } catch { }
      }
    }
    syncData();
  }, []);

  const getDoctorSlotStats = (doctor: any) => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Priority 1: Check fetched server-side availability cache
    const cachedStats = doctorsAvailabilityCache[doctor.id] || doctorsAvailabilityCache[doctor.doc_id];
    if (cachedStats) {
      return {
        bookedCount: cachedStats.booked,
        totalCapacity: cachedStats.capacity,
        remaining: cachedStats.capacity - cachedStats.booked,
        isFull: Boolean(cachedStats.is_full)
      };
    }

    const docCode = String(doctor.doc_id || doctor.id || "").trim();
    const docNumericId = String(doctor.id || "").trim();
    const docName = String(doctor.name || doctor.fullName || "").toLowerCase().trim();

    // Priority 2: Fallback client-side count matching all possible ID formats
    const bookedCount = activeBookingsList.filter((b: any) => {
      const bDate = String(b.date || "").trim();
      if (bDate !== todayStr || b.status === "Cancelled" || b.is_active === false || b.status === "Disabled") return false;

      const bDocId = String(b.doctorId || b.doctor_id || b.doctor || "").trim();
      const bDocName = String(b.doctorName || b.doctor_name || b.doctorAcronym || "").toLowerCase().trim();

      if (bDocId && (bDocId === docCode || bDocId === docNumericId || bDocId === String(doctor.id))) return true;
      if (bDocName && docName && (bDocName.includes(docName) || docName.includes(bDocName))) return true;
      return false;
    }).length;

    // Find matched schedule capacity
    const matchedSched = schedulesList.find((s: any) => {
      const sDocId = String(s.doctorId || s.doctor_id || s.doctor || "").trim();
      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      return (sDocId && (sDocId === docCode || sDocId === docNumericId || sDocId === String(doctor.id))) || (sName && docName && sName.includes(docName));
    });

    let totalCapacity = Number(doctor.capacity || 15);
    if (matchedSched) {
      const tableMax = matchedSched.maxDailyAppointments || matchedSched.max_daily_appointments || matchedSched.capacity;
      if (tableMax !== undefined && tableMax !== null && !isNaN(Number(tableMax))) {
        totalCapacity = Number(tableMax);
      }
    }

    const remaining = Math.max(0, totalCapacity - bookedCount);
    const isFull = remaining <= 0;

    return { bookedCount, totalCapacity, remaining, isFull };
  };

  const filteredDoctors = allDoctors.filter((doc: any) => {
    const isNotDisabled = doc.status !== false && (typeof doc.status !== "string" || !doc.status.includes("Disabled"));

    let rawDeptId = "";
    if (typeof doc.department === "string") rawDeptId = doc.department;
    else if (doc.department && typeof doc.department === "object") rawDeptId = doc.department.dept_id || doc.department.id || doc.department.name || "";
    if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
    if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

    const docDeptId = rawDeptId.toLowerCase().trim();
    const targetDeptId = selectedDept.toLowerCase().trim();

    const cleanDocDeptId = docDeptId.replace(/[^a-z0-9]/g, "");
    const cleanTargetDeptId = targetDeptId.replace(/[^a-z0-9]/g, "");

    let matchesDept = selectedDept === "all" || (cleanDocDeptId ? cleanDocDeptId === cleanTargetDeptId : false);
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
          <button
            onClick={() => handleSelectDept("all")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md ${selectedDept === "all"
              ? "bg-[#008ac9] text-white border-2 border-[#008ac9]"
              : "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-[#008ac9]"
              }`}
          >
            All Departments
          </button>
          {departmentsList.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleSelectDept(dept.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md ${selectedDept === dept.id
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
            let savedSchedules: any[] = schedulesList && schedulesList.length > 0 ? schedulesList : [];

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

            const { bookedCount, totalCapacity, remaining, isFull } = getDoctorSlotStats(doc);

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#008ac9] transition-all duration-300 flex flex-col justify-between relative"
              >
                {/* Full Badge / Capacity Indicator */}
                <div className="absolute top-4 right-4 z-10">
                  {isFull ? (
                    <span className="px-3 py-1 bg-rose-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 border border-rose-400">
                      <XCircle className="h-3.5 w-3.5" /> Fully Booked Today
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-full shadow-sm flex items-center gap-1 border border-emerald-300">
                      <Users className="h-3 w-3" /> {remaining} Slots Left
                    </span>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex gap-4 items-start pt-2">
                    <SpecialistAvatar name={doc.acronym || doc.name} imageUrl={doc.image} size="md" />
                    <div className="flex-1 pr-16">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">{doc.acronym || doc.name}</h3>
                      <p className="text-xs font-extrabold text-[#008ac9] dark:text-sky-400 uppercase tracking-wide">{doc.specialty}</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">{doc.qualification || doc.qualifications}</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {doc.bio || "Senior Medical Consultant specializing in high-quality clinical care at Isalu Hospitals."}
                  </p>

                  <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#008ac9]" />
                      <span>Available on: <strong className="text-slate-900 dark:text-white font-black">{safeDays.join(", ")}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#008ac9]" />
                      <span>Today's Capacity: <strong className="text-slate-900 dark:text-white font-black">{bookedCount} / {totalCapacity} Booked</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800">
                  <Link
                    to={`/book?doctor=${doc.id}`}
                    className={`w-full py-3 font-black rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md border ${isFull
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                      : "bg-[#008ac9] hover:bg-[#0072b1] text-white border-[#008ac9]"
                      }`}
                  >
                    {isFull ? "View Schedule / Select Another Date →" : "Book Appointment →"}
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