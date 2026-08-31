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

  // Helper: Format day numbers to ordinal suffixes (e.g. 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 7 -> 7th, 21 -> 21st, 22 -> 22nd, 23 -> 23rd, 31 -> 31st)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1:  return `${day}st`;
      case 2:  return `${day}nd`;
      case 3:  return `${day}rd`;
      default: return `${day}th`;
    }
  };

  // Helper: Format date into "7th October, 2026" format for booking slips & tickets
  const formatDateToOrdinal = (dateInput: string): string => {
    if (!dateInput) return "";

    const trimmed = String(dateInput).trim();

    // If already formatted like "7th October, 2026", return as is
    if (/\d+(st|nd|rd|th)\s+[A-Za-z]+,\s*\d{4}/i.test(trimmed)) {
      return trimmed;
    }

    let dateObj: Date;

    // Handle ISO format YYYY-MM-DD
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

    // 1st Priority: Specialist Schedule from Roster
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

    // 2nd Priority: Doctor model availableDays
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
        } catch {}
        return [docDays.trim()];
      }
    }

    // Default fallback weekdays
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  };

  // Helper 3: Check if a date string (YYYY-MM-DD) matches doctor duty days
  const isDateMatchingDoctorDutyDays = (dateStr: string, dutyDays: string[]): boolean => {
    if (!dateStr || dutyDays.length === 0) return true;

    const dateObj = new Date(dateStr + "T00:00:00");
    if (isNaN(dateObj.getTime())) return false;

    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }); // e.g. "Monday"
    const dayShort = dateObj.toLocaleDateString("en-US", { weekday: "short" }); // e.g. "Mon"

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

  // Helper 4: Get upcoming valid duty dates for the doctor (strictly enforce 24h cutoff & single Next Available schedule)
  const getUpcomingAvailableDutyDatesForDoctor = (dutyDays: string[], maxCount = 25) => {
    const dates: { dateStr: string; displayLabel: string; dayName: string; dayShort: string; isNextAvailable?: boolean; isAvailable?: boolean; isPast24HoursNotice?: boolean }[] = [];
    const now = new Date();
    const minAllowedTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours notice

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

    // Flag the earliest available date as Next Available and restrict selection strictly to ONLY this next available date
    let foundNext = false;
    for (const item of dates) {
      if (item.isAvailable && !foundNext) {
        item.isNextAvailable = true;
        foundNext = true;
      } else {
        item.isNextAvailable = false;
        item.isAvailable = false; // Patients can pick ONLY the next available schedule date
      }
    }

    return dates;
  };

  // Helper 5: Calculate live capacity, booked count, and remaining slots for a doctor on a specific date
  const getDoctorSlotStatsForDate = (booking: any, dateStr: string) => {
    if (!booking || !dateStr) return { bookedCount: 0, maxCapacity: 15, remainingSlots: 15, isLocked: false };

    const bDocId = String(booking.doctorId || booking.doctor_id || "").toLowerCase().trim();
    const bDocName = String(booking.doctorName || booking.doctor_name || "").toLowerCase().trim();
    const currentRef = String(booking.refCode || booking.ref_code || "").toLowerCase().trim();

    // 1. Count active bookings for this doctor on dateStr (excluding Cancelled & current booking)
    const bookedCount = bookings.filter((b) => {
      const bCode = String(b.refCode || b.ref_code || "").toLowerCase().trim();
      if (bCode && bCode === currentRef) return false;

      const docIdMatch = bDocId && String(b.doctorId || b.doctor_id || "").toLowerCase().trim() === bDocId;
      const docNameMatch = bDocName && String(b.doctorName || b.doctor_name || "").toLowerCase().trim().includes(bDocName);

      const isMatchDoc = docIdMatch || docNameMatch;
      return isMatchDoc && b.date === dateStr && b.status !== "Cancelled";
    }).length;

    // 2. Resolve capacity from SpecialistSchedule or Doctor model
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

  // Helper 6: Extract clean exact time string (e.g. "04:00 PM – 05:00 PM") from raw schedule strings like "Mon: 04:00 PM – 05:00 PM (15 visits) | Wed: ..."
  const cleanTimeSlotString = (rawTime: string, dateStr?: string): string => {
    if (!rawTime) return "08:00 AM – 10:00 AM";

    let inputStr = String(rawTime).trim();

    // If input contains multiple day parts separated by '|', find the part for dateStr day of week
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

    // 1. Try match standard time range pattern e.g. "04:00 PM – 05:00 PM" or "8:00 AM - 12:00 PM"
    const timeRangeMatch = inputStr.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*(?:–|-|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
    if (timeRangeMatch) {
      return timeRangeMatch[0].trim();
    }

    // 2. Fallback: Strip day prefixes (Mon:, Monday:), visit counts "(15 visits)", and extra symbols
    const cleaned = inputStr
      .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*:\s*/i, "")
      .replace(/\(\d+\s*visits?\)/gi, "")
      .replace(/\(\d+\s*patients?\)/gi, "")
      .replace(/\|\s*/g, "")
      .trim();

    return cleaned || "08:00 AM – 10:00 AM";
  };

  // Helper 7: Resolve specific clean time slots for doctor based on selected date
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

    // 1. Check SpecialistSchedule
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

    // 2. Check Doctor profile
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

    // Clean all extracted time strings
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

    // 4-Sphere Isalu Logo Emblem on Canvas
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

    // Watermark Overlay in Center
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

    // Official Red Verification Seal
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

    // Watermark Overlay in PDF
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

    // 4-Sphere Isalu Logo Emblem on PDF Header
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

    // Red Official Verification Seal
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

    // Fallback: trigger download and show toast
    doc.save(fileName);
    showToast("PDF Ticket generated & downloaded.", "success");
  };

  // PDF Ticket Generator
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
    } catch {}

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
      const result = await lookupBookingAPI(q);
      const results = result && !result.error ? [result] : [];
      setHasSearched(true);
      setFilteredBookings(results);
      if (results.length) { setSelectedBooking(results[0]); }
    } finally { setIsSearching(false); }
  };

  const isActionDisabled = (booking: any): { disabled: boolean; reason: string; badgeLabel: string; type: "checkedin" | "completed" | "cleared" | "hmo" | "cancelled" | "none" } => {
    if (!booking) return { disabled: false, reason: "", badgeLabel: "", type: "none" };

    const st = String(booking.status || "").toLowerCase();
    const payType = String(booking.paymentType || booking.payment_type || "Private Self-Pay");
    const paySt = String(booking.paymentStatus || booking.payment_status || "").toLowerCase();
    const hmoSt = String(booking.hmoStatus || booking.hmo_status || "").toLowerCase();

    if (st.includes("checked") || st.includes("in room")) {
      return { disabled: true, reason: "Patient Checked-In to Room", badgeLabel: "Patient Checked-In to Consultation Room", type: "checkedin" };
    }
    if (st.includes("completed")) {
      return { disabled: true, reason: "Consultation Completed", badgeLabel: "Consultation Completed", type: "completed" };
    }
    if (st.includes("cancelled")) {
      return { disabled: true, reason: "Appointment Cancelled", badgeLabel: "Appointment Cancelled", type: "cancelled" };
    }

    const isHmoTicket = payType === "HMO Insurance";
    const hmoName = booking.hmoName && booking.hmoName !== "N/A" ? booking.hmoName : (booking.hmo_name && booking.hmo_name !== "N/A" ? booking.hmo_name : "HMO Insurance");
    const isHmoApproved = isHmoTicket && (hmoSt === "approved" || hmoSt === "hmo approved");

    if (isHmoApproved) {
      return {
        disabled: true,
        reason: `Approved by ${hmoName}`,
        badgeLabel: `Approved by ${hmoName}`,
        type: "hmo",
      };
    }

    if (paySt.includes("cleared") || paySt === "paid") {
      return { disabled: true, reason: "Payment Cleared by Cashdesk", badgeLabel: "Paid & Cleared by Cashdesk", type: "cleared" };
    }

    return { disabled: false, reason: "", badgeLabel: "", type: "none" };
  };

  const openSlipModal = (booking: any) => {
    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Ticket Slip viewing is disabled: ${check.reason}.`, "error");
      return;
    }
    setSelectedBooking(booking);
    setRescheduleDate(booking.date || "");
    setRescheduleTime(booking.time || "08:00 AM – 10:00 AM");
    setIsRescheduleOpen(false);
    setIsSlipModalOpen(true);
  };

  const closeSlipModal = () => {
    setIsSlipModalOpen(false);
    setIsRescheduleOpen(false);
  };

  const isRescheduleDisabled = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return (
      s.includes("checked") ||
      s.includes("completed") ||
      s.includes("cancelled") ||
      s.includes("in room") ||
      s === "checked in" ||
      s === "completed"
    );
  };

  const openRescheduleView = (booking: any) => {
    const check = isActionDisabled(booking);
    if (check.disabled) {
      showToast(`Rescheduling is disabled: ${check.reason}.`, "error");
      return;
    }

    setSelectedBooking(booking);

    // Resolve doctor's duty days and available dates
    const dutyDays = getDoctorEffectiveDutyDays(booking);
    const validDates = getUpcomingAvailableDutyDatesForDoctor(dutyDays, 25);

    // Do not autoselect date or time - let patient select manually
    setRescheduleDate("");
    setRescheduleTime("");

    setRescheduleReason("");
    setIsRescheduleOpen(true);
    setIsSlipModalOpen(true);
  };

  const handleSelectRescheduleDate = (dateStr: string) => {
    setRescheduleDate(dateStr);
    if (selectedBooking) {
      const slots = getDoctorTimeSlotsForDate(selectedBooking, dateStr);
      if (slots.length > 0 && (!rescheduleTime || !slots.includes(rescheduleTime))) {
        setRescheduleTime(slots[0]);
      }
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !rescheduleDate) return;

    const doctorId = selectedBooking.doctorId || selectedBooking.doctor_id;
    if (doctorId) {
      const availability = await getBookingAvailabilityAPI({ doctor_id: String(doctorId), date: rescheduleDate });
      if (!availability || availability.error || availability.available === false) {
        showToast(availability?.error || "Selected date is fully booked. Please choose another date.", "error");
        return;
      }
    }

    const refCode = selectedBooking.refCode || selectedBooking.ref_code;
    setIsSubmittingReschedule(true);

    const formattedDate = formatDateToOrdinal(rescheduleDate);
    const cleanTime = cleanTimeSlotString(rescheduleTime, rescheduleDate);

    const updatedFields = {
      date: formattedDate,
      time: cleanTime,
      status: "Rescheduled",
      reason: rescheduleReason ? `${selectedBooking.reason || ''} [Rescheduled: ${rescheduleReason}]`.trim() : selectedBooking.reason,
    };

    try {
      // Send the mutation to Django; the server is authoritative.
      const updatedFromServer: any = await updateBookingAPI(refCode, updatedFields);
      if (!updatedFromServer || updatedFromServer.error) throw new Error(typeof updatedFromServer?.error === "string" ? updatedFromServer.error : "Server rejected the reschedule request.");

      // 2. Update local state objects
      const updatedBooking = {
        ...selectedBooking,
        ...updatedFields,
        date: formattedDate,
        time: cleanTime,
        status: "Rescheduled",
      };

      const updateList = (prev: any[]) =>
        prev.map((b) => ((b.refCode || b.ref_code) === refCode ? updatedBooking : b));

      const newAllBookings = updateList(bookings);
      const newFilteredBookings = updateList(filteredBookings);

      setBookings(newAllBookings);
      setFilteredBookings(newFilteredBookings);
      setSelectedBooking(updatedBooking);

      // 3. Sync LocalStorage for offline persistence

      // 4. Return to updated ticket slip view
      setIsRescheduleOpen(false);
      showToast(
        `✓ Appointment successfully rescheduled to ${formattedDate} (${cleanTime})! Your Ticket Reference Code (${refCode}) remains unchanged.`,
        "success"
      );
    } catch (error) {
      console.error("Reschedule Error:", error);
      showToast("Could not update the appointment on the hospital server. Please try again.", "error");
      return;

    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 py-10 md:py-16 relative">
      {/* Toast Banner */}
      {toastNotification && (
        <div className="fixed top-20 right-5 z-[9999] max-w-md w-full animate-bounce">
          <div
            className={`p-4 rounded-2xl shadow-2xl border-2 flex items-center justify-between gap-3 text-sm font-bold ${
              toastNotification.type === "success"
                ? "bg-emerald-900 text-emerald-100 border-emerald-500"
                : "bg-rose-900 text-rose-100 border-rose-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{toastNotification.message}</span>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-white hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#008ac9]/10 px-4 py-1.5 text-xs font-black text-[#008ac9] dark:text-sky-400 border-2 border-[#008ac9]/20">
            <Ticket className="h-4 w-4" /> Real-time Ticket Verification & Doctor Availability Reschedule
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Check & Reschedule Appointment
          </h1>
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">
            Enter your Ticket Reference Code (e.g. ISALU-XXXXXX) or Patient Phone Number to view your booking slip or pick an available duty date for your doctor.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="pt-2 flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                disabled={isSearching}
                placeholder="Reference Code or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-[#008ac9] transition-all disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black rounded-2xl text-sm shadow-lg border border-[#008ac9] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Searching...</span>
                </>
              ) : (
                <>Lookup</>
              )}
            </button>
          </form>

          {isSearching && (
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse max-w-md mx-auto mt-3 shadow-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-[#008ac9]" />
              <span>Searching verified ticket records... Please wait.</span>
            </div>
          )}
        </div>

        {/* State 1: Prompt before searching */}
        {!hasSearched && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
            <Search className="h-14 w-14 text-[#008ac9] mx-auto mb-3" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Search Your Appointment Ticket</h3>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-md mx-auto">
              Please enter your Ticket Reference Code (e.g. ISALU-XXXXXX) or Patient Phone Number in the search box above and click "Lookup".
            </p>
          </div>
        )}

        {/* State 2: Has searched but no bookings match */}
        {hasSearched && filteredBookings.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl p-8 shadow-md animate-fadeIn">
            <Ticket className="h-14 w-14 text-rose-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white">No Appointment Ticket Found</h3>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 mb-6 max-w-md mx-auto">
              No appointment matches your search query "{searchQuery}". Please verify your ticket reference code or phone number.
            </p>
            <Link
              to="/book"
              className="px-7 py-3.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black rounded-2xl text-xs inline-block shadow-lg border border-[#008ac9]"
            >
              + Book New Appointment
            </Link>
          </div>
        )}

        {/* State 3: Has searched and matches found */}
        {hasSearched && filteredBookings.length > 0 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Found {filteredBookings.length} Matching Booking(s)
              </span>
            </div>

            {filteredBookings.map((b) => {
              const code = b.refCode || b.ref_code;
              const isClosed = b.status === "Completed" || b.status === "Cancelled";
              return (
                <div
                  key={code}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-[#008ac9] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-[#008ac9] dark:text-sky-400 tracking-widest font-mono">
                        {code}
                      </span>
                      <span
                        className={`px-3.5 py-1 rounded-full text-xs font-black ${
                          b.status === "Rescheduled"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-2 border-amber-400 font-extrabold"
                            : b.status === "Completed"
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-2 border-rose-400 font-extrabold"
                            : b.status === "Cancelled"
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300"
                            : "bg-sky-100 dark:bg-slate-800 text-[#008ac9] dark:text-sky-300 border border-[#008ac9]/30"
                        }`}
                      >
                        {b.status || "Confirmed"}
                      </span>
                    </div>

                    <div className="text-base font-black text-slate-900 dark:text-white">
                      Patient: {b.patientName || b.patient_name} ({b.patientPhone || b.patient_phone})
                    </div>

                    <div className="text-xs text-slate-800 dark:text-slate-200 flex flex-wrap gap-4 pt-1 font-bold">
                      <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="h-4 w-4 text-[#008ac9]" /> {b.date}
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Clock className="h-4 w-4 text-[#008ac9]" /> {cleanTimeSlotString(b.time, b.date)}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Specialist: <strong className="text-slate-900 dark:text-white font-black">{getDoctorDisplayAcronym(b)}</strong> ({b.doctorSpecialty || b.doctor_specialty})
                    </div>
                  </div>

                  {(() => {
                    const check = isActionDisabled(b);

                    if (check.disabled) {
                      let badgeStyle = "bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-800 dark:text-emerald-300";
                      let IconComponent = CheckCircle2;

                      if (check.type === "completed" || check.type === "cancelled") {
                        badgeStyle = "bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 text-rose-800 dark:text-rose-300";
                      } else if (check.type === "hmo") {
                        badgeStyle = "bg-sky-50 dark:bg-sky-950/80 border-2 border-sky-400 text-sky-800 dark:text-sky-300";
                        IconComponent = ShieldCheck;
                      } else if (check.type === "checkedin") {
                        badgeStyle = "bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-800 dark:text-emerald-300";
                        IconComponent = UserCheck;
                      } else if (check.type === "cleared") {
                        badgeStyle = "bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300";
                        IconComponent = CheckCircle2;
                      }

                      return (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${badgeStyle} text-xs font-black shrink-0 self-center`}>
                          <IconComponent className="h-4 w-4 shrink-0" />
                          <span>{check.badgeLabel}</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap md:flex-col items-stretch gap-2 pt-3 md:pt-0 border-t-2 md:border-t-0 border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openSlipModal(b)}
                          className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 border border-[#008ac9] cursor-pointer"
                        >
                          <Ticket className="h-4 w-4" /> View Ticket Slip
                        </button>

                        <button
                          type="button"
                          onClick={() => openRescheduleView(b)}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 border border-amber-600 cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" /> Reschedule Date
                        </button>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => downloadTicketAsImage(b)}
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Download PNG"
                          >
                            <Download className="h-3.5 w-3.5" /> PNG
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadTicketAsPdf(b)}
                            className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Download PDF"
                          >
                            <FileText className="h-3.5 w-3.5 text-sky-400" /> PDF
                          </button>

                          <button
                            type="button"
                            onClick={() => shareTicketAsPdf(b)}
                            className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Share PDF Ticket"
                          >
                            <Share2 className="h-3.5 w-3.5 text-white" /> Share PDF
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOOKING SLIP & RESCHEDULE POPUP MODAL */}
      {isSlipModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]">
            
            {/* Modal Top Header */}
            <div className="bg-[#008ac9] text-white p-5 flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {isRescheduleOpen ? "Reschedule Appointment Date" : "Official Booking Slip"}
                  </h2>
                  <p className="text-xs text-sky-100 font-semibold">
                    {isRescheduleOpen ? "Select doctor duty date and time slot" : "Isalu Hospitals Verified Ticket"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSlipModal}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* TICKET REFERENCE MAINTENANCE BANNER */}
              <div className="bg-sky-50 dark:bg-sky-950/60 border-2 border-[#008ac9]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#008ac9] dark:text-sky-400 tracking-wider block">
                    Permanent Ticket Reference Code
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-[#008ac9] dark:text-sky-300 font-mono tracking-widest">
                      {selectedBooking.refCode || selectedBooking.ref_code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedBooking.refCode || selectedBooking.ref_code)}
                      className="p-1.5 rounded-lg bg-sky-200/60 dark:bg-sky-900 text-[#008ac9] dark:text-sky-300 hover:bg-sky-300 transition"
                      title="Copy Reference Code"
                    >
                      {copiedRef ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs font-black shrink-0">
                  <Lock className="h-3.5 w-3.5 text-amber-600" /> Reference Kept Intact
                </div>
              </div>

              {/* MODE 1: RESCHEDULE FORM BASED STRICTLY ON DOCTOR SCHEDULE & SLOTS */}
              {isRescheduleOpen ? (() => {
                if (isRescheduleDisabled(selectedBooking?.status)) {
                  return (
                    <div className="p-6 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 rounded-2xl text-center space-y-2">
                      <div className="text-sm font-black text-rose-700 dark:text-rose-300 flex items-center justify-center gap-2">
                        <AlertCircle className="h-5 w-5" /> Rescheduling Unavailable
                      </div>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Appointments with status '{selectedBooking?.status}' cannot be rescheduled. Rescheduling is strictly disabled for checked-in and completed consultations.
                      </p>
                    </div>
                  );
                }

                const dutyDays = getDoctorEffectiveDutyDays(selectedBooking);
                const upcomingDutyDates = getUpcomingAvailableDutyDatesForDoctor(dutyDays, 25);
                const timeSlotsForSelectedDate = getDoctorTimeSlotsForDate(selectedBooking, rescheduleDate);
                const currentSlotStats = getDoctorSlotStatsForDate(selectedBooking, rescheduleDate);

                return (
                  <form onSubmit={handleConfirmReschedule} className="space-y-5 animate-fadeIn">
                    
                    {/* Doctor Schedule Information Box */}
                    <div className="bg-sky-900 text-white p-4.5 rounded-2xl border-2 border-sky-700 shadow-md space-y-2">
                      <div className="flex items-center justify-between border-b border-sky-700/80 pb-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-sky-300" />
                          <span className="text-xs font-black uppercase text-sky-200">Doctor Roster & Capacity</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
                          Live Schedule
                        </span>
                      </div>

                      <div className="text-xs font-bold space-y-1">
                        <p className="text-sm font-black text-white">
                          {getDoctorDisplayAcronym(selectedBooking)}
                        </p>
                        <p className="text-sky-200 font-semibold">
                          Specialty: {selectedBooking.doctorSpecialty || selectedBooking.doctor_specialty}
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-sky-300 text-[11px] font-black">Scheduled Duty Days:</span>
                          <div className="flex flex-wrap gap-1">
                            {dutyDays.map((day) => (
                              <span key={day} className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-black">
                                {day}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Doctor Duty Dates Selection (Only Next Available Allowed) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#008ac9]" /> 1. Select Scheduled Duty Date <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-extrabold text-[#008ac9] bg-sky-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-[#008ac9]/30">
                          Only Next Available Allowed (24h+ Notice)
                        </span>
                      </div>

                      {upcomingDutyDates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                          {upcomingDutyDates.map((item) => {
                            const isSelected = rescheduleDate === item.dateStr;
                            const isNext = item.isNextAvailable;
                            const stats = getDoctorSlotStatsForDate(selectedBooking, item.dateStr);
                            const isDisabled = stats.isLocked || !item.isAvailable;

                            return (
                              <button
                                key={item.dateStr}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleSelectRescheduleDate(item.dateStr)}
                                className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                                  isDisabled
                                    ? "bg-slate-100 dark:bg-slate-900/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                                    : isSelected
                                    ? "bg-[#008ac9] text-white border-[#008ac9] shadow-lg scale-[1.01]"
                                    : isNext
                                    ? "bg-sky-50 dark:bg-sky-950/40 border-[#008ac9] ring-2 ring-[#008ac9]/40 text-slate-900 dark:text-white font-bold hover:bg-sky-100"
                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#008ac9]"
                                }`}
                              >
                                {isNext && (
                                  <span className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black rounded-bl-xl uppercase tracking-wider shadow-sm border-l border-b ${
                                    isSelected ? "bg-amber-400 text-slate-900 border-amber-300" : "bg-[#008ac9] text-white border-[#008ac9]"
                                  }`}>
                                    ★ Next Avail
                                  </span>
                                )}
                                <div className="flex items-center justify-between w-full pr-14">
                                  <span className="text-xs font-black uppercase tracking-wider">
                                    {item.dayName}
                                  </span>
                                </div>

                                <div className="text-sm font-black mt-2 font-mono flex items-center justify-between">
                                  <span>{item.displayLabel}</span>
                                  {!item.isPast24HoursNotice ? (
                                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-300">
                                      &lt;24h Notice
                                    </span>
                                  ) : stats.isLocked ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-300 flex items-center gap-1">
                                      <Lock className="h-3 w-3" /> FULL
                                    </span>
                                  ) : isNext ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isSelected ? "bg-white/20 text-white" : "bg-[#008ac9] text-white"
                                    }`}>
                                      ★ Next Available
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-400">
                                      Locked
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-2xl font-bold border border-amber-300 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                          <span>No upcoming roster dates found for this specialist.</span>
                        </div>
                      )}
                    </div>

                    {/* Time Slot Selection (Based on Doctor's Selected Date) */}
                    {rescheduleDate && (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            2. Select Time Slot for {formatDateToOrdinal(rescheduleDate)} <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-extrabold text-[#008ac9]">
                            {timeSlotsForSelectedDate.length} slot(s) available
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {timeSlotsForSelectedDate.map((slot) => {
                            const isSelected = rescheduleTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setRescheduleTime(slot)}
                                className={`p-3 rounded-2xl text-xs font-black border-2 transition-all flex items-center justify-between ${
                                  isSelected
                                    ? "bg-slate-900 text-white dark:bg-sky-500 border-slate-900 dark:border-sky-500 shadow-md"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-[#008ac9] dark:text-sky-200" />
                                  {slot}
                                </span>
                                {isSelected && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reason Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                        Reason for Rescheduling <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Work commitment, travel schedule, medical preference..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#008ac9]"
                      />
                    </div>

                    {isSubmittingReschedule && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-slate-900 border-2 border-amber-500 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse shadow-sm my-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                        <span>Updating doctor consultation schedule & issuing revised appointment ticket... Please wait.</span>
                      </div>
                    )}

                    {/* Form Action Controls */}
                    <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRescheduleOpen(false)}
                        disabled={isSubmittingReschedule}
                        className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back to Ticket Slip
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingReschedule || !rescheduleDate || currentSlotStats.isLocked}
                        className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-lg transition flex items-center gap-2 border border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingReschedule ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Saving Reschedule...
                          </>
                        ) : (
                          <>
                            Confirm Reschedule & Keep Ticket Reference ✓
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                );
              })() : (
                /* MODE 2: DISPLAY BOOKING SLIP DETAILS */
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Patient Name</span>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {selectedBooking.patientName || selectedBooking.patient_name}
                      </p>
                      <span className="text-xs font-bold text-slate-500">
                        Phone: {selectedBooking.patientPhone || selectedBooking.patient_phone}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Specialist Physician</span>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {getDoctorDisplayAcronym(selectedBooking)}
                      </p>
                      <span className="text-xs font-bold text-[#008ac9]">
                        {selectedBooking.doctorSpecialty || selectedBooking.doctor_specialty}
                      </span>
                    </div>
                  </div>

                  {/* Date & Time Highlight Box */}
                  <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-5 rounded-3xl border-2 border-[#008ac9]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#008ac9] dark:text-sky-400 tracking-wider">
                        Scheduled Date & Time Slot
                      </span>
                      <div className="flex items-center gap-3 mt-1.5 text-slate-900 dark:text-white font-black text-base">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-5 w-5 text-[#008ac9]" /> {selectedBooking.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-5 w-5 text-[#008ac9]" /> {cleanTimeSlotString(selectedBooking.time, selectedBooking.date)}
                        </span>
                      </div>
                    </div>

                    {selectedBooking.status !== "Completed" && selectedBooking.status !== "Cancelled" && (
                      <button
                        onClick={() => openRescheduleView(selectedBooking)}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0 border border-amber-600"
                      >
                        <RefreshCw className="h-4 w-4" /> Change Date
                      </button>
                    )}
                  </div>

                  {/* Payment & Category Matrix */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 font-black block">Payment Type</span>
                      <p className="text-slate-800 dark:text-slate-200 mt-1">
                        {selectedBooking.paymentType || selectedBooking.payment_type || "Private Self-Pay"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 font-black block">Status</span>
                      <span
                        className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-black ${
                          selectedBooking.status === "Rescheduled"
                            ? "bg-amber-100 text-amber-800 border border-amber-400"
                            : selectedBooking.status === "Completed"
                            ? "bg-rose-100 text-rose-800 border border-rose-400"
                            : selectedBooking.status === "Cancelled"
                            ? "bg-slate-200 text-slate-700 border border-slate-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-400"
                        }`}
                      >
                        {selectedBooking.status || "Confirmed"}
                      </span>
                    </div>
                  </div>

                  {/* Slip Verification Stamp Footer */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>Verified Official Appointment Slip — Isalu Hospitals</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">ISO 9001:2026</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    {selectedBooking.status !== "Completed" && selectedBooking.status !== "Cancelled" ? (
                      <button
                        type="button"
                        onClick={() => openRescheduleView(selectedBooking)}
                        className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center gap-2 border border-amber-600"
                      >
                        <RefreshCw className="h-4 w-4" /> Reschedule Appointment
                      </button>
                    ) : (
                      <span className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-slate-400" /> Reschedule Closed ({selectedBooking.status})
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTicketAsImage(selectedBooking)}
                        className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-sm transition-all flex items-center gap-1.5 border border-emerald-500"
                      >
                        <Download className="h-4 w-4" /> PNG
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadTicketAsPdf(selectedBooking)}
                        className="px-4 py-3 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-sm transition-all flex items-center gap-1.5 border border-slate-700"
                      >
                        <FileText className="h-4 w-4 text-sky-400" /> PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => shareTicketAsPdf(selectedBooking)}
                        className="px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-2xl shadow-sm transition-all flex items-center gap-1.5 border border-sky-500"
                      >
                        <Share2 className="h-4 w-4" /> Share PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
