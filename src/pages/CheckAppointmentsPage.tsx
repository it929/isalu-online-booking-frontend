import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  CheckCircle2,
  Ticket,
  Download,
  FileText,
  RefreshCw,
  X,
  AlertCircle,
  Copy,
  Check,
  CalendarDays,
  Edit3,
  Lock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { updateBookingAPI, getDoctorsAPI, getSchedulesAPI, lookupBookingAPI, getBookingAvailabilityAPI } from "../api/client";

const getDoctorDisplayAcronym = (booking: any) => booking?.doctorName || booking?.doctor_name || booking?.acronym || "Specialist";

export function CheckAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal / Slip States
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Reschedule Form States
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // UI Toast & Copy feedback
  const [copiedRef, setCopiedRef] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 6000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // Helper: Format day numbers to ordinal suffixes
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  // Helper: Format date into "7th October, 2026" format for booking slips & tickets
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

    if (isNaN(dateObj.getTime())) {
      return dateInput;
    }

    const dayNum = dateObj.getDate();
    const ordinalDay = getOrdinalSuffix(dayNum);
    const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
    const yearNum = dateObj.getFullYear();

    return `${ordinalDay} ${monthName}, ${yearNum}`;
  };

  // Helper: Format date to standard ISO YYYY-MM-DD for backend Django/DRF submission
  const formatDateToISO = (dateInput: string): string => {
    if (!dateInput) return "";
    const trimmed = String(dateInput).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const cleaned = trimmed.replace(/(\d+)(st|nd|rd|th)/i, "$1");
    const parsedDate = new Date(cleaned);

    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const day = String(parsedDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return dateInput;
  };

  // Helper 1: Find Doctor object matching a booking
  const findDoctorForBooking = (booking: any) => {
    if (!booking) return null;
    const bDocId = String(booking.doctorId || booking.doctor_id || "").toLowerCase().trim();
    const bDocName = String(booking.doctorName || booking.doctor_name || "").toLowerCase().trim();

    if (bDocId) {
      const matched = doctorsList.find(
        (d) => String(d.id || d.doc_id || "").toLowerCase().trim() === bDocId
      );
      if (matched) return matched;
    }

    if (bDocName) {
      const matched = doctorsList.find((d) => {
        const dName = String(d.name || "").toLowerCase().trim();
        const dFullName = String(d.fullName || d.full_name || "").toLowerCase().trim();
        return (dName && (bDocName.includes(dName) || dName.includes(bDocName))) ||
          (dFullName && (bDocName.includes(dFullName) || dFullName.includes(bDocName)));
      });
      if (matched) return matched;
    }

    return null;
  };

  // Helper 2: Resolve configured duty days for the booking doctor
  const getDoctorEffectiveDutyDays = (booking: any): string[] => {
    if (!booking) return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const bDocId = String(booking.doctorId || booking.doctor_id || "").toLowerCase().trim();
    const bDocName = String(booking.doctorName || booking.doctor_name || "").toLowerCase().trim();

    const matchedSchedules = schedulesList.filter((s) => {
      const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
      if (bDocId && sDocId && sDocId === bDocId) return true;

      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      if (bDocName && sName && (bDocName.includes(sName) || sName.includes(bDocName))) return true;

      return false;
    });

    const scheduleDays: string[] = [];
    matchedSchedules.forEach((s) => {
      const days = s.dutyDays || s.duty_days;
      if (Array.isArray(days)) {
        scheduleDays.push(...days);
      } else if (typeof days === "string" && days.trim()) {
        scheduleDays.push(days.trim());
      }
    });

    if (scheduleDays.length > 0) {
      return Array.from(new Set(scheduleDays));
    }

    const docObj = findDoctorForBooking(booking);
    if (docObj) {
      const docDays = docObj.availableDays || docObj.available_days || docObj.availability;
      if (Array.isArray(docDays) && docDays.length > 0) {
        return Array.from(new Set(docDays));
      }
      if (typeof docDays === "string" && docDays.trim()) {
        try {
          const parsed = JSON.parse(docDays);
          if (Array.isArray(parsed) && parsed.length > 0) return Array.from(new Set(parsed));
        } catch { }
        return [docDays.trim()];
      }
    }

    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  };

  // Helper 3: Check if a date string (YYYY-MM-DD) matches doctor duty days
  const isDateMatchingDoctorDutyDays = (dateStr: string, dutyDays: string[]): boolean => {
    if (!dateStr || dutyDays.length === 0) return true;

    const dateObj = new Date(dateStr + "T00:00:00");
    if (isNaN(dateObj.getTime())) return false;

    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });

    return dutyDays.some((av) => {
      const upperAv = av.toUpperCase();
      const upperName = dayName.toUpperCase();
      const upperShort = dayShort.toUpperCase();

      if (upperAv.includes(dateStr)) return true;
      if (upperAv.includes(upperName) || upperAv.includes(upperShort)) return true;

      const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
      const weekdaysShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      for (let idx = 0; idx < weekdays.length; idx++) {
        if ((upperAv.includes(weekdays[idx]) || upperAv.includes(weekdaysShort[idx])) && idx === dateObj.getDay()) {
          return true;
        }
      }

      return false;
    });
  };

  // Helper 4: Get upcoming valid duty dates for doctor
  const getUpcomingAvailableDutyDatesForDoctor = (dutyDays: string[], maxCount = 25) => {
    const dates: { dateStr: string; displayLabel: string; dayName: string; dayShort: string; isNextAvailable?: boolean; isAvailable?: boolean; isPast24HoursNotice?: boolean }[] = [];
    const now = new Date();
    const minAllowedTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dYear = d.getFullYear();
      const dMonth = String(d.getMonth() + 1).padStart(2, "0");
      const dDay = String(d.getDate()).padStart(2, "0");
      const dateStr = `${dYear}-${dMonth}-${dDay}`;

      const candidateStartTime = new Date(dYear, d.getMonth(), d.getDate(), 8, 0, 0);
      const isPast24HoursNotice = candidateStartTime.getTime() >= minAllowedTime.getTime();

      if (isDateMatchingDoctorDutyDays(dateStr, dutyDays)) {
        const displayLabel = formatDateToOrdinal(dateStr);
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
        const dayShort = d.toLocaleDateString("en-US", { weekday: "short" });

        dates.push({ dateStr, displayLabel, dayName, dayShort, isPast24HoursNotice, isAvailable: isPast24HoursNotice });
        if (dates.length >= maxCount) break;
      }
    }

    let foundNext = false;
    for (const item of dates) {
      if (item.isAvailable && !foundNext) {
        item.isNextAvailable = true;
        foundNext = true;
      } else {
        item.isNextAvailable = false;
        item.isAvailable = false;
      }
    }

    return dates;
  };

  // Helper 5: Calculate slot stats
  const getDoctorSlotStatsForDate = (booking: any, dateStr: string) => {
    if (!booking || !dateStr) return { bookedCount: 0, maxCapacity: 15, remainingSlots: 15, isLocked: false };

    const bDocId = String(booking.doctorId || booking.doctor_id || "").toLowerCase().trim();
    const bDocName = String(booking.doctorName || booking.doctor_name || "").toLowerCase().trim();
    const currentRef = String(booking.refCode || booking.ref_code || "").toLowerCase().trim();

    const bookedCount = bookings.filter((b) => {
      const bCode = String(b.refCode || b.ref_code || "").toLowerCase().trim();
      if (bCode && bCode === currentRef) return false;

      const docIdMatch = bDocId && String(b.doctorId || b.doctor_id || "").toLowerCase().trim() === bDocId;
      const docNameMatch = bDocName && String(b.doctorName || b.doctor_name || "").toLowerCase().trim().includes(bDocName);

      const isMatchDoc = docIdMatch || docNameMatch;
      return isMatchDoc && b.date === dateStr && b.status !== "Cancelled";
    }).length;

    const matchedSched = schedulesList.find((s) => {
      const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
      if (bDocId && sDocId && sDocId === bDocId) return true;
      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      if (bDocName && sName && (bDocName.includes(sName) || sName.includes(bDocName))) return true;
      return false;
    });

    let maxCapacity = 15;
    if (matchedSched) {
      const dateObj = new Date(dateStr + "T00:00:00");
      if (!isNaN(dateObj.getTime())) {
        const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

        if (matchedSched.dayConfigs) {
          const cfg = matchedSched.dayConfigs[dayShort] || matchedSched.dayConfigs[dayName];
          if (cfg && cfg.capacity && !isNaN(Number(cfg.capacity))) {
            maxCapacity = Number(cfg.capacity);
          } else if (matchedSched.capacity && !isNaN(Number(matchedSched.capacity))) {
            maxCapacity = Number(matchedSched.capacity);
          }
        } else if (matchedSched.capacity && !isNaN(Number(matchedSched.capacity))) {
          maxCapacity = Number(matchedSched.capacity);
        }
      }
    }

    const remainingSlots = Math.max(0, maxCapacity - bookedCount);
    const isLocked = remainingSlots <= 0;

    return { bookedCount, maxCapacity, remainingSlots, isLocked };
  };

  // Helper 6: Extract clean time slot string
  const cleanTimeSlotString = (rawTime: string, dateStr?: string): string => {
    if (!rawTime) return "08:00 AM – 10:00 AM";

    let inputStr = String(rawTime).trim();

    if (inputStr.includes("|") && dateStr) {
      const dateObj = new Date(dateStr + "T00:00:00");
      if (!isNaN(dateObj.getTime())) {
        const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

        const parts = inputStr.split("|").map((p) => p.trim());
        const matchedPart = parts.find(
          (p) => p.toLowerCase().includes(dayShort) || p.toLowerCase().includes(dayName)
        );

        if (matchedPart) {
          inputStr = matchedPart;
        } else if (parts.length > 0) {
          inputStr = parts[0];
        }
      }
    } else if (inputStr.includes("|")) {
      inputStr = inputStr.split("|")[0].trim();
    }

    const timeRangeMatch = inputStr.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*(?:–|-|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
    if (timeRangeMatch) {
      return timeRangeMatch[0].trim();
    }

    const cleaned = inputStr
      .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*:\s*/i, "")
      .replace(/\(\d+\s*visits?\)/gi, "")
      .replace(/\(\d+\s*patients?\)/gi, "")
      .replace(/\|\s*/g, "")
      .trim();

    return cleaned || "08:00 AM – 10:00 AM";
  };

  // Helper 7: Resolve specific clean time slots for doctor based on date
  const getDoctorTimeSlotsForDate = (booking: any, dateStr: string): string[] => {
    const defaultSlots = [
      "08:00 AM – 10:00 AM",
      "10:00 AM – 12:00 PM",
      "12:00 PM – 02:00 PM",
      "02:00 PM – 04:00 PM",
    ];

    if (!booking || !dateStr) return defaultSlots;

    const bDocId = String(booking.doctorId || booking.doctor_id || "").toLowerCase().trim();
    const bDocName = String(booking.doctorName || booking.doctor_name || "").toLowerCase().trim();

    let rawList: string[] = [];

    const matchedSched = schedulesList.find((s) => {
      const sDocId = String(s.doctorId || s.doctor_id || "").toLowerCase().trim();
      if (bDocId && sDocId && sDocId === bDocId) return true;
      const sName = String(s.doctorName || s.doctor_name || "").toLowerCase().trim();
      if (bDocName && sName && (bDocName.includes(sName) || sName.includes(bDocName))) return true;
      return false;
    });

    if (matchedSched) {
      const dateObj = new Date(dateStr + "T00:00:00");
      if (!isNaN(dateObj.getTime())) {
        const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

        if (matchedSched.dayConfigs) {
          const cfg = matchedSched.dayConfigs[dayShort] || matchedSched.dayConfigs[dayName];
          if (cfg) {
            if (Array.isArray(cfg.timeSlots) && cfg.timeSlots.length > 0) rawList = cfg.timeSlots;
            else if (cfg.shiftTime) rawList = [cfg.shiftTime];
          }
        }
      }

      if (rawList.length === 0 && Array.isArray(matchedSched.time_slots) && matchedSched.time_slots.length > 0) {
        rawList = matchedSched.time_slots;
      } else if (rawList.length === 0 && matchedSched.shiftTime) {
        rawList = [matchedSched.shiftTime];
      }
    }

    if (rawList.length === 0) {
      const docObj = findDoctorForBooking(booking);
      if (docObj) {
        const slots = docObj.timeSlots || docObj.time_slots;
        if (Array.isArray(slots) && slots.length > 0) rawList = slots;
        else if (typeof slots === "string" && slots.trim()) {
          try {
            const parsed = JSON.parse(slots);
            if (Array.isArray(parsed) && parsed.length > 0) rawList = parsed;
            else rawList = [slots.trim()];
          } catch {
            rawList = [slots.trim()];
          }
        }
      }
    }

    if (rawList.length === 0) {
      rawList = defaultSlots;
    }

    const cleanedList = rawList
      .map((s) => cleanTimeSlotString(s, dateStr))
      .filter((s, idx, arr) => s && arr.indexOf(s) === idx);

    return cleanedList.length > 0 ? cleanedList : defaultSlots;
  };

  // Canvas Image Ticket Generator
  const downloadTicketAsImage = (booking: any) => {
    if (!booking) return;

    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Ticket download is disabled: ${check.reason}.`, "error");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(80, 80, 1040, 1290, 40);
    } else {
      ctx.rect(80, 80, 1040, 1290);
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
    ctx.fillText("TICKET REFERENCE CODE (PERMANENT)", 600, 340);

    ctx.fillStyle = "#008AC9";
    ctx.font = "900 52px sans-serif";
    ctx.fillText(booking.refCode || booking.ref_code || "ISALU-000000", 600, 405);

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

    drawRow("PATIENT NAME", booking.patientName || booking.patient_name || "N/A", "CONTACT PHONE", booking.patientPhone || booking.patient_phone || "N/A");
    drawRow("SPECIALIST DOCTOR", getDoctorDisplayAcronym(booking) || "Specialist", "DEPARTMENT / SPECIALTY", booking.doctorSpecialty || booking.doctor_specialty || "Specialist Clinic");
    drawRow("APPOINTMENT DATE", booking.date || "N/A", "TIME SLOT", cleanTimeSlotString(booking.time, booking.date));
    drawRow(
      "PATIENT TYPE",
      booking.paymentType || booking.payment_type || "Private Self-Pay",
      "BOOKING STATUS",
      booking.status || "Confirmed"
    );

    if (booking.referralDocName || booking.referral_doc_name) {
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("ATTACHED REFERRAL DOCUMENT", 140, y);
      ctx.fillStyle = "#059669";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(`📎 ${booking.referralDocName || booking.referral_doc_name}`, 140, y + 35);
    }

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#008AC9";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.translate(600, 780);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.fillText("ISALU HOSPITALS", 0, 0);
    ctx.font = "900 30px sans-serif";
    ctx.fillText("OFFICIAL VERIFIED TICKET", 0, 45);
    ctx.restore();

    ctx.save();
    const sealX = 940;
    const sealY = 1130;
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
      (ctx as any).roundRect(80, 1270, 1040, 100, [0, 0, 40, 40]);
    } else {
      ctx.rect(80, 1270, 1040, 100);
    }
    ctx.fill();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos • Hotline: +234 (0) 800-ISALU-CARE", 600, 1328);

    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const code = booking.refCode || booking.ref_code;
    link.download = `Isalu_Appointment_Ticket_${code}.png`;
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

    const code = booking.refCode || booking.ref_code || "ISALU-000000";

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
    doc.text("TICKET REFERENCE CODE (PERMANENT)", 105, 60, { align: "center" });

    doc.setTextColor(0, 138, 201);
    doc.setFontSize(22);
    doc.text(code, 105, 72, { align: "center" });

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

    addDetailRow("Patient Name", booking.patientName || booking.patient_name || "N/A", "Contact Phone", booking.patientPhone || booking.patient_phone || "N/A");
    addDetailRow("Specialist Doctor", getDoctorDisplayAcronym(booking) || "Specialist", "Department / Specialty", booking.doctorSpecialty || booking.doctor_specialty || "Specialist Clinic");
    addDetailRow("Appointment Date", booking.date || "N/A", "Time Slot", cleanTimeSlotString(booking.time, booking.date));
    addDetailRow("Patient Type", booking.paymentType || booking.payment_type || "Private Self-Pay", "Booking Status", booking.status || "Confirmed");

    if (booking.referralDocName || booking.referral_doc_name) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ATTACHED REFERRAL DOCUMENT", 20, y);

      doc.setTextColor(5, 150, 105);
      doc.setFontSize(11);
      doc.text(`[Doc] ${booking.referralDocName || booking.referral_doc_name}`, 20, y + 6);
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

    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Ticket sharing is disabled: ${check.reason}.`, "error");
      return;
    }

    const doc = buildTicketPdfDoc(booking);
    if (!doc) return;

    const code = booking.refCode || booking.ref_code || "ISALU-000000";
    const fileName = `Isalu_Appointment_Ticket_${code}.pdf`;
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Isalu Hospitals Ticket - ${code}`,
          text: `Official Isalu Hospitals Appointment Ticket (${code})`,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    doc.save(fileName);
    showToast("PDF Ticket generated & downloaded.", "success");
  };

  const downloadTicketAsPdf = (booking: any) => {
    if (!booking) return;

    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Ticket download is disabled: ${check.reason}.`, "error");
      return;
    }

    const doc = buildTicketPdfDoc(booking);
    if (!doc) return;

    const code = booking.refCode || booking.ref_code || "ISALU-000000";
    doc.save(`Isalu_Appointment_Ticket_${code}.pdf`);
  };

  useEffect(() => {
    async function loadAllData() {
      const [remoteDoctors, remoteSchedules] = await Promise.all([getDoctorsAPI(), getSchedulesAPI()]);
      setDoctorsList(Array.isArray(remoteDoctors) ? remoteDoctors : []);
      setSchedulesList(Array.isArray(remoteSchedules) ? remoteSchedules : []);

      const urlRef = searchParams.get("ref") || searchParams.get("code");
      if (urlRef) {
        const found = await lookupBookingAPI(urlRef);
        const matches = found && !found.error ? [found] : [];
        setBookings(matches);
        setSearchQuery(urlRef);
        setHasSearched(true);
        setFilteredBookings(matches);
        if (matches.length > 0) { setSelectedBooking(matches[0]); setIsSlipModalOpen(true); }
      } else {
        setBookings([]);
      }
    }
    loadAllData();

    const pollInterval = setInterval(() => {
      loadAllData();
    }, 2000);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("isalu_hospital_channel");
      channel.onmessage = () => {
        loadAllData();
      };
    } catch { }

    window.addEventListener("storage", loadAllData);
    window.addEventListener("isalu_booking_updated", loadAllData);

    return () => {
      clearInterval(pollInterval);
      if (channel) channel.close();
      window.removeEventListener("storage", loadAllData);
      window.removeEventListener("isalu_booking_updated", loadAllData);
    };
  }, [searchParams]);

  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { setHasSearched(false); setFilteredBookings([]); return; }
    setIsSearching(true);
    try {
      const found = await lookupBookingAPI(q);
      const matches = found && !found.error ? [found] : [];
      setBookings(matches);
      setFilteredBookings(matches);
      setHasSearched(true);
    } catch {
      setFilteredBookings([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const isActionDisabled = (booking: any) => {
    if (!booking) return { disabled: true, reason: "Invalid appointment" };
    const status = String(booking.status || "").toLowerCase().trim();

    if (status === "cancelled" || status === "canceled") {
      return { disabled: true, reason: "Appointment is cancelled" };
    }
    if (status === "completed") {
      return { disabled: true, reason: "Appointment is already completed" };
    }

    return { disabled: false, reason: "" };
  };

  const handleOpenReschedule = (booking: any) => {
    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Cannot reschedule: ${check.reason}.`, "error");
      return;
    }

    setSelectedBooking(booking);
    const isoDate = formatDateToISO(booking.date);
    setRescheduleDate(isoDate);

    const timeSlots = getDoctorTimeSlotsForDate(booking, isoDate);
    const cleanedTime = cleanTimeSlotString(booking.time, isoDate);
    setRescheduleTime(timeSlots.includes(cleanedTime) ? cleanedTime : timeSlots[0] || "");
    setRescheduleReason("");
    setIsRescheduleOpen(true);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !rescheduleDate) {
      showToast("Please select a valid appointment date.", "error");
      return;
    }

    const isoDate = formatDateToISO(rescheduleDate);

    const targetDateObj = new Date(isoDate + "T08:00:00");
    const minNoticeTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (targetDateObj.getTime() < minNoticeTime.getTime()) {
      showToast("Rescheduling requires at least 24 hours advance notice.", "error");
      return;
    }

    setIsSubmittingReschedule(true);

    try {
      const payload = {
        date: isoDate,
        time: rescheduleTime,
        reschedule_reason: rescheduleReason || "Patient requested reschedule",
        status: "Confirmed",
      };

      const refCode = selectedBooking.refCode || selectedBooking.ref_code;
      const res = await updateBookingAPI(refCode, payload);

      if (res && res.error) {
        const err = Array.isArray(res.error) ? res.error.join(" ") : String(res.error);
        showToast(`Reschedule failed: ${err}`, "error");
        setIsSubmittingReschedule(false);
        return;
      }

      const updatedBooking = {
        ...selectedBooking,
        date: isoDate,
        time: rescheduleTime,
        rescheduleReason,
      };

      setSelectedBooking(updatedBooking);
      setBookings((prev) =>
        prev.map((b) =>
          (b.refCode || b.ref_code) === refCode ? updatedBooking : b
        )
      );
      setFilteredBookings((prev) =>
        prev.map((b) =>
          (b.refCode || b.ref_code) === refCode ? updatedBooking : b
        )
      );

      setIsRescheduleOpen(false);
      showToast("Appointment rescheduled successfully!", "success");
    } catch {
      showToast("An unexpected error occurred while rescheduling.", "error");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all animate-bounce ${toastNotification.type === "error" ? "bg-red-600" : "bg-emerald-600"
            }`}
        >
          {toastNotification.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Appointment Status & Management
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Track your appointment status, view booking details, download official slips, or reschedule your visit.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-sky-500 transition-all">
            <Search className="w-5 h-5 text-slate-400 absolute left-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Reference Code (e.g., ISALU-982341)..."
              className="w-full pl-12 pr-32 py-4 text-slate-800 placeholder-slate-400 focus:outline-none text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Appointments Found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  We couldn't find any appointment matching reference "{searchQuery}".
                </p>
              </div>
            ) : (
              filteredBookings.map((b, idx) => {
                const actionCheck = isActionDisabled(b);

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Reference Code
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-lg font-extrabold text-sky-600">
                            {b.refCode || b.ref_code || "N/A"}
                          </span>
                          <button
                            onClick={() => copyToClipboard(b.refCode || b.ref_code)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${b.status === "Confirmed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : b.status === "Cancelled"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-sky-50 text-sky-700 border border-sky-200"
                            }`}
                        >
                          {b.status || "Confirmed"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-start gap-3">
                        <UserCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Patient</p>
                          <p className="font-bold text-slate-800">{b.patientName || b.patient_name || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Doctor</p>
                          <p className="font-bold text-slate-800">{getDoctorDisplayAcronym(b)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Date & Time</p>
                          <p className="font-bold text-slate-800">
                            {formatDateToOrdinal(b.date)} ({cleanTimeSlotString(b.time, b.date)})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setIsSlipModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <FileText className="w-4 h-4" /> View Details
                      </button>

                      <button
                        disabled={actionCheck.disabled}
                        onClick={() => downloadTicketAsPdf(b)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" /> Download Ticket (PDF)
                      </button>

                      <button
                        disabled={actionCheck.disabled}
                        onClick={() => downloadTicketAsImage(b)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Ticket className="w-4 h-4" /> Save Ticket (Image)
                      </button>

                      <button
                        disabled={actionCheck.disabled}
                        onClick={() => shareTicketAsPdf(b)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </button>

                      <button
                        disabled={actionCheck.disabled}
                        onClick={() => handleOpenReschedule(b)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs sm:text-sm transition-colors ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-4 h-4" /> Reschedule
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Reschedule Modal */}
        {isRescheduleOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Reschedule Visit</h2>
                    <p className="text-xs text-slate-500">Select a new date and time slot</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRescheduleOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="space-y-5">
                {/* Available Date Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Available Scheduled Dates
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl">
                    {getUpcomingAvailableDutyDatesForDoctor(
                      getDoctorEffectiveDutyDays(selectedBooking)
                    ).map((dItem, idx) => {
                      const stats = getDoctorSlotStatsForDate(selectedBooking, dItem.dateStr);
                      const isSelected = rescheduleDate === dItem.dateStr;
                      const isDisabled = !dItem.isAvailable || stats.isLocked;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setRescheduleDate(dItem.dateStr);
                            const slots = getDoctorTimeSlotsForDate(selectedBooking, dItem.dateStr);
                            if (slots.length > 0) setRescheduleTime(slots[0]);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col justify-between gap-1 ${isSelected
                              ? "border-sky-600 bg-sky-50 ring-2 ring-sky-500/20 text-sky-900 font-bold"
                              : isDisabled
                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "border-slate-200 bg-white hover:border-sky-300 text-slate-700"
                            }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{dItem.dayName}</span>
                            {dItem.isNextAvailable && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                                Next Available
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 font-medium">{dItem.displayLabel}</span>
                          <span className="text-[10px] text-slate-400">
                            {stats.remainingSlots} / {stats.maxCapacity} slots left
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Time Slots */}
                {rescheduleDate && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Time Slot
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getDoctorTimeSlotsForDate(selectedBooking, rescheduleDate).map((slot, idx) => {
                        const isSelected = rescheduleTime === slot;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setRescheduleTime(slot)}
                            className={`p-3 rounded-xl border text-center transition-all text-xs font-semibold ${isSelected
                                ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20"
                                : "border-slate-200 bg-white hover:border-sky-300 text-slate-700"
                              }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reschedule Reason */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Reason for Rescheduling
                  </label>
                  <textarea
                    rows={2}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Optional reason for rescheduling..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRescheduleOpen(false)}
                    className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule || !rescheduleDate}
                    className="w-1/2 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReschedule ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      "Confirm Reschedule"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Slip Modal */}
        {isSlipModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-50 rounded-2xl text-sky-600">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Appointment Slip</h2>
                    <p className="text-xs text-slate-500">Official verified appointment details</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSlipModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Reference:</span>
                    <span className="font-mono font-bold text-sky-600">{selectedBooking.refCode || selectedBooking.ref_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Patient:</span>
                    <span className="font-bold">{selectedBooking.patientName || selectedBooking.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Phone:</span>
                    <span className="font-bold">{selectedBooking.patientPhone || selectedBooking.patient_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Doctor:</span>
                    <span className="font-bold">{getDoctorDisplayAcronym(selectedBooking)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Date:</span>
                    <span className="font-bold">{formatDateToOrdinal(selectedBooking.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Time Slot:</span>
                    <span className="font-bold">{cleanTimeSlotString(selectedBooking.time, selectedBooking.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Payment Type:</span>
                    <span className="font-bold">{selectedBooking.paymentType || selectedBooking.payment_type || "Private Self-Pay"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Status:</span>
                    <span className="font-bold text-emerald-600">{selectedBooking.status || "Confirmed"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsSlipModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}