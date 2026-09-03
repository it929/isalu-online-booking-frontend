import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { jsPDF } from "jspdf";
type Doctor = any;
const getDoctorDisplayAcronym = (doctor: any): string => {
  const acronym = doctor?.acronym ?? doctor?.doctorAcronym ?? doctor?.doctor_acronym;
  return typeof acronym === "string" && acronym.trim() ? acronym.trim() : "Specialist";
};
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Ticket,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Baby,
  Brain,
  Bone,
  Eye,
  Activity,
  Flame,
  CreditCard,
  Search,
  Download,
  Printer,
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
  Lock,
  XCircle,
  CheckCircle2,
  Share2,
  RefreshCw,
  AlertTriangle,
  X,
  AlertCircle,
  Users,
} from "lucide-react";
import { SpecialistAvatar } from "../components/SpecialistAvatar";
import { IsaluLogo } from "../components/IsaluLogo";
import { getDoctorsAPI, getDepartmentsAPI, createBookingAPI, getSchedulesAPI, getBookingsAPI, getDoctorAvailableDatesAPI } from "../api/client";

/**
 * Modern High-UX & User-Friendly API Error Modal Component
 */
export function ApiErrorModal({ error, onClose, onRetry }: { error: string | null; onClose: () => void; onRetry?: () => void }) {
  if (!error) return null;

  let userFriendlyMessage = "We encountered a temporary issue processing your appointment request. Please review your details and try again.";
  const lowerErr = error.toLowerCase();

  if (lowerErr.includes("capacity") || lowerErr.includes("full") || lowerErr.includes("maximum")) {
    userFriendlyMessage = "The selected date has reached its maximum appointment capacity for this specialist. Please select another available date or time.";
  } else if (lowerErr.includes("same-day") || lowerErr.includes("cutoff") || lowerErr.includes("30 minutes")) {
    userFriendlyMessage = "Online booking for today's session is closed because it is less than 30 minutes before clinic hours. Please select a future date or contact our front desk.";
  } else if (lowerErr.includes("network") || lowerErr.includes("connection") || lowerErr.includes("failed to fetch")) {
    userFriendlyMessage = "Unable to connect to the secure hospital server. Please check your internet connection and try again.";
  } else if (lowerErr.includes("required") || lowerErr.includes("mandatory") || lowerErr.includes("invalid")) {
    userFriendlyMessage = "Please ensure all required form fields and patient details are filled out correctly.";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20 shadow-inner">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Notice regarding your booking</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
            {userFriendlyMessage}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 px-4 bg-[#008ac9] hover:bg-[#0072b1] text-white font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Try Again
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Okay, Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookAppointmentPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const departmentIcons: Record<string, any> = {
    HeartPulse,
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

  const [searchParams] = useSearchParams();
  const initialDept = searchParams.get("department") || "orthopedics";
  const initialDoctor = searchParams.get("doctor") || "";
  const [selectedDept, setSelectedDept] = useState<string>(initialDept);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctor);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [specialistSchedulesList, setSpecialistSchedulesList] = useState<any[]>([]);
  const [activeBookingsList, setActiveBookingsList] = useState<any[]>([]);
  const [doctorAvailabilityMap, setDoctorAvailabilityMap] = useState<Record<string, any>>({});

  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const [patientType, setPatientType] = useState<"Private Self-Pay" | "HMO Insurance">("Private Self-Pay");
  const [hmoName, setHmoName] = useState<string>("Hygeia HMO");
  const [hmoSearchQuery, setHmoSearchQuery] = useState<string>("Hygeia HMO");
  const [showHmoSuggestions, setShowHmoSuggestions] = useState<boolean>(false);
  const [hmoPolicyCode, setHmoPolicyCode] = useState<string>("");
  const [referralDocName, setReferralDocName] = useState<string>("");
  const [referralDocData, setReferralDocData] = useState<string>("");
  const [referralDocText, setReferralDocText] = useState<string>("");

  const [step, setStep] = useState<number>(1);
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);

  const specialistsSectionRef = useRef<HTMLDivElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [hmoCompanies, setHmoCompanies] = useState<any[]>([]);

  const sanitizeDoctor = (doc: any) => {
    let rawTypes = doc.acceptedPatientTypes || doc.accepted_patient_types;
    if (!rawTypes || !Array.isArray(rawTypes) || rawTypes.length === 0) {
      rawTypes = ["Private Self-Pay", "HMO Insurance"];
    }
    let rawDeptId = "";
    let rawDeptName = "";
    if (typeof doc.department === "string") rawDeptId = doc.department;
    else if (doc.department && typeof doc.department === "object") {
      rawDeptId = doc.department.dept_id || doc.department.id || "";
      rawDeptName = doc.department.name || "";
    }
    if (!rawDeptId && doc.departmentId) rawDeptId = String(doc.departmentId);
    if (!rawDeptId && doc.department_id) rawDeptId = String(doc.department_id);

    const deptObj = departmentsList.find(d => d.id === rawDeptId || d.name?.toLowerCase() === rawDeptId.toLowerCase()) ||
      departmentsList.find(d => rawDeptName && d.name?.toLowerCase() === rawDeptName.toLowerCase());

    const finalDeptId = deptObj ? deptObj.id : rawDeptId;
    const finalDeptName = deptObj ? deptObj.name : (rawDeptName || doc.specialty || "General Medicine");

    return {
      ...doc,
      departmentId: finalDeptId,
      department_id: finalDeptId,
      specialty: finalDeptName,
      acceptedPatientTypes: rawTypes,
      accepted_patient_types: rawTypes,
    };
  };

  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    async function syncData() {
      try {
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
        }
      } catch (err: any) {
        setApiError("Failed to fetch medical departments. Please check your network connection.");
      }

      try {
        const remoteDoctors = await getDoctorsAPI();
        if (remoteDoctors && Array.isArray(remoteDoctors) && remoteDoctors.length > 0) {
          const sanitized = remoteDoctors.map(sanitizeDoctor);
          setAllDoctors(sanitized);
        }
      } catch (err: any) {
        setApiError("Failed to fetch doctor rosters.");
      }

      try {
        const remoteSchedules = await getSchedulesAPI();
        if (remoteSchedules && Array.isArray(remoteSchedules)) {
          setSpecialistSchedulesList(remoteSchedules);
        }
      } catch (err: any) { }

      try {
        if (getBookingsAPI) {
          const existing = await getBookingsAPI();
          if (Array.isArray(existing)) setActiveBookingsList(existing);
        }
        const stored = localStorage.getItem("isalu_offline_bookings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setActiveBookingsList((prev) => {
              const combined = [...prev, ...parsed];
              return Array.from(new Map(combined.map(item => [item.refCode || item.ref_code || item.id, item])).values());
            });
          }
        }
      } catch (err: any) { }

      try {
        const remoteHmos = await (await import("../api/client")).getHmoCompaniesAPI();
        if (Array.isArray(remoteHmos)) setHmoCompanies(remoteHmos);
      } catch (err: any) { }
    }
    syncData();
  }, [selectedDept]);

  // Fetch real-time availability map from backend when selectedDoctorId changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedDoctorId) return;
      const targetDoc = allDoctors.find(
        (d) => String(d.id) === String(selectedDoctorId) || String(d.doc_id) === String(selectedDoctorId)
      );
      const docKey = String(targetDoc?.doc_id || targetDoc?.id || selectedDoctorId);

      try {
        const data = await getDoctorAvailableDatesAPI(docKey, 90);
        if (data && Array.isArray(data.availability)) {
          const map: Record<string, any> = {};
          data.availability.forEach((item: any) => {
            map[item.date] = item;
          });
          setDoctorAvailabilityMap(map);
        }
      } catch (err) {
        console.warn("Could not fetch remote doctor availability map:", err);
      }
    }
    fetchAvailability();
  }, [selectedDoctorId, allDoctors]);

  useEffect(() => {
    if (initialDoctor) {
      const doc = allDoctors.find((d) => d.id === initialDoctor || d.doc_id === initialDoctor);
      if (doc) {
        setSelectedDept(doc.departmentId || doc.department);
        setStep(2);
      }
    }
  }, [initialDoctor, allDoctors]);

  useEffect(() => {
    if (selectedDoctor) {
      const upcoming = getUpcomingDates(undefined, selectedDoctor);
      const nextAvail = upcoming.find((d) => d.isNextAvailable);
      if (nextAvail && (!selectedDate || isDateFullyBooked(selectedDoctor, selectedDate))) {
        setSelectedDate(nextAvail.dateStr);
        setSelectedTime(getDutyTimeWindow(selectedDoctor, nextAvail.dateStr));
      }
    } else {
      setSelectedDate("");
      setSelectedTime("");
    }
  }, [selectedDoctorId, doctorAvailabilityMap, allDoctors]);

  const matchesDept = (doc: any, deptId: string) => {
    if (!deptId || deptId === "all") return true;

    const targetDept = departmentsList.find(
      (d: any) =>
        String(d.id || d.dept_id || "").toLowerCase().trim() === String(deptId).toLowerCase().trim() ||
        String(d.name || "").toLowerCase().trim() === String(deptId).toLowerCase().trim()
    ) || departmentsList.find(
      (d: any) =>
        String(d.id || "").toLowerCase().trim() === String(deptId).toLowerCase().trim() ||
        String(d.name || "").toLowerCase().trim() === String(deptId).toLowerCase().trim()
    );

    const targetDeptId = String(deptId).toLowerCase().trim();
    const targetDeptKey = targetDept ? String(targetDept.id || targetDept.dept_id || "").toLowerCase().trim() : targetDeptId;
    const targetDeptName = targetDept ? String(targetDept.name || "").toLowerCase().trim() : targetDeptId;

    const cleanTargetDeptId = targetDeptId.replace(/[^a-z0-9]/g, "");
    const cleanTargetDeptKey = targetDeptKey.replace(/[^a-z0-9]/g, "");
    const cleanTargetDeptName = targetDeptName.replace(/[^a-z0-9]/g, "");

    let rawDocDeptId = "";
    let rawDocDeptName = "";

    if (typeof doc.department === "object" && doc.department !== null) {
      rawDocDeptId = String(doc.department.dept_id || doc.department.id || doc.department.pk || "").toLowerCase().trim();
      rawDocDeptName = String(doc.department.name || "").toLowerCase().trim();
    } else if (typeof doc.department === "string" || typeof doc.department === "number") {
      rawDocDeptId = String(doc.department).toLowerCase().trim();
    }

    if (!rawDocDeptId && doc.departmentId) rawDocDeptId = String(doc.departmentId).toLowerCase().trim();
    if (!rawDocDeptId && doc.department_id) rawDocDeptId = String(doc.department_id).toLowerCase().trim();

    const cleanDocDeptId = rawDocDeptId.replace(/[^a-z0-9]/g, "");
    const cleanDocDeptName = rawDocDeptName.replace(/[^a-z0-9]/g, "");

    if (cleanDocDeptId) {
      if (
        cleanDocDeptId === cleanTargetDeptId ||
        cleanDocDeptId === cleanTargetDeptKey ||
        cleanDocDeptId === cleanTargetDeptName
      ) {
        return true;
      }
    }

    if (cleanDocDeptName) {
      if (
        cleanDocDeptName === cleanTargetDeptName ||
        cleanDocDeptName === cleanTargetDeptId ||
        cleanDocDeptName === cleanTargetDeptKey
      ) {
        return true;
      }
    }

    return false;
  };

  const selectedDeptObj = departmentsList.find(
    (d: any) => String(d.id || d.dept_id).toLowerCase().trim() === String(selectedDept).toLowerCase().trim() || String(d.name).toLowerCase().trim() === String(selectedDept).toLowerCase().trim()
  ) || departmentsList.find(
    (d) => d.id === selectedDept || d.name.toLowerCase() === selectedDept.toLowerCase()
  );

  const selectedDoctor = allDoctors.find(
    (doc) => String(doc.id) === String(selectedDoctorId) || String(doc.doc_id) === String(selectedDoctorId)
  );

  /**
   * Cross-references backend availability map & active bookings against schedule capacity
   */
  const getDoctorSlotStatsForDate = (doctorId: string, dateStr: string) => {
    const docObj = allDoctors.find(
      (d) => String(d.id) === String(doctorId) || String(d.doc_id) === String(doctorId)
    );

    const docCodes = [
      String(docObj?.doc_id || "").toLowerCase().trim(),
      String(docObj?.id || "").toLowerCase().trim(),
      String(doctorId || "").toLowerCase().trim(),
    ].filter(Boolean);

    const docNames = [
      String(docObj?.name || "").toLowerCase().trim(),
      String(docObj?.fullName || docObj?.full_name || "").toLowerCase().trim(),
      String(docObj?.acronym || "").toLowerCase().trim(),
    ].filter(Boolean);

    // 1. Calculate active bookings on client side matching doctor ID or Name
    const clientBookedCount = activeBookingsList.filter((b) => {
      const bDate = String(b.date || "").trim();
      if (bDate !== dateStr || b.status === "Cancelled" || b.is_active === false || b.status === "Disabled") return false;

      const bDocId = String(b.doctorId || b.doctor_id || b.doctor || "").toLowerCase().trim();
      const bDocName = String(b.doctorName || b.doctor_name || b.doctorAcronym || "").toLowerCase().trim();

      const idMatch = bDocId !== "" && docCodes.includes(bDocId);
      const nameMatch = bDocName !== "" && docNames.some((dn) => dn !== "" && (bDocName.includes(dn) || dn.includes(bDocName)));

      return idMatch || nameMatch;
    }).length;

    // 2. Extract schedule max capacity from specialist schedule
    const savedSchedules: any[] = specialistSchedulesList || [];
    const matchedSched = savedSchedules.find((s) => {
      const sDocId = String(s.doctorId || s.doctor_id || s.doctor || "").toLowerCase().trim();
      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      const idMatch = sDocId !== "" && docCodes.includes(sDocId);
      const nameMatch = sName !== "" && docNames.some((dn) => dn !== "" && (sName.includes(dn) || dn.includes(sName)));
      return idMatch || nameMatch;
    });

    let maxCapacity = 15;
    if (matchedSched) {
      if (dateStr) {
        const dateObj = new Date(dateStr + "T00:00:00");
        const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

        if (matchedSched.dayConfigs) {
          const cfg = matchedSched.dayConfigs[dayShort] || matchedSched.dayConfigs[dayName];
          if (cfg && (cfg.capacity || cfg.maxDailyAppointments || cfg.max_daily_appointments)) {
            maxCapacity = Number(cfg.capacity || cfg.maxDailyAppointments || cfg.max_daily_appointments);
          }
        }
      }

      if (maxCapacity === 15 || !maxCapacity) {
        const tableMax = matchedSched.maxDailyAppointments || matchedSched.max_daily_appointments || matchedSched.capacity;
        if (tableMax !== undefined && tableMax !== null && !isNaN(Number(tableMax))) {
          maxCapacity = Number(tableMax);
        }
      }
    }

    let remoteBooked = 0;
    if (doctorAvailabilityMap && doctorAvailabilityMap[dateStr]) {
      const info = doctorAvailabilityMap[dateStr];
      remoteBooked = Number(info.booked || 0);
      if (info.capacity !== undefined && info.capacity !== null && !isNaN(Number(info.capacity))) {
        maxCapacity = Number(info.capacity);
      }
    }

    const bookedOnDate = Math.max(remoteBooked, clientBookedCount);
    const remaining = Math.max(0, maxCapacity - bookedOnDate);
    return { bookedOnDate, maxCapacity, remaining };
  };

  const isDateFullyBooked = (doctor: Doctor | undefined, dateStr: string): boolean => {
    if (!doctor || !dateStr) return false;

    // Check 1: Live combined active bookings and capacity
    const stats = getDoctorSlotStatsForDate(doctor.id || (doctor as any).doc_id, dateStr);
    if (stats.remaining <= 0) return true;

    // Check 2: Explicit backend is_full flag
    if (doctorAvailabilityMap && doctorAvailabilityMap[dateStr]) {
      const item = doctorAvailabilityMap[dateStr];
      if (item.is_full !== undefined && Boolean(item.is_full)) return true;
      if (item.isFull !== undefined && Boolean(item.isFull)) return true;
    }

    return false;
  };

  const getDoctorEffectiveAvailableDays = (doctor: Doctor | undefined): string[] => {
    if (!doctor) return [];

    const savedSchedules: any[] = specialistSchedulesList || [];
    const docSchedules = savedSchedules.filter((s) => {
      const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
      const dId = String(doctor.id || "").toLowerCase().trim();
      const dDocId = String((doctor as any).doc_id || "").toLowerCase().trim();

      if (sDocId && (sDocId === dId || sDocId === dDocId)) return true;

      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      const dName = String(doctor.name || "").toLowerCase().trim();
      const dFullName = String((doctor as any).fullName || (doctor as any).full_name || "").toLowerCase().trim();

      if (sName && dName && (sName.includes(dName) || dName.includes(sName))) return true;
      if (sName && dFullName && (sName.includes(dFullName) || dFullName.includes(sName))) return true;
      return false;
    });

    const rosterDays: string[] = [];
    docSchedules.forEach((s) => {
      const days = s.dutyDays || s.duty_days;
      if (Array.isArray(days) && days.length > 0) {
        rosterDays.push(...days);
      } else if (typeof days === "string" && days.trim()) {
        rosterDays.push(days.trim());
      }
    });

    if (rosterDays.length > 0) {
      return rosterDays;
    }

    const docDays = (doctor as any).availableDays || (doctor as any).available_days || doctor.availability;
    if (Array.isArray(docDays) && docDays.length > 0) {
      return docDays;
    }
    if (typeof docDays === "string" && docDays.trim()) {
      try {
        const parsed = JSON.parse(docDays);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { }
      return [docDays.trim()];
    }

    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  };

  const isDoctorOnDutyInNext24Hours = (doctor: Doctor | undefined): boolean => {
    if (!doctor) return false;
    const isDocDisabled =
      doctor.status === false ||
      doctor.status === "Disabled" ||
      doctor.status === "Inactive" ||
      String(doctor.status || "").toLowerCase().includes("disable") ||
      String(doctor.status || "").toLowerCase().includes("false") ||
      (doctor as any).is_active === false;

    if (isDocDisabled) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayNameUpper = tomorrow.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const dayShortUpper = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const tYear = tomorrow.getFullYear();
    const tMonth = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const tDay = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowDateStr = `${tYear}-${tMonth}-${tDay}`;

    const dutyDays = getDoctorEffectiveAvailableDays(doctor);
    if (!dutyDays || dutyDays.length === 0) return false;

    const tokens: string[] = [];
    dutyDays.forEach((item: any) => {
      if (typeof item === "string") {
        item.split(/[,/|]+/).forEach((p) => {
          if (p.trim()) tokens.push(p.trim().toUpperCase());
        });
      }
    });

    return tokens.some((token) => {
      if (token.includes(tomorrowDateStr)) return true;
      if (token === dayNameUpper || token === dayShortUpper) return true;
      if (dayNameUpper.startsWith(token) || token.startsWith(dayShortUpper)) return true;
      if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) return true;
      return false;
    });
  };

  const getNextAvailableDateForDoctor = (doctor: Doctor | undefined): string => {
    if (!doctor) return "No upcoming schedule";

    const isDocDisabled =
      doctor.status === false ||
      doctor.status === "Disabled" ||
      doctor.status === "Inactive" ||
      String(doctor.status || "").toLowerCase().includes("disable") ||
      String(doctor.status || "").toLowerCase().includes("false") ||
      (doctor as any).is_active === false;

    if (isDocDisabled) return "Doctor inactive";

    const dutyDays = getDoctorEffectiveAvailableDays(doctor);
    if (!dutyDays || dutyDays.length === 0) return "No upcoming schedule";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 1; offset <= 30; offset++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + offset);

      const dayNameUpper = candidate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      const dayShortUpper = candidate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const cYear = candidate.getFullYear();
      const cMonth = String(candidate.getMonth() + 1).padStart(2, "0");
      const cDay = String(candidate.getDate()).padStart(2, "0");
      const candidateDateStr = `${cYear}-${cMonth}-${cDay}`;

      if (isDateFullyBooked(doctor, candidateDateStr)) {
        continue;
      }

      const tokens: string[] = [];
      dutyDays.forEach((item: any) => {
        if (typeof item === "string") {
          item.split(/[,/|]+/).forEach((p) => {
            if (p.trim()) tokens.push(p.trim().toUpperCase());
          });
        }
      });

      const isWorking = tokens.some((token) => {
        if (token.includes(candidateDateStr)) return true;
        if (token === dayNameUpper || token === dayShortUpper) return true;
        if (dayNameUpper.startsWith(token) || token.startsWith(dayShortUpper)) return true;
        if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) return true;
        return false;
      });

      if (isWorking) {
        return candidate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
    }

    return "No upcoming schedule";
  };

  const filteredDoctors = allDoctors.filter((doc) => {
    const isDocDisabled =
      doc.status === false ||
      doc.status === "Disabled" ||
      doc.status === "Inactive" ||
      String(doc.status || "").toLowerCase().includes("disable") ||
      String(doc.status || "").toLowerCase().includes("false") ||
      (doc as any).is_active === false;

    if (isDocDisabled) return false;

    const matchesDepartment = selectedDept ? matchesDept(doc, selectedDept) : true;
    if (!matchesDepartment) return false;

    const rawTypes = (doc as any).acceptedPatientTypes || (doc as any).accepted_patient_types;
    const acceptedTypes = (rawTypes && Array.isArray(rawTypes) && rawTypes.length > 0) ? rawTypes : ["Private Self-Pay", "HMO Insurance"];
    return acceptedTypes.includes(patientType);
  });

  const isDoctorOnDutyOnDate = (doctor: Doctor | undefined, candidateDate: Date): boolean => {
    if (!doctor) return false;

    const isDocDisabled =
      doctor.status === false ||
      doctor.status === "Disabled" ||
      doctor.status === "Inactive" ||
      String(doctor.status || "").toLowerCase().includes("disable") ||
      String(doctor.status || "").toLowerCase().includes("false") ||
      (doctor as any).is_active === false;

    if (isDocDisabled) return false;

    const cYear = candidateDate.getFullYear();
    const cMonth = String(candidateDate.getMonth() + 1).padStart(2, "0");
    const cDay = String(candidateDate.getDate()).padStart(2, "0");
    const candidateDateStr = `${cYear}-${cMonth}-${cDay}`;

    if (doctorAvailabilityMap && doctorAvailabilityMap[candidateDateStr]) {
      return Boolean(doctorAvailabilityMap[candidateDateStr].onDuty !== false);
    }

    const dutyDays = getDoctorEffectiveAvailableDays(doctor);
    if (!dutyDays || dutyDays.length === 0) return true;

    const dayNameUpper = candidateDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const dayShortUpper = candidateDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

    const dayOfMonth = candidateDate.getDate();
    const nthWeek = Math.ceil(dayOfMonth / 7);

    const dayKeyShort = candidateDate.toLocaleDateString("en-US", { weekday: "short" });
    const dayKeyLong = candidateDate.toLocaleDateString("en-US", { weekday: "long" });
    const docIdCandidates = [
      String(doctor.id || "").toLowerCase().trim(),
      String((doctor as any).doc_id || "").toLowerCase().trim(),
    ].filter(Boolean);
    const matchedSchedules = (specialistSchedulesList || []).filter((s: any) => {
      const sDocId = String(s.doctorId || s.doctor_id || s.doctor || "").toLowerCase().trim();
      return sDocId !== "" && docIdCandidates.includes(sDocId);
    });
    for (const sched of matchedSchedules) {
      const cfgs = (sched as any).dayConfigs || (sched as any).day_configs || {};
      const cfg = cfgs[dayKeyShort] || cfgs[dayKeyLong] || {};
      const weeks: number[] = Array.isArray(cfg.weeks) ? cfg.weeks : [];
      if (weeks.length > 0 && !weeks.includes(nthWeek)) {
        return false;
      }
    }

    const tokens: string[] = [];
    dutyDays.forEach((item: any) => {
      if (typeof item === "string") {
        item.split(/[,/|]+/).forEach((p) => {
          if (p.trim()) tokens.push(p.trim().toUpperCase());
        });
      }
    });

    return tokens.some((token) => {
      if (token.includes(candidateDateStr)) return true;
      if (token === dayNameUpper || token === dayShortUpper) return true;
      if (token.includes("EVERY") && (token.includes(dayNameUpper) || token.includes(dayShortUpper))) return true;

      if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) {
        if (token.includes("1ST & 3RD") || token.includes("1ST AND 3RD")) {
          return nthWeek === 1 || nthWeek === 3;
        }
        if (token.includes("2ND & 4TH") || token.includes("2ND AND 4TH")) {
          return nthWeek === 2 || nthWeek === 4;
        }
        if (token.includes("1ST – 3RD") || token.includes("1ST-3RD") || token.includes("1ST TO 3RD")) {
          return nthWeek === 1 || nthWeek === 2 || nthWeek === 3;
        }
        return true;
      }

      if (dayNameUpper.startsWith(token) || token.startsWith(dayShortUpper)) return true;
      if (token.includes(dayNameUpper) || token.includes(dayShortUpper)) return true;

      return false;
    });
  };

  const getUpcomingDates = (doctorAvailability?: string[], selectedDocObj?: Doctor) => {
    const list: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const effectiveDutyDays = selectedDocObj
      ? getDoctorEffectiveAvailableDays(selectedDocObj)
      : (doctorAvailability && doctorAvailability.length > 0 ? doctorAvailability : []);

    let firstNextAvailableFound = false;

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dayShort = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthShort = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dYear = d.getFullYear();
      const dMonth = String(d.getMonth() + 1).padStart(2, "0");
      const dDay = String(d.getDate()).padStart(2, "0");
      const dateStr = `${dYear}-${dMonth}-${dDay}`;

      const dayNum = d.getDate();
      let weekNum = "1st Week";
      if (dayNum <= 7) weekNum = "1st Week";
      else if (dayNum <= 14) weekNum = "2nd Week";
      else if (dayNum <= 21) weekNum = "3rd Week";
      else if (dayNum <= 28) weekNum = "4th Week";
      else weekNum = "5th Week";

      const weekOccurrenceBadge = `${weekNum.replace(" Week", "")} ${dayShort}`;

      let isAvailable = false;
      if (selectedDocObj) {
        isAvailable = isDoctorOnDutyOnDate(selectedDocObj, d);
      } else if (effectiveDutyDays.length > 0) {
        const tokens: string[] = [];
        effectiveDutyDays.forEach((item: any) => {
          if (typeof item === "string") {
            item.split(/[,/|]+/).forEach((p) => {
              if (p.trim()) tokens.push(p.trim().toUpperCase());
            });
          }
        });
        const dayUpper = dayName.toUpperCase();
        const shortUpper = dayShort.toUpperCase();
        isAvailable = tokens.some((t) => t === dayUpper || t === shortUpper || t.includes(dayUpper) || t.includes(shortUpper));
      } else {
        isAvailable = true;
      }

      // Check if this date is fully booked
      const isFullyBooked = selectedDocObj ? isDateFullyBooked(selectedDocObj, dateStr) : false;

      let isNextAvailable = false;
      // CRITICAL FIX: Must check that isAvailable is TRUE AND isFullyBooked is FALSE
      if (isAvailable && !isFullyBooked && !firstNextAvailableFound) {
        isNextAvailable = true;
        firstNextAvailableFound = true;
      }

      list.push({
        dateStr,
        dayName,
        dayShort,
        monthShort,
        weekNum,
        weekOccurrenceBadge,
        isAvailable,
        isFullyBooked,
        isPast24HoursNotice: i >= 0,
        isNextAvailable,
      });
    }

    return list;
  };

  const getDutyTimeWindow = (doctor: Doctor | undefined, dateStr: string) => {
    if (!doctor || !dateStr) return "08:00 AM – 02:00 PM";

    const dateObj = new Date(dateStr + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });

    const savedSchedules: any[] = specialistSchedulesList || [];
    const matchedSched = savedSchedules.find(
      (s) => s.doctorId === doctor.id || s.doctorId === (doctor as any).doc_id || s.doctorName?.includes(doctor.name)
    );

    if (matchedSched) {
      if (matchedSched.dayConfigs) {
        let dayCfg = matchedSched.dayConfigs[dayShort] || matchedSched.dayConfigs[dayName];
        if (!dayCfg) {
          const keys = Object.keys(matchedSched.dayConfigs);
          const nthWeekday = Math.ceil(dateObj.getDate() / 7);
          const foundKey = keys.find((key) => {
            const upperKey = key.toUpperCase();
            if (upperKey.includes("1ST & 3RD") || upperKey.includes("1ST AND 3RD")) return nthWeekday === 1 || nthWeekday === 3;
            if (upperKey.includes("2ND & 4TH") || upperKey.includes("2ND AND 4TH")) return nthWeekday === 2 || nthWeekday === 4;
            if (upperKey.includes("1ST – 3RD") || upperKey.includes("1ST-3RD")) return nthWeekday === 1 || nthWeekday === 2 || nthWeekday === 3;
            return false;
          });
          if (foundKey) {
            dayCfg = matchedSched.dayConfigs[foundKey];
          }
        }
        if (dayCfg && dayCfg.shiftTimes && dayCfg.shiftTimes.length > 0) {
          return dayCfg.shiftTimes.join(", ");
        }
      }
      if (matchedSched.shiftTime) {
        const parts = matchedSched.shiftTime.split("|").map((p: string) => p.trim());
        const dayPart = parts.find((p: string) => p.toLowerCase().includes(dayShort.toLowerCase()) || p.toLowerCase().includes(dayName.toLowerCase()));
        if (dayPart) {
          const match = dayPart.match(/\d{1,2}:\d{2}\s*(?:AM|PM)\s*–\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
          if (match) return match[0];
          return dayPart.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*:\s*/i, "").replace(/\(\d+ visits\)/i, "").trim();
        }
      }
    }

    if (doctor.timeSlots && Array.isArray(doctor.timeSlots) && doctor.timeSlots.length > 0) {
      const daySlot = doctor.timeSlots.find(
        (ts: string) => ts.toLowerCase().includes(dayShort.toLowerCase()) || ts.toLowerCase().includes(dayName.toLowerCase())
      );
      if (daySlot) {
        const match = daySlot.match(/\d{1,2}:\d{2}\s*(?:AM|PM)\s*–\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i);
        if (match) return match[0];
        return daySlot;
      }
      return doctor.timeSlots[0];
    }

    return "08:00 AM – 02:00 PM";
  };

  const parseClinicStartTime = (timeStr: string): { hour: number; minute: number } | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;

    if (ampm === "PM" && hour < 12) {
      hour += 12;
    } else if (ampm === "AM" && hour === 12) {
      hour = 0;
    }

    return { hour, minute };
  };

  const isSameDayBookingWithin30MinCutoff = (dateStr: string, timeStr: string): boolean => {
    if (!dateStr || !timeStr) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    if (dateStr !== todayStr) {
      return false;
    }

    const parsedTime = parseClinicStartTime(timeStr);
    if (!parsedTime) return false;

    const clinicStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parsedTime.hour, parsedTime.minute, 0, 0);
    const timeDiffMinutes = (clinicStart.getTime() - now.getTime()) / (1000 * 60);

    return timeDiffMinutes < 30;
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  const formatDateToOrdinal = (dateInput: string): string => {
    if (!dateInput) return "";
    const trimmed = String(dateInput).trim();
    if (/\d+(st|nd|rd|th)\s+[A-Za-z]+,\s*\d{4}/i.test(trimmed)) {
      return trimmed;
    }
    let dateObj: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(trimmed);
    }
    if (isNaN(dateObj.getTime())) return dateInput;
    const dayNum = dateObj.getDate();
    const ordinalDay = getOrdinalSuffix(dayNum);
    const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
    const yearNum = dateObj.getFullYear();
    return `${ordinalDay} ${monthName}, ${yearNum}`;
  };

  const downloadTicketAsImage = (booking: any) => {
    if (!booking) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(80, 80, 1040, 1240, 40);
    } else {
      ctx.rect(80, 80, 1040, 1240);
    }
    ctx.fill();

    ctx.fillStyle = "#008AC9";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(80, 80, 1040, 220, [40, 40, 0, 0]);
    } else {
      ctx.rect(80, 80, 1040, 220);
    }
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(400, 110, 400, 45, 22);
    } else {
      ctx.rect(400, 110, 400, 45);
    }
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OFFICIAL APPOINTMENT TICKET", 600, 140);

    const logoX = 390;
    const logoY = 205;
    const sR = 12;

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(logoX, logoY - 18, sR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(logoX - 18, logoY, sR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(logoX + 18, logoY, sR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(logoX, logoY + 18, sR, 0, Math.PI * 2); ctx.fill();

    ctx.font = "900 48px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText("Isalu Hospitals", 435, 220);

    ctx.font = "600 20px sans-serif";
    ctx.fillStyle = "#E0F2FE";
    ctx.textAlign = "center";
    ctx.fillText("Present this ticket or Reference Code at hospital reception.", 600, 255);

    ctx.fillStyle = "#F0F9FF";
    ctx.fillRect(80, 300, 1040, 130);
    ctx.strokeStyle = "rgba(0, 138, 201, 0.3)";
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 300, 1040, 130);

    ctx.fillStyle = "#0369A1";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("TICKET REFERENCE CODE", 600, 340);

    ctx.fillStyle = "#008AC9";
    ctx.font = "900 52px sans-serif";
    ctx.fillText(booking.refCode || "ISALU-000000", 600, 405);

    ctx.textAlign = "left";
    let y = 500;

    const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(label1, 140, y);
      ctx.fillText(label2, 640, y);

      ctx.fillStyle = "#0F172A";
      ctx.font = "900 24px sans-serif";
      ctx.fillText(val1, 140, y + 35);
      ctx.fillText(val2, 640, y + 35);

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(140, y + 65);
      ctx.lineTo(1020, y + 65);
      ctx.stroke();

      y += 110;
    };

    drawRow("PATIENT NAME", booking.patientName || "N/A", "CONTACT PHONE", booking.patientPhone || "N/A");
    drawRow("SPECIALIST DOCTOR", getDoctorDisplayAcronym(booking) || "Specialist", "DEPARTMENT / SPECIALTY", booking.doctorSpecialty || "Specialist Clinic");
    drawRow("APPOINTMENT DATE", formatDateToOrdinal(booking.date) || "N/A", "TIME SLOT", booking.time || "N/A");
    drawRow("PATIENT TYPE", booking.paymentType || "Private Self-Pay", "HMO / ENROLLEE CODE", booking.paymentType === "HMO Insurance" ? `${booking.hmoName || "HMO"} (${booking.hmoPolicyCode || "N/A"})` : "N/A (Self-Pay)");

    if (booking.referralDocName) {
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("ATTACHED REFERRAL DOCUMENT", 140, y);
      ctx.fillStyle = "#059669";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(`📎 ${booking.referralDocName}`, 140, y + 35);
    }

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#008AC9";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.translate(600, 750);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.fillText("ISALU HOSPITALS", 0, 0);
    ctx.font = "900 30px sans-serif";
    ctx.fillText("OFFICIAL VERIFIED TICKET", 0, 45);
    ctx.restore();

    ctx.save();
    const sealX = 940;
    const sealY = 1080;
    const sealR = 75;

    ctx.fillStyle = "#DC2626";
    ctx.beginPath();
    const points = 24;
    for (let i = 0; i < points; i++) {
      const angle = (i * Math.PI * 2) / points;
      const r = i % 2 === 0 ? sealR : sealR - 8;
      const px = sealX + Math.cos(angle) * r;
      const py = sealY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#B91C1C";
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR - 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#FDE047";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ISALU HOSPITALS", sealX, sealY - 24);

    ctx.font = "900 24px sans-serif";
    ctx.fillText("✓ VERIFIED", sealX, sealY + 4);

    ctx.font = "bold 10px sans-serif";
    ctx.fillText("OFFICIAL SEAL", sealX, sealY + 24);
    ctx.restore();

    ctx.fillStyle = "#011627";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(80, 1220, 1040, 100, [0, 0, 40, 40]);
    } else {
      ctx.rect(80, 1220, 1040, 100);
    }
    ctx.fill();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos • Hotline: +234 (0) 800-ISALU-CARE", 600, 1278);

    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Isalu_Appointment_Ticket_${booking.refCode}.png`;
    link.href = imageURI;
    link.click();
  };

  const buildTicketPdfDoc = (booking: any) => {
    if (!booking) return null;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setTextColor(215, 235, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text("ISALU HOSPITALS", 105, 145, { align: "center", angle: 25 });
    doc.setFontSize(16);
    doc.text("OFFICIAL VERIFIED TICKET", 105, 158, { align: "center", angle: 25 });

    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 45, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OFFICIAL APPOINTMENT TICKET", 105, 14, { align: "center" });

    const pdfLogoX = 62;
    const pdfLogoY = 26;
    const r = 2.5;

    doc.setFillColor(255, 255, 255);
    doc.circle(pdfLogoX, pdfLogoY - 3.8, r, "F");
    doc.circle(pdfLogoX - 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX + 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX, pdfLogoY + 3.8, r, "F");

    doc.setFontSize(22);
    doc.text("Isalu Hospitals", pdfLogoX + 8, 29, { align: "left" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Present this ticket or Reference Code at hospital reception.", 105, 35, { align: "center" });

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 52, 180, 26, 4, 4, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TICKET REFERENCE CODE", 105, 60, { align: "center" });

    doc.setTextColor(0, 138, 201);
    doc.setFontSize(22);
    doc.text(booking.refCode || "ISALU-000000", 105, 72, { align: "center" });

    let y = 92;

    const addDetailRow = (label1: string, val1: string, label2: string, val2: string) => {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(label1.toUpperCase(), 20, y);
      doc.text(label2.toUpperCase(), 115, y);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(val1 || "N/A", 20, y + 6);
      doc.text(val2 || "N/A", 115, y + 6);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(20, y + 11, 190, y + 11);

      y += 20;
    };

    addDetailRow("Patient Name", booking.patientName || "N/A", "Contact Phone", booking.patientPhone || "N/A");
    addDetailRow("Specialist Doctor", getDoctorDisplayAcronym(booking) || "Specialist", "Department / Specialty", booking.doctorSpecialty || "Specialist Clinic");
    addDetailRow("Appointment Date", formatDateToOrdinal(booking.date) || "N/A", "Time Slot", booking.time || "N/A");
    addDetailRow("Patient Type", booking.paymentType || "Private Self-Pay", "HMO / Enrollee ID", booking.paymentType === "HMO Insurance" ? `${booking.hmoName || "HMO"} (${booking.hmoPolicyCode || "N/A"})` : "N/A (Self-Pay)");

    if (booking.referralDocName) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ATTACHED REFERRAL DOCUMENT", 20, y);

      doc.setTextColor(5, 150, 105);
      doc.setFontSize(11);
      doc.text(`[Doc] ${booking.referralDocName}`, 20, y + 6);
      y += 20;
    }

    const sX = 168;
    const sY = 225;
    const sR = 18;

    doc.setFillColor(220, 38, 38);
    doc.circle(sX, sY, sR, "F");

    doc.setDrawColor(253, 224, 71);
    doc.setLineWidth(0.8);
    doc.circle(sX, sY, sR - 1.5, "S");

    doc.setFillColor(185, 28, 28);
    doc.circle(sX, sY, sR - 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("ISALU HOSPITALS", sX, sY - 6, { align: "center" });

    doc.setFontSize(11);
    doc.text("VERIFIED", sX, sY + 1, { align: "center" });

    doc.setFontSize(5);
    doc.text("OFFICIAL SEAL", sX, sY + 7, { align: "center" });

    doc.setFillColor(1, 22, 39);
    doc.rect(0, 275, 210, 22, "F");

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos  |  Hotline: +234 (0) 800-ISALU-CARE", 105, 287, { align: "center" });

    return doc;
  };

  const shareTicketAsPdf = async (booking: any) => {
    if (!booking) return;

    const doc = buildTicketPdfDoc(booking);
    if (!doc) return;

    const refCode = booking.refCode || booking.ref_code || booking.id || "000000";
    const fileName = `Isalu_Appointment_Ticket_${refCode}.pdf`;
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Isalu Hospitals Ticket - ${refCode}`,
          text: `Official Isalu Hospitals Appointment Ticket (${refCode})`,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    doc.save(fileName);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 4000);
  };

  const downloadTicketAsPdf = (booking: any) => {
    if (!booking) return;
    const doc = buildTicketPdfDoc(booking);
    if (!doc) return;

    doc.save(`Isalu_Appointment_Ticket_${booking.refCode}.pdf`);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedTime || !patientName || !patientPhone) {
      setApiError("Please complete all required fields before confirming your appointment.");
      return;
    }

    if (patientType === "HMO Insurance" && !hmoPolicyCode) {
      setApiError("Please enter your HMO Enrollee No / Policy ID to verify insurance coverage.");
      return;
    }

    if (isSameDayBookingWithin30MinCutoff(selectedDate, selectedTime)) {
      setApiError("Online appointments for today's clinic must be booked at least 30 minutes prior to the clinic start time. Please select a future date or contact hospital reception.");
      return;
    }

    setIsSubmittingBooking(true);
    await new Promise((resolve) => setTimeout(resolve, 450));

    const newBooking = {
      doctorId: selectedDoctor.id,
      doctor_id: selectedDoctor.id,
      doctorName: selectedDoctor.fullName || selectedDoctor.name,
      doctor_name: selectedDoctor.fullName || selectedDoctor.name,
      doctorAcronym: getDoctorDisplayAcronym(selectedDoctor),
      doctor_acronym: getDoctorDisplayAcronym(selectedDoctor),
      doctorSpecialty: selectedDoctor.specialty,
      doctor_specialty: selectedDoctor.specialty,
      date: selectedDate,
      time: selectedTime,
      patientName,
      patient_name: patientName,
      patientPhone,
      patient_phone: patientPhone,
      patientEmail,
      patient_email: patientEmail,
      reason,
      paymentType: patientType,
      payment_type: patientType,
      hmoName: patientType === "HMO Insurance" ? hmoName : "N/A",
      hmo_name: patientType === "HMO Insurance" ? hmoName : "N/A",
      hmoPolicyCode: patientType === "HMO Insurance" ? hmoPolicyCode : "",
      hmo_policy_code: patientType === "HMO Insurance" ? hmoPolicyCode : "",
      referralDocName: referralDocName || "",
      referral_doc_name: referralDocName || "",
      referralDocData: referralDocData || "",
      referral_doc_data: referralDocData || "",
      referralDocText: referralDocText || "",
      referral_doc_text: referralDocText || "",
      hmoStatus: patientType === "HMO Insurance" ? "Pending Pre-Auth" : "N/A",
      hmo_status: patientType === "HMO Insurance" ? "Pending Pre-Auth" : "N/A",
      paymentStatus: patientType === "HMO Insurance" ? "HMO Cover" : "Pending",
      payment_status: patientType === "HMO Insurance" ? "HMO Cover" : "Pending",
    };

    let savedRecord = newBooking;
    try {
      const res: any = await createBookingAPI(newBooking);
      if (res && (res.error || res.capacity)) {
        let errorMsg = res.error || "The daily capacity limit for this specialist has been reached.";
        if (typeof errorMsg === "object") {
          errorMsg = Object.values(errorMsg).flat().join(" ");
        }
        setApiError(errorMsg);
        setIsSubmittingBooking(false);
        return;
      }
      if (!res || res.error || !(res.refCode || res.ref_code)) {
        setApiError("The hospital server did not return a valid booking record. Please try again.");
        setIsSubmittingBooking(false);
        return;
      }
      savedRecord = res;
    } catch (e: any) {
      console.warn("createBookingAPI error:", e);
      const serverErr = e?.response?.data?.error || e?.message || "Could not save booking to backend database.";
      let cleanMsg = typeof serverErr === "object" ? "The selected specialist schedule is currently fully booked or unavailable." : String(serverErr);
      setApiError(cleanMsg);
      setIsSubmittingBooking(false);
      return;
    }

    try {
      window.dispatchEvent(new CustomEvent("isalu_booking_created", { detail: savedRecord }));
      window.dispatchEvent(new Event("storage"));
    } catch { }

    setIsSubmittingBooking(false);
    setBookingConfirmed(savedRecord);
    setStep(4);
  };

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 py-10 md:py-16">
      {/* GLOBAL API ERROR MODAL */}
      <ApiErrorModal error={apiError} onClose={() => setApiError(null)} />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="text-center mb-10 space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#008ac9]/10 px-4 py-1.5 text-xs font-black text-[#008ac9] dark:text-sky-400 border-2 border-[#008ac9]/20">
            <ShieldCheck className="h-4 w-4" /> Instant Online Appointment Ticket
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Book Doctor Consultation
          </h1>
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">
            Enter patient details first, select your payment category (Private vs HMO), and pick an eligible specialist doctor.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
          {[
            { num: 1, label: "Patient Details & Category" },
            { num: 2, label: "Select Specialist Doctor" },
            { num: 3, label: "Date & Time Schedule" },
            { num: 4, label: "Official Ticket" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${step === s.num
                  ? "bg-[#008ac9] text-white shadow-lg ring-4 ring-[#008ac9]/30"
                  : step > s.num
                    ? "bg-[#0072b1] text-white font-bold"
                    : "bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                  }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-xs font-black hidden sm:inline ${step === s.num ? "text-[#008ac9] dark:text-sky-400 font-black" : "text-slate-700 dark:text-slate-300"}`}>
                {s.label}
              </span>
              {s.num < 4 && <div className="h-1 w-6 sm:w-10 bg-slate-300 dark:bg-slate-800 rounded-full" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Patient Information & Payment Category */}
        {step === 1 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
              <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="h-6 w-6 text-[#008ac9]" /> Step 1: Patient Details & Category Type
                  </h2>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    Enter patient details and select payment category to filter eligible specialist doctors.
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#008ac9]/10 text-[#008ac9] font-black text-xs rounded-xl border border-[#008ac9]/30">
                  Step 1 of 4
                </span>
              </div>

              {/* Patient Category Type Selector */}
              <div className="bg-sky-50/70 dark:bg-slate-800/60 p-5 rounded-2xl border-2 border-[#008ac9]/30 space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-[#008ac9]" /> Patient Payment Category <span className="text-red-500 font-black ml-0.5">*</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#008ac9] uppercase">Determines Doctor Availability</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPatientType("Private Self-Pay");
                        if (selectedDoctor) {
                          const accepted = (selectedDoctor as any).acceptedPatientTypes || (selectedDoctor as any).accepted_patient_types || ["Private Self-Pay", "HMO Insurance"];
                          if (!accepted.includes("Private Self-Pay")) setSelectedDoctorId("");
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 ${patientType === "Private Self-Pay"
                        ? "bg-[#008ac9] text-white border-[#008ac9] shadow-lg ring-2 ring-[#008ac9]/30 scale-[1.02]"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-[#008ac9]"
                        }`}
                    >
                      <span className="text-lg">💳</span>
                      <span>Private Self-Pay Patient</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPatientType("HMO Insurance");
                        if (selectedDoctor) {
                          const accepted = (selectedDoctor as any).acceptedPatientTypes || (selectedDoctor as any).accepted_patient_types || ["Private Self-Pay", "HMO Insurance"];
                          if (!accepted.includes("HMO Insurance")) setSelectedDoctorId("");
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 ${patientType === "HMO Insurance"
                        ? "bg-[#008ac9] text-white border-[#008ac9] shadow-lg ring-2 ring-[#008ac9]/30 scale-[1.02]"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-[#008ac9]"
                        }`}
                    >
                      <span className="text-lg">🛡️</span>
                      <span>HMO Insurance Enrollee</span>
                    </button>
                  </div>
                </div>

                {/* Conditional HMO Fields */}
                {patientType === "HMO Insurance" && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-[#008ac9]/20 animate-fadeIn">
                    <div className="relative">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                        Search HMO Provider <span className="text-red-500 font-black ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required={patientType === "HMO Insurance"}
                          placeholder="Type 2+ letters (e.g. Hy, Re, AX)..."
                          value={hmoSearchQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHmoSearchQuery(val);
                            setHmoName(val);
                            setShowHmoSuggestions(val.trim().length >= 2);
                          }}
                          onFocus={() => {
                            if (hmoSearchQuery.trim().length >= 2) {
                              setShowHmoSuggestions(true);
                            }
                          }}
                          className="w-full p-3.5 pr-9 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] transition-all"
                        />
                        <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>

                      {showHmoSuggestions && hmoSearchQuery.trim().length >= 2 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-2xl shadow-xl max-h-52 overflow-y-auto p-1.5 animate-fadeIn">
                          {(() => {
                            const allHmoNames = hmoCompanies.map((h: any) => h.name).filter(Boolean);

                            const matches = allHmoNames.filter((provider) =>
                              provider.toLowerCase().includes(hmoSearchQuery.trim().toLowerCase())
                            );
                            if (matches.length === 0) {
                              return (
                                <div className="p-3 text-center text-xs font-bold text-slate-500">
                                  No preset HMO found. Keeping custom input: "{hmoSearchQuery}"
                                </div>
                              );
                            }
                            return matches.map((provider) => (
                              <button
                                type="button"
                                key={provider}
                                onClick={() => {
                                  setHmoName(provider);
                                  setHmoSearchQuery(provider);
                                  setShowHmoSuggestions(false);
                                }}
                                className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-[#008ac9] hover:text-white flex items-center justify-between transition-all group"
                              >
                                <span>🛡️ {provider}</span>
                                <span className="text-[10px] font-bold text-[#008ac9] group-hover:text-white uppercase">Select</span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                        Enrollee No / Policy ID <span className="text-red-500 font-black ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required={patientType === "HMO Insurance"}
                        placeholder="e.g. HYG-984210"
                        value={hmoPolicyCode}
                        onChange={(e) => setHmoPolicyCode(e.target.value)}
                        className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Contact Info */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                    Patient Full Name <span className="text-red-500 font-black ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-[#008ac9] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                    Contact Phone Number <span className="text-red-500 font-black ml-0.5">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 801 234 5678"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-[#008ac9] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-[#008ac9] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">Chief Complaint / Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Heart Checkup, General Fever"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-[#008ac9] transition-all"
                  />
                </div>

                {/* Optional Attach Referral Document */}
                <div className="md:col-span-2 pt-2">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block flex items-center justify-between">
                    <span>Attach Referral Letter / Document (Optional)</span>
                    <span className="text-[10px] text-slate-500 font-bold">Formats: PDF, PNG, JPG, DOC</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      id="referral-upload"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setReferralDocName(file.name);
                          const dataReader = new FileReader();
                          dataReader.onload = (evt) => {
                            setReferralDocData((evt.target?.result as string) || "");
                          };
                          dataReader.readAsDataURL(file);

                          const textReader = new FileReader();
                          textReader.onload = (evt) => {
                            const rawTxt = (evt.target?.result as string) || "";
                            const cleanTxt = rawTxt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").trim();
                            if (cleanTxt.length > 10) {
                              setReferralDocText(cleanTxt.substring(0, 4000));
                            }
                          };
                          textReader.readAsText(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="referral-upload"
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-[#008ac9] text-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800 text-xs font-black cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      📎 Choose Referral Document
                    </label>
                    {referralDocName ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-300">
                        ✓ {referralDocName}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">No document attached</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={!patientName.trim() || !patientPhone.trim() || (patientType === "HMO Insurance" && !hmoPolicyCode.trim())}
                  onClick={() => setStep(2)}
                  className="bg-[#008ac9] hover:bg-[#0072b1] disabled:opacity-50 text-white px-8 py-3.5 text-sm font-black rounded-2xl flex items-center gap-2 shadow-lg border-2 border-sky-300/40 transition-all transform hover:-translate-y-0.5"
                >
                  Continue to Doctor Selection <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Select Clinic & Specialist Doctor */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-[#008ac9]/10 border-2 border-[#008ac9]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{patientType === "HMO Insurance" ? "🛡️" : "💳"}</span>
                <div>
                  <span className="text-xs font-black block">
                    Patient Category: <strong className="text-[#008ac9] dark:text-sky-400 font-black">{patientType}</strong>
                    {patientType === "HMO Insurance" && ` (${hmoName})`}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mt-0.5">
                    Showing only Specialist Doctors registered to accept {patientType} consultations.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-black text-[#008ac9] hover:underline underline-offset-4 shrink-0"
              >
                Change Patient Category ✎
              </button>
            </div>

            <div ref={specialistsSectionRef} className="space-y-4 scroll-mt-24">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-sm">
                <div>
                  <span className="text-xs font-extrabold text-[#008ac9] dark:text-sky-400 uppercase tracking-wider block">
                    Specialist Selection
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Available {patientType} Specialists {selectedDeptObj ? `in ${selectedDeptObj.name}` : ""}
                  </h3>
                </div>

                <span className="text-xs font-bold text-[#008ac9] bg-sky-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-[#008ac9]/30 shrink-0">
                  {filteredDoctors.length} Doctor{filteredDoctors.length === 1 ? "" : "s"} Available
                </span>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800">
                  <Stethoscope className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200">No Doctors Available for {patientType}</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto mt-1">
                    There are currently no active doctors registered under this category accepting {patientType} patients.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDoctors.map((doctor: any) => {
                    const isSelected =
                      String(selectedDoctorId) === String(doctor.id) ||
                      String(selectedDoctorId) === String(doctor.doc_id);
                    const safeDays = getDoctorEffectiveAvailableDays(doctor);
                    const displayDays = safeDays.length > 0 ? safeDays : ["No Active Roster Set"];
                    const docAcceptedTypes = doctor.acceptedPatientTypes || doctor.accepted_patient_types || ["Private Self-Pay", "HMO Insurance"];

                    const isAvailableNext24h = isDoctorOnDutyInNext24Hours(doctor);
                    const nextDateStr = getNextAvailableDateForDoctor(doctor);

                    return (
                      <div
                        key={doctor.id || doctor.doc_id}
                        onClick={() => setSelectedDoctorId(doctor.id || doctor.doc_id)}
                        className={`transition-all rounded-3xl border-2 p-4 flex flex-col justify-between cursor-pointer ${isSelected
                          ? "border-[#008ac9] ring-2 ring-[#008ac9]/30 bg-sky-50 dark:bg-slate-800 shadow-md scale-[1.01]"
                          : "border-slate-300 dark:border-slate-700 hover:border-[#008ac9] hover:shadow-sm bg-white dark:bg-slate-900"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <SpecialistAvatar name={getDoctorDisplayAcronym(doctor)} imageUrl={doctor.image} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                                  {getDoctorDisplayAcronym(doctor)}
                                </h3>
                              </div>
                              {isAvailableNext24h ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 shrink-0">
                                  ⚡ Duty Tomorrow
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 shrink-0 flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> Next: {nextDateStr}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-extrabold text-[#008ac9] dark:text-sky-400 uppercase tracking-wide truncate mt-0.5">{doctor.specialty}</p>

                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {docAcceptedTypes.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md text-[9.5px] font-black border border-purple-200">
                                  {t === "HMO Insurance" ? "🛡️ HMO" : "💳 Private"}
                                </span>
                              ))}
                            </div>

                            <div className="mt-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-[#008ac9] flex-shrink-0" />
                              <span>Roster: <strong className="text-slate-900 dark:text-white font-black">{displayDays.join(", ")}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                          <span
                            className={`px-3 py-1.5 text-[11px] font-black rounded-xl transition-all ${isSelected
                              ? "bg-[#008ac9] text-white shadow-sm"
                              : "bg-slate-900 text-white hover:bg-[#008ac9]"
                              }`}
                          >
                            {isSelected ? "Selected ✓" : "Select Specialist →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 font-extrabold text-xs text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                >
                  Back to Patient Info
                </button>
                <button
                  type="button"
                  disabled={!selectedDoctorId}
                  onClick={() => setStep(3)}
                  className="bg-[#008ac9] hover:bg-[#0072b1] disabled:opacity-50 text-white px-8 py-3 text-sm font-black rounded-2xl flex items-center gap-2 shadow-lg border-2 border-sky-300/40 transition-all"
                >
                  Continue to Consultation Schedule <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Choose Date & Time Slot */}
        {step === 3 && selectedDoctor && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <SpecialistAvatar name={getDoctorDisplayAcronym(selectedDoctor)} imageUrl={selectedDoctor.image} size="sm" />
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{getDoctorDisplayAcronym(selectedDoctor)}</h3>
                    <p className="text-[10px] font-black text-[#008ac9] dark:text-sky-400 uppercase tracking-wide">{selectedDoctor.specialty}</p>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                      Duty Days: <strong className="text-slate-900 dark:text-white font-bold">{getDoctorEffectiveAvailableDays(selectedDoctor).join(", ") || "Monday, Tuesday, Wednesday, Thursday, Friday"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-black text-[#008ac9] hover:underline"
                >
                  Change Doctor ✎
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#008ac9]" /> 1. Select Available Consultation Date <span className="text-red-500 font-black ml-0.5">*</span>
                    </label>
                    <span className="text-xs font-bold text-[#008ac9] bg-sky-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-[#008ac9]/30 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#008ac9]" /> Next 30 Available Consultation Days Roster
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {getUpcomingDates(undefined, selectedDoctor).map((d) => {
                      const isSelected = selectedDate === d.dateStr;
                      const isNext = d.isNextAvailable;
                      const isFullyBooked = d.isFullyBooked;
                      const isClickable = d.isAvailable && !isFullyBooked;

                      return (
                        <button
                          type="button"
                          key={d.dateStr}
                          disabled={!isClickable}
                          aria-disabled={!isClickable}
                          aria-label={
                            isFullyBooked
                              ? `${d.dayShort} ${d.monthShort}: Fully booked`
                              : !d.isAvailable
                                ? `${d.dayShort} ${d.monthShort}: Not available`
                                : `${d.dayShort} ${d.monthShort}: Available`
                          }
                          onClick={() => {
                            if (!isClickable) return;

                            setSelectedDate(d.dateStr);
                            setSelectedTime(getDutyTimeWindow(selectedDoctor, d.dateStr));

                            setTimeout(() => {
                              slotsSectionRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }, 100);
                          }}
                          className={`relative py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center select-none ${isFullyBooked
                            ? "bg-rose-600 text-white border-rose-700 shadow-md cursor-not-allowed font-black"
                            : !d.isAvailable
                              ? "opacity-60 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                              : isSelected
                                ? "bg-[#008ac9] text-white border-[#008ac9] shadow-md ring-2 ring-[#008ac9]/30 font-black scale-[1.03]"
                                : isNext
                                  ? "bg-sky-50 dark:bg-sky-950/40 border-[#008ac9] ring-2 ring-[#008ac9]/40 text-slate-900 dark:text-white font-bold hover:bg-sky-100"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                            }`}
                        >
                          {isFullyBooked ? (
                            <span className="absolute -top-2 px-1.5 py-0.5 text-[7px] font-black rounded-full uppercase tracking-tighter shadow-sm border bg-white text-rose-700 border-rose-300">
                              FULL
                            </span>
                          ) : isNext ? (
                            <span className="absolute -top-2 px-1.5 py-0.5 text-[7px] font-black rounded-full uppercase tracking-tighter shadow-sm border bg-[#008ac9] text-white border-[#008ac9]">
                              Next Avail
                            </span>
                          ) : null}

                          <span className={`text-[8px] font-black uppercase tracking-tight ${isSelected || isFullyBooked ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                            {d.dayShort} ({d.weekOccurrenceBadge})
                          </span>
                          <span className={`text-[11px] font-black leading-tight my-0.5 ${!d.isAvailable && !isFullyBooked ? "text-slate-700 dark:text-slate-200" : ""}`}>{d.monthShort}</span>
                          <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-md ${isFullyBooked
                            ? "bg-white text-rose-600 shadow-sm uppercase tracking-wider font-black"
                            : !d.isAvailable
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                              : isSelected
                                ? "bg-white/20 text-white"
                                : "text-[#008ac9]"
                            }`}>
                            {isFullyBooked ? "FULL" : d.isAvailable ? (isNext ? "★ Next Avail" : "✓ Available") : "Off Duty"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consultation Slots & Capacity Status Section */}
                <div ref={slotsSectionRef} className="scroll-mt-24 space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#008ac9]" /> 2. Consultation Slots & Roster Status <span className="text-red-500 font-black ml-0.5">*</span>
                      </label>
                      {selectedDate ? (
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                          Live capacity countdown for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}:
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          ⚠️ Please select an available consultation date on the calendar above first.
                        </p>
                      )}
                    </div>
                  </div>

                  {!selectedDate ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6">
                      <Clock className="h-8 w-8 text-[#008ac9]/60 mx-auto mb-2" />
                      <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400">
                        Please select an available consultation date on the calendar above to view live slot availability.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fadeIn">
                      {(() => {
                        const slotStats = getDoctorSlotStatsForDate(selectedDoctor.id, selectedDate);
                        const formattedDateName = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                        const isFilled = slotStats.remaining <= 0;

                        if (isFilled) {
                          return (
                            <div className="bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-900 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-300 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/80 rounded-xl shrink-0">
                                  <XCircle className="h-5 w-5 text-rose-600 fill-rose-100" />
                                </div>
                                <div>
                                  <span className="text-xs font-black block">
                                    ⚠️ Schedule Full for {formattedDateName}
                                  </span>
                                  <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-400 block mt-0.5">
                                    This specialist has reached the maximum daily patient capacity of {slotStats.maxCapacity} bookings for this date. Please choose another date.
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-rose-800 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/80 px-3 py-1 rounded-xl border border-rose-300/80 shrink-0">
                                Fully Booked ({slotStats.bookedOnDate}/{slotStats.maxCapacity})
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-900 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 dark:text-emerald-300 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/80 rounded-xl shrink-0">
                                <Users className="h-5 w-5 text-emerald-600 animate-pulse" />
                              </div>
                              <div>
                                <span className="text-xs font-black block">
                                  Consultation Slots for {formattedDateName}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 block mt-0.5">
                                  <strong className="font-black text-emerald-950 dark:text-emerald-200">{slotStats.bookedOnDate}</strong> patients booked • <strong className="font-black text-emerald-950 dark:text-emerald-200">{slotStats.remaining}</strong> slots remaining out of {slotStats.maxCapacity} daily appointment capacity.
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/80 px-3 py-1 rounded-xl border border-emerald-300/80 shrink-0">
                              {slotStats.remaining} Slots Left
                            </span>
                          </div>
                        );
                      })()}

                      {/* Duty Time Window Selection Button */}
                      <div className="max-w-md pt-2">
                        {(() => {
                          const dutyTime = getDutyTimeWindow(selectedDoctor, selectedDate);
                          const isCutoff = isSameDayBookingWithin30MinCutoff(selectedDate, dutyTime);
                          const isSelected = selectedTime === dutyTime && !isCutoff;

                          if (isCutoff) {
                            return (
                              <div className="space-y-3">
                                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-900 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
                                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div className="text-xs space-y-1">
                                    <span className="font-black text-amber-950 dark:text-amber-100 block">
                                      ⚠️ Same-Day Booking Cutoff Reached (&lt;30 Mins)
                                    </span>
                                    <span className="font-semibold text-amber-800 dark:text-amber-300 block leading-relaxed">
                                      Online bookings for today's clinic session must be placed at least 30 minutes prior to the clinic start time. Online booking for this time slot today is closed. Please select a future date.
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  className="w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between opacity-60 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500 cursor-not-allowed"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center font-black bg-slate-200 dark:bg-slate-800 text-slate-500">
                                      <Clock className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                      <span className="text-[8px] font-black uppercase tracking-tight block text-slate-500">
                                        Duty Hours (Booking Closed Today)
                                      </span>
                                      <span className="text-xs font-black tracking-tight block my-0.5 line-through">
                                        {dutyTime}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300/60">
                                    Cutoff Reached
                                  </span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedTime(dutyTime)}
                              className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group shadow-sm ${isSelected
                                ? "bg-[#008ac9] text-white border-[#008ac9] shadow-md ring-2 ring-[#008ac9]/30 scale-[1.01]"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-[#008ac9] hover:bg-sky-50 dark:hover:bg-slate-800"
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black transition-all ${isSelected ? "bg-white text-[#008ac9]" : "bg-sky-100 dark:bg-slate-800 text-[#008ac9]"
                                  }`}>
                                  <Clock className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <span className={`text-[8px] font-black uppercase tracking-tight block ${isSelected ? "text-sky-100" : "text-[#008ac9]"}`}>
                                    Duty Hours (Start – End)
                                  </span>
                                  <span className="text-xs font-black tracking-tight block my-0.5">
                                    {dutyTime}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg inline-flex items-center gap-1 shadow-sm transition-all ${isSelected
                                  ? "bg-white text-[#008ac9]"
                                  : "bg-slate-900 text-white group-hover:bg-[#008ac9]"
                                  }`}>
                                  {isSelected ? "✓ Selected" : "Select"}
                                </span>
                              </div>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isSubmittingBooking && (
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 animate-pulse shadow-md my-4">
                <RefreshCw className="h-5 w-5 animate-spin text-[#008ac9]" />
                <span>Processing your appointment request & issuing official ticket... Please wait.</span>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                disabled={isSubmittingBooking}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 font-extrabold text-xs text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              {(() => {
                const slotStats = selectedDate ? getDoctorSlotStatsForDate(selectedDoctor.id, selectedDate) : { remaining: 1 };
                const isFull = slotStats.remaining <= 0;

                return (
                  <button
                    type="button"
                    disabled={!selectedDate || !selectedTime || isSubmittingBooking || isFull || isSameDayBookingWithin30MinCutoff(selectedDate, selectedTime)}
                    onClick={handleBookingSubmit}
                    className="bg-[#008ac9] hover:bg-[#0072b1] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 text-sm font-black rounded-2xl flex items-center gap-2 shadow-lg border-2 border-sky-300/40 transition-all"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Submitting Request... Please Wait</span>
                      </>
                    ) : isFull ? (
                      <>Schedule Full (Capacity Reached)</>
                    ) : (
                      <>Confirm & Issue Official Ticket ✓</>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* STEP 4: Official Appointment Ticket Receipt */}
        {step === 4 && bookingConfirmed && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-[#008ac9] text-white p-7 text-center relative overflow-hidden">
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full text-xs font-black mb-3 border border-white/30">
                  <CheckCircle className="h-4 w-4 text-sky-200" /> OFFICIAL APPOINTMENT TICKET
                </div>
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="bg-white p-2 rounded-2xl shadow-md border border-white/40 flex items-center justify-center">
                    <IsaluLogo iconOnly size="sm" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-white">Isalu Hospitals</h2>
                </div>
                <p className="text-xs font-bold text-sky-100 mt-1">Present this ticket or Reference Code at hospital reception.</p>
              </div>

              <div className="bg-sky-50 dark:bg-slate-800 border-y-2 border-[#008ac9]/30 p-5 text-center">
                <span className="text-xs text-slate-700 dark:text-slate-300 block font-black uppercase tracking-widest mb-1">
                  Ticket Reference Code
                </span>
                <span className="text-4xl font-black tracking-widest text-[#008ac9] dark:text-sky-400">
                  {bookingConfirmed.refCode}
                </span>
              </div>

              <div className="p-7 space-y-4 text-sm font-bold">
                <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-500 block font-bold">Patient Name</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">{bookingConfirmed.patientName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-bold">Contact Phone</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">{bookingConfirmed.patientPhone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block font-bold">Specialist Doctor</span>
                    <span className="font-black text-[#008ac9] dark:text-sky-400 text-base">{getDoctorDisplayAcronym(bookingConfirmed)}</span>
                    <span className="text-xs font-bold text-slate-600 block">{bookingConfirmed.doctorSpecialty}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-500 block font-bold">Appointment Date</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">{formatDateToOrdinal(bookingConfirmed.date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-bold">Time Slot</span>
                    <span className="font-black text-[#008ac9] dark:text-sky-400 text-base">{bookingConfirmed.time}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-500 block font-bold">Patient Type</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">{bookingConfirmed.paymentType || "Private Self-Pay"}</span>
                  </div>
                  {bookingConfirmed.paymentType === "HMO Insurance" && (
                    <div>
                      <span className="text-xs text-slate-500 block font-bold">HMO & Enrollee ID</span>
                      <span className="font-black text-[#008ac9] dark:text-sky-400 text-sm">{bookingConfirmed.hmoName} ({bookingConfirmed.hmoPolicyCode})</span>
                    </div>
                  )}
                  {bookingConfirmed.referralDocName && (
                    <div className="col-span-2 pt-1">
                      <span className="text-xs text-slate-500 block font-bold">Attached Referral Letter</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">📎 {bookingConfirmed.referralDocName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 p-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300 border-t-2 border-slate-200 dark:border-slate-800">
                No. 46, Ijaiye Road (beside Tastee Fried Chicken and opposite Ogba Shopping Arcade / Caterpillar Bus Stop), Ogba, Ikeja, Lagos, Nigeria • Hotline: +234 (0) 800-ISALU-CARE
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => downloadTicketAsImage(bookingConfirmed)}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-2 border border-emerald-500"
              >
                <Download className="h-4 w-4" /> Save Image (PNG)
              </button>

              <button
                type="button"
                onClick={() => downloadTicketAsPdf(bookingConfirmed)}
                className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <FileText className="h-4 w-4 text-sky-400" /> Download PDF
              </button>

              <button
                type="button"
                onClick={() => shareTicketAsPdf(bookingConfirmed)}
                className="flex-1 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs sm:text-sm rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-2 border border-sky-500"
              >
                <Share2 className="h-4 w-4" /> {copiedShare ? "PDF Generated!" : "Share PDF"}
              </button>

              <Link
                to={`/appointments?ref=${bookingConfirmed.refCode}`}
                className="py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-1.5 border border-amber-600"
              >
                🗓️ Reschedule / Lookup Ticket →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}