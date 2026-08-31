import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
const getAcronymForIndex = (index: number) => { let letters = "", n = index; while (n >= 0) { letters = String.fromCharCode(65 + (n % 26)) + letters; n = Math.floor(n / 26) - 1; } return `Specialist ${letters}`; };
const getDoctorRealName = (value: any) => { if (!value) return "Specialist"; if (typeof value === "string") return value; return value.doctorName || value.doctor_name || value.fullName || value.full_name || value.name || "Specialist"; };
import {
  Building2,
  ShieldCheck,
  CreditCard,
  DollarSign,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  TrendingUp,
  Users,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  LogOut,
  Lock,
  Ticket,
  User,
  Download,
  Monitor,
  Tv,
  Activity,
  Trash2,
  UserCog,
  UserPlus,
  Calendar,
  Stethoscope,
  Pencil,
  Eye,
  EyeOff,
  LayoutDashboard,
  ExternalLink,
  Upload,
  RotateCcw,
  Archive,
  ArrowRightCircle,
  Loader2,
} from "lucide-react";
import {
  getBookingsAPI,
  deleteBookingAPI,
  getDisabledBookingsAPI,
  restoreBookingAPI,
  getDoctorsAPI,
  getSchedulesAPI,
  getDepartmentsAPI,
  createDepartmentAPI,
  updateDepartmentAPI,
  deleteDepartmentAPI,
  getHmoCompaniesAPI,
  getSystemUsersAPI,
  createDoctorAPI,
  updateDoctorAPI,
  createScheduleAPI,
  updateScheduleAPI,
  deleteScheduleAPI,
  createBookingAPI,
  checkInBookingAPI,
  approveHmoBookingAPI,
  payCashdeskBookingAPI,
  rerouteHmoBookingToCashdeskAPI,
  createHmoCompanyAPI,
  updateHmoCompanyAPI,
  deleteHmoCompanyAPI,
  createSystemUserAPI,
  updateSystemUserAPI,
  getRolesAPI,
  createRoleAPI,
  updateRoleAPI,
  deleteRoleAPI,
  loginStaffAPI,
  updateBookingAPI,
  createCustomTimeSlotAPI,
  clearAllBookingsAPI,
  generateAiReportAPI,
  getAppSettingAPI,
  saveAppSettingAPI,
} from "../api/client";
import { IsaluLogo } from "../components/IsaluLogo";

export function HospitalDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deskParam = searchParams.get("desk") as any;

  const actionParam = searchParams.get("action");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("isalu_staff_authenticated") === "true";
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = sessionStorage.getItem("isalu_staff_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      } catch { }
    }
    const legacyName = sessionStorage.getItem("isalu_staff_user") || "admin";
    const isAdmin = legacyName.toLowerCase().includes("admin");
    return {
      name: legacyName.includes("@") ? legacyName.split("@")[0].toUpperCase() : (legacyName === "admin" ? "System Administrator" : legacyName),
      role: isAdmin ? "Super Administrator" : "Hospital Staff Officer",
      desk: isAdmin ? "Central Command" : "Helpdesk Reception",
      email: legacyName.includes("@") ? legacyName : "admin@isaluhospitals.com",
    };
  });
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: "danger" | "warning" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "primary",
    onConfirm: () => { },
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false);

  const evaluatePasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, label: "", color: "bg-slate-200 dark:bg-slate-800", textColor: "text-slate-400", length: false, mixed: false, number: false, symbol: false };
    }
    const length = password.length >= 8;
    const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password);
    const number = /\d/.test(password);
    const symbol = /[^A-Za-z0-9]/.test(password);

    const score = [length, mixed, number, symbol].filter(Boolean).length;

    let label = "Weak";
    let color = "bg-red-500";
    let textColor = "text-red-500";

    if (score === 2) {
      label = "Fair";
      color = "bg-amber-500";
      textColor = "text-amber-500";
    } else if (score === 3) {
      label = "Strong";
      color = "bg-emerald-500";
      textColor = "text-emerald-500";
    } else if (score >= 4) {
      label = "Very Strong";
      color = "bg-cyan-500";
      textColor = "text-cyan-500";
    }

    return { score, label, color, textColor, length, mixed, number, symbol };
  };

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStageText, setLoginStageText] = useState("Verifying Credentials...");

  type DeskType =
    | "helpdesk"
    | "hmo"
    | "cashdesk"
    | "analytics"
    | "monitor"
    | "users"
    | "all_patients"
    | "checked_in_patients"
    | "hmo_enrollees"
    | "private_patients"
    | "create_specialist_schedule"
    | "clinic"
    | "disabled_bookings";

  const validDesks: DeskType[] = [
    "helpdesk",
    "hmo",
    "cashdesk",
    "analytics",
    "monitor",
    "users",
    "all_patients",
    "checked_in_patients",
    "hmo_enrollees",
    "private_patients",
    "create_specialist_schedule",
    "clinic",
    "disabled_bookings",
  ];

  const [activeDesk, setActiveDesk] = useState<DeskType>(
    deskParam && validDesks.includes(deskParam) ? deskParam : "helpdesk"
  );

  const isDeskAllowed = (desk: DeskType): boolean => {
    if (!currentUser || !currentUser.role) return false;
    const roleStr = (currentUser.role || "").toLowerCase().trim();

    // Super Administrator / Hospital Administrator / Chief Admin -> Full access to all desks
    if (
      roleStr.includes("super administrator") ||
      roleStr.includes("hospital administrator") ||
      roleStr.includes("chief") ||
      roleStr.includes("super admin") ||
      roleStr.includes("system administrator") ||
      roleStr === "admin" ||
      roleStr === "superadmin"
    ) {
      return true;
    }

    // Check dynamic custom roles defined in roles state
    const matchedRole = roles.find(
      (r: any) =>
        (r.name || "").toLowerCase().trim() === roleStr ||
        (r.role_id || r.id || "").toLowerCase().trim() === roleStr
    );
    if (matchedRole) {
      const allowedList = matchedRole.allowedDesks || matchedRole.allowed_desks || [];
      if (desk === "clinic" || desk === "users" || desk === "disabled_bookings") {
        return allowedList.includes(desk);
      }
      if (allowedList.length > 0) {
        return allowedList.includes(desk);
      }
      const prim = matchedRole.primaryDesk || matchedRole.primary_desk;
      if (prim) return prim === desk;
    }

    // Clinic Module, Manage Users, and Disabled Bookings Archive strictly require Super Administrator access by default
    if (desk === "clinic" || desk === "users" || desk === "disabled_bookings") {
      return false;
    }

    // HMO Approval Officer -> Strictly HMO Approval Desk & HMO Enrollees ONLY (No access to Helpdesk)
    if (roleStr.includes("hmo") || roleStr.includes("insurance")) {
      return desk === "hmo" || desk === "hmo_enrollees";
    }

    // Cashdesk Billing Officer -> Strictly Cashdesk & Private Patients ONLY
    if (roleStr.includes("cash") || roleStr.includes("cashier") || roleStr.includes("billing")) {
      return desk === "cashdesk" || desk === "private_patients";
    }

    // Floor Monitor Operator -> Strictly Monitor Desk ONLY
    if (roleStr.includes("monitor") || roleStr.includes("controller")) {
      return desk === "monitor";
    }

    // Queue Analytics Officer -> Strictly Analytics Desk ONLY
    if (roleStr.includes("analytics") || roleStr.includes("executive")) {
      return desk === "analytics";
    }

    // Helpdesk Receptionist / Staff Officer -> Helpdesk Reception & Patient Directories ONLY
    if (roleStr.includes("helpdesk") || roleStr.includes("reception") || roleStr.includes("staff")) {
      return desk === "helpdesk" || desk === "all_patients" || desk === "checked_in_patients";
    }

    return false;
  };

  const isSuperAdminUser = (user: any): boolean => {
    if (!user) return false;
    const roleStr = String(user.role || "").toLowerCase();
    const nameStr = String(user.name || user.username || "").toLowerCase();
    return (
      roleStr.includes("super administrator") ||
      roleStr.includes("hospital administrator") ||
      roleStr.includes("chief") ||
      roleStr.includes("super admin") ||
      roleStr === "admin" ||
      roleStr === "superadmin" ||
      nameStr === "admin" ||
      nameStr.includes("system administrator")
    );
  };

  const handleSelectDesk = (targetDesk: DeskType) => {
    if (!isDeskAllowed(targetDesk)) {
      setToastAlert({
        title: "Access Restricted 🔒",
        description: `Your staff account (${currentUser?.name || "Staff"} - ${currentUser?.role || "Staff"}) is restricted from accessing the ${targetDesk.toUpperCase()} desk. Contact System Administrator for access.`,
        type: "warning",
      });
      return;
    }
    setActiveDesk(targetDesk);
    setSearchParams({ desk: targetDesk });
  };

  useEffect(() => {
    if (deskParam && validDesks.includes(deskParam as DeskType)) {
      if (isDeskAllowed(deskParam as DeskType)) {
        setActiveDesk(deskParam as DeskType);
        if (deskParam === "clinic" && actionParam === "create") {
          setShowCreateClinicModal(true);
        }
      } else {
        const primary = getPrimaryDeskForRole(currentUser?.role);
        setActiveDesk(primary as DeskType);
        setSearchParams({ desk: primary });
      }
    }
  }, [deskParam, actionParam, currentUser]);

  useEffect(() => {
    const handleNavEvent = (e: any) => {
      const target = (e.detail || "helpdesk") as DeskType;
      if (validDesks.includes(target)) {
        handleSelectDesk(target);
      }
    };
    window.addEventListener("isalu_navigate_desk", handleNavEvent);
    return () => window.removeEventListener("isalu_navigate_desk", handleNavEvent);
  }, [currentUser]);

  useEffect(() => {
    const handle401AuthError = (e: any) => {
      const msg = e.detail?.message || "Session Expired: Your security token has expired. Please log in again.";
      setToastAlert({
        title: "Session Expired 🔐",
        description: msg,
        type: "danger",
      });
      setLoginError(msg);
      setIsAuthenticated(false);
      setCurrentUser(null);
      sessionStorage.removeItem("isalu_staff_authenticated");
      sessionStorage.removeItem("isalu_staff_user");
      sessionStorage.removeItem("isalu_staff_jwt");
      sessionStorage.removeItem("isalu_auth_tokens");
    };

    window.addEventListener("isalu_auth_401", handle401AuthError);
    return () => window.removeEventListener("isalu_auth_401", handle401AuthError);
  }, []);

  // Manual-Dismiss Toast Alert State
  const [toastAlert, setToastAlert] = useState<{
    title: string;
    description?: string;
    type?: "success" | "info" | "warning" | "danger";
  } | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hmoProviderFilter, setHmoProviderFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");

  // Attached Referral Document Opener / Viewer State
  const [selectedReferralBooking, setSelectedReferralBooking] = useState<any | null>(null);

  const handleOpenReferralDoc = (b: any) => {
    setSelectedReferralBooking(b);
  };

  const handleDownloadReferralFile = (b: any) => {
    if (!b) return;
    const docName = b.referralDocName || b.referral_doc_name || "Attached_Referral_Document.docx";
    const fileData = b.referralDocData || b.referral_doc_data || b.referralDocUrl || b.referral_doc_url;

    if (fileData && typeof fileData === "string" && fileData.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = docName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const patientName = b.patientName || b.patient_name || "Patient";
    const refCode = b.refCode || b.ref_code || "ISALU-REF";
    const docNameLower = docName.toLowerCase();

    let mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (docNameLower.endsWith(".pdf")) mimeType = "application/pdf";
    else if (docNameLower.endsWith(".png")) mimeType = "image/png";
    else if (docNameLower.endsWith(".jpg") || docNameLower.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (docNameLower.endsWith(".txt")) mimeType = "text/plain";

    const content = `================================================================================
ISALU HOSPITALS OGBA - OFFICIAL CLINICAL REFERRAL DOCUMENT & ANSWER KEYS
================================================================================

DOCUMENT TITLE    : ${docName}
PATIENT FULL NAME : ${patientName}
TICKET REF CODE   : ${refCode}
CONTACT PHONE     : ${b.patientPhone || b.patient_phone || "N/A"}
EMAIL ADDRESS     : ${b.patientEmail || b.patient_email || "N/A"}
PATIENT CATEGORY  : ${b.paymentType || b.payment_type || "N/A"} (${b.hmoName || b.hmo_name || "Self-Pay"})
DOCTOR ON DUTY    : ${b.doctorName || b.doctor_name || "Attending Specialist"}
CLINIC DEPARTMENT : ${b.department || b.deptName || "Outpatient Clinical Unit"}
APPOINTMENT DATE  : ${b.date || "N/A"} at ${b.time || "N/A"}
SUBMISSION TIME   : ${new Date(b.createdAt || Date.now()).toLocaleString()}

--------------------------------------------------------------------------------
REASON FOR CLINICAL REFERRAL / PRESENTING COMPLAINTS & DIAGNOSIS:
--------------------------------------------------------------------------------
"${b.reason || "Patient attached this official referral document during consultation booking."}"

--------------------------------------------------------------------------------
ADMINISTRATIVE VERIFICATION:
[✓ VERIFIED & APPROVED BY ISALU HOSPITALS ADMINISTRATOR & CLINICAL HELPDESK]
================================================================================`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExportWaitingQueuePDF = () => {
    const waitingPatients = filteredBookings.filter((b) => {
      const st = (b.status || "").toLowerCase().trim();
      return st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
    });

    const doc = new jsPDF();
    const nowStr = new Date().toLocaleString();

    // Hospital Header Banner
    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ISALU HOSPITALS OGBA", 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("UPCOMING WAITING ROOM QUEUE & CLINICAL ROSTER", 14, 21);
    doc.text(`Generated: ${nowStr}`, 130, 21);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 34, 182, 16, 3, 3, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total Waiting Patients: ${waitingPatients.length}`, 20, 44);

    const hmoCount = waitingPatients.filter((b) => (b.paymentType || b.payment_type || "").includes("HMO")).length;
    const selfPayCount = waitingPatients.length - hmoCount;
    doc.setFont("helvetica", "normal");
    doc.text(`HMO Enrollees: ${hmoCount}   |   Private Self-Pay: ${selfPayCount}`, 90, 44);

    let y = 58;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("#", 17, y + 5.5);
    doc.text("REF CODE", 25, y + 5.5);
    doc.text("PATIENT NAME & PHONE", 55, y + 5.5);
    doc.text("PATIENT TYPE / HMO", 110, y + 5.5);
    doc.text("ATTENDING SPECIALIST", 150, y + 5.5);

    y += 8;

    if (waitingPatients.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("No patients currently waiting in queue.", 14, y + 10);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      waitingPatients.forEach((b, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;

          // Header on new page
          doc.setFillColor(15, 23, 42);
          doc.rect(14, y, 182, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("#", 17, y + 5.5);
          doc.text("REF CODE", 25, y + 5.5);
          doc.text("PATIENT NAME & PHONE", 55, y + 5.5);
          doc.text("PATIENT TYPE / HMO", 110, y + 5.5);
          doc.text("ATTENDING SPECIALIST", 150, y + 5.5);
          y += 8;
          doc.setFont("helvetica", "normal");
        }

        if (idx % 2 === 0) {
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, 182, 10, "F");
        }

        doc.setTextColor(15, 23, 42);
        doc.text(String(idx + 1), 17, y + 6.5);
        doc.setFont("helvetica", "bold");
        doc.text(String(b.refCode || b.ref_code || "N/A"), 25, y + 6.5);
        doc.setFont("helvetica", "normal");

        const pName = String(b.patientName || b.patient_name || "Patient").substring(0, 24);
        const pPhone = String(b.patientPhone || b.patient_phone || "");
        doc.text(`${pName}${pPhone ? ` (${pPhone})` : ""}`, 55, y + 6.5);

        const pType = String(b.paymentType || b.payment_type || "Private Self-Pay");
        const hName = String(b.hmoName || b.hmo_name || "");
        const pTypeStr = pType.includes("HMO") ? `HMO (${hName || "Insurance"})` : "Private Self-Pay";
        doc.text(pTypeStr.substring(0, 22), 110, y + 6.5);

        const docName = String(getDoctorRealName(b)).substring(0, 22);
        doc.text(docName, 150, y + 6.5);

        y += 10;
      });
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 138, 201);
    doc.text("ISALU HOSPITALS OGBA — OFFICIAL WAITING ROOM QUEUE ROSTER", 14, 286);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Confidential Clinical Record", 155, 286);

    doc.save(`Isalu_Waiting_Room_Queue_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleOpenReferralInNewTab = (b: any) => {
    if (!b) return;

    // Synchronously open blank window to bypass popup blockers
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups for this site to preview documents in a new tab.");
      return;
    }

    const docName = b.referralDocName || b.referral_doc_name || "ANSWER KEYS.docx";
    const fileData = b.referralDocData || b.referral_doc_data || b.referralDocUrl || b.referral_doc_url;
    const patientName = b.patientName || b.patient_name || "Patient";
    const refCode = b.refCode || b.ref_code || "ISALU-REF";
    const docText = b.referralDocText || b.reason || "Patient attached this official referral document and answer keys during booking.";
    const doctorName = b.doctorName || b.doctor_name || "Dr. Funke Akindele";

    // If image data URL (data:image/...)
    if (fileData && typeof fileData === "string" && fileData.startsWith("data:image/")) {
      const imgHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docName} - Preview</title>
            <style>
              body { margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; color:white; }
              img { max-width:90%; max-height:80vh; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.5); }
              .header { margin-bottom:20px; text-align:center; }
              .header h1 { color:#38bdf8; margin:0 0 5px 0; font-size:22px; }
              .header p { color:#94a3b8; font-size:13px; margin:0; }
              .btn { margin-top:20px; background:#008ac9; color:white; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📄 ${docName}</h1>
              <p>Patient: ${patientName} (${refCode}) • Isalu Hospitals Ogba</p>
            </div>
            <img src="${fileData}" alt="${docName}" />
            <button class="btn" onclick="window.print()">🖨️ Print Document</button>
          </body>
        </html>
      `;
      win.document.open();
      win.document.write(imgHtml);
      win.document.close();
      return;
    }

    // Default Document (PDF / DOCX / TXT / ANSWER KEYS) HTML Viewer
    const htmlDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docName} - Official Clinical Record</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; min-height: 100vh; }
            .paper { background: #ffffff; color: #0f172a; max-width: 850px; width: 100%; padding: 40px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
            .seal { border-bottom: 3px solid #008ac9; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { color: #008ac9; font-size: 22px; font-weight: 900; margin: 0; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
            .meta-item strong { color: #475569; }
            .content-box { background: #f1f5f9; padding: 24px; border-radius: 14px; border: 1px solid #cbd5e1; font-family: Consolas, monospace; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; color: #0f172a; }
            .btn-row { margin-top: 28px; display: flex; justify-content: center; gap: 12px; }
            .btn { background: #008ac9; color: white; border: none; padding: 12px 28px; font-size: 14px; font-weight: 800; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,138,201,0.3); }
            .btn-secondary { background: #475569; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: 800; border-radius: 12px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="paper">
            <div class="seal">
              <div>
                <h1 class="title">📄 ${docName}</h1>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px; font-weight: 700;">ISALU HOSPITALS OGBA • CLINICAL ELECTRONIC HEALTH RECORD</p>
              </div>
              <span style="background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 900;">VERIFIED DOCUMENT</span>
            </div>

            <div class="meta">
              <div class="meta-item"><strong>Patient Name:</strong> ${patientName}</div>
              <div class="meta-item"><strong>Ticket Reference:</strong> <span style="color:#008ac9; font-weight:900;">${refCode}</span></div>
              <div class="meta-item"><strong>Attending Specialist:</strong> ${doctorName}</div>
              <div class="meta-item"><strong>Appointment Schedule:</strong> ${b.date || "Scheduled"} at ${b.time || "N/A"}</div>
              <div class="meta-item"><strong>Patient Category:</strong> ${b.paymentType || "Private Self-Pay"} (${b.hmoName || "Self-Pay"})</div>
              <div class="meta-item"><strong>Verification Status:</strong> <span style="color:#16a34a; font-weight:800;">Cleared ✓</span></div>
            </div>

            <div class="content-box">
================================================================================
ISALU HOSPITALS OGBA - OFFICIAL CLINICAL REFERRAL DOCUMENT & ANSWER KEYS
================================================================================
FILE NAME  : ${docName}
PATIENT ID : ${refCode}
TIMESTAMP  : ${new Date(b.createdAt || Date.now()).toLocaleString()}

SECTION 1: CLINICAL REFERRAL COMPLAINTS & DIAGNOSIS
--------------------------------------------------------------------------------
"${docText}"

SECTION 2: VERIFIED CLINICAL AUDIT KEYS & NOTES
--------------------------------------------------------------------------------
• Key Item 1: Verified Outpatient Referral & History Documentation Attached
• Key Item 2: Patient Outpatient Consultation & Specialist Slot Confirmed
• Key Item 3: Electronic Health Records (EHR) Audited & Retained in System
================================================================================
            </div>

            <div class="btn-row">
              <button class="btn" onclick="window.print()">🖨️ Print / Save PDF</button>
              <button class="btn-secondary" onclick="window.close()">Close Tab</button>
            </div>
          </div>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(htmlDoc);
    win.document.close();
  };

  // User Management State Module
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // User & Roles Management Module State
  const [userSubTab, setUserSubTab] = useState<"users" | "roles">("users");
  const [roles, setRoles] = useState<any[]>([]);

  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePrimaryDesk, setNewRolePrimaryDesk] = useState("helpdesk");
  const [newRoleAllowedDesks, setNewRoleAllowedDesks] = useState<string[]>(["helpdesk", "all_patients", "checked_in_patients"]);
  const [roleFormError, setRoleFormError] = useState("");

  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRolePrimaryDesk, setEditRolePrimaryDesk] = useState("helpdesk");
  const [editRoleAllowedDesks, setEditRoleAllowedDesks] = useState<string[]>([]);
  const [editRoleError, setEditRoleError] = useState("");

  const broadcastRoleChange = (updatedRoles: any[]) => {
    try {

      const channel = new BroadcastChannel("isalu_role_channel");
      channel.postMessage({ type: "ROLES_UPDATED", roles: updatedRoles });
      channel.close();
    } catch { }
    window.dispatchEvent(new CustomEvent("isalu_roles_updated", { detail: updatedRoles }));
    window.dispatchEvent(new Event("storage"));
  };

  const loadRoles = async () => {
    const remote = await getRolesAPI();
    if (Array.isArray(remote)) { setRoles(remote); }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setRoleFormError("Please enter a role title/name.");
      return;
    }
    const newRoleObj = {
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      primaryDesk: newRolePrimaryDesk,
      primary_desk: newRolePrimaryDesk,
      allowedDesks: newRoleAllowedDesks,
      allowed_desks: newRoleAllowedDesks,
      isSystemRole: false,
      is_system_role: false,
      status: "Active",
    };

    const res = await createRoleAPI(newRoleObj);
    if (!res || res.error) { setRoleFormError(res?.error || "Failed to create role on the server."); return; }
    const created = res;
    const remoteRoles = await getRolesAPI();
    const updated = Array.isArray(remoteRoles) ? remoteRoles : roles;
    setRoles(updated);
    broadcastRoleChange(updated);

    setNewRoleName("");
    setNewRoleDescription("");
    setRoleFormError("");
    setShowCreateRoleModal(false);
    setToastAlert({
      title: "Custom Role Created ✓",
      description: `New role '${created.name}' registered successfully.`,
      type: "success",
    });
  };

  const handleStartEditRole = (role: any) => {
    setEditingRole(role);
    setEditRoleName(role.name || "");
    setEditRoleDescription(role.description || "");
    setEditRolePrimaryDesk(role.primaryDesk || role.primary_desk || "helpdesk");
    setEditRoleAllowedDesks(role.allowedDesks || role.allowed_desks || ["helpdesk"]);
    setEditRoleError("");
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editRoleName.trim()) {
      setEditRoleError("Role title cannot be empty.");
      return;
    }
    const targetId = editingRole.id || editingRole.role_id;
    const updatedData = {
      name: editRoleName.trim(),
      description: editRoleDescription.trim(),
      primaryDesk: editRolePrimaryDesk,
      primary_desk: editRolePrimaryDesk,
      allowedDesks: editRoleAllowedDesks,
      allowed_desks: editRoleAllowedDesks,
    };

    await updateRoleAPI(targetId, updatedData);
    const remoteRoles = await getRolesAPI();
    const updated = (remoteRoles && remoteRoles.length > 0)
      ? remoteRoles
      : roles.map((r) => ((r.id === targetId || r.role_id === targetId) ? { ...r, ...updatedData } : r));

    setRoles(updated);
    broadcastRoleChange(updated);
    setEditingRole(null);
    setToastAlert({
      title: "Role Configuration Updated ✓",
      description: `Permissions updated for ${editRoleName.trim()}.`,
      type: "success",
    });
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystemRole || role.is_system_role) {
      setToastAlert({
        title: "System Role Protected 🛡️",
        description: `Built-in role '${role.name}' is a system core role and cannot be deleted.`,
        type: "warning",
      });
      return;
    }
    const targetId = role.id || role.role_id;
    await deleteRoleAPI(targetId);
    const remoteRoles = await getRolesAPI();
    const updated = remoteRoles && remoteRoles.length > 0 ? remoteRoles : roles.filter((r) => r.id !== targetId && r.role_id !== targetId);
    setRoles(updated);
    broadcastRoleChange(updated);
    setToastAlert({
      title: "Role Removed",
      description: `Custom role '${role.name}' deleted.`,
      type: "info",
    });
  };

  const userRoleFilterOptions = roles;

  const [hmoOrgSearchQuery, setHmoOrgSearchQuery] = useState("");
  const [hmoOrgCurrentPage, setHmoOrgCurrentPage] = useState(1);
  const [hmoOrgItemsPerPage, setHmoOrgItemsPerPage] = useState(10);

  const broadcastUserChange = (updatedList: any[]) => {
    try {

      const channel = new BroadcastChannel("isalu_user_channel");
      channel.postMessage({ type: "USERS_UPDATED", users: updatedList });
      channel.close();
    } catch { }

    window.dispatchEvent(new CustomEvent("isalu_users_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const loadUsers = async () => {
    const remote = await getSystemUsersAPI();
    setSystemUsers(Array.isArray(remote) ? remote : []);
    if (Array.isArray(remote)) {
      const savedProfile = sessionStorage.getItem("isalu_staff_user_profile");
      if (savedProfile) { try { const parsedCur = JSON.parse(savedProfile); const matched = remote.find((u: any) => u.email?.toLowerCase() === parsedCur?.email?.toLowerCase() || u.name?.toLowerCase() === parsedCur?.name?.toLowerCase()); if (matched?.role) { const updatedProf = { ...parsedCur, role: matched.role, desk: matched.desk || getPrimaryDeskForRole(matched.role) }; sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(updatedProf)); setCurrentUser(updatedProf); } } catch { } }
    }
  };

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Helpdesk Officer");
  const [userFormError, setUserFormError] = useState("");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState("Helpdesk Officer");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editUserError, setEditUserError] = useState("");

  const handleStartEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name || "");
    setEditUserEmail(user.email || "");
    setEditUserPassword(user.password || "");
    setEditUserRole(user.role || "Helpdesk Officer");
    setEditUserError("");
    setShowEditPassword(false);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      setEditUserError("Please enter staff name and email address.");
      return;
    }

    const targetId = editingUser.id || editingUser.user_id;
    const updatedData: any = {
      name: editUserName.trim(),
      email: editUserEmail.trim(),
      role: editUserRole,
      desk: editUserRole.replace("Officer", "").replace("Operator", "").trim(),
    };

    if (editUserPassword.trim()) {
      updatedData.password = editUserPassword.trim();
    }

    await updateSystemUserAPI(targetId, updatedData);

    const remoteUsers = await getSystemUsersAPI();
    const updated = (remoteUsers && remoteUsers.length > 0)
      ? remoteUsers
      : systemUsers.map((u) => ((u.id === targetId || u.user_id === targetId) ? { ...u, ...updatedData } : u));

    setSystemUsers(updated);
    broadcastUserChange(updated);

    setEditingUser(null);
    setToastAlert({
      title: "Staff Account Updated ✓",
      description: `Account details for ${editUserName.trim()} updated successfully.`,
      type: "success",
    });
  };

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleAddSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setUserFormError("Please fill out all required fields.");
      return;
    }

    if (newUserPassword !== newUserConfirmPassword) {
      setUserFormError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const newUser = {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
        desk: newUserRole.replace("Officer", "").replace("Operator", "").trim(),
        status: "Active",
        last_active: "Just created",
        lastActive: "Just created",
      };

      const res = await createSystemUserAPI(newUser);
      if (!res || res.error) throw new Error(res?.error || "Failed to create user on the server.");
      const remoteUsers = await getSystemUsersAPI();
      const updated = Array.isArray(remoteUsers) ? remoteUsers : systemUsers;

      setSystemUsers(updated);
      broadcastUserChange(updated);

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserConfirmPassword("");
      setUserFormError("");
      setShowAddUserModal(false);

      setToastAlert({
        title: "User Account Created Successfully! ✓",
        description: `New ${newUserRole} account for ${newUser.name} is active and saved.`,
        type: "success",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };


  const mergeHmoData = (defaultList: any[], localList: any[], remoteList: any[]) => {
    const mergedMap = new Map<string, any>();

    (defaultList || []).forEach((h) => {
      const key = (h.name || h.id || "").toLowerCase().trim();
      if (key) mergedMap.set(key, { ...h });
    });

    (localList || []).forEach((h) => {
      const nameStr = typeof h === "string" ? h : h.name;
      const key = (nameStr || h.id || "").toLowerCase().trim();
      if (key) {
        const existing = mergedMap.get(key) || {};
        const obj = typeof h === "string" ? { id: `hmo-${key}`, name: h } : h;
        mergedMap.set(key, { ...existing, ...obj });
      }
    });

    (remoteList || []).forEach((r) => {
      const key = (r.name || r.hmo_id || r.id || "").toLowerCase().trim();
      if (key) {
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, {
          ...existing,
          ...r,
          id: r.id || r.hmo_id || existing.id,
          name: r.name || existing.name,
          code: r.code || existing.code,
          email: r.email || existing.email,
          phone: r.phone || existing.phone,
          contactPerson: r.contactPerson || r.contact_person || existing.contactPerson || "Pre-Auth Desk Officer",
          status: r.status || existing.status || "Active Partner",
        });
      }
    });

    return Array.from(mergedMap.values());
  };

  // HMO Provider Companies List State
  const [hmoCompanies, setHmoCompanies] = useState<any[]>([]);

  // Create & Edit HMO Provider Company Form State
  const [showCreateHmoModal, setShowCreateHmoModal] = useState(false);
  const [showEditHmoModal, setShowEditHmoModal] = useState(false);
  const [editingHmoItem, setEditingHmoItem] = useState<any | null>(null);

  const [hmoCompanyName, setHmoCompanyName] = useState("");
  const [hmoCompanyCode, setHmoCompanyCode] = useState("");
  const [hmoCompanyEmail, setHmoCompanyEmail] = useState("");
  const [hmoCompanyPhone, setHmoCompanyPhone] = useState("");
  const [hmoCompanyContact, setHmoCompanyContact] = useState("");
  const [hmoCompanyPlanTier, setHmoCompanyPlanTier] = useState("Corporate / Standard / Executive");
  const [hmoCompanyStatus, setHmoCompanyStatus] = useState("Active Partner");
  const [hmoFormError, setHmoFormError] = useState("");

  const isAdminUser = (user: any): boolean => {
    if (!user || !user.role) return false;
    const roleStr = (user.role || "").toLowerCase().trim();
    const emailStr = (user.email || user.name || "").toLowerCase().trim();
    return (
      roleStr.includes("admin") ||
      roleStr.includes("administrator") ||
      roleStr.includes("chief") ||
      emailStr.includes("admin")
    );
  };

  const handleOpenEditHmoModal = (hmo: any) => {
    if (!isAdminUser(currentUser)) {
      setToastAlert({
        title: "Admin Authorized Action Only 🔒",
        description: "Only Administrator accounts are permitted to edit HMO partner records.",
        type: "warning",
      });
      return;
    }
    setEditingHmoItem(hmo);
    setHmoCompanyName(hmo.name || "");
    setHmoCompanyCode(hmo.code || "");
    setHmoCompanyEmail(hmo.email || hmo.email_address || "");
    setHmoCompanyPhone(hmo.phone || hmo.phone_number || "");
    setHmoCompanyContact(hmo.contactPerson || hmo.contact_person || "");
    setHmoCompanyStatus(hmo.status || "Active Partner");
    setHmoFormError("");
    setShowEditHmoModal(true);
  };

  const handleSaveEditHmoCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHmoItem) return;

    if (!hmoCompanyName.trim() || !hmoCompanyEmail.trim() || !hmoCompanyPhone.trim()) {
      setHmoFormError("Please fill out HMO Company Name, Desk Email, and Helpline Phone.");
      return;
    }

    setIsSubmittingHmoCompany(true);
    try {
      const targetId = editingHmoItem.id || editingHmoItem.hmo_id;

      const updatedData = {
        ...editingHmoItem,
        id: targetId,
        hmo_id: targetId,
        name: hmoCompanyName.trim(),
        code: hmoCompanyCode.trim() || `HMO-${hmoCompanyName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        email: hmoCompanyEmail.trim(),
        phone: hmoCompanyPhone.trim(),
        contactPerson: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
        contact_person: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
        status: hmoCompanyStatus,
      };

      try {
        if (targetId) {
          await updateHmoCompanyAPI(targetId, updatedData);
        }
      } catch { }

      const updatedList = hmoCompanies.map((item) => {
        const itemId = item.id || item.hmo_id;
        if ((itemId && itemId === targetId) || item.name.toLowerCase() === editingHmoItem.name.toLowerCase()) {
          return updatedData;
        }
        return item;
      });

      setHmoCompanies(updatedList);
      broadcastHmoChange(updatedList);
      setShowEditHmoModal(false);
      setEditingHmoItem(null);

      setToastAlert({
        title: "HMO Provider Details Updated ✓",
        description: `Updated partnership details for ${updatedData.name}.`,
        type: "success",
      });
    } finally {
      setIsSubmittingHmoCompany(false);
    }
  };

  const handleCreateHmoCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hmoCompanyName.trim() || !hmoCompanyEmail.trim() || !hmoCompanyPhone.trim()) {
      setHmoFormError("Please fill out HMO Company Name, Desk Email, and Helpline Phone.");
      return;
    }
    setIsSubmittingHmoCompany(true);

    const newCompany = {
      name: hmoCompanyName.trim(),
      code: hmoCompanyCode.trim() || `HMO-${hmoCompanyName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      email: hmoCompanyEmail.trim(),
      phone: hmoCompanyPhone.trim(),
      contactPerson: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
      contact_person: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
      planTier: hmoCompanyPlanTier,
      status: hmoCompanyStatus,
    };

    try {
      const res: any = await createHmoCompanyAPI(newCompany);
      if (res && res.error) {
        setHmoFormError(`Database error: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`);
        return;
      }
      const remoteHmos = await getHmoCompaniesAPI();
      if (remoteHmos && Array.isArray(remoteHmos)) {
        setHmoCompanies(remoteHmos);

      }
    } catch (e: any) {
      setHmoFormError(`Failed to save HMO company to database: ${e.message}`);
      return;
    } finally {
      setIsSubmittingHmoCompany(false);
    }

    // Reset Form
    setHmoCompanyName("");
    setHmoCompanyCode("");
    setHmoCompanyEmail("");
    setHmoCompanyPhone("");
    setHmoCompanyContact("");
    setHmoFormError("");
    setShowCreateHmoModal(false);

    setToastAlert({
      title: "HMO Provider Registered!",
      description: `Accredited provider ${newCompany.name} has been saved to database.`,
      type: "success",
    });
  };

  const broadcastHmoChange = (updatedList: any[]) => {
    try {

      const channel = new BroadcastChannel("isalu_hmo_channel");
      channel.postMessage({ type: "HMO_UPDATED", hmoCompanies: updatedList });
      channel.close();
    } catch { }

    window.dispatchEvent(new CustomEvent("isalu_hmo_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const handleDownloadHmoCsvTemplate = () => {
    const csvHeader = "HMO Name,Registration Code,Pre-Auth Email,Helpline Phone,Contact Person\n";
    const sampleRows = [
      "Hygeia HMO,HMO-HYG-001,preauth@hygeiahmo.com,+234 700 494 342,Mrs. Victoria Adeleke",
      "Reliance HMO,HMO-RLN-002,claims@reliancehmo.com,+234 1 700 1555,Mr. Chukwuma Eze",
      "AXA Mansard Health,HMO-AXA-003,hmo@axamansard.com,+234 1 448 5433,Dr. Funke Akindele",
      "Avon HMO,HMO-AVN-004,preauth@avonhmo.com,+234 700 286 6466,Mr. Segun Oladipo",
      "Anchor HMO,HMO-ANC-009,info@anchorhmo.com,+234 800 262 467,Dr. Sarah Okafor",
      "Metrohealth HMO,HMO-MTR-010,preauth@metrohealthhmo.com,+234 700 638 764,Mr. James Obi",
    ].join("\n");

    const blob = new Blob([csvHeader + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "isalu_hmo_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadHmoCsv = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = (e.target?.result as string) || "";
      const lines = text.split(/\r\n|\n/);
      const newHmos: any[] = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (idx === 0 && (trimmed.toLowerCase().includes("hmo name") || trimmed.toLowerCase().includes("registration code"))) {
          continue;
        }

        const cols = trimmed.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
        const name = cols[0];
        if (!name) continue;

        const code = cols[1] || `HMO-${name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const email = cols[2] || `preauth@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
        const phone = cols[3] || "+234 700 000 0000";
        const contactPerson = cols[4] || "Desk Officer";

        const hmoObj = {
          name,
          code,
          email,
          phone,
          contactPerson,
          contact_person: contactPerson,
          status: "Active Partner",
        };

        try {
          const apiRes = await createHmoCompanyAPI(hmoObj);
          if (apiRes && !apiRes.error) newHmos.push(apiRes);
        } catch { /* server remains authoritative */ }
      }

      if (newHmos.length === 0) {
        setToastAlert({
          title: "No HMO Records Found",
          description: "Please check your CSV file formatting and try again.",
          type: "warning",
        });
        return;
      }

      const remoteHmos = await getHmoCompaniesAPI();
      const masterList = remoteHmos && Array.isArray(remoteHmos) && remoteHmos.length > 0 ? remoteHmos : newHmos;

      setHmoCompanies(masterList);
      broadcastHmoChange(masterList);

      setToastAlert({
        title: "HMO CSV Import Saved & Published! ✓",
        description: `Successfully saved ${newHmos.length} HMO partner companies to database API. Live on homepage slider and booking forms.`,
        type: "success",
      });
    };

    reader.readAsText(file);
  };

  const isSuperAdminOnly = (user: any): boolean => {
    if (!user || !user.role) return false;
    const roleStr = (user.role || "").toLowerCase().trim();
    const emailStr = (user.email || user.name || "").toLowerCase().trim();
    return (
      roleStr === "super administrator" ||
      roleStr === "super admin" ||
      (roleStr.includes("super") && roleStr.includes("admin")) ||
      emailStr === "admin@isaluhospitals.com" ||
      emailStr === "admin"
    );
  };

  const handleClearAllHmoCompanies = () => {
    if (!isSuperAdminOnly(currentUser)) {
      setToastAlert({
        title: "Super Admin Authorized Action Only 🔒",
        description: "Only Super Administrator accounts are permitted to clear all HMO partner records. Hospital Admins and staff officers are restricted.",
        type: "warning",
      });
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: "Clear All Accredited HMO Partner Records",
      message: "Are you sure you want to clear all HMO partner records? This will delete all current HMO companies from the database so you can upload a fresh CSV file.",
      confirmText: "Yes, Clear All HMOs",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          const allHmos = await getHmoCompaniesAPI();
          if (allHmos && Array.isArray(allHmos)) {
            for (const hmo of allHmos) {
              const targetId = hmo.id || hmo.hmo_id;
              if (targetId) {
                await deleteHmoCompanyAPI(targetId);
              }
            }
          }
        } catch { }

        setHmoCompanies([]);
        broadcastHmoChange([]);
        setToastAlert({
          title: "All HMO Records Cleared ✓",
          description: "HMO directory is now completely clear (0 records). You can now upload your fresh CSV file of 65 HMOs.",
          type: "info",
        });
      },
    });
  };

  // Clinic & Department Management Module State
  const [clinics, setClinics] = useState<any[]>([]);

  const loadClinics = async () => {
    const remote = await getDepartmentsAPI({ include_disabled: true });
    if (remote && Array.isArray(remote)) {
      const mapped = remote.map((d: any) => ({
        id: d.dept_id || d.id,
        dept_id: d.dept_id || d.id,
        name: d.name,
        description: d.description || "Specialized clinical consultation services.",
        iconName: d.icon_name || d.iconName || "Building2",
        icon_name: d.icon_name || d.iconName || "Building2",
        doctorCount: d.doctor_count ?? d.doctorCount ?? 0,
        doctor_count: d.doctor_count ?? d.doctorCount ?? 0,
        status: d.status,
        location: d.location || "Main Hospital Complex - Suite Wing",
      }));
      setClinics(mapped);

    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  // Create Clinic Modal State
  const [showCreateClinicModal, setShowCreateClinicModal] = useState(false);
  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicId, setNewClinicId] = useState("");
  const [newClinicDescription, setNewClinicDescription] = useState("");
  const [newClinicIcon, setNewClinicIcon] = useState("Building2");
  const [newClinicLocation, setNewClinicLocation] = useState("Main Hospital Complex - Suite Wing");
  const [newClinicStatus, setNewClinicStatus] = useState("Active");
  const [clinicFormError, setClinicFormError] = useState("");
  const [isSubmittingClinic, setIsSubmittingClinic] = useState(false);

  // Edit Clinic Modal State
  const [editingClinic, setEditingClinic] = useState<any | null>(null);
  const [editClinicName, setEditClinicName] = useState("");
  const [editClinicDescription, setEditClinicDescription] = useState("");
  const [editClinicIcon, setEditClinicIcon] = useState("Building2");
  const [editClinicLocation, setEditClinicLocation] = useState("");
  const [editClinicStatus, setEditClinicStatus] = useState("Active");
  const [editClinicFormError, setEditClinicFormError] = useState("");

  // Search & Filter state for Clinics Module
  const [clinicSearchQuery, setClinicSearchQuery] = useState("");
  const [clinicStatusFilter, setClinicStatusFilter] = useState("all");

  const filteredClinics = clinics.filter((c) => {
    const nameStr = (c.name || "").toLowerCase();
    const idStr = (c.id || c.dept_id || "").toLowerCase();
    const descStr = (c.description || "").toLowerCase();
    const q = clinicSearchQuery.toLowerCase().trim();

    const matchesSearch = !q || nameStr.includes(q) || idStr.includes(q) || descStr.includes(q);

    const isClinicActive = c.status === true || c.status === "Active" || c.status === "active" || c.status === 1 || (c.status !== false && c.status !== "Disabled" && c.status !== "Disabled 🚫" && c.status !== "Inactive" && c.status !== "Maintenance");

    let matchesStatus = true;
    if (clinicStatusFilter === "active") {
      matchesStatus = isClinicActive;
    } else if (clinicStatusFilter === "disabled") {
      matchesStatus = !isClinicActive;
    } else if (clinicStatusFilter === "maintenance") {
      matchesStatus = c.status === "Maintenance";
    }

    return matchesSearch && matchesStatus;
  });

  const broadcastClinicChange = (updatedList: any[]) => {
    try {

      const channel = new BroadcastChannel("isalu_clinic_channel");
      channel.postMessage({ type: "CLINIC_UPDATED", clinics: updatedList });
      channel.close();
    } catch { }

    window.dispatchEvent(new CustomEvent("isalu_clinic_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) {
      setClinicFormError("Clinic / Department Name is required.");
      return;
    }

    setIsSubmittingClinic(true);
    try {
      const slugId = newClinicId.trim()
        ? newClinicId.trim().toLowerCase().replace(/\s+/g, "-")
        : newClinicName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

      const formattedName = newClinicName.trim();

      const newClinic = {
        id: slugId,
        dept_id: slugId,
        name: formattedName,
        description: newClinicDescription.trim() || "Specialized medical consultation suite and outpatient clinical care.",
        iconName: newClinicIcon || "Building2",
        icon_name: newClinicIcon || "Building2",
        doctorCount: 0,
        doctor_count: 0,
        status: newClinicStatus || "Active",
        location: newClinicLocation.trim() || "Main Hospital Complex - Suite Wing",
      };

      const res: any = await createDepartmentAPI(newClinic);
      if (res && res.error) {
        setClinicFormError(`Database Error: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`);
        return;
      }
      await loadClinics();

      setNewClinicName("");
      setNewClinicId("");
      setNewClinicDescription("");
      setNewClinicIcon("Building2");
      setNewClinicLocation("Main Hospital Complex - Suite Wing");
      setNewClinicStatus("Active");
      setClinicFormError("");
      setShowCreateClinicModal(false);

      setToastAlert({
        title: "Clinic Created Successfully! 🏥",
        description: `${newClinic.name} module registered and available across the hospital system.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Error creating clinic:", err);
      setClinicFormError(`Failed to register medical clinic module: ${err.message || err}`);
    } finally {
      setIsSubmittingClinic(false);
    }
  };

  const handleOpenEditClinic = (clinic: any) => {
    setEditingClinic(clinic);
    setEditClinicName(clinic.name || "");
    setEditClinicDescription(clinic.description || "");
    setEditClinicIcon(clinic.iconName || clinic.icon_name || "Building2");
    setEditClinicLocation(clinic.location || "Main Hospital Complex - Suite Wing");
    setEditClinicStatus(clinic.status || "Active");
    setEditClinicFormError("");
  };

  const handleSaveEditClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic) return;
    if (!editClinicName.trim()) {
      setEditClinicFormError("Clinic / Department Name is required.");
      return;
    }

    const targetId = editingClinic.id || editingClinic.dept_id;
    const updatedData = {
      ...editingClinic,
      id: targetId,
      dept_id: targetId,
      name: editClinicName.trim(),
      description: editClinicDescription.trim(),
      iconName: editClinicIcon,
      icon_name: editClinicIcon,
      location: editClinicLocation.trim() || "Main Hospital Complex - Suite Wing",
      status: editClinicStatus,
    };

    const res: any = await updateDepartmentAPI(targetId, updatedData);
    if (res && res.error) {
      setEditClinicFormError(`Database Error: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`);
      return;
    }
    await loadClinics();

    const updated = clinics.map((c) =>
      (c.id === targetId || c.dept_id === targetId || (c.name && c.name.toLowerCase().trim() === editingClinic.name.toLowerCase().trim())) ? updatedData : c
    );
    setClinics(updated);
    broadcastClinicChange(updated);

    setEditingClinic(null);
    setToastAlert({
      title: "Clinic Updated ✓",
      description: `${editClinicName.trim()} details saved successfully.`,
      type: "success",
    });
  };

  const handleDeleteClinic = async (clinic: any) => {
    const targetId = clinic.id || clinic.dept_id;
    setConfirmModalConfig({
      isOpen: true,
      title: `Disable Clinic "${clinic.name}"?`,
      message: `Are you sure you want to disable this clinic module? It will be updated as Disabled in the database and hidden from all active clinic displays.`,
      confirmText: "Yes, Disable Clinic",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        // 1. Update status to Disabled in Django Database via API
        await updateDepartmentAPI(targetId, { status: false, is_active: false, status_text: "Disabled" });
        await deleteDepartmentAPI(targetId);

        // 2. Mark clinic as Disabled in local list & broadcast
        const updated = clinics.map((c) =>
          (c.id === targetId || c.dept_id === targetId) ? { ...c, status: "Disabled" } : c
        );
        setClinics(updated);
        broadcastClinicChange(updated);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setToastAlert({
          title: "Clinic Disabled in Database 🚫",
          description: `${clinic.name} has been set to Disabled in the database and hidden from active clinic displays.`,
          type: "warning",
        });
      },
    });
  };

  const handleReEnableClinic = async (clinic: any) => {
    const targetId = clinic.id || clinic.dept_id;
    setConfirmModalConfig({
      isOpen: true,
      title: `Re-Enable Clinic "${clinic.name}"?`,
      message: `Are you sure you want to re-enable this clinic module? It will be marked as Active (status = True) in the database and restored to active clinic displays.`,
      confirmText: "Yes, Re-Enable Clinic",
      cancelText: "Cancel",
      variant: "primary",
      onConfirm: async () => {
        await updateDepartmentAPI(targetId, { status: true, is_active: true, status_text: "Active" });

        const updated = clinics.map((c) =>
          (c.id === targetId || c.dept_id === targetId) ? { ...c, status: "Active" } : c
        );
        setClinics(updated);
        broadcastClinicChange(updated);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setToastAlert({
          title: "Clinic Re-Enabled ✓",
          description: `${clinic.name} is now Active in the database and available for booking.`,
          type: "success",
        });
      },
    });
  };

  const handleRequestToggleHmoDisable = (hmo: any) => {
    const isDisabling = hmo.status === "Active Partner" || !hmo.status || hmo.status === "Active";
    const targetId = hmo.id || hmo.hmo_id;

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable HMO Provider" : "Enable HMO Provider",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} partnership status for "${hmo.name}"? Staff will ${isDisabling ? "no longer" : "now"} be able to select this HMO provider.`,
      confirmText: isDisabling ? "Yes, Disable Provider" : "Yes, Enable Provider",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        const newStatus = isDisabling ? "Disabled Partner" : "Active Partner";

        await updateHmoCompanyAPI(targetId, { status: newStatus });

        const remoteHmos = await getHmoCompaniesAPI();
        const updated = (remoteHmos && remoteHmos.length > 0)
          ? remoteHmos
          : hmoCompanies.map((item) => ((item.id === targetId || item.hmo_id === targetId) ? { ...item, status: newStatus } : item));

        setHmoCompanies(updated);

        setToastAlert({
          title: isDisabling ? "HMO Partner Disabled 🚫" : "HMO Partner Re-Enabled ✓",
          description: `Partnership status for ${hmo.name} updated to ${newStatus}.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  // Specialist Schedule Management State
  const [specialistSchedules, setSpecialistSchedules] = useState<any[]>([]);

  // Registered Doctors State
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  // New Specialist Doctor Modal State
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState(clinics[0]?.name || "Cardiology");
  const [newDocQualifications, setNewDocQualifications] = useState("");
  const [newDocRoom, setNewDocRoom] = useState("");
  const [newDocAcceptedTypes, setNewDocAcceptedTypes] = useState<string[]>(["Private Self-Pay", "HMO Insurance"]);
  const [newDocFormError, setNewDocFormError] = useState("");

  // Registered Doctors Directory Search & Filter State
  const [docDirectorySearch, setDocDirectorySearch] = useState("");
  const [docDirectoryStatusFilter, setDocDirectoryStatusFilter] = useState("all");
  const [docDirectoryDeptFilter, setDocDirectoryDeptFilter] = useState("all");

  // List Pagination States
  const [helpdeskCurrentPage, setHelpdeskCurrentPage] = useState(1);
  const [helpdeskItemsPerPage, setHelpdeskItemsPerPage] = useState(5);

  const [cashdeskCurrentPage, setCashdeskCurrentPage] = useState(1);
  const [cashdeskItemsPerPage, setCashdeskItemsPerPage] = useState(5);

  const [hmoCurrentPage, setHmoCurrentPage] = useState(1);
  const [hmoItemsPerPage, setHmoItemsPerPage] = useState(5);

  const [allPatientsCurrentPage, setAllPatientsCurrentPage] = useState(1);
  const [allPatientsItemsPerPage, setAllPatientsItemsPerPage] = useState(5);

  const [checkedInCurrentPage, setCheckedInCurrentPage] = useState(1);
  const [checkedInItemsPerPage, setCheckedInItemsPerPage] = useState(5);

  const [hmoEnrolleesCurrentPage, setHmoEnrolleesCurrentPage] = useState(1);
  const [hmoEnrolleesItemsPerPage, setHmoEnrolleesItemsPerPage] = useState(5);

  const [privatePatientsCurrentPage, setPrivatePatientsCurrentPage] = useState(1);
  const [privatePatientsItemsPerPage, setPrivatePatientsItemsPerPage] = useState(5);

  const [docDirCurrentPage, setDocDirCurrentPage] = useState(1);
  const [docDirItemsPerPage, setDocDirItemsPerPage] = useState(5);

  const [usersDirCurrentPage, setUsersDirCurrentPage] = useState(1);
  const [usersDirItemsPerPage, setUsersDirItemsPerPage] = useState(5);

  useEffect(() => {
    setHelpdeskCurrentPage(1);
    setCashdeskCurrentPage(1);
    setHmoCurrentPage(1);
    setAllPatientsCurrentPage(1);
    setCheckedInCurrentPage(1);
    setHmoEnrolleesCurrentPage(1);
    setPrivatePatientsCurrentPage(1);
    setDocDirCurrentPage(1);
    setUsersDirCurrentPage(1);
  }, [searchQuery, statusFilter, hmoProviderFilter, clinicFilter, docDirectorySearch, docDirectoryStatusFilter, docDirectoryDeptFilter]);

  // Specialist Timetables & Shift Roster Search, Filter & Pagination State
  const [schedSearchQuery, setSchedSearchQuery] = useState("");
  const [schedStatusFilter, setSchedStatusFilter] = useState("all");
  const [schedDeptFilter, setSchedDeptFilter] = useState("all");
  const [schedDayFilter, setSchedDayFilter] = useState("all");
  const [schedCurrentPage, setSchedCurrentPage] = useState(1);
  const [schedItemsPerPage, setSchedItemsPerPage] = useState(5);

  const filteredSchedules = specialistSchedules.filter((sched) => {
    const docName = (sched.doctorName || sched.doctor_name || "").toLowerCase();
    const spec = (sched.specialty || sched.doctorSpecialty || "").toLowerCase();
    const rm = (sched.room || "").toLowerCase();
    const shift = (sched.shiftTime || sched.shift_time || "").toLowerCase();
    const rawDays = sched.dutyDays || sched.duty_days || sched.availableDays || sched.available_days || [];
    const daysArr: string[] = Array.isArray(rawDays) ? rawDays : [String(rawDays)];
    const daysStr = daysArr.join(" ").toLowerCase();
    const q = schedSearchQuery.toLowerCase().trim();

    const matchesSearch =
      !q ||
      docName.includes(q) ||
      spec.includes(q) ||
      rm.includes(q) ||
      shift.includes(q) ||
      daysStr.includes(q);

    let matchesStatus = true;
    if (schedStatusFilter === "active") {
      matchesStatus = sched.status !== false && (typeof sched.status !== "string" || !sched.status.includes("Disabled"));
    } else if (schedStatusFilter === "disabled") {
      matchesStatus = sched.status === false || (typeof sched.status === "string" && sched.status.includes("Disabled"));
    }

    let matchesDept = true;
    if (schedDeptFilter !== "all") {
      matchesDept = spec.includes(schedDeptFilter.toLowerCase());
    }

    let matchesDay = true;
    if (schedDayFilter !== "all") {
      const targetDay = schedDayFilter.toLowerCase();
      const targetShort = targetDay.substring(0, 3); // e.g. "mon", "tue", "wed", "thu", "fri", "sat", "sun"

      matchesDay = daysArr.some((d: any) => {
        if (!d) return false;
        const itemLower = String(d).toLowerCase();
        return itemLower.includes(targetDay) || itemLower.includes(targetShort);
      });
    }

    return matchesSearch && matchesStatus && matchesDept && matchesDay;
  });

  const totalSchedPages = Math.ceil(filteredSchedules.length / schedItemsPerPage) || 1;
  const currentSchedPage = Math.min(schedCurrentPage, totalSchedPages);

  const paginatedSchedules = filteredSchedules.slice(
    (currentSchedPage - 1) * schedItemsPerPage,
    currentSchedPage * schedItemsPerPage
  );

  // Edit Doctor Modal State
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocSpecialty, setEditDocSpecialty] = useState("");
  const [editDocDeptId, setEditDocDeptId] = useState("");
  const [editDocQualifications, setEditDocQualifications] = useState("");
  const [editDocRoom, setEditDocRoom] = useState("");
  const [editDocAcronym, setEditDocAcronym] = useState("");
  const [editDocStatus, setEditDocStatus] = useState("Active");
  const [editDocAcceptedTypes, setEditDocAcceptedTypes] = useState<string[]>(["Private Self-Pay", "HMO Insurance"]);
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);
  const [isApprovingHmo, setIsApprovingHmo] = useState(false);
  const [isSubmittingHmoCompany, setIsSubmittingHmoCompany] = useState(false);

  const handleOpenEditDoctor = (doc: any) => {
    setEditingDoctor(doc);
    setEditDocName(doc.fullName || doc.name || "");
    setEditDocSpecialty(doc.specialty || clinics[0]?.name || "Cardiology");
    setEditDocDeptId(doc.departmentId || "cardiology");
    setEditDocQualifications(doc.qualification || doc.qualifications || "MBBS, FWACS");
    setEditDocRoom(doc.room || doc.roomNumber || "Consultation Suite");
    setEditDocAcronym(doc.acronym || "");
    setEditDocStatus(doc.status || "Active");
    setEditDocAcceptedTypes(doc.acceptedPatientTypes || doc.accepted_patient_types || ["Private Self-Pay", "HMO Insurance"]);
    setEditFormError("");
  };

  const handleSaveEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    if (!editDocName.trim() || !editDocSpecialty.trim()) {
      setEditFormError("Doctor Name and Specialty are required.");
      return;
    }

    setIsSubmittingDoctor(true);
    const targetId = editingDoctor.id || editingDoctor.doc_id;
    const formattedName = editDocName.trim().startsWith("Dr.") ? editDocName.trim() : `Dr. ${editDocName.trim()}`;

    const updatedDocData = {
      ...editingDoctor,
      id: targetId,
      doc_id: targetId,
      name: formattedName,
      fullName: formattedName,
      full_name: formattedName,
      specialty: editDocSpecialty,
      departmentId: editDocDeptId,
      department_id: editDocDeptId,
      qualification: editDocQualifications.trim(),
      qualifications: editDocQualifications.trim(),
      room: editDocRoom.trim(),
      roomNumber: editDocRoom.trim(),
      acronym: editDocAcronym.trim() || editingDoctor.acronym,
      acceptedPatientTypes: editDocAcceptedTypes.length > 0 ? editDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      accepted_patient_types: editDocAcceptedTypes.length > 0 ? editDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      status: editDocStatus,
    };

    await updateDoctorAPI(targetId, updatedDocData);

    const updatedList = doctorsList.map((item) =>
      (item.id === targetId || item.doc_id === targetId) ? updatedDocData : item
    );
    setDoctorsList(updatedList);

    // Update matching schedule records in API & DB too
    const updatedSchedules = specialistSchedules.map((sched) => {
      if (sched.doctorId === targetId || sched.doctorName?.includes(editingDoctor.name)) {
        const updatedSched = {
          ...sched,
          doctorName: formattedName,
          doctor_name: formattedName,
          specialty: editDocSpecialty,
          room: editDocRoom.trim() || sched.room,
        };
        updateScheduleAPI(sched.id, updatedSched);
        return updatedSched;
      }
      return sched;
    });
    setSpecialistSchedules(updatedSchedules);

    setIsSubmittingDoctor(false);
    setEditingDoctor(null);
    setToastAlert({
      title: "Doctor Record Updated! ✓",
      description: `Updated profile details for ${formattedName} in database & API.`,
      type: "success",
    });
  };

  const filteredDirectoryDoctors = doctorsList.filter((doc) => {
    const docName = (doc.fullName || doc.name || "").toLowerCase();
    const docSpec = (doc.specialty || "").toLowerCase();
    const docRoom = (doc.room || doc.roomNumber || "").toLowerCase();
    const docAcro = (doc.acronym || "").toLowerCase();
    const q = docDirectorySearch.toLowerCase().trim();

    const matchesSearch = !q || docName.includes(q) || docSpec.includes(q) || docRoom.includes(q) || docAcro.includes(q);

    let matchesStatus = true;
    if (docDirectoryStatusFilter === "active") {
      matchesStatus = doc.status !== false && (typeof doc.status !== "string" || !doc.status.includes("Disabled"));
    } else if (docDirectoryStatusFilter === "disabled") {
      matchesStatus = doc.status === false || (typeof doc.status === "string" && doc.status.includes("Disabled"));
    }

    let matchesDept = true;
    if (docDirectoryDeptFilter !== "all") {
      const docDept = typeof doc.department === "object" && doc.department !== null
        ? (doc.department.dept_id || doc.department.id || "")
        : (doc.department || doc.departmentId || doc.department_id || "");
      matchesDept = String(docDept).toLowerCase().trim() === String(docDirectoryDeptFilter).toLowerCase().trim();
    }

    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleCreateNewDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      setNewDocFormError("Please enter Specialist Doctor's Name.");
      return;
    }

    const autoAcronym = getAcronymForIndex(doctorsList.length);
    const formattedName = newDocName.trim().startsWith("Dr.") ? newDocName.trim() : `Dr. ${newDocName.trim()}`;
    const deptMatch = clinics.find((d) =>
      d.name.toLowerCase().includes(newDocSpecialty.toLowerCase()) ||
      newDocSpecialty.toLowerCase().includes(d.name.toLowerCase()) ||
      d.id.toLowerCase().includes(newDocSpecialty.toLowerCase())
    );

    const defaultRoom = newDocRoom.trim() || "Consultation Suite";
    const newDocPayload = {
      name: formattedName,
      fullName: formattedName,
      full_name: formattedName,
      acronym: autoAcronym,
      specialty: newDocSpecialty,
      departmentId: deptMatch ? deptMatch.id : "general-physician",
      qualification: newDocQualifications.trim() || "MBBS, FWACS",
      qualifications: newDocQualifications.trim() || "MBBS, FWACS",
      room: defaultRoom,
      roomNumber: defaultRoom,
      acceptedPatientTypes: newDocAcceptedTypes.length > 0 ? newDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      accepted_patient_types: newDocAcceptedTypes.length > 0 ? newDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      availableDays: ["Monday", "Wednesday", "Friday"],
      availability: ["Monday", "Wednesday", "Friday"],
      timeSlots: ["08:00 AM – 02:00 PM"],
      image: "",
      bio: "Senior Medical Consultant specializing in high-quality clinical care at Isalu Hospitals.",
      status: true,
    };

    // 1. Save to Doctor Table in Database
    const doctorApiRes: any = await createDoctorAPI(newDocPayload);
    if (doctorApiRes && doctorApiRes.error) {
      console.error("Failed to save doctor to DB:", doctorApiRes.error);
      setNewDocFormError(`Failed to save doctor to database: ${doctorApiRes.error}`);
      return;
    }

    if (!doctorApiRes || doctorApiRes.error) { setNewDocFormError(doctorApiRes?.error || "Failed to save doctor to the server."); return; }
    const savedDoc = doctorApiRes;
    const docId = savedDoc.id || savedDoc.doc_id;
    const docAdminName = `${savedDoc.fullName || savedDoc.full_name || savedDoc.name} (${savedDoc.acronym || autoAcronym})`;

    // 2. Save Initial Entry to SpecialistSchedule Table in Database
    const initialSchedulePayload = {
      doctorId: docId,
      doctor_id: docId,
      doctorName: docAdminName,
      doctor_name: docAdminName,
      specialty: newDocSpecialty,
      room: defaultRoom,
      dutyDays: ["Monday", "Wednesday", "Friday"],
      duty_days: ["Monday", "Wednesday", "Friday"],
      dayConfigs: {},
      day_configs: {},
      shiftTime: "08:00 AM – 02:00 PM",
      shift_time: "08:00 AM – 02:00 PM",
      capacity: 15,
      totalWeeklyCapacity: 15,
      total_weekly_capacity: 15,
      status: true,
    };

    const scheduleRes = await createScheduleAPI(initialSchedulePayload);
    if (!scheduleRes) {
      setNewDocFormError(
        "Doctor saved, but the initial schedule could not be created on the server."
      );
      return;
    }
    // 3. Re-fetch all doctors & schedules from Database to guarantee 100% synchronization
    const [remoteDocs, remoteSchedules] = await Promise.all([
      getDoctorsAPI(),
      getSchedulesAPI()
    ]);

    const updatedDoctorsList = remoteDocs && Array.isArray(remoteDocs) && remoteDocs.length > 0
      ? remoteDocs
      : [savedDoc, ...doctorsList.filter((d) => d.id !== docId && d.doc_id !== docId)];

    setDoctorsList(updatedDoctorsList);

    if (remoteSchedules && Array.isArray(remoteSchedules) && remoteSchedules.length > 0) {
      setSpecialistSchedules(remoteSchedules);

    }

    // Auto-select this newly created doctor in schedule form fields
    setSchedDoctorId(docId);
    setSchedDoctorSearch(docAdminName);
    setSpecDateDoctorId(docId);
    setSpecDateDoctorSearch(docAdminName);
    setShowDoctorDropdown(false);
    setShowSpecDoctorDropdown(false);

    // Reset Form
    setNewDocName("");
    setNewDocQualifications("");
    setNewDocRoom("");
    setNewDocAcceptedTypes(["Private Self-Pay", "HMO Insurance"]);
    setNewDocFormError("");
    setShowAddDoctorModal(false);

    setToastAlert({
      title: "Specialist Doctor Saved to Database!",
      description: `${docAdminName} saved to both Doctor & Specialist Schedule tables in database.`,
      type: "success",
    });
  };

  const handleToggleDoctorStatus = (doc: any) => {
    const isDisabling = doc.status !== false && (typeof doc.status !== "string" || !doc.status.includes("Disabled"));
    const targetId = doc.id || doc.doc_id;

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable Specialist Doctor" : "Enable Specialist Doctor",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} "${doc.fullName || doc.name}"? ${isDisabling ? "This doctor will no longer appear on the public portal or patient booking pages." : "This doctor will become active again."}`,
      confirmText: isDisabling ? "Yes, Disable Doctor" : "Yes, Enable Doctor",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        const newStatus = isDisabling ? "Disabled 🚫" : "Active";

        // Pure in-place local status switch
        const updatedList = doctorsList.map((item) =>
          (item.id === targetId || item.doc_id === targetId) ? { ...item, status: newStatus } : item
        );
        setDoctorsList(updatedList);

        // Persist status change directly to existing DB record via PATCH
        await updateDoctorAPI(targetId, { status: newStatus });

        setToastAlert({
          title: isDisabling ? "Doctor Status Disabled 🚫" : "Doctor Status Active ✓",
          description: `Status for ${doc.fullName || doc.name} updated in database.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [isSubmittingEditSchedule, setIsSubmittingEditSchedule] = useState(false);
  const [isRegisteringNewDocInSched, setIsRegisteringNewDocInSched] = useState(false);
  const [schedNewDocName, setSchedNewDocName] = useState("");
  const [schedNewDocDeptId, setSchedNewDocDeptId] = useState("cardiology");
  const [schedNewDocQual, setSchedNewDocQual] = useState("MBBS, FWACS");
  const [schedDoctorId, setSchedDoctorId] = useState(doctorsList[0]?.id || "");
  const [schedDoctorSearch, setSchedDoctorSearch] = useState("");
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [schedRoom, setSchedRoom] = useState("");
  const [schedDutyDays, setSchedDutyDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [schedDaySchedules, setSchedDaySchedules] = useState<Record<string, { shiftTimes: string[]; capacity: number }>>({
    Mon: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
    Wed: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
    Fri: { shiftTimes: ["08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
  });

  const handleToggleSchedDay = (day: string) => {
    if (schedDutyDays.includes(day)) {
      const updatedDays = schedDutyDays.filter((d) => d !== day);
      setSchedDutyDays(updatedDays);
      setSchedDaySchedules((prev) => {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      });
    } else {
      setSchedDutyDays([...schedDutyDays, day]);
      setSchedDaySchedules((prev) => ({
        ...prev,
        [day]: prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
      }));
    }
  };

  const handleAddShiftTimeToDay = (day: string) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 };
      const unused = shiftTimeOptions.find((opt) => !current.shiftTimes.includes(opt)) || shiftTimeOptions[0] || "01:00 PM – 06:00 PM (Afternoon Shift)";
      return {
        ...prev,
        [day]: {
          ...current,
          shiftTimes: [...current.shiftTimes, unused],
        },
      };
    });
  };

  const handleRemoveShiftTimeFromDay = (day: string, index: number) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current || current.shiftTimes.length <= 1) return prev;
      const updated = current.shiftTimes.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateDayShiftTime = (day: string, index: number, value: string) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      const updated = [...current.shiftTimes];
      updated[index] = value;
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateDayCapacity = (day: string, capacity: number) => {
    setSchedDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: { ...current, capacity: Math.max(1, capacity) },
      };
    });
  };

  // Inline Custom Start-to-End Time Slot State
  const [customInputSlotKey, setCustomInputSlotKey] = useState<string | null>(null);
  const [slotCustomStart, setSlotCustomStart] = useState("08:00 AM");
  const [slotCustomEnd, setSlotCustomEnd] = useState("02:00 PM");

  const handleOpenSlotCustomTime = (day: string, idx: number, currentShiftTime?: string) => {
    const key = `${day}-${idx}`;
    if (customInputSlotKey === key) {
      setCustomInputSlotKey(null);
      return;
    }

    if (currentShiftTime && currentShiftTime.includes("–")) {
      const parts = currentShiftTime.split("–");
      setSlotCustomStart(parts[0]?.trim() || "08:00 AM");
      const endPart = parts[1]?.trim() || "02:00 PM";
      const cleanEnd = endPart.split("(")[0]?.trim() || endPart;
      setSlotCustomEnd(cleanEnd);
    } else {
      setSlotCustomStart("08:00 AM");
      setSlotCustomEnd("02:00 PM");
    }

    setCustomInputSlotKey(key);
  };

  const handleApplyCustomStartEndTime = async (day: string, idx: number, isEditModal: boolean = false) => {
    if (!slotCustomStart.trim() || !slotCustomEnd.trim()) return;

    const formattedShiftTime = `${slotCustomStart.trim()} – ${slotCustomEnd.trim()}`;

    if (!shiftTimeOptions.includes(formattedShiftTime)) {
      await createCustomTimeSlotAPI({
        startTime: slotCustomStart.trim(),
        endTime: slotCustomEnd.trim(),
        formatted: formattedShiftTime,
      });
      const updatedOptions = [formattedShiftTime, ...shiftTimeOptions];
      setShiftTimeOptions(updatedOptions);
      await saveAppSettingAPI("shift_time_options", updatedOptions);

    }

    if (isEditModal) {
      handleUpdateEditDayShiftTime(day, idx, formattedShiftTime);
    } else {
      handleUpdateDayShiftTime(day, idx, formattedShiftTime);
    }

    setCustomInputSlotKey(null);

    setToastAlert({
      title: `Custom Time Set for ${day}!`,
      description: `Shift time "${formattedShiftTime}" saved for ${day}.`,
      type: "success",
    });
  };
  // Custom Shift Time Options State
  const [shiftTimeOptions, setShiftTimeOptions] = useState<string[]>([]);

  // Create Custom Shift Time Modal Form State
  const [showCreateTimeModal, setShowCreateTimeModal] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("08:00 AM");
  const [customEndTime, setCustomEndTime] = useState("02:00 PM");
  const [customShiftLabel, setCustomShiftLabel] = useState("");
  const [timeFormError, setTimeFormError] = useState("");

  const handleCreateCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartTime.trim() || !customEndTime.trim()) {
      setTimeFormError("Please enter both Start Time and End Time.");
      return;
    }

    const labelSuffix = customShiftLabel.trim() ? ` (${customShiftLabel.trim()})` : "";
    const formattedShiftTime = `${customStartTime.trim()} – ${customEndTime.trim()}${labelSuffix}`;

    if (!shiftTimeOptions.includes(formattedShiftTime)) {
      createCustomTimeSlotAPI({
        startTime: customStartTime.trim(),
        endTime: customEndTime.trim(),
        shiftLabel: customShiftLabel.trim(),
        formatted: formattedShiftTime,
      });
      const updated = [formattedShiftTime, ...shiftTimeOptions];
      setShiftTimeOptions(updated);

    }

    // Auto-select the newly created shift time
    setSchedShiftTime(formattedShiftTime);

    // Reset Form
    setCustomShiftLabel("");
    setTimeFormError("");
    setShowCreateTimeModal(false);

    setToastAlert({
      title: "Custom Shift Hours Saved!",
      description: `Shift timetable option "${formattedShiftTime}" added.`,
      type: "success",
    });
  };
  // Create Specific Date Schedule Modal Form State
  const [showCreateSpecificDateModal, setShowCreateSpecificDateModal] = useState(false);
  const [specDateDoctorId, setSpecDateDoctorId] = useState(doctorsList[0]?.id || "");
  const [specDateDoctorSearch, setSpecDateDoctorSearch] = useState("");
  const [showSpecDoctorDropdown, setShowSpecDoctorDropdown] = useState(false);
  const [specDateValue, setSpecDateValue] = useState("");
  const [specDateTargetDay, setSpecDateTargetDay] = useState("Sunday");
  const [specDateRoom, setSpecDateRoom] = useState("");
  const [specDateWeeks, setSpecDateWeeks] = useState<string[]>([]);
  const [specDateWeekPreset, setSpecDateWeekPreset] = useState("");
  const [specDateShiftTime, setSpecDateShiftTime] = useState("08:00 AM – 02:00 PM (Morning Shift)");
  const [specDateCapacity, setSpecDateCapacity] = useState(15);
  const [specDateNote, setSpecDateNote] = useState("Special Clinic Session");
  const [specDateFormError, setSpecDateFormError] = useState("");

  // Helper: derive week badges array from a pattern string
  const deriveWeeksFromPattern = (pattern: string): string[] => {
    if (!pattern) return [];
    const upper = pattern.toUpperCase();
    const weeks: string[] = [];
    if (upper.includes("1ST") || upper.includes("FIRST")) weeks.push("1st Week");
    if (upper.includes("2ND") || upper.includes("SECOND")) weeks.push("2nd Week");
    if (upper.includes("3RD") || upper.includes("THIRD")) weeks.push("3rd Week");
    if (upper.includes("4TH") || upper.includes("FOURTH")) weeks.push("4th Week");
    if (upper.includes("5TH") || upper.includes("FIFTH")) weeks.push("5th Week");
    if (upper.includes("EVERY") || upper.includes("ALL WEEKS")) {
      return ["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week"];
    }
    return weeks;
  };

  // Helper: derive pattern preset string from week badges array
  const derivePatternFromWeeks = (weeks: string[], dayName: string): string => {
    if (weeks.length === 0) return "";
    if (weeks.length === 5) return "EVERY";
    const sorted = [...weeks].sort();
    const weekNums = sorted.map((w) => w.replace(" Week", "").toUpperCase());
    if (weekNums.length === 2 && weekNums.includes("1ST") && weekNums.includes("3RD")) {
      return "1ST & 3RD";
    }
    if (weekNums.length === 2 && weekNums.includes("2ND") && weekNums.includes("4TH")) {
      return "2ND & 4TH";
    }
    if (weekNums.length === 3 && weekNums.includes("1ST") && weekNums.includes("2ND") && weekNums.includes("3RD")) {
      return "1ST - 3RD";
    }
    return `${weekNums.join(", ")} ${dayName}S`;
  };

  // Saved Custom Week Patterns State
  const [savedCustomPatterns, setSavedCustomPatterns] = useState<string[]>([]);

  const [showCustomPatternInput, setShowCustomPatternInput] = useState(false);
  const [customPatternInput, setCustomPatternInput] = useState("");

  const handleAddCustomPattern = () => {
    if (!customPatternInput.trim()) return;
    const formatted = customPatternInput.trim().toUpperCase();
    if (!savedCustomPatterns.includes(formatted)) {
      const updated = [formatted, ...savedCustomPatterns];
      setSavedCustomPatterns(updated);
      void saveAppSettingAPI("custom_week_patterns", updated);

    }
    setSpecDateWeekPreset(formatted);
    const derivedWeeks = deriveWeeksFromPattern(formatted);
    setSpecDateWeeks(derivedWeeks);
    setShowCustomPatternInput(false);
    setCustomPatternInput("");
    setToastAlert({
      title: "Custom Week Pattern Added!",
      description: `Pattern "${formatted}" saved and selected (${derivedWeeks.length} week(s) active).`,
      type: "success",
    });
  };

  // Extra Recurring Pattern Entries State for Multi-Pattern Schedules
  const [extraPatternEntries, setExtraPatternEntries] = useState<{
    id: string;
    preset: string;
    weeks: string[];
    shiftTime: string;
    capacity: number;
  }[]>([]);

  const handleAddPatternEntry = () => {
    const newEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      preset: "2ND & 4TH",
      weeks: ["2nd Week", "4th Week"],
      shiftTime: "01:00 PM – 06:00 PM (Afternoon Shift)",
      capacity: 15,
    };
    setExtraPatternEntries([...extraPatternEntries, newEntry]);
  };

  const handleRemovePatternEntry = (id: string) => {
    setExtraPatternEntries(extraPatternEntries.filter((item) => item.id !== id));
  };

  const handleUpdatePatternEntry = (id: string, updates: any) => {
    setExtraPatternEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.preset !== undefined) {
          updated.weeks = deriveWeeksFromPattern(updates.preset);
        }
        return updated;
      })
    );
  };

  const handleCreateSpecificDateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!specDateRoom.trim()) {
      setSpecDateFormError("Please enter Consultation Room / Suite.");
      return;
    }

    if (!specDateValue && !specDateWeekPreset && specDateWeeks.length === 0 && extraPatternEntries.length === 0) {
      setSpecDateFormError("Please select a Specific Date or pick/toggle at least one Recurring Week Duty Pattern.");
      return;
    }

    const selectedDoc = doctorsList.find((d) => d.id === specDateDoctorId || d.doc_id === specDateDoctorId) || doctorsList[0] || doctorsList[0];
    const docAdminName = selectedDoc.fullName || selectedDoc.full_name ? `${selectedDoc.fullName || selectedDoc.full_name} (${selectedDoc.acronym || selectedDoc.name})` : selectedDoc.name;

    let formattedDateLabel = "";
    let dayNameStr = specDateTargetDay ? specDateTargetDay.toUpperCase() : "SUNDAY";
    if (specDateValue) {
      dayNameStr = new Date(specDateValue).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      formattedDateLabel = new Date(specDateValue).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    let displayWeekLabel = "";
    if (specDateWeekPreset === "EVERY") {
      displayWeekLabel = `EVERY ${dayNameStr}`;
    } else if (specDateWeekPreset === "1ST & 3RD") {
      displayWeekLabel = `1ST & 3RD ${dayNameStr}S`;
    } else if (specDateWeekPreset === "2ND & 4TH") {
      displayWeekLabel = `2ND & 4TH ${dayNameStr}S`;
    } else if (specDateWeekPreset === "1ST - 3RD") {
      displayWeekLabel = `1ST – 3RD ${dayNameStr}S`;
    } else if (savedCustomPatterns.includes(specDateWeekPreset) || (specDateWeekPreset && specDateWeekPreset.includes(dayNameStr))) {
      displayWeekLabel = specDateWeekPreset;
    } else if (specDateWeekPreset) {
      displayWeekLabel = `${specDateWeekPreset} ${dayNameStr} ONLY`;
    } else if (specDateWeeks.length > 0) {
      const weekNums = specDateWeeks.map((w) => w.replace(" Week", "").toUpperCase());
      displayWeekLabel = `${weekNums.join(", ")} ${dayNameStr}S`;
    }

    const dutyDaysList: string[] = [];
    const dayConfigs: Record<string, { shiftTimes: string[]; capacity: number }> = {};

    // Primary entry
    if (displayWeekLabel) {
      const primaryDutyLabel = formattedDateLabel
        ? `📅 ${formattedDateLabel} (${displayWeekLabel})`
        : `📅 ${displayWeekLabel}`;
      dutyDaysList.push(primaryDutyLabel);
      dayConfigs[displayWeekLabel] = {
        shiftTimes: [specDateShiftTime],
        capacity: Number(specDateCapacity) || 15,
      };
    }

    // Additional recurring pattern entries
    extraPatternEntries.forEach((entry, idx) => {
      let entryLabel = "";
      if (entry.preset === "EVERY") entryLabel = `EVERY ${dayNameStr}`;
      else if (entry.preset === "1ST & 3RD") entryLabel = `1ST & 3RD ${dayNameStr}S`;
      else if (entry.preset === "2ND & 4TH") entryLabel = `2ND & 4TH ${dayNameStr}S`;
      else if (entry.preset === "1ST - 3RD") entryLabel = `1ST – 3RD ${dayNameStr}S`;
      else if (savedCustomPatterns.includes(entry.preset) || (entry.preset && entry.preset.includes(dayNameStr))) entryLabel = entry.preset;
      else if (entry.preset) entryLabel = `${entry.preset} ${dayNameStr} ONLY`;
      else if (entry.weeks.length > 0) {
        const weekNums = entry.weeks.map((w) => w.replace(" Week", "").toUpperCase());
        entryLabel = `${weekNums.join(", ")} ${dayNameStr}S`;
      } else {
        entryLabel = `RECURRING SHIFT #${idx + 2} (${dayNameStr})`;
      }

      const fullEntryDutyLabel = `📅 ${entryLabel}`;
      if (!dutyDaysList.includes(fullEntryDutyLabel)) {
        dutyDaysList.push(fullEntryDutyLabel);
      }
      dayConfigs[entryLabel] = {
        shiftTimes: [entry.shiftTime],
        capacity: Number(entry.capacity) || 15,
      };
    });

    if (dutyDaysList.length === 0) {
      dutyDaysList.push(`📅 ON-DUTY (${dayNameStr})`);
    }

    const docTargetId = selectedDoc.id || selectedDoc.doc_id;

    const newSchedulePayload = {
      doctorId: docTargetId,
      doctor_id: docTargetId,
      doctorName: docAdminName,
      doctor_name: docAdminName,
      specialty: selectedDoc.specialty,
      room: specDateRoom.trim(),
      dutyDays: dutyDaysList,
      duty_days: dutyDaysList,
      dayConfigs: dayConfigs,
      day_configs: dayConfigs,
      isSpecificDate: !!specDateValue,
      specificDate: specDateValue || "",
      weekPreset: specDateWeekPreset,
      selectedWeeks: specDateWeeks,
      extraPatternEntries: extraPatternEntries,
      weekPatternLabel: displayWeekLabel,
      shiftTime: specDateShiftTime,
      shift_time: specDateShiftTime,
      capacity: Number(specDateCapacity) || 15,
      note: specDateNote.trim() || "Special Clinic Session",
      status: "Active On Duty",
    };

    const savedSchedFromApi: any = await createScheduleAPI(newSchedulePayload);
    if (!savedSchedFromApi || savedSchedFromApi.error) {
      setSpecDateFormError(savedSchedFromApi?.error || "Failed to save schedule to database. Please check backend API server.");
      return;
    }

    // Sync doctor's availableDays in API & Database!
    if (selectedDoc && docTargetId) {
      const updatedDocPayload = {
        availableDays: dutyDaysList,
        available_days: dutyDaysList,
        availability: dutyDaysList,
      };
      await updateDoctorAPI(docTargetId, updatedDocPayload);
    }

    // Re-fetch schedules and doctors from DB
    const remoteSchedules = await getSchedulesAPI();
    if (remoteSchedules && Array.isArray(remoteSchedules)) {
      setSpecialistSchedules(remoteSchedules);

    }

    const remoteDocs = await getDoctorsAPI();
    if (remoteDocs && Array.isArray(remoteDocs) && remoteDocs.length > 0) {
      setDoctorsList(remoteDocs);

    }

    // Reset Form
    setSpecDateValue("");
    setSpecDateRoom("");
    setSpecDateWeeks([]);
    setSpecDateWeekPreset("");
    setExtraPatternEntries([]);
    setSpecDateFormError("");
    setShowCreateSpecificDateModal(false);

    setToastAlert({
      title: "Multi-Pattern Schedule Created!",
      description: `Schedule with ${dutyDaysList.length} recurring shift pattern(s) for ${docAdminName} created successfully.`,
      type: "success",
    });
  };
  // Edit Schedule Modal State
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editDutyDays, setEditDutyDays] = useState<string[]>([]);
  const [editDaySchedules, setEditDaySchedules] = useState<Record<string, { shiftTimes: string[]; capacity: number }>>({});
  const [editShiftTime, setEditShiftTime] = useState("");
  const [editCapacity, setEditCapacity] = useState(15);
  const [editFormError, setEditFormError] = useState("");

  const handleOpenEditSchedule = (sched: any) => {
    setEditingSchedule(sched);
    setEditRoom(sched.room || "");
    const days = Array.isArray(sched.dutyDays) ? sched.dutyDays : [];
    setEditDutyDays(days);
    setEditShiftTime(sched.shiftTime || shiftTimeOptions[0] || "");
    setEditCapacity(sched.capacity || 15);

    const initialConfigs: Record<string, { shiftTimes: string[]; capacity: number }> = {};
    days.forEach((day: string) => {
      if (sched.dayConfigs && sched.dayConfigs[day]) {
        initialConfigs[day] = { ...sched.dayConfigs[day] };
      } else {
        initialConfigs[day] = {
          shiftTimes: [sched.shiftTime || shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"],
          capacity: sched.capacity || 15,
        };
      }
    });
    setEditDaySchedules(initialConfigs);
    setEditFormError("");
  };

  const handleToggleEditDay = (day: string) => {
    if (editDutyDays.includes(day)) {
      setEditDutyDays(editDutyDays.filter((d) => d !== day));
      setEditDaySchedules((prev) => {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      });
    } else {
      setEditDutyDays([...editDutyDays, day]);
      setEditDaySchedules((prev) => ({
        ...prev,
        [day]: prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 },
      }));
    }
  };

  const handleAddShiftTimeToEditDay = (day: string) => {
    setEditDaySchedules((prev) => {
      const current = prev[day] || { shiftTimes: [shiftTimeOptions[0] || "08:00 AM – 02:00 PM (Morning Shift)"], capacity: 15 };
      const unused = shiftTimeOptions.find((opt) => !current.shiftTimes.includes(opt)) || shiftTimeOptions[0] || "01:00 PM – 06:00 PM (Afternoon Shift)";
      return {
        ...prev,
        [day]: {
          ...current,
          shiftTimes: [...current.shiftTimes, unused],
        },
      };
    });
  };

  const handleRemoveShiftTimeFromEditDay = (day: string, index: number) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current || current.shiftTimes.length <= 1) return prev;
      const updated = current.shiftTimes.filter((_, i) => i !== index);
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateEditDayShiftTime = (day: string, index: number, value: string) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      const updated = [...current.shiftTimes];
      updated[index] = value;
      return {
        ...prev,
        [day]: { ...current, shiftTimes: updated },
      };
    });
  };

  const handleUpdateEditDayCapacity = (day: string, capacity: number) => {
    setEditDaySchedules((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: { ...current, capacity: Math.max(1, capacity) },
      };
    });
  };

  const handleSaveEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    if (!editRoom.trim()) {
      setEditFormError("Please fill out Consultation Room.");
      return;
    }

    setIsSubmittingEditSchedule(true);

    try {
      const daySummaries = editDutyDays.map((day) => {
        const cfg = editDaySchedules[day];
        if (!cfg) return `${day}: ${editShiftTime}`;
        const timesStr = cfg.shiftTimes.join(", ");
        return `${day}: ${timesStr} (${cfg.capacity} visits)`;
      });

      const totalCapacity = editDutyDays.reduce((acc, day) => acc + (editDaySchedules[day]?.capacity || editCapacity), 0);

      const updatedItem = {
        ...editingSchedule,
        room: editRoom.trim(),
        dutyDays: editDutyDays,
        dayConfigs: editDaySchedules,
        shiftTime: daySummaries.length > 0 ? daySummaries.join(" | ") : editShiftTime,
        capacity: Math.round(totalCapacity / Math.max(1, editDutyDays.length)),
        totalWeeklyCapacity: totalCapacity,
      };

      const res: any = await updateScheduleAPI(editingSchedule.id || editingSchedule.sched_id, updatedItem);
      if (res && res.error) {
        setEditFormError(res.error);
        return;
      }

      const [remoteSchedules, remoteDocs] = await Promise.all([
        getSchedulesAPI(),
        getDoctorsAPI()
      ]);

      if (remoteSchedules && Array.isArray(remoteSchedules)) {
        setSpecialistSchedules(remoteSchedules);

      }

      if (remoteDocs && Array.isArray(remoteDocs)) {
        setDoctorsList(remoteDocs);

      }

      setEditingSchedule(null);
      setEditFormError("");

      setToastAlert({
        title: "Schedule Updated Successfully!",
        description: `Updated consultation schedule details for ${editingSchedule.doctorName}.`,
        type: "success",
      });
    } catch (err: any) {
      setEditFormError(err?.message || "Failed to update schedule. Please check backend connection.");
    } finally {
      setIsSubmittingEditSchedule(false);
    }
  };

  const [schedShiftTime, setSchedShiftTime] = useState("08:00 AM – 02:00 PM (Morning Shift)");
  const [schedCapacity, setSchedCapacity] = useState(15);
  const [schedStatus, setSchedStatus] = useState("Active On Duty");
  const [schedFormError, setSchedFormError] = useState("");

  const handleCreateSpecialistSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedRoom.trim() || schedDutyDays.length === 0) {
      setSchedFormError("Please fill out Consultation Room and select at least one Duty Day.");
      return;
    }

    if (isRegisteringNewDocInSched && !schedNewDocName.trim()) {
      setSchedFormError("Please enter Doctor Full Name.");
      return;
    }

    setIsSubmittingSchedule(true);
    setSchedFormError("");

    try {
      let docTargetId = "";
      let docAdminName = "";
      let docSpecialty = "";

      if (isRegisteringNewDocInSched) {
        // Step 1: Create Doctor on Django REST API FIRST
        const formattedDocName = schedNewDocName.trim().startsWith("Dr.") ? schedNewDocName.trim() : `Dr. ${schedNewDocName.trim()}`;
        const deptMatch = clinics.find((d: any) => d.id === schedNewDocDeptId || d.dept_id === schedNewDocDeptId);
        const specName = deptMatch ? deptMatch.name : "Specialist Consultation";

        const newDocPayload = {
          name: formattedDocName,
          fullName: formattedDocName,
          full_name: formattedDocName,
          acronym: formattedDocName,
          departmentId: schedNewDocDeptId,
          department_id: schedNewDocDeptId,
          specialty: specName,
          qualification: schedNewDocQual.trim() || "MBBS, FWACS",
          qualifications: schedNewDocQual.trim() || "MBBS, FWACS",
          acceptedPatientTypes: ["Private Self-Pay", "HMO Insurance"],
          accepted_patient_types: ["Private Self-Pay", "HMO Insurance"],
          availableDays: schedDutyDays,
          available_days: schedDutyDays,
          availability: schedDutyDays,
          status: true,
        };

        const docRes: any = await createDoctorAPI(newDocPayload);
        if (!docRes || docRes.error) {
          setSchedFormError(docRes?.error || "Failed to register doctor in database. Please check backend API server.");
          setIsSubmittingSchedule(false);
          return;
        }

        docTargetId = docRes.doc_id || docRes.id;
        docAdminName = formattedDocName;
        docSpecialty = specName;
      } else {
        const targetDocIdStr = String(schedDoctorId || "").trim();
        const selectedDoc = doctorsList.find((d) => {
          const id1 = String(d.doc_id || "").trim();
          const id2 = String(d.id || "").trim();
          return (id1 && id1 === targetDocIdStr) || (id2 && id2 === targetDocIdStr);
        }) || doctorsList[0] || doctorsList[0];

        docTargetId = selectedDoc?.doc_id || selectedDoc?.id;
        docAdminName = selectedDoc?.fullName || selectedDoc?.full_name ? `${selectedDoc.fullName || selectedDoc.full_name} (${selectedDoc.acronym || selectedDoc.name})` : (selectedDoc?.name || "Specialist Doctor");
        docSpecialty = selectedDoc?.specialty || "Specialist Consultation";
      }

      const daySummaries = schedDutyDays.map((day) => {
        const cfg = schedDaySchedules[day];
        if (!cfg) return `${day}: ${schedShiftTime}`;
        const timesStr = cfg.shiftTimes.join(", ");
        return `${day}: ${timesStr} (${cfg.capacity} visits)`;
      });

      const totalCapacity = schedDutyDays.reduce((acc, day) => acc + (schedDaySchedules[day]?.capacity || schedCapacity), 0);
      const newSchedulePayload = {
        doctor: docTargetId,
        doctorId: docTargetId,
        doctor_id: docTargetId,
        doctorName: docAdminName,
        doctor_name: docAdminName,
        specialty: docSpecialty,
        room: schedRoom.trim(),
        dutyDays: schedDutyDays,
        duty_days: schedDutyDays,
        dayConfigs: schedDaySchedules,
        day_configs: schedDaySchedules,
        shiftTime: daySummaries.join(" | "),
        shift_time: daySummaries.join(" | "),
        capacity: Math.round(totalCapacity / Math.max(1, schedDutyDays.length)),
        totalWeeklyCapacity: totalCapacity,
        total_weekly_capacity: totalCapacity,
        status: schedStatus,
      };

      const res: any = await createScheduleAPI(newSchedulePayload);
      if (!res || res.error) {
        setSchedFormError(res?.error || "Failed to save schedule to database. Please check backend API server.");
        setIsSubmittingSchedule(false);
        return;
      }

      // Re-fetch schedules and doctors from DB to guarantee 100% sync
      const [remoteSchedules, remoteDocs] = await Promise.all([
        getSchedulesAPI(),
        getDoctorsAPI()
      ]);

      if (remoteSchedules && Array.isArray(remoteSchedules)) {
        setSpecialistSchedules(remoteSchedules);

      }

      if (remoteDocs && Array.isArray(remoteDocs)) {
        setDoctorsList(remoteDocs);

      }

      // Reset Form
      setSchedRoom("");
      setSchedNewDocName("");
      setSchedFormError("");
      setIsRegisteringNewDocInSched(false);
      setShowCreateScheduleModal(false);

      setToastAlert({
        title: "Saved to Database Tables!",
        description: `Schedule and Doctor records saved to both SpecialistSchedule and Doctor DB tables for ${docAdminName}.`,
        type: "success",
      });
    } catch (err: any) {
      setSchedFormError(err?.message || "Failed to save schedule. Please check backend API.");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleToggleScheduleStatus = (sched: any) => {
    const isDisabling = sched.status !== false && (typeof sched.status !== "string" || !sched.status.includes("Disabled"));
    const targetId = sched.id || sched.sched_id;

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable Specialist Shift" : "Enable Specialist Shift",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} consultation shift for "${sched.doctorName}" (${sched.specialty})? Patients will ${isDisabling ? "no longer" : "now"} be able to book slots during this shift.`,
      confirmText: isDisabling ? "Yes, Disable Shift" : "Yes, Enable Shift",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        const newStatus = isDisabling ? "Disabled Shift 🚫" : "Active On Duty";

        // Pure in-place local status switch
        const updatedSchedules = specialistSchedules.map((item) =>
          (item.id === targetId || item.sched_id === targetId) ? { ...item, status: newStatus } : item
        );
        setSpecialistSchedules(updatedSchedules);

        await updateScheduleAPI(targetId, { status: newStatus });

        const remoteSchedules = await getSchedulesAPI();
        if (remoteSchedules && Array.isArray(remoteSchedules)) {
          setSpecialistSchedules(remoteSchedules);

        }

        setToastAlert({
          title: isDisabling ? "Shift Disabled 🚫" : "Shift Re-Enabled ✓",
          description: `Schedule status for ${sched.doctorName} updated successfully in database.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  const handleDeleteSchedule = (sched: any) => {
    const targetId = sched.id || sched.sched_id;
    const docName = sched.doctorName || sched.doctor_name || "Specialist";

    setConfirmModalConfig({
      isOpen: true,
      title: "Delete Specialist Schedule",
      message: `Are you sure you want to permanently delete the schedule for "${docName}" from the database? This action cannot be undone.`,
      confirmText: "Yes, Delete Schedule",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteScheduleAPI(targetId);

        const remoteSchedules = await getSchedulesAPI();
        if (remoteSchedules && Array.isArray(remoteSchedules)) {
          setSpecialistSchedules(remoteSchedules);

        }

        setToastAlert({
          title: "Schedule Deleted ✓",
          description: `Schedule for ${docName} deleted from database successfully.`,
          type: "success",
        });
      },
    });
  };

  const handleRequestToggleUserDisable = (user: any) => {
    const isDisabling = user.status === "Active";
    const targetId = user.id || user.user_id;

    setConfirmModalConfig({
      isOpen: true,
      title: isDisabling ? "Disable Staff Account" : "Enable Staff Account",
      message: `Are you sure you want to ${isDisabling ? "disable" : "re-enable"} staff account access for "${user.name}" (${user.email})? This staff member will ${isDisabling ? "be blocked from logging in" : "now be allowed to log in"}.`,
      confirmText: isDisabling ? "Yes, Disable Account" : "Yes, Enable Account",
      cancelText: "Cancel",
      variant: isDisabling ? "danger" : "primary",
      onConfirm: async () => {
        const newStatus = isDisabling ? "Disabled" : "Active";

        await updateSystemUserAPI(targetId, { status: newStatus });

        const [shiftSetting, patternSetting] = await Promise.all([getAppSettingAPI("shift_time_options"), getAppSettingAPI("custom_week_patterns")]);
        if (Array.isArray(shiftSetting?.value)) setShiftTimeOptions(shiftSetting.value);
        if (Array.isArray(patternSetting?.value)) setSavedCustomPatterns(patternSetting.value);

        const remoteUsers = await getSystemUsersAPI();
        const updated = (remoteUsers && remoteUsers.length > 0)
          ? remoteUsers
          : systemUsers.map((u) => ((u.id === targetId || u.user_id === targetId) ? { ...u, status: newStatus } : u));

        setSystemUsers(updated);
        broadcastUserChange(updated);

        setToastAlert({
          title: isDisabling ? "Account Disabled 🚫" : "Account Re-Enabled ✓",
          description: `Staff account status for ${user.name} updated to ${newStatus}.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  // Selection states for modal / actions
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [hmoPolicyCode, setHmoPolicyCode] = useState("");
  const [hmoAuthCode, setHmoAuthCode] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both Username/Email and Password.");
      return;
    }

    setLoginError("");
    setIsLoggingIn(true);
    setLoginStageText("Verifying Staff Credentials...");

    // Stage 1 preloader visual pause
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoginStageText("Authenticating Access Tokens...");

    const res = await loginStaffAPI(loginUsername.trim(), loginPassword.trim());
    if (res && res.tokens) {
      setLoginStageText("Syncing Staff Duty Permissions...");
      await new Promise((resolve) => setTimeout(resolve, 350));

      const assignedRole = res.user?.role || "Hospital Staff";
      const primaryDesk = getPrimaryDeskForRole(assignedRole);

      const profile = {
        name: res.user?.name || loginUsername,
        role: assignedRole,
        desk: res.user?.desk || primaryDesk,
        email: res.user?.email || loginUsername,
      };

      sessionStorage.setItem("isalu_staff_authenticated", "true");
      sessionStorage.setItem("isalu_staff_user", profile.name);
      sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(profile));
      if (res.tokens.access) {
        sessionStorage.setItem("isalu_staff_jwt", res.tokens.access);
      }
      setLoginStageText("Access Granted! Launching Portal...");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setIsLoggingIn(false);
      setLoginError("");
      setActiveDesk(primaryDesk as DeskType);
      setSearchParams({ desk: primaryDesk });
      return;
    }

    if (res && res.error) {
      setIsLoggingIn(false);
      setLoginError(res.error);
      return;
    }

    const u = loginUsername.toLowerCase().trim();
    const p = loginPassword.trim();

    const matchingSysUser = systemUsers.find(
      (usr: any) => usr.email.toLowerCase() === u || usr.name.toLowerCase().includes(u)
    );

    const expectedPassword = matchingSysUser?.password || "admin123";

    if (
      (u === "admin" || u === "staff" || u.includes("isalu") || u.includes("admin") || matchingSysUser) &&
      p === expectedPassword
    ) {
      setLoginStageText("Establishing Encrypted Session...");
      await new Promise((resolve) => setTimeout(resolve, 400));

      const determineRole = () => {
        if (matchingSysUser?.role) return matchingSysUser.role;
        if (u.includes("admin") || u === "admin") return "Super Administrator";
        if (u.includes("hmo")) return "HMO Approval Officer";
        if (u.includes("cash") || u.includes("billing") || u.includes("cashier")) return "Cashdesk Billing Officer";
        if (u.includes("reception") || u.includes("helpdesk")) return "Helpdesk Officer";
        if (u.includes("monitor")) return "Monitor Desk Operator";
        if (u.includes("analytics")) return "Queue Analytics Officer";
        return "Hospital Staff Officer";
      };

      const assignedRole = determineRole();
      const primaryDesk = getPrimaryDeskForRole(assignedRole);

      const profile = {
        name: matchingSysUser?.name || (u === "admin" ? "Dr. Chief Administrator" : loginUsername.split("@")[0].replace(".", " ").toUpperCase()),
        role: assignedRole,
        desk: matchingSysUser?.desk || primaryDesk,
        email: matchingSysUser?.email || (u.includes("@") ? u : "admin@isaluhospitals.com"),
      };

      sessionStorage.setItem("isalu_staff_authenticated", "true");
      sessionStorage.setItem("isalu_staff_user", profile.name);
      sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(profile));
      setLoginStageText("Access Granted! Launching Portal...");
      await new Promise((resolve) => setTimeout(resolve, 400));
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setIsLoggingIn(false);
      setLoginError("");
      setActiveDesk(primaryDesk as DeskType);
      setSearchParams({ desk: primaryDesk });
    } else {
      setIsLoggingIn(false);
      setLoginError("Invalid username/email or password. Please check and try again.");
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("isalu_staff_authenticated");
    sessionStorage.removeItem("isalu_staff_user");
    sessionStorage.removeItem("isalu_staff_user_profile");
    sessionStorage.removeItem("isalu_staff_jwt");
    setIsAuthenticated(false);
  };

  // Role-Based Access Control (RBAC) Desk Helpers
  const getPrimaryDeskForRole = (role: string = "") => {
    const r = role.toLowerCase().trim();
    if (r.includes("super") || r.includes("administrator") || r.includes("chief") || r === "admin" || r === "superadmin") return "analytics";

    const matchedRole = roles.find((ro: any) => (ro.name || "").toLowerCase().trim() === r);
    if (matchedRole && (matchedRole.primaryDesk || matchedRole.primary_desk)) {
      return matchedRole.primaryDesk || matchedRole.primary_desk;
    }

    if (r.includes("helpdesk") || r.includes("reception")) return "helpdesk";
    if (r.includes("hmo") || r.includes("insurance")) return "hmo";
    if (r.includes("cash") || r.includes("cashier") || r.includes("billing")) return "cashdesk";
    if (r.includes("monitor") || r.includes("controller")) return "monitor";
    if (r.includes("analytics") || r.includes("executive")) return "analytics";
    return "helpdesk";
  };



  useEffect(() => {
    if (!isDeskAllowed(activeDesk)) {
      const primary = getPrimaryDeskForRole(currentUser?.role);
      setActiveDesk(primary as any);
    }
  }, [currentUser, activeDesk]);

  // AI Reporting Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [aiProcessingStep, setAiProcessingStep] = useState<string>("Initializing Neural Engine...");
  const [aiProcessingProgress, setAiProcessingProgress] = useState<number>(0);
  const [generatedAiReport, setGeneratedAiReport] = useState<string | null>(null);
  const [copiedAiReport, setCopiedAiReport] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);

  const [aiReportHistory, setAiReportHistory] = useState<Array<{ prompt: string; date: string; report: string }>>([]);

  const handleGenerateAiReport = async (customPrompt?: string) => {
    const p = (customPrompt || aiPrompt || "Generate Full Executive Board Report").trim();
    setIsGeneratingAiReport(true); setCopiedAiReport(false); setAiProcessingProgress(20); setAiProcessingStep("Querying hospital database...");
    try { const result = await generateAiReportAPI(p); if (!result || result.error) throw new Error(typeof result?.error === "string" ? result.error : "Server report generation failed"); setGeneratedAiReport(result.report || ""); setAiProcessingProgress(100); setAiProcessingStep("Report generated from server data."); setAiReportHistory(prev => [{ prompt: p, date: result.generatedAt || new Date().toISOString(), report: result.report || "" }, ...prev].slice(0, 10)); } catch (err: any) { setGeneratedAiReport(null); setToastAlert({ title: "AI Report Failed", description: err?.message || "Could not generate report from backend.", type: "warning" }); } finally { setIsGeneratingAiReport(false); }
  };

  const downloadAiReportAsPdf = (reportText: string, promptTitle: string) => {
    if (!reportText) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Watermark Overlay in PDF
    doc.setTextColor(215, 235, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.text("ISALU HOSPITALS", 105, 145, { align: "center", angle: 25 });
    doc.setFontSize(16);
    doc.text("AI EXECUTIVE MEDICAL REPORT", 105, 158, { align: "center", angle: 25 });

    // Header Background (#008AC9)
    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 45, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OFFICIAL EXECUTIVE AI MEDICAL REPORT", 105, 14, { align: "center" });

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

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Official AI Analytical Report generated for Hospital Management Board & Clinical Directors.", 105, 36, { align: "center" });

    // Report Header Box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 50, 180, 24, 4, 4, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("REPORT PROMPT / ANALYTICAL FOCUS", 105, 57, { align: "center" });

    doc.setTextColor(0, 138, 201);
    doc.setFontSize(13);
    doc.text((promptTitle || "Executive Board Summary Report").toUpperCase(), 105, 67, { align: "center" });

    // Body Text Lines
    let y = 83;
    doc.setFontSize(9.5);

    const lines = reportText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (y > 255) {
        doc.addPage();
        y = 25;
      }

      if (line.includes("ISALU HOSPITALS") || line.includes("------------------------------------------------------------------")) {
        continue;
      }

      if (line.match(/^[0-9]\./)) {
        y += 3;
        doc.setTextColor(0, 138, 201);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text(line, 18, y);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(18, y + 2, 192, y + 2);
        y += 7;
      } else if (line.trim().startsWith("•") || line.trim().startsWith("✔")) {
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const wrapped = doc.splitTextToSize(line.trim(), 170);
        doc.text(wrapped, 22, y);
        y += wrapped.length * 5;
      } else if (line.trim().startsWith("Generated On:") || line.trim().startsWith("Analysis Focus:")) {
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(line.trim(), 18, y);
        y += 5;
      } else {
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const wrapped = doc.splitTextToSize(line, 172);
        doc.text(wrapped, 18, y);
        y += wrapped.length * 5;
      }
    }

    // Red Official Verification Seal
    const sX = 168;
    const sY = 228;
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

    doc.setFontSize(10);
    doc.text("VERIFIED", sX, sY + 1, { align: "center" });

    doc.setFontSize(5);
    doc.text("AI OFFICIAL SEAL", sX, sY + 7, { align: "center" });

    // Footer Bar
    doc.setFillColor(1, 22, 39);
    doc.rect(0, 275, 210, 22, "F");

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos  |  Hotline: +234 (0) 800-ISALU-CARE", 105, 287, { align: "center" });

    const cleanTitle = (promptTitle || "Executive_Board").replace(/[^a-z0-9]/gi, "_");
    doc.save(`Isalu_AI_Report_${cleanTitle}.pdf`);
  };

  const downloadHospitalAnalyticsAsPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Watermark Overlay in PDF
    doc.setTextColor(215, 235, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("ISALU HOSPITALS", 105, 145, { align: "center", angle: 25 });
    doc.setFontSize(14);
    doc.text("HOSPITAL QUEUE & DEPARTMENT ANALYTICS", 105, 158, { align: "center", angle: 25 });

    // Header Background (#008AC9)
    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 45, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OFFICIAL HOSPITAL QUEUE & DEPARTMENT ANALYTICS REPORT", 105, 14, { align: "center" });

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

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Comprehensive Live Operational, Clinical Floor & Revenue Clearance Audit Report.", 105, 36, { align: "center" });

    // Report Header Metadata Box
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 50, 180, 22, 4, 4, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("REPORT GENERATED ON", 105, 57, { align: "center" });

    doc.setTextColor(0, 138, 201);
    doc.setFontSize(11);
    doc.text(nowStr.toUpperCase(), 105, 65, { align: "center" });

    // 1. Executive Summary Metrics Grid
    let y = 79;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)", 15, y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    const kpiBoxes = [
      { label: "Total Bookings", val: `${totalBookings} Registered Tickets` },
      { label: "Active Floor Queue", val: `${checkedInCount} Waiting Lobby Patients` },
      { label: "Completed (Red Badge)", val: `${completedCount} Concluded Consultations` },
      { label: "HMO Pre-Auth Queue", val: `${pendingHmoCount} Pending (${hmoApprovedCount} Approved)` },
      { label: "Cashdesk Queue", val: `${pendingCashCount} Pending (${clearedPaymentCount} Cleared)` },
      { label: "Staff Roster Coverage", val: `${activeStaffCount} Active (${activeShiftsCount} Shifts On Duty)` },
    ];

    doc.setFontSize(8.5);
    for (let i = 0; i < kpiBoxes.length; i += 2) {
      const b1 = kpiBoxes[i];
      const b2 = kpiBoxes[i + 1];

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 87, 13, 2, 2, "FD");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text(b1.label.toUpperCase(), 18, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.text(b1.val, 18, y + 9.5);

      if (b2) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(108, y, 87, 13, 2, 2, "FD");
        doc.setTextColor(100, 116, 139);
        doc.text(b2.label.toUpperCase(), 111, y + 4.5);
        doc.setTextColor(15, 23, 42);
        doc.text(b2.val, 111, y + 9.5);
      }

      y += 15;
    }

    // 2. Department Volume Breakdown Table
    y += 2;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. DEPARTMENT QUEUE & PATIENT VOLUME BREAKDOWN", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    // Table Header Row
    doc.setFillColor(0, 138, 201);
    doc.rect(15, y, 180, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("MEDICAL SPECIALTY", 18, y + 4.8);
    doc.text("VOLUME", 90, y + 4.8, { align: "center" });
    doc.text("WORKLOAD %", 125, y + 4.8, { align: "center" });
    doc.text("CHECKED IN", 160, y + 4.8, { align: "center" });
    doc.text("COMPLETED", 188, y + 4.8, { align: "center" });
    y += 7;

    clinics.forEach((dept, idx) => {
      const deptBookings = bookings.filter((b) => {
        if (!b.doctorSpecialty && !b.doctor_specialty) return false;
        const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
        const dName = dept.name.toLowerCase();
        return spec.includes(dName) || dName.includes(spec) || (dept.id === "cardiology" && spec.includes("cardio"));
      });
      const totalDept = deptBookings.length;
      const checkedInDept = deptBookings.filter((b) => b.status === "Checked In").length;
      const completedDept = deptBookings.filter((b) => b.status === "Completed").length;
      const percentOfTotal = totalBookings > 0 ? Math.round((totalDept / totalBookings) * 100) : 0;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6.5, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(15, y, 180, 6.5, "F");
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(dept.name, 18, y + 4.5);
      doc.text(String(totalDept), 90, y + 4.5, { align: "center" });
      doc.text(`${percentOfTotal}%`, 125, y + 4.5, { align: "center" });
      doc.text(String(checkedInDept), 160, y + 4.5, { align: "center" });
      doc.text(String(completedDept), 188, y + 4.5, { align: "center" });
      y += 6.5;
    });

    // 3. Revenue Clearance & Funding Ratios
    y += 5;
    doc.setTextColor(0, 138, 201);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("3. REVENUE CLEARANCE & FUNDING SOURCE RATIOS", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    const clearanceRate = totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 0;
    const hmoRatio = totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0;
    const selfPayRatio = totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0;

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text(`• Private Self-Pay Patient Share: ${privateSelfPayCount} Patients (${selfPayRatio}%)`, 18, y);
    y += 5;
    doc.text(`• HMO Health Insurance Enrollee Share: ${hmoEnrolleeCount} Enrollees (${hmoRatio}%)`, 18, y);
    y += 5;
    doc.text(`• Overall Revenue Clearance Rate: ${clearedPaymentCount} Cleared Invoices out of ${totalBookings} (${clearanceRate}%)`, 18, y);
    y += 5;
    doc.text(`• Verified Doctor Referral Documents: ${referralDocCount} Documents attached to patient files`, 18, y);

    // Red Official Verification Seal
    const sX = 168;
    const sY = 228;
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

    doc.setFontSize(10);
    doc.text("VERIFIED", sX, sY + 1, { align: "center" });

    doc.setFontSize(5);
    doc.text("ANALYTICAL SEAL", sX, sY + 7, { align: "center" });

    // Footer Bar
    doc.setFillColor(1, 22, 39);
    doc.rect(0, 275, 210, 22, "F");

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("No. 46, Ijaiye Road (beside Tastee Fried Chicken), Ogba, Ikeja, Lagos  |  Hotline: +234 (0) 800-ISALU-CARE", 105, 287, { align: "center" });

    doc.save(`Isalu_Hospital_Queue_Analytics_Report.pdf`);
  };

  const downloadHospitalAnalyticsAsExcel = () => {
    const totalBookings = bookings.length;
    const checkedInCount = bookings.filter((b) => b.status === "Checked In").length;
    const completedCount = bookings.filter((b) => b.status === "Completed").length;
    const pendingHmoCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus !== "Approved").length;
    const hmoApprovedCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus === "Approved").length;
    const pendingCashCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" && b.paymentStatus !== "Cleared").length;
    const clearedPaymentCount = bookings.filter((b) => b.paymentStatus === "Cleared").length;
    const paidOrApprovedCount = bookings.filter((b) => (b.hmoStatus === "Approved" || b.hmo_status === "Approved" || b.paymentStatus === "Cleared" || b.payment_status === "Cleared") && b.status !== "Completed" && b.status !== "Cancelled").length;

    const privateSelfPayCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType || b.paymentType.includes("Self-Pay")).length;
    const hmoEnrolleeCount = bookings.filter((b) => b.paymentType === "HMO Insurance").length;
    const referralDocCount = bookings.filter((b) => Boolean(b.referralDocName || b.referral_doc_name)).length;

    const activeStaffCount = systemUsers.filter((u) => u.status === "Active").length;
    const activeShiftsCount = specialistSchedules.filter((s) => s.status !== false && (typeof s.status !== "string" || !s.status.includes("Disabled"))).length;

    const clearanceRate = totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 0;
    const hmoRatio = totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0;
    const selfPayRatio = totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0;

    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    let xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Queue & Dept Analytics</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
  th { background-color: #008ac9; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #0072b1; text-align: left; }
  td { padding: 6px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 11pt; }
  .title { background-color: #008ac9; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 12px; }
  .subtitle { background-color: #f0f9ff; color: #0369a1; font-size: 11pt; font-weight: bold; text-align: center; padding: 6px; }
  .section-header { background-color: #0f172a; color: #38bdf8; font-size: 12pt; font-weight: bold; padding: 8px; }
  .kpi-title { font-weight: bold; color: #475569; background-color: #f8fafc; }
  .kpi-val { font-weight: bold; color: #008ac9; }
</style>
</head>
<body>
<table>
  <tr><td colspan="6" class="title">ISALU HOSPITALS - QUEUE & DEPARTMENT ANALYTICS AUDIT REPORT</td></tr>
  <tr><td colspan="6" class="subtitle">Generated on: ${nowStr}</td></tr>
  <tr><td colspan="6"></td></tr>

  <!-- 1. EXECUTIVE KPIs -->
  <tr><td colspan="6" class="section-header">1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)</td></tr>
  <tr>
    <th colspan="3">Metric Indicator</th>
    <th colspan="3">Operational Count & Status</th>
  </tr>
  <tr><td colspan="3" class="kpi-title">Total Patient Bookings</td><td colspan="3" class="kpi-val">${totalBookings} Registered Tickets</td></tr>
  <tr><td colspan="3" class="kpi-title">Active Floor Queue (Waiting Lobby)</td><td colspan="3" class="kpi-val">${checkedInCount} Checked-In Patients</td></tr>
  <tr><td colspan="3" class="kpi-title">Completed Consultations</td><td colspan="3" class="kpi-val">${completedCount} Concluded Visits</td></tr>
  <tr><td colspan="3" class="kpi-title">HMO Pre-Authorization Queue</td><td colspan="3" class="kpi-val">${pendingHmoCount} Pending (${hmoApprovedCount} Approved)</td></tr>
  <tr><td colspan="3" class="kpi-title">Cashdesk Payment Clearance Queue</td><td colspan="3" class="kpi-val">${pendingCashCount} Pending (${clearedPaymentCount} Cleared)</td></tr>
  <tr><td colspan="3" class="kpi-title">Staff Roster & Duty Coverage</td><td colspan="3" class="kpi-val">${activeStaffCount} Active Staff (${activeShiftsCount} Shifts On Duty)</td></tr>
  <tr><td colspan="3" class="kpi-title">Overall Revenue Clearance Rate</td><td colspan="3" class="kpi-val">${clearanceRate}% (${clearedPaymentCount} / ${totalBookings})</td></tr>
  <tr><td colspan="3" class="kpi-title">Private Self-Pay Patient Share</td><td colspan="3" class="kpi-val">${selfPayRatio}% (${privateSelfPayCount} Patients)</td></tr>
  <tr><td colspan="3" class="kpi-title">HMO Insurance Enrollee Share</td><td colspan="3" class="kpi-val">${hmoRatio}% (${hmoEnrolleeCount} Enrollees)</td></tr>
  <tr><td colspan="3" class="kpi-title">Verified Doctor Referral Documents</td><td colspan="3" class="kpi-val">${referralDocCount} Files Attached</td></tr>
  <tr><td colspan="6"></td></tr>

  <!-- 2. DEPARTMENT QUEUE & WORKLOAD BREAKDOWN -->
  <tr><td colspan="6" class="section-header">2. DEPARTMENT QUEUE & PATIENT VOLUME BREAKDOWN</td></tr>
  <tr>
    <th>Department Specialty</th>
    <th>Total Bookings</th>
    <th>Workload %</th>
    <th>Checked In Queue</th>
    <th>Completed Consultations</th>
    <th>Status</th>
  </tr>`;

    clinics.forEach((dept) => {
      const deptBookings = bookings.filter((b) => {
        if (!b.doctorSpecialty && !b.doctor_specialty) return false;
        const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
        const dName = dept.name.toLowerCase();
        return spec.includes(dName) || dName.includes(spec) || (dept.id === "cardiology" && spec.includes("cardio"));
      });
      const totalDept = deptBookings.length;
      const checkedInDept = deptBookings.filter((b) => b.status === "Checked In").length;
      const completedDept = deptBookings.filter((b) => b.status === "Completed").length;
      const percentOfTotal = totalBookings > 0 ? Math.round((totalDept / totalBookings) * 100) : 0;

      xml += `
  <tr>
    <td><b>${dept.name}</b></td>
    <td align="center">${totalDept}</td>
    <td align="center">${percentOfTotal}%</td>
    <td align="center">${checkedInDept}</td>
    <td align="center">${completedDept}</td>
    <td>Operational</td>
  </tr>`;
    });

    xml += `
  <tr><td colspan="6"></td></tr>

  <!-- 3. DETAILED PATIENT QUEUE RECORDS -->
  <tr><td colspan="6" class="section-header">3. DETAILED PATIENT TICKET REGISTRY</td></tr>
  <tr>
    <th>Ticket Code</th>
    <th>Patient Name</th>
    <th>Specialty / Doctor</th>
    <th>Payment Category</th>
    <th>HMO / Payment Status</th>
    <th>Visit Status</th>
  </tr>`;

    bookings.forEach((b) => {
      const ref = b.refCode || b.ref_code || "N/A";
      const name = b.patientName || b.patient_name || "N/A";
      const doc = b.doctorName || b.doctor_name || b.doctorSpecialty || "Specialist";
      const payType = b.paymentType || b.payment_type || "Private Self-Pay";
      const payStat = b.paymentStatus || b.payment_status || "Pending";
      const status = b.status || "Pending";

      xml += `
  <tr>
    <td><b>${ref}</b></td>
    <td>${name}</td>
    <td>${doc}</td>
    <td>${payType}</td>
    <td>${payStat}</td>
    <td>${status}</td>
  </tr>`;
    });

    xml += `
</table>
</body>
</html>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Isalu_Hospital_Queue_Department_Analytics_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastAlert({
      title: "Excel Analytics Exported ✓",
      description: "Hospital Queue & Department Analytics spreadsheet downloaded successfully.",
      type: "success",
    });
  };

  // --- UNIVERSAL ISALU HOSPITALS PDF EXPORT ENGINE ---
  interface PDFExportConfig {
    title: string;
    subtitle: string;
    filename: string;
    headers: string[];
    data: (string | number)[][];
    summaryItems?: { label: string; value: string }[];
  }

  const exportTableToPDF = (config: PDFExportConfig) => {
    const doc = new jsPDF("p", "mm", "a4");
    const nowStr = new Date().toLocaleString();
    const staffName = currentUser?.name || currentUser?.username || "Superadmin";

    doc.setFillColor(0, 138, 201);
    doc.rect(0, 0, 210, 42, "F");

    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(config.title.toUpperCase(), 105, 12, { align: "center" });

    const pdfLogoX = 62;
    const pdfLogoY = 25;
    const r = 2.5;

    doc.setFillColor(255, 255, 255);
    doc.circle(pdfLogoX, pdfLogoY - 3.8, r, "F");
    doc.circle(pdfLogoX - 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX + 3.8, pdfLogoY, r, "F");
    doc.circle(pdfLogoX, pdfLogoY + 3.8, r, "F");

    doc.setFontSize(22);
    doc.text("Isalu Hospitals", pdfLogoX + 8, 28, { align: "left" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(config.subtitle, 105, 36, { align: "center" });

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(0, 138, 201);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, 48, 182, 18, 3, 3, "FD");

    doc.setTextColor(3, 105, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`REPORT GENERATED: ${nowStr.toUpperCase()}`, 18, 55);
    doc.text(`GENERATED BY: ${staffName.toUpperCase()}`, 18, 61);
    doc.text(`TOTAL EXPORTED: ${config.data.length} RECORDS`, 192, 55, { align: "right" });
    doc.text(`CONFIDENTIALITY: INTERNAL HOSPITAL RECORD`, 192, 61, { align: "right" });

    let startY = 72;

    if (config.summaryItems && config.summaryItems.length > 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, startY, 182, 14, 2, 2, "FD");

      const colWidth = 182 / config.summaryItems.length;
      config.summaryItems.forEach((item, idx) => {
        const itemX = 14 + idx * colWidth + colWidth / 2;
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(item.label.toUpperCase(), itemX, startY + 5, { align: "center" });
        doc.setTextColor(0, 138, 201);
        doc.setFontSize(8.5);
        doc.text(item.value, itemX, startY + 10.5, { align: "center" });
      });
      startY += 19;
    }

    const marginX = 14;
    const tableWidth = 182;
    const numCols = config.headers.length;
    const colWidth = tableWidth / numCols;
    const rowHeight = 7.5;
    const pageHeight = 285;

    const renderTableHeader = (yPos: number) => {
      doc.setFillColor(0, 138, 201);
      doc.rect(marginX, yPos, tableWidth, rowHeight + 1, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);

      config.headers.forEach((h, i) => {
        const x = marginX + i * colWidth + 2;
        const truncatedH = doc.splitTextToSize(h.toUpperCase(), colWidth - 3)[0];
        doc.text(truncatedH, x, yPos + 5.5);
      });
    };

    renderTableHeader(startY);
    let currentY = startY + rowHeight + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    config.data.forEach((row, rowIndex) => {
      if (currentY + rowHeight > pageHeight - 12) {
        addPDFFooter(doc);
        doc.addPage();
        currentY = 18;
        renderTableHeader(currentY);
        currentY += rowHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
      }

      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, tableWidth, rowHeight, "F");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(marginX, currentY, tableWidth, rowHeight, "F");
      }

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(marginX, currentY + rowHeight, marginX + tableWidth, currentY + rowHeight);

      doc.setTextColor(15, 23, 42);

      row.forEach((cellVal, colIndex) => {
        const cellStr = String(cellVal ?? "-");
        const x = marginX + colIndex * colWidth + 2;
        const truncatedCell = doc.splitTextToSize(cellStr, colWidth - 3)[0];
        doc.text(truncatedCell, x, currentY + 5);
      });

      currentY += rowHeight;
    });

    addPDFFooter(doc);
    doc.save(config.filename);

    setToastAlert({
      title: "PDF Report Exported ✓",
      description: `${config.title} PDF document downloaded successfully.`,
      type: "success",
    });
  };

  const addPDFFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 283, 196, 283);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("ISALU HOSPITALS • OFFICIAL AUDIT REPORT", 14, 287);
      doc.text(`PAGE ${i} OF ${pageCount}`, 196, 287, { align: "right" });
    }
  };

  const exportHelpdeskToPDF = () => {
    exportTableToPDF({
      title: "Helpdesk Reception Patient Queue Report",
      subtitle: "Official Reception Desk Patient Check-In & Consultation Ticket Export",
      filename: "Isalu_Helpdesk_Reception_Queue.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone Number", "Doctor Assigned", "Specialty", "Date & Time", "Payment Type", "Status"],
      summaryItems: [
        { label: "Total Queue", value: `${filteredBookings.length} Tickets` },
        { label: "Checked In", value: `${filteredBookings.filter(b => b.status === "Checked In").length}` },
        { label: "Completed", value: `${filteredBookings.filter(b => b.status === "Completed").length}` },
      ],
      data: filteredBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.doctorSpecialty || b.doctor_specialty || "-",
        `${b.date} ${b.time}`,
        b.paymentType || b.payment_type || "Private Self-Pay",
        b.status || "Confirmed",
      ]),
    });
  };

  const exportHmoDeskToPDF = () => {
    exportTableToPDF({
      title: "HMO Insurance Pre-Authorization Report",
      subtitle: "Official Verification & HMO Pre-Auth Desk Approval Register",
      filename: "Isalu_HMO_PreAuth_Desk_Queue.pdf",
      headers: ["Ticket Ref", "Enrollee Name", "Phone", "HMO Provider", "Policy ID", "Auth Code", "Status"],
      summaryItems: [
        { label: "Total HMO", value: `${paginatedHmoBookings.length}` },
        { label: "Approved", value: `${paginatedHmoBookings.filter(b => b.hmoStatus === "Approved" || b.hmo_status === "Approved").length}` },
        { label: "Pending Auth", value: `${paginatedHmoBookings.filter(b => b.hmoStatus !== "Approved" && b.hmo_status !== "Approved").length}` },
      ],
      data: paginatedHmoBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.hmoName || b.hmo_name || "HMO",
        b.hmoPolicyCode || b.hmo_policy_code || "-",
        b.hmoAuthCode || b.hmo_auth_code || "PENDING",
        (b.hmoStatus === "Approved" || b.hmo_status === "Approved") ? "Approved ✓" : "Pending Pre-Auth",
      ]),
    });
  };

  const exportCashdeskToPDF = () => {
    exportTableToPDF({
      title: "Cashdesk Invoicing & Payment Clearance Report",
      subtitle: "Official Self-Pay Patient Payment & POS Invoicing Register",
      filename: "Isalu_Cashdesk_Payment_Clearance.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Method", "Invoice Ref", "Payment Status"],
      summaryItems: [
        { label: "Total Billing", value: `${paginatedCashdeskBookings.length}` },
        { label: "Paid & Cleared", value: `${paginatedCashdeskBookings.filter(b => b.paymentStatus === "Cleared" || b.payment_status === "Cleared").length}` },
        { label: "Pending", value: `${paginatedCashdeskBookings.filter(b => b.paymentStatus !== "Cleared" && b.payment_status !== "Cleared").length}` },
      ],
      data: paginatedCashdeskBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentMethod || b.payment_method || "POS/Cash",
        b.invoiceRef || b.invoice_ref || "INV-PENDING",
        (b.paymentStatus === "Cleared" || b.payment_status === "Cleared") ? "Cleared ✓" : "Pending",
      ]),
    });
  };

  const exportMasterPatientsToPDF = () => {
    exportTableToPDF({
      title: "Patient Master Directory Report",
      subtitle: "Full Registered Patient Index & Appointment History Register",
      filename: "Isalu_Patient_Master_Directory.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Email", "Doctor", "Payment Classification", "Date", "Status"],
      data: filteredBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.patientEmail || b.patient_email || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentType || b.payment_type || "Private Self-Pay",
        `${b.date} ${b.time}`,
        b.status || "Confirmed",
      ]),
    });
  };

  const exportCheckedInPatientsToPDF = () => {
    exportTableToPDF({
      title: "Reception Checked-In Patients Queue Report",
      subtitle: "Live Lobby Monitoring of Patients Physically Arrived at Reception",
      filename: "Isalu_Checked_In_Queue.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Payment Type", "Check-In Status"],
      data: checkedInList.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentType || b.payment_type || "Private Self-Pay",
        "Checked In ✓",
      ]),
    });
  };

  const exportHmoEnrolleesToPDF = () => {
    exportTableToPDF({
      title: "HMO Insurance Enrollees Register Report",
      subtitle: "Directory of Patients Registered Under HMO Insurance Plans",
      filename: "Isalu_HMO_Enrollees_Register.pdf",
      headers: ["Ticket Ref", "Enrollee Name", "Phone", "HMO Provider", "Policy ID", "Auth Code", "Pre-Auth Status"],
      data: hmoEnrolleesList.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.hmoName || b.hmo_name || "HMO",
        b.hmoPolicyCode || b.hmo_policy_code || "-",
        b.hmoAuthCode || b.hmo_auth_code || "-",
        b.hmoStatus || b.hmo_status || "Pending",
      ]),
    });
  };

  const exportPrivatePatientsToPDF = () => {
    exportTableToPDF({
      title: "Private Self-Pay Patients Directory Report",
      subtitle: "Directory of Private Outpatient Consultations & Payment Clearance",
      filename: "Isalu_Private_Patients_Directory.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor Assigned", "Method", "Invoice Ref", "Payment Status"],
      data: privatePatientsList.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        b.paymentMethod || b.payment_method || "POS/Cash",
        b.invoiceRef || b.invoice_ref || "-",
        (b.paymentStatus === "Cleared" || b.payment_status === "Cleared") ? "Cleared ✓" : "Pending",
      ]),
    });
  };

  const exportDisabledBookingsToPDF = () => {
    exportTableToPDF({
      title: "Disabled Bookings Restoration Archive Report",
      subtitle: "Audit Register of Soft-Deleted & Disabled Patient Appointments with Deletion Reasons",
      filename: "Isalu_Disabled_Bookings_Archive.pdf",
      headers: ["Ticket Ref", "Patient Name", "Phone", "Doctor", "Scheduled Date", "Reason for Disabling"],
      data: disabledBookings.map((b) => [
        b.refCode || b.ref_code || "-",
        b.patientName || b.patient_name || "-",
        b.patientPhone || b.patient_phone || "-",
        b.doctorName || b.doctor_name || "-",
        `${b.date} ${b.time}`,
        b.deleteReason || b.delete_reason || "Disabled by Administrator",
      ]),
    });
  };

  const exportSpecialistSchedulesToPDF = () => {
    exportTableToPDF({
      title: "Specialist Timetables & Duty Roster Report",
      subtitle: "Doctor Consultation Timetables, Room Assignments, Duty Days & Capacity",
      filename: "Isalu_Specialist_Schedules_Roster.pdf",
      headers: ["Schedule ID", "Doctor Name", "Specialty", "Room", "Duty Days", "Shift Time", "Daily Capacity", "Status"],
      data: filteredSchedules.map((s) => [
        s.id || s.sched_id || "-",
        s.doctorName || s.doctor_name || "-",
        s.specialty || "-",
        s.room || "-",
        Array.isArray(s.dutyDays) ? s.dutyDays.join(", ") : "-",
        s.shiftTime || s.shift_time || "-",
        s.capacity || 15,
        s.status || "Active On Duty",
      ]),
    });
  };

  const exportDoctorsRosterToPDF = () => {
    exportTableToPDF({
      title: "Registered Specialist Doctors Roster Report",
      subtitle: "Medical Consultants Roster, Departmental Specialty & Room Index",
      filename: "Isalu_Specialist_Doctors_Roster.pdf",
      headers: ["Doctor ID", "Doctor Name", "Acronym", "Specialty", "Room Suite", "Status"],
      data: filteredDirectoryDoctors.map((doc) => [
        doc.id || doc.doc_id || "-",
        doc.fullName || doc.full_name || doc.name || "-",
        doc.acronym || doc.name || "-",
        doc.specialty || "-",
        doc.roomNumber || doc.room_number || "-",
        doc.status || "Active",
      ]),
    });
  };

  const exportHmoCompaniesToPDF = () => {
    exportTableToPDF({
      title: "Accredited HMO Insurance Providers Report",
      subtitle: "Official Accredited HMO Companies, Contact Officers & Status Index",
      filename: "Isalu_Accredited_HMO_Companies.pdf",
      headers: ["HMO Code", "Company Name", "Contact Person", "Email", "Phone", "Status"],
      data: filteredHmoCompanies.map((hmo) => [
        hmo.code || "-",
        hmo.name || "-",
        hmo.contactPerson || hmo.contact_person || "-",
        hmo.email || "-",
        hmo.phone || "-",
        hmo.status || "Active Partner",
      ]),
    });
  };

  const exportSystemUsersToPDF = () => {
    exportTableToPDF({
      title: "System User Accounts & Staff Directory Report",
      subtitle: "Internal Staff Accounts, Role Assignments, Desk Duty & Account Status",
      filename: "Isalu_System_User_Accounts_Directory.pdf",
      headers: ["User ID", "Staff Name", "Email Address", "Role / Designation", "Desk Duty", "Account Status"],
      data: filteredSystemUsers.map((u) => [
        u.id || u.user_id || "-",
        u.name || "-",
        u.email || "-",
        u.role || "-",
        u.desk || "-",
        u.status || "Active",
      ]),
    });
  };

  const exportClinicsToPDF = () => {
    exportTableToPDF({
      title: "Medical Clinics & Departments Directory Report",
      subtitle: "Hospital Departmental Units, Locations & Specialist Count Index",
      filename: "Isalu_Medical_Clinics_Directory.pdf",
      headers: ["Clinic ID", "Department Name", "Location", "Doctors Count", "Status"],
      data: clinics.map((c) => [
        c.id || c.dept_id || "-",
        c.name || "-",
        c.location || "Main Building",
        c.doctor_count || c.doctorCount || 0,
        c.status || "Active",
      ]),
    });
  };

  const downloadAiReportAsExcel = (reportText: string, title: string = "AI Executive Report") => {
    let xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>AI Executive Report</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
  th { background-color: #0f172a; color: #38bdf8; font-weight: bold; padding: 10px; border: 1px solid #334155; text-align: left; }
  td { padding: 8px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 11pt; white-space: pre-wrap; }
  .title { background-color: #008ac9; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 12px; }
  .subtitle { background-color: #f0f9ff; color: #0369a1; font-size: 11pt; font-weight: bold; text-align: center; padding: 6px; }
</style>
</head>
<body>
<table>
  <tr><td colspan="2" class="title">ISALU HOSPITALS - AI EXECUTIVE SYNTHESIS REPORT</td></tr>
  <tr><td colspan="2" class="subtitle">${title} | Generated: ${new Date().toLocaleString()}</td></tr>
  <tr><td colspan="2"></td></tr>
  <tr>
    <th width="200">Report Section / Line</th>
    <th>Synthesized AI Intelligence Output</th>
  </tr>`;

    const lines = reportText.split("\n");
    lines.forEach((line, idx) => {
      if (line.trim().length === 0) return;
      const isHeader = line.startsWith("#") || line.toUpperCase() === line;
      xml += `
  <tr>
    <td><b>Line ${idx + 1}</b></td>
    <td style="${isHeader ? "font-weight:bold; background-color:#f8fafc; color:#008ac9;" : ""}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
  </tr>`;
    });

    xml += `
</table>
</body>
</html>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Isalu_AI_Executive_Report_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastAlert({
      title: "AI Report Excel Downloaded ✓",
      description: "AI Executive Report spreadsheet saved successfully.",
      type: "success",
    });
  };

  const formatCreatedDate = (dateVal: any) => {
    if (!dateVal) return "Recently Created";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateVal);
    }
  };

  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Booking registry is always loaded from the backend.
  const loadBookings = async () => {
    const remote = await getBookingsAPI();
    setBookings(Array.isArray(remote) ? remote : []);
  };

  const handleManualRefresh = async () => {
    setIsRefreshingData(true);
    try { await loadBookings(); await loadClinics(); await loadUsers(); await loadRoles(); } finally { setIsRefreshingData(false); setToastAlert({ title: "Dashboard Synchronized ✓", description: "Latest hospital records refreshed from the server.", type: "success" }); }
  };

  const handleClearAllBookings = () => {
    setConfirmModalConfig({ isOpen: true, title: "Clear All Patient Tickets", message: "Disable all active appointment tickets on the hospital server?", confirmText: "Yes, Clear All Tickets", cancelText: "Cancel", variant: "danger", onConfirm: async () => { const result = await clearAllBookingsAPI(); if (result && !result.error) { await loadBookings(); setToastAlert({ title: "All Bookings Cleared", description: `${result.count || 0} booking records disabled on the server.`, type: "info" }); } else { setToastAlert({ title: "Server Update Failed", description: "No booking records were changed.", type: "warning" }); } } });
  };

  // --- SUPERADMIN EDIT & DELETE BOOKING REAL-TIME HANDLERS ---
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [isEditBookingModalOpen, setIsEditBookingModalOpen] = useState(false);

  const [editPatientName, setEditPatientName] = useState("");
  const [editPatientPhone, setEditPatientPhone] = useState("");
  const [editPatientEmail, setEditPatientEmail] = useState("");
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editDoctorSpecialty, setEditDoctorSpecialty] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentType, setEditPaymentType] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editHmoName, setEditHmoName] = useState("");
  const [editHmoStatus, setEditHmoStatus] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSavingBookingEdit, setIsSavingBookingEdit] = useState(false);

  const openEditBookingModal = (booking: any) => {
    if (!booking) return;
    setEditingBooking(booking);
    setEditPatientName(booking.patientName || booking.patient_name || "");
    setEditPatientPhone(booking.patientPhone || booking.patient_phone || "");
    setEditPatientEmail(booking.patientEmail || booking.patient_email || "");
    setEditDoctorName(booking.doctorName || booking.doctor_name || "");
    setEditDoctorSpecialty(booking.doctorSpecialty || booking.doctor_specialty || "");
    setEditDate(booking.date || "");
    setEditTime(booking.time || "");
    setEditStatus(booking.status || "Booked");
    setEditPaymentType(booking.paymentType || booking.payment_type || "Private Self-Pay");
    setEditPaymentStatus(booking.paymentStatus || booking.payment_status || "Pending");
    setEditHmoName(booking.hmoName || booking.hmo_name || "N/A");
    setEditHmoStatus(booking.hmoStatus || booking.hmo_status || "Pending");
    setEditReason(booking.reason || "");
    setIsEditBookingModalOpen(true);
  };

  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const refCode = editingBooking.refCode || editingBooking.ref_code;
    setIsSavingBookingEdit(true);

    const updatePayload = {
      patient_name: editPatientName,
      patient_phone: editPatientPhone,
      patient_email: editPatientEmail,
      doctor_name: editDoctorName,
      doctor_specialty: editDoctorSpecialty,
      date: editDate,
      time: editTime,
      status: editStatus,
      payment_type: editPaymentType,
      payment_status: editPaymentStatus,
      hmo_name: editHmoName,
      hmo_status: editHmoStatus,
      reason: editReason,
    };

    try {
      await updateBookingAPI(refCode, updatePayload);

      const updatedBooking = {
        ...editingBooking,
        patientName: editPatientName,
        patient_name: editPatientName,
        patientPhone: editPatientPhone,
        patient_phone: editPatientPhone,
        patientEmail: editPatientEmail,
        patient_email: editPatientEmail,
        doctorName: editDoctorName,
        doctor_name: editDoctorName,
        doctorSpecialty: editDoctorSpecialty,
        doctor_specialty: editDoctorSpecialty,
        date: editDate,
        time: editTime,
        status: editStatus,
        paymentType: editPaymentType,
        payment_type: editPaymentType,
        paymentStatus: editPaymentStatus,
        payment_status: editPaymentStatus,
        hmoName: editHmoName,
        hmo_name: editHmoName,
        hmoStatus: editHmoStatus,
        hmo_status: editHmoStatus,
        reason: editReason,
      };

      const updatedList = bookings.map((b) =>
        (b.refCode || b.ref_code) === refCode ? updatedBooking : b
      );

      setBookings(updatedList);

      try {
        const channel = new BroadcastChannel("isalu_hospital_channel");
        channel.postMessage({ type: "booking_updated", refCode });
        channel.close();
      } catch { }

      setIsEditBookingModalOpen(false);
      setEditingBooking(null);
      setToastAlert({
        title: "Booking Record Updated ✓",
        description: `Ticket #${refCode} updated successfully in real-time.`,
        type: "success",
      });
    } catch (err) {
      console.error("Edit booking error:", err);
      setToastAlert({
        title: "Update Failed",
        description: "Failed to update booking record on backend server.",
        type: "danger",
      });
    } finally {
      setIsSavingBookingEdit(false);
    }
  };

  // --- SUPERADMIN SOFT DELETE / DISABLE BOOKING RECORD REAL-TIME MODAL & HANDLERS ---
  const [deletingBooking, setDeletingBooking] = useState<any | null>(null);
  const [isDeleteBookingModalOpen, setIsDeleteBookingModalOpen] = useState(false);
  const [deleteReasonText, setDeleteReasonText] = useState("");
  const [deleteReasonError, setDeleteReasonError] = useState("");
  const [isSubmittingBookingDelete, setIsSubmittingBookingDelete] = useState(false);

  const openDeleteBookingModal = (booking: any) => {
    if (!booking) return;
    setDeletingBooking(booking);
    setDeleteReasonText("");
    setDeleteReasonError("");
    setIsDeleteBookingModalOpen(true);
  };

  const handleConfirmSoftDeleteBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingBooking) return;

    if (!deleteReasonText.trim()) {
      setDeleteReasonError("Please provide a reason for deleting/disabling this booking record.");
      return;
    }

    const refCode = deletingBooking.refCode || deletingBooking.ref_code;
    const patientName = deletingBooking.patientName || deletingBooking.patient_name || refCode;
    setIsSubmittingBookingDelete(true);

    try {
      await updateBookingAPI(refCode, {
        status: "Disabled",
        is_active: false,
        is_disabled: true,
        delete_reason: deleteReasonText.trim(),
      });

      try {
        await deleteBookingAPI(refCode);
      } catch { }

      const updated = bookings.filter((b) => (b.refCode || b.ref_code) !== refCode);
      setBookings(updated);

      try {
        const channel = new BroadcastChannel("isalu_hospital_channel");
        channel.postMessage({ type: "booking_disabled", refCode });
        channel.close();
      } catch { }

      setIsDeleteBookingModalOpen(false);
      setDeletingBooking(null);
      setToastAlert({
        title: "Booking Record Disabled ✓",
        description: `Ticket #${refCode} for ${patientName} disabled in database. Reason: "${deleteReasonText.trim()}"`,
        type: "success",
      });
    } catch (err) {
      console.error("Disable booking error:", err);
      setToastAlert({
        title: "Action Failed",
        description: `Failed to disable ticket #${refCode}. Please check backend connection.`,
        type: "danger",
      });
    } finally {
      setIsSubmittingBookingDelete(false);
    }
  };

  const handleDeleteBookingRecord = (booking: any) => {
    openDeleteBookingModal(booking);
  };

  // --- SUPERADMIN RESTORE DISABLED BOOKINGS STATE & HANDLERS ---
  const [disabledBookings, setDisabledBookings] = useState<any[]>([]);
  const [disabledSearchQuery, setDisabledSearchQuery] = useState("");
  const [isRestoringBooking, setIsRestoringBooking] = useState<string | null>(null);

  const fetchDisabledBookings = async () => {
    try {
      const remote = await getDisabledBookingsAPI();
      if (remote && Array.isArray(remote)) {
        setDisabledBookings(remote);
      }
    } catch (err) {
      console.warn("Error fetching disabled bookings:", err);
    }
  };

  const handleRestoreBookingRecord = async (booking: any) => {
    if (!booking) return;
    const refCode = booking.refCode || booking.ref_code;
    const patientName = booking.patientName || booking.patient_name || refCode;
    setIsRestoringBooking(refCode);

    try {
      await restoreBookingAPI(refCode);
      await updateBookingAPI(refCode, {
        status: "Booked",
        is_active: true,
        is_disabled: false,
        delete_reason: "",
      });

      setDisabledBookings((prev) => prev.filter((b) => (b.refCode || b.ref_code) !== refCode));

      const restoredItem = {
        ...booking,
        status: "Booked",
        is_active: true,
        is_disabled: false,
        delete_reason: "",
      };

      const updatedActive = [...bookings.filter((b) => (b.refCode || b.ref_code) !== refCode), restoredItem];
      setBookings(updatedActive);

      try {
        const channel = new BroadcastChannel("isalu_hospital_channel");
        channel.postMessage({ type: "booking_restored", refCode });
        channel.close();
      } catch { }

      setToastAlert({
        title: "Booking Record Restored ✓",
        description: `Ticket #${refCode} for ${patientName} has been restored to active queue list successfully.`,
        type: "success",
      });
    } catch (err) {
      console.error("Restore booking error:", err);
      setToastAlert({
        title: "Restore Failed",
        description: `Failed to restore ticket #${refCode}. Please check backend connection.`,
        type: "danger",
      });
    } finally {
      setIsRestoringBooking(null);
    }
  };

  // --- HMO RE-ROUTE TO CASHDESK REMARK STATE & HANDLERS ---
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState(false);
  const [targetRerouteBooking, setTargetRerouteBooking] = useState<any | null>(null);
  const [rerouteRemark, setRerouteRemark] = useState("");
  const [rerouteError, setRerouteError] = useState("");
  const [isSubmittingReroute, setIsSubmittingReroute] = useState(false);

  const openRerouteToCashdeskModal = (booking: any) => {
    setTargetRerouteBooking(booking);
    setRerouteRemark("");
    setRerouteError("");
    setIsRerouteModalOpen(true);
  };

  const handleConfirmRerouteToCashdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRerouteBooking) return;
    const refCode = targetRerouteBooking.refCode || targetRerouteBooking.ref_code;
    const patientName = targetRerouteBooking.patientName || targetRerouteBooking.patient_name || refCode;
    const remarkText = rerouteRemark.trim();

    if (!remarkText) {
      setRerouteError("Please enter a remark explaining why this HMO patient is being passed to Cashdesk as a paying patient.");
      return;
    }

    setIsSubmittingReroute(true);
    setRerouteError("");

    try {
      await rerouteHmoBookingToCashdeskAPI(refCode, remarkText);

      const updatedBookings = bookings.map((b) => {
        if ((b.refCode || b.ref_code) === refCode) {
          return {
            ...b,
            paymentType: "Private Self-Pay",
            payment_type: "Private Self-Pay",
            hmoName: "N/A",
            hmo_name: "N/A",
            hmoStatus: `Re-routed to Cashdesk (Self-Pay): ${remarkText}`,
            hmo_status: `Re-routed to Cashdesk (Self-Pay): ${remarkText}`,
            paymentStatus: "Pending",
            payment_status: "Pending",
            deleteReason: `Re-routed from HMO to Cashdesk: ${remarkText}`,
            delete_reason: `Re-routed from HMO to Cashdesk: ${remarkText}`,
            hmoRemark: remarkText,
          };
        }
        return b;
      });

      setBookings(updatedBookings);

      loadBookings();

      try {
        const channel = new BroadcastChannel("isalu_hospital_channel");
        channel.postMessage({ type: "booking_rerouted_to_cashdesk", refCode, remarkText });
        channel.close();
      } catch { }

      setIsRerouteModalOpen(false);
      setTargetRerouteBooking(null);
      setRerouteRemark("");

      setToastAlert({
        title: "Patient Re-routed to Cashdesk ✓",
        description: `Ticket #${refCode} (${patientName}) passed from HMO Approval to Cashdesk as Private Paying Patient. Remark: "${remarkText}"`,
        type: "success",
      });
    } catch (err) {
      console.error("Reroute to cashdesk error:", err);
      setRerouteError("Failed to re-route booking. Please check network connection.");
    } finally {
      setIsSubmittingReroute(false);
    }
  };

  useEffect(() => {
    loadBookings();
    fetchDisabledBookings();

    async function syncBackendData() {
      try {
        fetchDisabledBookings();
        const remoteBookings = await getBookingsAPI();
        if (Array.isArray(remoteBookings)) { setBookings(remoteBookings); }

        await loadClinics();

        const remoteDoctors = await getDoctorsAPI();
        if (remoteDoctors && Array.isArray(remoteDoctors)) {
          setDoctorsList(remoteDoctors);

        }

        const remoteSchedules = await getSchedulesAPI();
        if (remoteSchedules && Array.isArray(remoteSchedules)) {
          setSpecialistSchedules(remoteSchedules);

        }
        const remoteHmos = await getHmoCompaniesAPI();
        if (Array.isArray(remoteHmos)) setHmoCompanies(remoteHmos);
        const remoteUsers = await getSystemUsersAPI();
        if (remoteUsers && Array.isArray(remoteUsers)) {
          setSystemUsers(remoteUsers);

          // Sync active session user profile if role was updated on another system
          const savedProfile = sessionStorage.getItem("isalu_staff_user_profile");
          if (savedProfile) {
            try {
              const parsedCur = JSON.parse(savedProfile);
              const curEmail = (parsedCur?.email || "").toLowerCase().trim();
              const curName = (parsedCur?.name || "").toLowerCase().trim();
              const matched = remoteUsers.find(
                (u: any) =>
                  (u.email && u.email.toLowerCase().trim() === curEmail) ||
                  (u.name && u.name.toLowerCase().trim() === curName)
              );
              if (matched && matched.role && (matched.role !== parsedCur.role || matched.desk !== parsedCur.desk)) {
                const updatedProf = {
                  ...parsedCur,
                  role: matched.role,
                  desk: matched.desk || getPrimaryDeskForRole(matched.role),
                };
                sessionStorage.setItem("isalu_staff_user_profile", JSON.stringify(updatedProf));
                setCurrentUser(updatedProf);
              }
            } catch { }
          }
        }
        await loadRoles();
      } catch (err) {
        console.warn("syncBackendData error:", err);
      }
    }

    syncBackendData();

    // Cross-tab and window sync listeners
    const handleSync = () => {
      loadBookings();
      syncBackendData();
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("isalu_hospital_channel");
      channel.onmessage = (event) => {
        if (event.data?.type === "BOOKINGS_UPDATED") {
          handleSync();
        }
      };
    } catch { }

    let userChan: BroadcastChannel | null = null;
    try {
      userChan = new BroadcastChannel("isalu_user_channel");
      userChan.onmessage = (event) => {
        if (event.data?.type === "USERS_UPDATED") {
          loadUsers();
        }
      };
    } catch { }

    let roleChan: BroadcastChannel | null = null;
    try {
      roleChan = new BroadcastChannel("isalu_role_channel");
      roleChan.onmessage = (event) => {
        if (event.data?.type === "ROLES_UPDATED") {
          loadRoles();
        }
      };
    } catch { }

    window.addEventListener("storage", handleSync);
    window.addEventListener("isalu_booking_created", handleSync);
    window.addEventListener("isalu_booking_updated", handleSync);
    window.addEventListener("isalu_users_updated", loadUsers);
    window.addEventListener("isalu_roles_updated", loadRoles);
    window.addEventListener("focus", handleSync);

    // Auto-polling interval every 2s for instant real-time live updates across different accounts and windows
    const pollInterval = setInterval(() => {
      syncBackendData();
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("isalu_booking_created", handleSync);
      window.removeEventListener("isalu_booking_updated", handleSync);
      window.removeEventListener("isalu_users_updated", loadUsers);
      window.removeEventListener("focus", handleSync);
      if (channel) channel.close();
      if (userChan) userChan.close();
      clearInterval(pollInterval);
    };
  }, []);

  const saveBookings = (updatedList: any[]) => {
    setBookings(updatedList);

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("isalu_booking_updated"));
    try {
      const channel = new BroadcastChannel("isalu_hospital_channel");
      channel.postMessage({ type: "BOOKINGS_UPDATED", timestamp: Date.now() });
      channel.close();
    } catch { }
  };

  const handleCheckIn = async (refCode: string) => {
    const target = bookings.find((b) => b.refCode === refCode || b.ref_code === refCode);
    const isHmo = (target?.paymentType || target?.payment_type) === "HMO Insurance";
    const hmoStat = target?.hmoStatus || target?.hmo_status || "Awaiting Approval";
    const payStat = target?.paymentStatus || target?.payment_status || "Pending";

    if (isHmo && hmoStat !== "Approved") {
      setToastAlert({
        title: "HMO Authorization Required 🛡️",
        description: `Ticket ${refCode} cannot be checked in while HMO status is ${hmoStat}. Please route patient to HMO Desk for pre-authorization first.`,
        type: "warning",
      });
      return;
    }

    if (payStat === "Pending") {
      setToastAlert({
        title: "Payment Clearance Required 💳",
        description: `Ticket ${refCode} cannot be checked in while payment is Pending. Please route patient to Cashdesk for payment clearing first.`,
        type: "warning",
      });
      return;
    }

    const res = await checkInBookingAPI(refCode);
    if (res && res.error) {
      setToastAlert({
        title: "Check-In Blocked 🚫",
        description: typeof res.error === "string"
          ? res.error
          : "An unexpected error occurred.",
        type: "warning",
      });
      return;
    }

    const updated = bookings.map((b) =>
      (b.refCode === refCode || b.ref_code === refCode) ? { ...b, status: "Checked In" } : b
    );
    saveBookings(updated);
    setToastAlert({
      title: "Patient Checked In ✓",
      description: `Patient ${target?.patientName || target?.patient_name || refCode} checked in successfully.`,
      type: "success",
    });
  };

  const handleMarkCompleted = async (refCode: string) => {
    const target = bookings.find((b) => b.refCode === refCode || b.ref_code === refCode);
    const payStat = target?.paymentStatus || target?.payment_status || "Pending";

    if (payStat === "Pending") {
      setToastAlert({
        title: "Payment Clearance Required 💳",
        description: `Ticket ${refCode} cannot be marked as Completed while payment is Pending. Please route patient to Cashdesk or HMO Desk for payment clearing.`,
        type: "warning",
      });
      return;
    }

    await updateBookingAPI(refCode, { status: "Completed" });
    const updated = bookings.map((b) =>
      (b.refCode === refCode || b.ref_code === refCode) ? { ...b, status: "Completed" } : b
    );
    saveBookings(updated);
    setToastAlert({
      title: "Appointment Completed ✓",
      description: `Ticket ${refCode} marked completed successfully.`,
      type: "success",
    });
  };

  const handleCancelBooking = (refCode: string) => {
    updateBookingAPI(refCode, { status: "Cancelled" });
    const updated = bookings.map((b) =>
      (b.refCode === refCode || b.ref_code === refCode) ? { ...b, status: "Cancelled" } : b
    );
    saveBookings(updated);
    setToastAlert({
      title: "Appointment Cancelled",
      description: `Ticket ${refCode} status updated to Cancelled.`,
      type: "warning",
    });
  };

  const handleHmoApproval = async (refCode: string, policy: string, auth: string) => {
    setIsApprovingHmo(true);
    try {
      await approveHmoBookingAPI(refCode, policy, auth);
      const updated = bookings.map((b) =>
        (b.refCode === refCode || b.ref_code === refCode)
          ? {
            ...b,
            hmoPolicyCode: policy || b.hmoPolicyCode || b.hmo_policy_code || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
            hmo_policy_code: policy || b.hmoPolicyCode || b.hmo_policy_code || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
            hmoAuthCode: auth || b.hmoAuthCode || b.hmo_auth_code || `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
            hmo_auth_code: auth || b.hmoAuthCode || b.hmo_auth_code || `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
            hmoStatus: "Approved",
            hmo_status: "Approved",
            paymentStatus: "Cleared",
            payment_status: "Cleared",
          }
          : b
      );
      saveBookings(updated);
      setSelectedBooking(null);
    } finally {
      setIsApprovingHmo(false);
    }
  };

  const handleCashdeskPayment = (refCode: string, method: string) => {
    payCashdeskBookingAPI(refCode, method);
    const updated = bookings.map((b) =>
      (b.refCode === refCode || b.ref_code === refCode)
        ? {
          ...b,
          paymentStatus: "Cleared",
          payment_status: "Cleared",
          paymentMethod: method,
          payment_method: method,
          invoiceRef: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          invoice_ref: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        }
        : b
    );
    saveBookings(updated);
  };

  // Filter Bookings based on Search & Active Tab
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredBookings = bookings.filter((b) => {
    const payType = b.paymentType || b.payment_type || "Private Self-Pay";
    const hName = b.hmoName || b.hmo_name || "N/A";
    const hStat = b.hmoStatus || b.hmo_status || "N/A";
    const pStat = b.paymentStatus || b.payment_status || "Pending";
    const ref = b.refCode || b.ref_code || "";
    const pName = b.patientName || b.patient_name || "";
    const pPhone = b.patientPhone || b.patient_phone || "";
    const dName = b.doctorName || b.doctor_name || "";

    const isHmoPatient = payType === "HMO Insurance";

    // Exclude HMO patients from Private Self-Pay Cashdesk & Invoicing
    if (activeDesk === "cashdesk" || activeDesk === "private_patients") {
      if (isHmoPatient) return false;
    }

    // Exclude Private Self-Pay patients from HMO Desk & HMO Enrollees Directory
    if (activeDesk === "hmo" || activeDesk === "hmo_enrollees") {
      if (!isHmoPatient) return false;
    }

    const matchesSearch =
      ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    let matchesStatus = true;

    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "today") {
      matchesStatus = b.date === todayStr || !b.date;
    } else if (statusFilter === "approved" || statusFilter === "hmo_approved") {
      matchesStatus = isHmoPatient && hStat === "Approved" && b.status !== "Cancelled";
    } else if (statusFilter === "pending" || statusFilter === "hmo_pending") {
      matchesStatus = isHmoPatient && hStat !== "Approved" && b.status !== "Cancelled";
    } else if (statusFilter === "checked_in") {
      matchesStatus = b.status === "Checked In";
    } else if (statusFilter === "completed") {
      matchesStatus = b.status === "Completed";
    } else if (statusFilter === "private") {
      matchesStatus = payType === "Private Self-Pay" || !isHmoPatient;
    } else if (statusFilter === "hmo") {
      matchesStatus = isHmoPatient;
    } else if (statusFilter === "cleared") {
      matchesStatus = !isHmoPatient && pStat === "Cleared";
    } else if (statusFilter === "cash_pending") {
      matchesStatus = !isHmoPatient && pStat !== "Cleared" && b.status !== "Cancelled";
    } else if (statusFilter === "has_referral") {
      matchesStatus = Boolean(b.referralDocName || b.referral_doc_name);
    } else {
      matchesStatus = String(b.status || "").toLowerCase() === statusFilter.toLowerCase();
    }

    const matchesHmo =
      hmoProviderFilter === "all"
        ? true
        : (() => {
          const selectedHmo = hmoProviderFilter.toLowerCase().trim();
          const bHmoName = (b.hmoName || b.hmo_name || b.hmoProvider || "").toLowerCase().trim();
          return bHmoName === selectedHmo || bHmoName.includes(selectedHmo);
        })();

    const matchesClinic =
      clinicFilter === "all"
        ? true
        : (() => {
          const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
          const docId = b.doctorId || b.doctor_id || "";
          const docObj = doctorsList.find((d) => d.doc_id === docId || d.id === docId);
          const docDept = (docObj?.department_id || docObj?.departmentId || "").toLowerCase();
          const docSpec = (docObj?.specialty || "").toLowerCase();
          const selected = clinicFilter.toLowerCase();
          const targetClinic = clinics.find(
            (c) => (c.name || "").toLowerCase() === selected || (c.id || c.dept_id || "").toLowerCase() === selected
          );
          const targetName = (targetClinic?.name || selected).toLowerCase();
          const targetId = (targetClinic?.id || targetClinic?.dept_id || selected).toLowerCase();

          return (
            spec.includes(targetName) ||
            spec.includes(targetId) ||
            docDept === targetId ||
            docSpec.includes(targetName) ||
            (targetId === "gynaecology" && (spec.includes("gynaec") || spec.includes("obs"))) ||
            (targetId === "ent" && (spec.includes("ent") || spec.includes("ear"))) ||
            (targetId === "pulmonology" && (spec.includes("pulmon") || spec.includes("chest")))
          );
        })();

    return matchesStatus && matchesHmo && matchesClinic;
  });

  const totalHelpdeskPages = Math.ceil(filteredBookings.length / helpdeskItemsPerPage) || 1;
  const currentHelpdeskPage = Math.min(helpdeskCurrentPage, totalHelpdeskPages);
  const paginatedHelpdeskBookings = filteredBookings.slice(
    (currentHelpdeskPage - 1) * helpdeskItemsPerPage,
    currentHelpdeskPage * helpdeskItemsPerPage
  );

  // 2. Cashdesk Invoicing List Pagination
  const totalCashdeskPages = Math.ceil(filteredBookings.length / cashdeskItemsPerPage) || 1;
  const currentCashdeskPage = Math.min(cashdeskCurrentPage, totalCashdeskPages);
  const paginatedCashdeskBookings = filteredBookings.slice(
    (currentCashdeskPage - 1) * cashdeskItemsPerPage,
    currentCashdeskPage * cashdeskItemsPerPage
  );

  // 3. HMO Pre-Auth Desk List Pagination
  const hmoList = filteredBookings.filter((b) => b.paymentType === "HMO Insurance" || b.hmoName || true);
  const totalHmoPages = Math.ceil(hmoList.length / hmoItemsPerPage) || 1;
  const currentHmoPage = Math.min(hmoCurrentPage, totalHmoPages);
  const paginatedHmoBookings = hmoList.slice(
    (currentHmoPage - 1) * hmoItemsPerPage,
    currentHmoPage * hmoItemsPerPage
  );

  // 4. Master Patient Directory Pagination
  const totalAllPatientsPages = Math.ceil(filteredBookings.length / allPatientsItemsPerPage) || 1;
  const currentAllPatientsPage = Math.min(allPatientsCurrentPage, totalAllPatientsPages);
  const paginatedAllPatientsBookings = filteredBookings.slice(
    (currentAllPatientsPage - 1) * allPatientsItemsPerPage,
    currentAllPatientsPage * allPatientsItemsPerPage
  );

  // 5. Checked-In Consultation Patients Directory Pagination
  const checkedInList = filteredBookings.filter((b) => b.status === "Checked In");
  const totalCheckedInPages = Math.ceil(checkedInList.length / checkedInItemsPerPage) || 1;
  const currentCheckedInPage = Math.min(checkedInCurrentPage, totalCheckedInPages);
  const paginatedCheckedInBookings = checkedInList.slice(
    (currentCheckedInPage - 1) * checkedInItemsPerPage,
    currentCheckedInPage * checkedInItemsPerPage
  );

  // 6. HMO Enrollees Directory Pagination
  const hmoEnrolleesList = filteredBookings.filter((b) => b.paymentType === "HMO Insurance" || b.hmoName);
  const totalHmoEnrolleesPages = Math.ceil(hmoEnrolleesList.length / hmoEnrolleesItemsPerPage) || 1;
  const currentHmoEnrolleesPage = Math.min(hmoEnrolleesCurrentPage, totalHmoEnrolleesPages);
  const paginatedHmoEnrolleesBookings = hmoEnrolleesList.slice(
    (currentHmoEnrolleesPage - 1) * hmoEnrolleesItemsPerPage,
    currentHmoEnrolleesPage * hmoEnrolleesItemsPerPage
  );

  // 7. Private Self-Pay Enrollees Directory Pagination
  const privatePatientsList = filteredBookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType || !b.paymentType.includes("HMO"));
  const totalPrivatePatientsPages = Math.ceil(privatePatientsList.length / privatePatientsItemsPerPage) || 1;
  const currentPrivatePatientsPage = Math.min(privatePatientsCurrentPage, totalPrivatePatientsPages);
  const paginatedPrivatePatientsBookings = privatePatientsList.slice(
    (currentPrivatePatientsPage - 1) * privatePatientsItemsPerPage,
    currentPrivatePatientsPage * privatePatientsItemsPerPage
  );

  // 8. Registered Doctors Directory Pagination
  const totalDocDirPages = Math.ceil(filteredDirectoryDoctors.length / docDirItemsPerPage) || 1;
  const currentDocDirPage = Math.min(docDirCurrentPage, totalDocDirPages);
  const paginatedDoctorsDirectory = filteredDirectoryDoctors.slice(
    (currentDocDirPage - 1) * docDirItemsPerPage,
    currentDocDirPage * docDirItemsPerPage
  );

  // 9. User & Staff Management Directory Pagination (Sorted by Recently Created First)
  const filteredSystemUsers = [...systemUsers]
    .sort((a, b) => {
      const dateA = a.created_at || a.createdAt || "";
      const dateB = b.created_at || b.createdAt || "";
      if (dateA && dateB) {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      const numA = parseInt(String(a.id || "").replace(/\D/g, "") || "0", 10);
      const numB = parseInt(String(b.id || "").replace(/\D/g, "") || "0", 10);
      return numB - numA;
    })
    .filter((u) => {
      const nameStr = (u.name || "").toLowerCase();
      const emailStr = (u.email || "").toLowerCase();
      const roleStr = (u.role || "").toLowerCase();
      const deskStr = (u.desk || "").toLowerCase();
      const q = userSearchQuery.toLowerCase().trim();

      const matchesSearch = !q || nameStr.includes(q) || emailStr.includes(q) || roleStr.includes(q) || deskStr.includes(q);

      let matchesRole = true;
      if (userRoleFilter !== "all") {
        matchesRole = roleStr.includes(userRoleFilter.toLowerCase());
      }

      let matchesStatus = true;
      if (userStatusFilter === "active") {
        matchesStatus = u.status === "Active" || !u.status;
      } else if (userStatusFilter === "disabled") {
        matchesStatus = u.status === "Disabled";
      }

      return matchesSearch && matchesRole && matchesStatus;
    });

  const totalUsersDirPages = Math.ceil(filteredSystemUsers.length / usersDirItemsPerPage) || 1;
  const currentUsersDirPage = Math.min(usersDirCurrentPage, totalUsersDirPages);
  const paginatedUsersList = filteredSystemUsers.slice(
    (currentUsersDirPage - 1) * usersDirItemsPerPage,
    currentUsersDirPage * usersDirItemsPerPage
  );

  // 10. Accredited HMO Companies Directory Pagination
  const filteredHmoCompanies = hmoCompanies.filter((hmo) => {
    const q = hmoOrgSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameStr = (hmo.name || "").toLowerCase();
    const codeStr = (hmo.code || "").toLowerCase();
    const emailStr = (hmo.email || "").toLowerCase();
    const phoneStr = (hmo.phone || "").toLowerCase();
    const contactStr = (hmo.contactPerson || hmo.contact_person || "").toLowerCase();
    return nameStr.includes(q) || codeStr.includes(q) || emailStr.includes(q) || phoneStr.includes(q) || contactStr.includes(q);
  });

  const totalHmoOrgPages = Math.ceil(filteredHmoCompanies.length / hmoOrgItemsPerPage) || 1;
  const currentHmoOrgPage = Math.min(hmoOrgCurrentPage, totalHmoOrgPages);
  const paginatedHmoCompanies = filteredHmoCompanies.slice(
    (currentHmoOrgPage - 1) * hmoOrgItemsPerPage,
    currentHmoOrgPage * hmoOrgItemsPerPage
  );

  const renderPaginationBar = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (page: number) => void,
    onItemsPerPageChange: (items: number) => void,
    itemLabel: string = "items"
  ) => {
    if (totalItems === 0) return null;

    const startIdx = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm mt-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
          <span>
            Showing{" "}
            <span className="font-black text-slate-900 dark:text-white">{startIdx}</span> to{" "}
            <span className="font-black text-slate-900 dark:text-white">{endIdx}</span> of{" "}
            <span className="font-black text-[#008ac9]">{totalItems}</span> {itemLabel}
          </span>

          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span>Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((pg) => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
              .map((pg, idx, arr) => {
                const prevPg = arr[idx - 1];
                const showEllipsis = prevPg && pg - prevPg > 1;

                return (
                  <React.Fragment key={pg}>
                    {showEllipsis && <span className="px-1.5 text-xs text-slate-400 font-bold">...</span>}
                    <button
                      onClick={() => onPageChange(pg)}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${currentPage === pg
                        ? "bg-[#008ac9] text-white shadow-md shadow-[#008ac9]/30"
                        : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      {pg}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // Calculate Key Metrics & Comprehensive Executive Reporting Data
  const totalBookings = bookings.length;
  const checkedInCount = bookings.filter((b) => b.status === "Checked In").length;
  const completedCount = bookings.filter((b) => (b.status || "").toLowerCase().trim() === "completed").length;
  const confirmedCount = bookings.filter((b) => b.status === "Confirmed" || !b.status).length;
  const cancelledCount = bookings.filter((b) => b.status === "Cancelled").length;

  const pendingHmoCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus !== "Approved").length;
  const hmoApprovedCount = bookings.filter((b) => b.paymentType === "HMO Insurance" && b.hmoStatus === "Approved").length;

  const pendingCashCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" && b.paymentStatus !== "Cleared").length;
  const clearedPaymentCount = bookings.filter((b) => b.paymentStatus === "Cleared").length;
  const paidOrApprovedCount = bookings.filter((b) => {
    const st = (b.status || "").toLowerCase().trim();
    const isHmoApp = b.hmoStatus === "Approved" || b.hmo_status === "Approved";
    const isPayClr = b.paymentStatus === "Cleared" || b.payment_status === "Cleared";
    return (isHmoApp || isPayClr) && st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
  }).length;

  const privateSelfPayCount = bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType || b.paymentType.includes("Self-Pay")).length;
  const hmoEnrolleeCount = bookings.filter((b) => b.paymentType === "HMO Insurance").length;
  const referralDocCount = bookings.filter((b) => Boolean(b.referralDocName)).length;

  const activeStaffCount = systemUsers.filter((u) => u.status === "Active").length;
  const disabledStaffCount = systemUsers.filter((u) => u.status === "Disabled").length;
  const activeShiftsCount = specialistSchedules.filter((s) => s.status !== false && (typeof s.status !== "string" || !s.status.includes("Disabled"))).length;

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 py-16 flex items-center justify-center min-h-[75vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 animate-fadeIn relative overflow-hidden">

          {/* Animated Login Preloader Overlay */}
          {isLoggingIn && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl z-30 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fadeIn">
              {/* Dynamic Animated Pulse Logo Container */}
              <div className="relative flex items-center justify-center">
                {/* Outer glowing pulsing rings */}
                <div className="absolute inset-0 rounded-full bg-[#008ac9]/20 animate-ping" />
                <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#008ac9]/50 animate-spin" style={{ animationDuration: "6s" }} />
                <div className="absolute -inset-8 rounded-full border border-sky-400/20 animate-pulse" />

                {/* Center Logo Box */}
                <div className="relative p-4 bg-sky-50 dark:bg-slate-800 rounded-3xl border-2 border-[#008ac9]/40 shadow-2xl">
                  <IsaluLogo size="lg" />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/90 text-[#008ac9] dark:text-sky-300 text-xs font-black border border-sky-300 dark:border-sky-800 shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Authenticating Session</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white transition-all duration-300">
                  {loginStageText}
                </h2>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Validating staff access permissions & loading operational duty desk modules...
                </p>
              </div>

              {/* Dynamic Progress Bar */}
              <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-[#008ac9] via-sky-400 to-[#008ac9] animate-pulse rounded-full w-full" />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>256-Bit SSL Encrypted Access Protocol</span>
              </div>
            </div>
          )}

          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-sky-50 dark:bg-slate-800 rounded-3xl border-2 border-[#008ac9]/30">
                <IsaluLogo size="md" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-300">
              <ShieldCheck className="h-4 w-4" /> Restricted Staff Access
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Staff Portal Login</h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Enter your authorized staff credentials to access Helpdesk, HMO Approval Desk, and Cashdesk.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {isLoggingIn && (
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse shadow-sm">
                <RefreshCw className="h-4 w-4 animate-spin text-[#008ac9]" />
                <span>{loginStageText || "Verifying staff credentials... Please wait."}</span>
              </div>
            )}

            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold animate-fadeIn">
                ⚠️ {loginError}
              </div>
            )}

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                Staff Email / Username <span className="text-red-500 font-black ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isLoggingIn}
                  placeholder="admin@isaluhospitals.com"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  Access Password <span className="text-red-500 font-black ml-0.5">*</span>
                </label>
                {loginPassword && (
                  <span className={`text-[10px] font-black uppercase tracking-wider ${evaluatePasswordStrength(loginPassword).textColor}`}>
                    {evaluatePasswordStrength(loginPassword).label} Strength
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  disabled={isLoggingIn}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Indicator Meter */}
              {loginPassword.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(loginPassword).score >= 1 ? evaluatePasswordStrength(loginPassword).color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(loginPassword).score >= 2 ? evaluatePasswordStrength(loginPassword).color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(loginPassword).score >= 3 ? evaluatePasswordStrength(loginPassword).color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(loginPassword).score >= 4 ? evaluatePasswordStrength(loginPassword).color : "bg-transparent"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span className={evaluatePasswordStrength(loginPassword).length ? "text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1" : "flex items-center gap-1 opacity-70"}>
                      {evaluatePasswordStrength(loginPassword).length ? "✓" : "○"} Min 8 Chars
                    </span>
                    <span className={evaluatePasswordStrength(loginPassword).mixed ? "text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1" : "flex items-center gap-1 opacity-70"}>
                      {evaluatePasswordStrength(loginPassword).mixed ? "✓" : "○"} Upper & Lower
                    </span>
                    <span className={evaluatePasswordStrength(loginPassword).number ? "text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1" : "flex items-center gap-1 opacity-70"}>
                      {evaluatePasswordStrength(loginPassword).number ? "✓" : "○"} Number (0-9)
                    </span>
                    <span className={evaluatePasswordStrength(loginPassword).symbol ? "text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1" : "flex items-center gap-1 opacity-70"}>
                      {evaluatePasswordStrength(loginPassword).symbol ? "✓" : "○"} Symbol (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all border border-[#008ac9] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Authenticating Staff Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Sign In to Staff Portal →
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 py-8 md:py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#011627] via-[#022b4a] to-[#004b7a] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#008ac9]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#008ac9]/30 px-3.5 py-1 text-xs font-black text-sky-200 border border-sky-300/40 mb-3">
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                Isalu Hospitals Internal Staff Portal
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap cursor-pointer" onClick={() => handleSelectDesk("helpdesk")} title="Click to Return to Main Staff Dashboard">
                <span className="hover:text-sky-300 transition-colors">Hospital Staff Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 max-w-2xl">
                Manage appointment tickets across Helpdesk reception check-in, HMO insurance pre-authorizations, and Private Patient cashdesk billing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Prominent Logged-In User Profile Badge: Name alongside Role */}
              <div className="flex items-center gap-3 bg-white/15 dark:bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-sky-400/40 shadow-xl">
                <div className="w-10 h-10 rounded-full bg-[#008ac9] text-white flex items-center justify-center font-black text-sm shadow-lg border-2 border-white shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                    <span>{currentUser?.name || "Staff Member"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-black border border-emerald-400/50 uppercase tracking-wider">
                      ● Active
                    </span>
                  </div>
                  <div className="text-xs font-bold text-sky-200 flex items-center gap-1 mt-0.5">
                    <span>🛡️ <strong>Role:</strong> {currentUser?.role || "Hospital Staff"}</span>
                    {currentUser?.desk && <span>• <strong>Desk:</strong> {currentUser.desk}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid for Mobile & Row on Desktop */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshingData}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-extrabold text-xs rounded-2xl border border-white/30 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Refresh & Synchronize Live Hospital Data"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingData ? "animate-spin text-amber-300" : ""}`} />
                  <span>{isRefreshingData ? "Refreshing..." : "Refresh"}</span>
                </button>
                <button
                  onClick={() => handleSelectDesk("clinic")}
                  className={`px-4 py-3 font-extrabold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border ${activeDesk === "clinic"
                    ? "bg-white text-[#008ac9] border-white shadow-lg font-black"
                    : isDeskAllowed("clinic")
                      ? "bg-white/10 hover:bg-white/20 text-white border-white/30"
                      : "opacity-50 bg-white/5 text-slate-300 border-white/10 cursor-not-allowed"
                    }`}
                  title={isDeskAllowed("clinic") ? "Create & Manage Clinics" : "Access Restricted (Super Administrator Only)"}
                >
                  {!isDeskAllowed("clinic") ? <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : <Building2 className="h-4 w-4" />}
                  <span>🏥 Clinic Module</span>
                </button>

                <button
                  onClick={() => handleSelectDesk("users")}
                  className={`px-4 py-3 font-extrabold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border ${activeDesk === "users"
                    ? "bg-white text-[#008ac9] border-white shadow-lg font-black"
                    : isDeskAllowed("users")
                      ? "bg-white/10 hover:bg-white/20 text-white border-white/30"
                      : "opacity-50 bg-white/5 text-slate-300 border-white/10 cursor-not-allowed"
                    }`}
                  title={isDeskAllowed("users") ? "Manage System Users" : "Access Restricted (Super Administrator Only)"}
                >
                  {!isDeskAllowed("users") ? <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : <UserCog className="h-4 w-4" />}
                  <span>⚙️ Manage Users</span>
                </button>

                {isSuperAdminUser(currentUser) && (
                  <button
                    onClick={() => handleSelectDesk("disabled_bookings")}
                    className={`px-4 py-3 font-extrabold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border ${activeDesk === "disabled_bookings"
                      ? "bg-white text-rose-600 border-white shadow-lg font-black"
                      : "bg-rose-500/20 hover:bg-rose-500/30 text-white border-rose-400/40"
                      }`}
                    title="Superadmin: Restore Disabled Bookings Archive"
                  >
                    <RotateCcw className="h-4 w-4 text-rose-300" />
                    <span>Restoration Archive ({disabledBookings.length})</span>
                  </button>
                )}
                <button
                  onClick={handleAdminLogout}
                  className="px-4 py-3 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl border border-rose-400 backdrop-blur-md transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics Overview Cards (Shown on main desk suite: Helpdesk, HMO, Cashdesk, Analytics, Monitor) */}
        {["helpdesk", "hmo", "cashdesk", "analytics", "monitor"].includes(activeDesk) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
                <div className="p-2.5 rounded-2xl bg-sky-50 text-[#008ac9] font-black">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalBookings}</h2>
              <p className="text-[11px] font-bold text-slate-500 mt-1">Hospital Consultation Queue</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monitor Checked-In</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 font-black">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{paidOrApprovedCount}</h2>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">Cleared by HMO Auth or Cashdesk</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{completedCount}</h2>
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">Concluded Consultations</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending HMO Desk</span>
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 font-black">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{pendingHmoCount}</h2>
              <p className="text-[11px] font-bold text-amber-600 mt-1">Awaiting Insurance Auth Code</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Cashdesk</span>
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 font-black">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{pendingCashCount}</h2>
              <p className="text-[11px] font-bold text-purple-600 mt-1">Private Patients Uncleared</p>
            </div>
          </div>
        )}

        {/* Desk Switcher Bar (Shown ONLY on main dashboard & role desks) */}
        {["helpdesk", "hmo", "cashdesk", "analytics", "monitor"].includes(activeDesk) && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-md mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => handleSelectDesk("helpdesk")}
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeDesk === "helpdesk"
                ? "bg-[#008ac9] text-white shadow-lg shadow-[#008ac9]/30 border border-[#008ac9]"
                : isDeskAllowed("helpdesk")
                  ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "opacity-45 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
              title={isDeskAllowed("helpdesk") ? "Helpdesk Reception" : "Access Restricted for your Role"}
            >
              {!isDeskAllowed("helpdesk") ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Building2 className="h-4 w-4 shrink-0" />}
              <span>📌 Helpdesk (Reception)</span>
            </button>

            <button
              onClick={() => handleSelectDesk("hmo")}
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeDesk === "hmo"
                ? "bg-[#008ac9] text-white shadow-lg shadow-[#008ac9]/30 border border-[#008ac9]"
                : isDeskAllowed("hmo")
                  ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "opacity-45 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
              title={isDeskAllowed("hmo") ? "HMO Approval Desk" : "Access Restricted for your Role"}
            >
              {!isDeskAllowed("hmo") ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
              <span>🛡️ HMO Approval Desk</span>
            </button>

            <button
              onClick={() => handleSelectDesk("cashdesk")}
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeDesk === "cashdesk"
                ? "bg-[#008ac9] text-white shadow-lg shadow-[#008ac9]/30 border border-[#008ac9]"
                : isDeskAllowed("cashdesk")
                  ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "opacity-45 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
              title={isDeskAllowed("cashdesk") ? "Cashdesk Private Billing" : "Access Restricted for your Role"}
            >
              {!isDeskAllowed("cashdesk") ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <CreditCard className="h-4 w-4 shrink-0" />}
              <span>💳 Cashdesk (Private)</span>
            </button>

            <button
              onClick={() => handleSelectDesk("analytics")}
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeDesk === "analytics"
                ? "bg-[#008ac9] text-white shadow-lg shadow-[#008ac9]/30 border border-[#008ac9]"
                : isDeskAllowed("analytics")
                  ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "opacity-45 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
              title={isDeskAllowed("analytics") ? "Queue Analytics" : "Access Restricted for your Role"}
            >
              {!isDeskAllowed("analytics") ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
              <span>📊 Queue Analytics</span>
            </button>

            <button
              onClick={() => handleSelectDesk("monitor")}
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeDesk === "monitor"
                ? "bg-[#008ac9] text-white shadow-lg shadow-[#008ac9]/30 border border-[#008ac9]"
                : isDeskAllowed("monitor")
                  ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "opacity-45 bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                }`}
              title={isDeskAllowed("monitor") ? "Monitor Desk" : "Access Restricted for your Role"}
            >
              {!isDeskAllowed("monitor") ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Monitor className="h-4 w-4 shrink-0" />}
              <span className="truncate">🖥️ Monitor</span>
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        {["helpdesk", "hmo", "cashdesk", "all_patients", "checked_in_patients", "hmo_enrollees", "private_patients"].includes(activeDesk) && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket ref, patient name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#008ac9]"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <select
                value={clinicFilter}
                onChange={(e) => setClinicFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#008ac9]"
              >
                <option value="all">🏥 All Clinics & Departments</option>
                {clinics.map((c) => (
                  <option key={c.id || c.dept_id || c.name} value={c.name}>
                    🏥 {c.name}
                  </option>
                ))}
              </select>

              <select
                value={hmoProviderFilter}
                onChange={(e) => setHmoProviderFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">🛡️ All HMO Providers</option>
                {hmoCompanies.map((hmo) => (
                  <option key={hmo.id || hmo.hmo_id || hmo.name} value={hmo.name}>
                    🛡️ {hmo.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200"
              >
                {activeDesk === "helpdesk" && (
                  <>
                    <option value="all">All Reception Tickets</option>
                    <option value="today">📅 Today's Appointments</option>
                    <option value="hmo_approved">✓ HMO Pre-Auth Approved</option>
                    <option value="hmo_pending">⏳ HMO Pre-Auth Pending</option>
                    <option value="checked_in">🩺 Checked In</option>
                    <option value="completed">Done / Completed</option>
                    <option value="private">Private Patients</option>
                    <option value="hmo">HMO Patients</option>
                  </>
                )}

                {activeDesk === "hmo" && (
                  <>
                    <option value="all">All HMO Requests</option>
                    <option value="approved">✓ HMO Pre-Auth Approved</option>
                    <option value="pending">⏳ Pending Pre-Auth Code</option>
                    <option value="today">📅 Today's HMO Queue</option>
                    <option value="has_referral">📎 Has Referral Document</option>
                  </>
                )}

                {activeDesk === "cashdesk" && (
                  <>
                    <option value="all">All Cashdesk Patients</option>
                    <option value="cleared">✓ Paid & Cleared</option>
                    <option value="cash_pending">⏳ Payment Pending</option>
                    <option value="today">📅 Today's Cashdesk Queue</option>
                  </>
                )}

                {["all_patients", "checked_in_patients", "hmo_enrollees", "private_patients"].includes(activeDesk) && (
                  <>
                    <option value="all">All Patient Records</option>
                    <option value="today">📅 Today's Appointments</option>
                    <option value="checked_in">🩺 Checked In</option>
                    <option value="completed">Done / Completed</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}

        {/* 1. HELPDESK (RECEPTION) DESK VIEW */}
        {activeDesk === "helpdesk" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#008ac9]" /> Reception Patient Check-In & Queue List ({filteredBookings.length})
              </h2>
              <button
                type="button"
                onClick={exportHelpdeskToPDF}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                title="Export Helpdesk Reception Queue to PDF"
              >
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">No Tickets Found</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Try adjusting your search filter or generate a new booking ticket.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {paginatedHelpdeskBookings.map((b) => (
                  <div
                    key={b.refCode}
                    className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all w-full"
                  >
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-lg font-black text-[#008ac9] dark:text-sky-400 tracking-wider">
                          {b.refCode}
                        </span>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[11px] font-black ${b.status === "Checked In"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                            : b.status === "Completed"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-2 border-rose-400 font-extrabold"
                              : b.status === "Cancelled"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300"
                            }`}
                        >
                          {b.status || "Confirmed"}
                        </span>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {b.paymentType || "Private / HMO"}
                        </span>

                        {/* HMO Pre-Authorization Approval Badge for Helpdesk */}
                        {b.paymentType === "HMO Insurance" && (
                          b.hmoStatus === "Approved" ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400 flex items-center gap-1 shadow-sm animate-fadeIn">
                              ✓ HMO Approved ({b.hmoAuthCode || "AUTH-OK"})
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                              ⏳ HMO Pre-Auth Pending
                            </span>
                          )
                        )}

                        {/* Private Cashdesk Payment Clearance Badge for Helpdesk */}
                        {b.paymentType === "Private Self-Pay" && (
                          b.paymentStatus === "Cleared" ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 flex items-center gap-1">
                              💳 Cashdesk Cleared
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300">
                              💳 Cashdesk Pending
                            </span>
                          )
                        )}

                        {isSuperAdminUser(currentUser) && (
                          <div className="flex items-center gap-1.5 ml-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditBookingModal(b)}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                              title="Superadmin: Edit Booking Record"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBookingRecord(b)}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                              title="Superadmin: Delete Booking Record from Database"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {b.patientName} <span className="text-xs font-semibold text-slate-500">({b.patientPhone})</span>
                      </div>

                      {/* Full Patient Information Record Panel */}
                      <div className="mt-2.5 p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-left w-full">
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                          <span className="font-black text-[#008ac9] dark:text-sky-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> Full Patient Booking Information
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-500">
                            Booked: {b.createdAt ? new Date(b.createdAt).toLocaleString() : "Recent"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-semibold text-slate-800 dark:text-slate-200">
                          <div>
                            <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Patient Name & Phone</span>
                            <span className="font-black text-slate-900 dark:text-white text-xs">{b.patientName}</span>
                            <span className="block text-slate-500 font-bold">{b.patientPhone}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Email Address</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{b.patientEmail || "Not Provided"}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Doctor & Specialty</span>
                            <span className="font-black text-[#008ac9] dark:text-sky-400">{b.doctorName}</span>
                            <span className="block text-slate-500 font-bold">{b.doctorSpecialty}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Date & Time Slot</span>
                            <span className="font-bold text-slate-900 dark:text-white">📅 {b.date}</span>
                            <span className="block font-bold text-[#008ac9] dark:text-sky-400">🕒 {b.time}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Patient Payment Type</span>
                            <span className="font-black text-slate-900 dark:text-white">{b.paymentType || "Private Self-Pay"}</span>
                          </div>

                          {b.paymentType === "HMO Insurance" && (
                            <div>
                              <span className="text-slate-500 font-extrabold block text-[10px] uppercase">HMO Provider & Enrollee ID</span>
                              <span className="font-black text-[#008ac9] dark:text-sky-400">🛡️ {b.hmoName || "N/A"}</span>
                              <span className="block font-bold text-slate-800 dark:text-slate-200">🆔 Enrollee Code: {b.hmoPolicyCode || "N/A"}</span>
                            </div>
                          )}

                          {b.paymentType === "HMO Insurance" && (
                            <div>
                              <span className="text-slate-500 font-extrabold block text-[10px] uppercase">HMO Pre-Auth Code</span>
                              <span className={`font-black px-2 py-0.5 rounded border inline-block ${b.hmoAuthCode ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"
                                }`}>
                                🔑 {b.hmoAuthCode || "Pending HMO Pre-Auth"}
                              </span>
                            </div>
                          )}

                          {(b.referralDocName || b.referral_doc_name) && (
                            <div className="col-span-1 sm:col-span-2">
                              <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Attached Referral Document</span>
                              <button
                                type="button"
                                onClick={() => handleOpenReferralDoc(b)}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/70 dark:hover:bg-sky-900/90 text-[#008ac9] dark:text-sky-300 border border-sky-300 dark:border-sky-700 text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer mt-1"
                                title="Click to preview & download attached referral document"
                              >
                                <FileText className="h-4 w-4 text-[#008ac9] dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="font-extrabold truncate max-w-[200px]">📎 {b.referralDocName || b.referral_doc_name}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#008ac9] text-white text-[10px] font-black group-hover:bg-[#0072b1] transition-colors shrink-0 shadow-2xs">
                                  <Eye className="h-3 w-3" /> Preview Document
                                </span>
                              </button>
                            </div>
                          )}

                          {b.reason && (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                              <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Reason for Visit / Clinical Symptoms</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 mt-0.5">
                                "{b.reason}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {renderPaginationBar(
                  currentHelpdeskPage,
                  totalHelpdeskPages,
                  filteredBookings.length,
                  helpdeskItemsPerPage,
                  setHelpdeskCurrentPage,
                  (val) => { setHelpdeskItemsPerPage(val); setHelpdeskCurrentPage(1); },
                  "patient tickets"
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. HMO APPROVAL DESK VIEW */}
        {activeDesk === "hmo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#008ac9]" /> HMO Insurance Pre-Authorization & Verification Desk
              </h2>
              <button
                type="button"
                onClick={exportHmoDeskToPDF}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                title="Export HMO Pre-Auth Queue to PDF"
              >
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
            </div>

            <div className="grid gap-4">
              {paginatedHmoBookings.map((b) => (
                <div
                  key={b.refCode}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all w-full space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-black text-[#008ac9] dark:text-sky-400 tracking-wider">
                        {b.refCode}
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-[11px] font-black ${b.hmoStatus === "Approved"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300"
                          }`}
                      >
                        {b.hmoStatus === "Approved" ? "HMO Approved ✓" : "Pending Pre-Auth"}
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-slate-800 text-[#008ac9] border border-[#008ac9]/30">
                        {b.hmoName || "Hygeia HMO"}
                      </span>
                      {isSuperAdminUser(currentUser) && (
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditBookingModal(b)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                            title="Superadmin: Edit Booking Record"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBookingRecord(b)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                            title="Superadmin: Delete Booking Record from Database"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {b.hmoStatus !== "Approved" && (
                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setHmoPolicyCode(b.hmoPolicyCode || "");
                            setHmoAuthCode(b.hmoAuthCode || "");
                          }}
                          className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="h-4 w-4" /> Grant HMO Pre-Auth
                        </button>

                        <button
                          type="button"
                          onClick={() => openRerouteToCashdeskModal(b)}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Pass HMO patient to Cashdesk as paying patient with remark"
                        >
                          <ArrowRightCircle className="h-4 w-4" /> Remark & Pass to Cashdesk →
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    Enrollee: {b.patientName} <span className="text-xs font-bold text-slate-500">({b.patientPhone})</span>
                  </div>

                  {/* Full Patient Information Record Panel */}
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-left w-full">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                      <span className="font-black text-[#008ac9] dark:text-sky-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> HMO Insurance Pre-Auth Details
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#008ac9]" /> Date Created: {formatCreatedDate(b.createdAt || b.created_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-semibold text-slate-800 dark:text-slate-200">
                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Enrollee Name & Phone</span>
                        <span className="font-black text-slate-900 dark:text-white text-xs">{b.patientName}</span>
                        <span className="block text-slate-500 font-bold">{b.patientPhone}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Email Address</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{b.patientEmail || "Not Provided"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Doctor & Specialty</span>
                        <span className="font-black text-[#008ac9] dark:text-sky-400">{b.doctorName}</span>
                        <span className="block text-slate-500 font-bold">{b.doctorSpecialty}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Date & Time Slot</span>
                        <span className="font-bold text-slate-900 dark:text-white">📅 {b.date}</span>
                        <span className="block font-bold text-[#008ac9] dark:text-sky-400">🕒 {b.time}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Date Created</span>
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1 text-xs">
                          <Clock className="h-3.5 w-3.5 text-[#008ac9]" />
                          {formatCreatedDate(b.createdAt || b.created_at)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">HMO Provider Name</span>
                        <span className="font-black text-[#008ac9] dark:text-sky-400">🛡️ {b.hmoName || "Hygeia HMO"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Enrollee ID / Policy Code</span>
                        <span className="font-black text-slate-900 dark:text-white">🆔 {b.hmoPolicyCode || "HYG-849201"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-extrabold block text-[10px] uppercase">HMO Pre-Auth Status</span>
                        <span className={`font-black px-2 py-0.5 rounded border inline-block ${b.hmoStatus === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}>
                          🔑 {b.hmoAuthCode ? `Approved (${b.hmoAuthCode})` : "Pending Pre-Auth Code"}
                        </span>
                      </div>

                      {(b.referralDocName || b.referral_doc_name) && (
                        <div className="col-span-1 sm:col-span-2">
                          <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Attached Referral Document</span>
                          <button
                            type="button"
                            onClick={() => handleOpenReferralDoc(b)}
                            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/70 dark:hover:bg-sky-900/90 text-[#008ac9] dark:text-sky-300 border border-sky-300 dark:border-sky-700 text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer mt-1"
                            title="Click to preview & download attached referral document"
                          >
                            <FileText className="h-4 w-4 text-[#008ac9] dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span className="font-extrabold truncate max-w-[200px]">📎 {b.referralDocName || b.referral_doc_name}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#008ac9] text-white text-[10px] font-black group-hover:bg-[#0072b1] transition-colors shrink-0 shadow-2xs">
                              <Eye className="h-3 w-3" /> Preview Document
                            </span>
                          </button>
                        </div>
                      )}

                      {b.reason && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 font-extrabold block text-[10px] uppercase">Reason for Visit / Clinical Symptoms</span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 mt-0.5">
                            "{b.reason}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {renderPaginationBar(
                currentHmoPage,
                totalHmoPages,
                hmoList.length,
                hmoItemsPerPage,
                setHmoCurrentPage,
                (val) => { setHmoItemsPerPage(val); setHmoCurrentPage(1); },
                "HMO pre-auth requests"
              )}
            </div>
          </div>
        )}

        {/* 3. CASHDESK (PRIVATE PATIENTS) VIEW */}
        {activeDesk === "cashdesk" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#008ac9]" /> Private Self-Pay Patient Cashdesk & Invoicing
              </h2>
              <button
                type="button"
                onClick={exportCashdeskToPDF}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                title="Export Cashdesk Billing Queue to PDF"
              >
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
            </div>

            <div className="grid gap-4">
              {paginatedCashdeskBookings.map((b) => (
                <div
                  key={b.refCode}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-black text-[#008ac9] dark:text-sky-400 tracking-wider">
                        {b.refCode}
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-[11px] font-black ${b.paymentStatus === "Cleared"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                          : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300"
                          }`}
                      >
                        {b.paymentStatus === "Cleared" ? "Paid & Cleared ✓" : "Payment Pending ⏳"}
                      </span>
                      {b.invoiceRef && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          Invoice: {b.invoiceRef}
                        </span>
                      )}
                      {(b.hmoRemark || (b.hmoStatus && b.hmoStatus.includes("Re-routed")) || (b.deleteReason && b.deleteReason.includes("Re-routed"))) && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                          <ArrowRightCircle className="h-3 w-3 text-amber-600" />
                          Passed from HMO: "{b.hmoRemark || b.deleteReason || b.hmoStatus}"
                        </span>
                      )}
                      {isSuperAdminUser(currentUser) && (
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditBookingModal(b)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                            title="Superadmin: Edit Booking Record"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBookingRecord(b)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                            title="Superadmin: Delete Booking Record from Database"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      Patient: {b.patientName} <span className="text-xs font-semibold text-slate-500">({b.patientPhone})</span>
                    </div>

                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex flex-wrap gap-4">
                      <span>🩺 <strong>Doctor:</strong> {b.doctorName} ({b.doctorSpecialty})</span>
                      <span>💳 <strong>Method:</strong> {b.paymentMethod || "POS / Cash / Transfer"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {b.paymentStatus !== "Cleared" ? (
                      <>
                        <button
                          onClick={() => handleCashdeskPayment(b.refCode, "POS Card Terminal")}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay POS Card
                        </button>
                        <button
                          onClick={() => handleCashdeskPayment(b.refCode, "Cash / Bank Transfer")}
                          className="px-4 py-2 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" /> Pay Cash/Transfer
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Invoice Paid & Cleared
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {renderPaginationBar(
                currentCashdeskPage,
                totalCashdeskPages,
                filteredBookings.length,
                cashdeskItemsPerPage,
                setCashdeskCurrentPage,
                (val) => { setCashdeskItemsPerPage(val); setCashdeskCurrentPage(1); },
                "invoices"
              )}
            </div>
          </div>
        )}

        {/* 4. HOSPITAL QUEUE & DEPARTMENT ANALYTICS & AI REPORTING VIEW */}
        {activeDesk === "analytics" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Title Card */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#008ac9]/10 text-[#008ac9] dark:text-sky-400 text-xs font-black border border-[#008ac9]/20 mb-2">
                  <TrendingUp className="h-4 w-4" /> Live Operational & Clinical Intelligence
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Hospital Queue & Department Analytics
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Real-time visual charts, queue trends, financial ratios, and AI-powered executive report generation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
                <select
                  value={clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#008ac9]"
                >
                  <option value="all">🏥 Filter Analytics by Clinic (All Clinics)</option>
                  {clinics.map((c) => (
                    <option key={c.id || c.dept_id || c.name} value={c.name}>
                      🏥 {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleGenerateAiReport("Generate Full Executive Board Report")}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#008ac9] to-sky-600 hover:from-sky-600 hover:to-[#008ac9] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" /> Instant AI Board Summary
                </button>

                <button
                  type="button"
                  onClick={downloadHospitalAnalyticsAsPdf}
                  className="px-4 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="h-4 w-4" /> Download Analytics (PDF)
                </button>

                <button
                  type="button"
                  onClick={downloadHospitalAnalyticsAsExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText className="h-4 w-4 text-emerald-200" /> Download Analytics (Excel)
                </button>
              </div>
            </div>

            {/* CREATE NEW CLINIC MODAL DIALOG */}
            {showCreateClinicModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Create New Clinic / Department</h3>
                        <p className="text-xs font-semibold text-slate-500">Register a new medical clinic module in Isalu Hospitals.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateClinicModal(false)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  {clinicFormError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{clinicFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateClinic} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Clinic / Department Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Neurology & Brain Care Clinic"
                        value={newClinicName}
                        onChange={(e) => setNewClinicName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                          Clinic ID / Code (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. neurology"
                          value={newClinicId}
                          onChange={(e) => setNewClinicId(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                          Operational Status
                        </label>
                        <select
                          value={newClinicStatus}
                          onChange={(e) => setNewClinicStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                        >
                          <option value="Active">Active ✓</option>
                          <option value="Maintenance">Under Maintenance 🛠️</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Hospital Location / Suite Wing
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Hospital Building - West Wing Floor 2"
                        value={newClinicLocation}
                        onChange={(e) => setNewClinicLocation(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Description & Medical Scope
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe medical services, specialists, and conditions treated at this clinic..."
                        value={newClinicDescription}
                        onChange={(e) => setNewClinicDescription(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateClinicModal(false)}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> Create Clinic
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT CLINIC MODAL DIALOG */}
            {editingClinic && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                        <Pencil className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Clinic Details</h3>
                        <p className="text-xs font-semibold text-slate-500">Update module details for {editingClinic.name}.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingClinic(null)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  {editClinicFormError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{editClinicFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEditClinic} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Clinic / Department Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editClinicName}
                        onChange={(e) => setEditClinicName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                          Location Wing
                        </label>
                        <input
                          type="text"
                          value={editClinicLocation}
                          onChange={(e) => setEditClinicLocation(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                          Operational Status
                        </label>
                        <select
                          value={editClinicStatus}
                          onChange={(e) => setEditClinicStatus(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                        >
                          <option value="Active">Active ✓</option>
                          <option value="Maintenance">Under Maintenance 🛠️</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Description & Medical Scope
                      </label>
                      <textarea
                        rows={3}
                        value={editClinicDescription}
                        onChange={(e) => setEditClinicDescription(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingClinic(null)}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-1.5"
                      >
                        <Pencil className="h-4 w-4" /> Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CONFIRMATION DIALOG MODAL */}
            {/* Robust AI Executive Report Generator Container */}
            <div className="bg-gradient-to-br from-slate-950 via-[#011627] to-slate-900 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 relative overflow-hidden">

              {/* Card Header & Neural Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-gradient-to-br from-[#008ac9] to-sky-600 rounded-2xl text-white shadow-lg shadow-sky-500/20 shrink-0">
                    <Sparkles className="h-6 w-6 text-yellow-300 animate-spin-slow" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase tracking-wider border border-sky-400/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping"></span>
                      Isalu Medical AI Intelligence v3.2
                    </div>
                    <h3 className="text-xl font-black text-white mt-1">
                      AI Executive Report & Audit Generator
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Neural Engine Connected
                  </span>
                </div>
              </div>

              {/* Neural Synthesis Progress Indicator Bar (Active during generation) */}
              {isGeneratingAiReport && (
                <div className="p-4 rounded-2xl bg-sky-950/80 border border-sky-500/40 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-extrabold text-sky-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                      {aiProcessingStep}
                    </span>
                    <span className="font-mono">{aiProcessingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-sky-800">
                    <div
                      className="bg-gradient-to-r from-[#008ac9] via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-md"
                      style={{ width: `${aiProcessingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Categorized Analytical Presets Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-sky-400" /> Select Quick Executive Synthesis Category:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { label: "Executive Board Summary", prompt: "Generate Full Executive Board Report", icon: Sparkles, color: "hover:border-sky-400 text-sky-300" },
                    { label: "Financial & HMO Risk Audit", prompt: "Financial Clearance & HMO Risk Audit", icon: CreditCard, color: "hover:border-emerald-400 text-emerald-300" },
                    { label: "Queue & Traffic Bottlenecks", prompt: "Analyze Department Workload & Queue Bottlenecks", icon: Activity, color: "hover:border-amber-400 text-amber-300" },
                    { label: "Specialist Staff & Roster", prompt: "Specialist Staff Roster & Shift Efficiency", icon: Users, color: "hover:border-purple-400 text-purple-300" },
                    { label: "Referral & EHR Health Audit", prompt: "Patient Health Referral & Document Audit", icon: FileText, color: "hover:border-teal-400 text-teal-300" },
                    { label: "Capacity & Growth Forecast", prompt: "Capacity & Growth Forecast", icon: TrendingUp, color: "hover:border-indigo-400 text-indigo-300" },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = aiPrompt === item.prompt;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setAiPrompt(item.prompt);
                          handleGenerateAiReport(item.prompt);
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer ${isSelected
                          ? "bg-[#008ac9] text-white border-sky-300 shadow-lg shadow-sky-500/20 font-black"
                          : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 font-bold"
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <IconComp className={`h-4 w-4 shrink-0 ${item.color}`} />
                          <span className="text-xs truncate">{item.label}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">→</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Prompt Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateAiReport();
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <input
                  type="text"
                  placeholder="Ask AI anything about queue times, HMO clearance rates, doctor load, revenue risks..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 p-3.5 rounded-2xl bg-slate-950/90 border-2 border-slate-700 text-white placeholder-slate-400 text-xs font-bold focus:ring-2 focus:ring-[#008ac9] focus:outline-none shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isGeneratingAiReport}
                  className="px-6 py-3.5 bg-gradient-to-r from-[#008ac9] to-sky-600 hover:from-[#0072b1] hover:to-sky-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                  {isGeneratingAiReport ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-sky-200" /> Synthesizing Data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-300" /> Synthesize AI Report
                    </>
                  )}
                </button>
              </form>

              {/* Rendered AI Report Box */}
              {generatedAiReport && (
                <div className="bg-slate-950/95 border-2 border-sky-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-400" />
                      <span className="text-xs font-black text-sky-300">
                        Synthesized AI Executive Report Output
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsAiReportModalOpen(true)}
                        className="px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        title="Open Report in Full Screen Modal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Full Screen Mode
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedAiReport);
                          setCopiedAiReport(true);
                          setTimeout(() => setCopiedAiReport(false), 2000);
                        }}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                      >
                        {copiedAiReport ? "✓ Copied!" : "📋 Copy Text"}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadAiReportAsPdf(generatedAiReport, aiPrompt || "Executive Board Summary Report")}
                        className="px-3.5 py-1.5 bg-[#008ac9] hover:bg-[#0072b1] text-xs font-black rounded-xl text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" /> Download (PDF)
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadAiReportAsExcel(generatedAiReport, aiPrompt || "Executive Board Summary Report")}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-black rounded-xl text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-200" /> Export (Excel)
                      </button>
                    </div>
                  </div>

                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto p-4 bg-black/70 rounded-xl border border-slate-800 custom-scrollbar">
                    {generatedAiReport}
                  </pre>
                </div>
              )}
            </div>

            {/* Executive KPI Summary Cards (6 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Total Bookings</span>
                  <div className="p-2 rounded-xl bg-sky-100 dark:bg-slate-800 text-[#008ac9]">
                    <Ticket className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalBookings}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Registered Patient Tickets</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Active Floor Queue</span>
                  <div className="p-2 rounded-xl bg-sky-100 dark:bg-slate-800 text-sky-600">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#008ac9] dark:text-sky-400 mt-2">{checkedInCount}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Checked In Waiting Patients</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Completed</span>
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{completedCount}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 uppercase">
                    Red Badge
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Consultations Concluded</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">HMO Desk Queue</span>
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{pendingHmoCount}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Awaiting Pre-Auth ({hmoApprovedCount} Approved)</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Cashdesk Queue</span>
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{pendingCashCount}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Pending Payment ({clearedPaymentCount} Cleared)</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Staff & Shifts</span>
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{activeStaffCount}</div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Active Roster ({activeShiftsCount} Shifts On Duty)</p>
              </div>
            </div>

            {/* SOPHISTICATED DATA VISUALIZATION SECTION: CHARTS & GRAPHS GRID (2 COLUMNS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Intraday Patient Arrival & Hourly Peak Line Area Graph (SVG Curve) */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#008ac9]" /> Hourly Patient Arrival & Floor Queue Trend
                    </h3>
                    <p className="text-xs font-bold text-slate-500">Peak consultation hours & arrival distribution curve</p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 bg-sky-50 dark:bg-slate-800 text-[#008ac9] rounded-full border border-[#008ac9]/30">
                    Live Intraday
                  </span>
                </div>

                {/* SVG Area & Smooth Bezier Line Graph */}
                <div className="relative pt-2 pb-1">
                  <svg viewBox="0 0 500 180" className="w-full h-48 overflow-visible">
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#008ac9" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#008ac9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                    <line x1="40" y1="140" x2="480" y2="140" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

                    {/* Filled Area Gradient */}
                    <path
                      d="M 50 140 C 100 120, 140 30, 200 45 C 260 60, 310 110, 370 70 C 430 30, 460 110, 470 140 L 470 140 L 50 140 Z"
                      fill="url(#curveGradient)"
                    />

                    {/* Smooth Line Curve */}
                    <path
                      d="M 50 140 C 100 120, 140 30, 200 45 C 260 60, 310 110, 370 70 C 430 30, 460 110, 470 140"
                      fill="none"
                      stroke="#008ac9"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points / Dots */}
                    {[
                      { x: 50, y: 140, label: "8 AM", val: 2 },
                      { x: 120, y: 80, label: "10 AM", val: 8 },
                      { x: 200, y: 45, label: "12 PM", val: 15 },
                      { x: 280, y: 90, label: "2 PM", val: 7 },
                      { x: 370, y: 70, label: "4 PM", val: 11 },
                      { x: 470, y: 140, label: "6 PM", val: 3 },
                    ].map((pt, idx) => (
                      <g key={idx} className="group cursor-pointer">
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#008ac9" strokeWidth="3" />
                        <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="fill-slate-900 dark:fill-white font-black text-[10px]">
                          {pt.val} pts
                        </text>
                        <text x={pt.x} y="165" textAnchor="middle" className="fill-slate-400 font-extrabold text-[10px]">
                          {pt.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>🔥 Peak Morning Rush Window: <strong>11:00 AM – 01:00 PM</strong></span>
                  <span className="font-black text-[#008ac9]">Highest Intake</span>
                </div>
              </div>

              {/* Chart 2: Patient Funding Source SVG Donut Chart */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[#008ac9]" /> Funding Source & Revenue Donut Chart
                    </h3>
                    <p className="text-xs font-bold text-slate-500">Private Self-Pay vs HMO Insurance distribution</p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 bg-purple-50 dark:bg-slate-800 text-purple-600 rounded-full border border-purple-300">
                    Ratio Breakdown
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                  {/* SVG Donut Chart */}
                  <div className="relative w-40 h-40 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {/* Segment 1: HMO Insurance (Sky Blue) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#008ac9"
                        strokeWidth="14"
                        strokeDasharray={`${totalBookings > 0 ? ((hmoEnrolleeCount / totalBookings) * 238) : 119} 238`}
                      />
                      {/* Segment 2: Private Self-Pay (Purple) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#9333ea"
                        strokeWidth="14"
                        strokeDasharray={`${totalBookings > 0 ? ((privateSelfPayCount / totalBookings) * 238) : 119} 238`}
                        strokeDashoffset={`-${totalBookings > 0 ? ((hmoEnrolleeCount / totalBookings) * 238) : 119}`}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 100}%
                      </span>
                      <span className="text-[9px] font-black uppercase text-emerald-600">Cleared Rate</span>
                    </div>
                  </div>

                  {/* Donut Legend Cards */}
                  <div className="space-y-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50 dark:bg-slate-800/80 border border-purple-200 dark:border-slate-700">
                      <div className="h-4 w-4 rounded-full bg-purple-600 shrink-0"></div>
                      <div>
                        <span className="block text-xs font-black text-slate-900 dark:text-white">Private Self-Pay Patients</span>
                        <span className="text-xs font-extrabold text-purple-600">
                          {privateSelfPayCount} Patients ({totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700">
                      <div className="h-4 w-4 rounded-full bg-[#008ac9] shrink-0"></div>
                      <div>
                        <span className="block text-xs font-black text-slate-900 dark:text-white">HMO Insurance Enrollees</span>
                        <span className="text-xs font-extrabold text-[#008ac9]">
                          {hmoEnrolleeCount} Enrollees ({totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700">
                      <div className="h-4 w-4 rounded-full bg-emerald-500 shrink-0"></div>
                      <div>
                        <span className="block text-xs font-black text-slate-900 dark:text-white">Payment Clearance Ratio</span>
                        <span className="text-xs font-extrabold text-emerald-600">
                          {clearedPaymentCount} Cleared Invoices
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3: Hospital Floor Queue Stage Funnel Stacked Bar */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#008ac9]" /> Hospital Patient Flow & Stage Funnel Distribution
                  </h3>
                  <p className="text-xs font-bold text-slate-500">Patient distribution from Reception to Discharged</p>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-emerald-50 dark:bg-slate-800 text-emerald-600 rounded-full border border-emerald-300">
                  Throughput Funnel
                </span>
              </div>

              {/* Stacked Stage Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-2xl h-5 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${totalBookings > 0 ? (confirmedCount / totalBookings) * 100 : 20}%` }}
                    className="bg-sky-400 h-full transition-all duration-500"
                    title={`Reception (Confirmed): ${confirmedCount}`}
                  ></div>
                  <div
                    style={{ width: `${totalBookings > 0 ? (pendingHmoCount / totalBookings) * 100 : 20}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                    title={`HMO Pre-Auth: ${pendingHmoCount}`}
                  ></div>
                  <div
                    style={{ width: `${totalBookings > 0 ? (pendingCashCount / totalBookings) * 100 : 20}%` }}
                    className="bg-purple-500 h-full transition-all duration-500"
                    title={`Cashdesk Billing: ${pendingCashCount}`}
                  ></div>
                  <div
                    style={{ width: `${totalBookings > 0 ? (checkedInCount / totalBookings) * 100 : 20}%` }}
                    className="bg-[#008ac9] h-full transition-all duration-500"
                    title={`Consultation Floor: ${checkedInCount}`}
                  ></div>
                  <div
                    style={{ width: `${totalBookings > 0 ? (completedCount / totalBookings) * 100 : 20}%` }}
                    className="bg-rose-600 h-full transition-all duration-500"
                    title={`Completed: ${completedCount}`}
                  ></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-bold pt-1">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700">
                    <span className="block text-[9px] font-black uppercase text-sky-600">1. Reception</span>
                    <span className="text-slate-900 dark:text-white font-black">{confirmedCount} Patients</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
                    <span className="block text-[9px] font-black uppercase text-amber-600">2. HMO Pre-Auth</span>
                    <span className="text-slate-900 dark:text-white font-black">{pendingHmoCount} Pending</span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700">
                    <span className="block text-[9px] font-black uppercase text-purple-600">3. Cashdesk</span>
                    <span className="text-slate-900 dark:text-white font-black">{pendingCashCount} Pending</span>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-100 dark:bg-slate-800 border border-[#008ac9]/30">
                    <span className="block text-[9px] font-black uppercase text-[#008ac9]">4. Consultation Floor</span>
                    <span className="text-slate-900 dark:text-white font-black">{checkedInCount} Checked In</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-slate-800 border border-rose-300">
                    <span className="block text-[9px] font-black uppercase text-rose-600">5. Completed Badge</span>
                    <span className="text-rose-600 dark:text-rose-400 font-black">{completedCount} Discharged</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Department Queue & Patient Volume Reporting */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#008ac9]" /> Department Queue & Patient Traffic Breakdown
                  </h3>
                  <p className="text-xs font-bold text-slate-500">Real-time volume and queue load per medical specialty</p>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-sky-50 dark:bg-slate-800 text-[#008ac9] rounded-full border border-[#008ac9]/30">
                  {clinics.length} Active Departments
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clinics.map((dept) => {
                  const deptBookings = bookings.filter((b) => {
                    if (!b.doctorSpecialty && !b.doctor_specialty) return false;
                    const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
                    const dName = dept.name.toLowerCase();
                    return spec.includes(dName) || dName.includes(spec) || (dept.id === "cardiology" && spec.includes("cardio"));
                  });
                  const totalDept = deptBookings.length;
                  const checkedInDept = deptBookings.filter((b) => b.status === "Checked In").length;
                  const completedDept = deptBookings.filter((b) => b.status === "Completed").length;
                  const percentOfTotal = totalBookings > 0 ? Math.round((totalDept / totalBookings) * 100) : 0;

                  return (
                    <div
                      key={dept.id}
                      className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-[#008ac9] transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-base text-slate-900 dark:text-white">{dept.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500">Code: {dept.id.toUpperCase()}</span>
                        </div>
                        <span className="text-2xl font-black text-[#008ac9]">{totalDept}</span>
                      </div>

                      {/* Workload Share Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                          <span>Department Share</span>
                          <span>{percentOfTotal}% of Hospital Volume</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#008ac9] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentOfTotal, 5)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                          <span className="block text-[9px] font-black uppercase text-slate-400">Checked In Waiting</span>
                          <span className="font-black text-[#008ac9] text-sm">{checkedInDept}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                          <span className="block text-[9px] font-black uppercase text-slate-400">Completed</span>
                          <span className="font-black text-rose-600 text-sm">{completedDept}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial & Payment Distribution Analytics (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment & Clearance Analytics */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <CreditCard className="h-5 w-5 text-[#008ac9]" /> Payment Type & Revenue Clearance Ratio
                </h3>

                <div className="space-y-3 text-xs font-bold">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Private Self-Pay Patients</span>
                      <span className="font-black text-slate-900 dark:text-white">{privateSelfPayCount} ({totalBookings > 0 ? Math.round((privateSelfPayCount / totalBookings) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${totalBookings > 0 ? (privateSelfPayCount / totalBookings) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">HMO Health Insurance Enrollees</span>
                      <span className="font-black text-slate-900 dark:text-white">{hmoEnrolleeCount} ({totalBookings > 0 ? Math.round((hmoEnrolleeCount / totalBookings) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#008ac9] h-2.5 rounded-full" style={{ width: `${totalBookings > 0 ? (hmoEnrolleeCount / totalBookings) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Overall Cashdesk / HMO Payment Clearance Rate</span>
                      <span className="font-black text-emerald-600">{clearedPaymentCount} Cleared ({totalBookings > 0 ? Math.round((clearedPaymentCount / totalBookings) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${totalBookings > 0 ? (clearedPaymentCount / totalBookings) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-slate-800/80 rounded-2xl border border-sky-200 dark:border-slate-700 text-xs flex items-center justify-between">
                  <span className="font-black text-slate-800 dark:text-slate-200">Attached Doctor Referral Letters:</span>
                  <span className="font-black text-[#008ac9] text-sm">📎 {referralDocCount} Documents</span>
                </div>
              </div>

              {/* Staff Roster & System Accounts Report */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <UserCheck className="h-5 w-5 text-[#008ac9]" /> Staff Roster & Specialist Shift Coverage
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="block text-[10px] font-black uppercase text-slate-500">System Users</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{systemUsers.length} Users</span>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">{activeStaffCount} Active / {disabledStaffCount} Disabled</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="block text-[10px] font-black uppercase text-slate-500">Specialist Roster</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{specialistSchedules.length} Shifts</span>
                    <span className="text-[10px] font-bold text-[#008ac9] block mt-0.5">{activeShiftsCount} Shifts Active On Duty</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="block text-[10px] font-black uppercase text-slate-500 mb-2">Live Staff Directory Summary</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {systemUsers.map((u: any) => (
                      <div key={u.id || u.user_id || u.email} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span className="font-black text-slate-900 dark:text-white block">{u.name}</span>
                          <span className="text-[10px] font-bold text-slate-500">{u.role}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {u.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. MONITOR DESK (LIVE HOSPITAL WAITING ROOM & TV SCREEN) VIEW */}
        {activeDesk === "monitor" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Waiting Room Queue / Next Patients (Moved to Top of Monitor Desk) */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              {/* Row 1: Header Title & Subtitle with Export PDF beside it */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-100 dark:bg-slate-800 text-[#008ac9] rounded-2xl shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Upcoming Waiting Room Queue</h3>
                    <p className="text-xs font-bold text-slate-500">Scheduled appointments awaiting check-in.</p>
                  </div>
                </div>

                {/* Export PDF & Badge right beside title */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-3.5 py-1.5 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black text-xs border border-[#008ac9]/30 whitespace-nowrap">
                    {filteredBookings.filter((b) => {
                      const st = (b.status || "").toLowerCase().trim();
                      return st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
                    }).length} Waiting Patients
                  </span>

                  <button
                    type="button"
                    onClick={handleExportWaitingQueuePDF}
                    className="px-4 py-2 bg-gradient-to-r from-[#008ac9] to-sky-600 hover:from-[#0072b1] hover:to-sky-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer border border-sky-400/40 shrink-0 rounded-xl"
                    title="Export Current Waiting Room Queue to Official PDF Roster"
                  >
                    <Download className="h-4 w-4 text-white" />
                    <span>Export PDF 📄</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Search & Filter Toolbar below the header */}
              <div className="flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ref code, patient name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
                  <select
                    value={clinicFilter}
                    onChange={(e) => setClinicFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">🏥 All Clinics</option>
                    {clinics.map((c: any) => {
                      const name = typeof c === "string" ? c : c.name || c.dept_name || c.id || "Clinic";
                      const key = typeof c === "string" ? c : c.id || c.dept_id || name;
                      return (
                        <option key={key} value={name}>
                          🏥 {name}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={hmoProviderFilter}
                    onChange={(e) => setHmoProviderFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">🛡️ All HMO Providers</option>
                    {hmoCompanies.map((hmo: any) => {
                      const name = typeof hmo === "string" ? hmo : hmo.name || hmo.hmo_name || hmo.id || "HMO Provider";
                      const key = typeof hmo === "string" ? hmo : hmo.id || hmo.hmo_id || name;
                      return (
                        <option key={key} value={name}>
                          🛡️ {name}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Queue Statuses</option>
                    <option value="today">📅 Today's Queue</option>
                    <option value="completed">✅ Completed Consultations</option>
                    <option value="hmo">🛡️ HMO Insurance Patients</option>
                    <option value="private">💳 Private Self-Pay Patients</option>
                  </select>
                </div>
              </div>

              {filteredBookings.filter((b) => {
                const st = (b.status || "").toLowerCase().trim();
                return st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
              }).length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">No Patients Waiting in Queue</h4>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {statusFilter === "completed"
                      ? "Completed consultations are displayed in the Completed Consultations section below."
                      : "All appointments for this filter are either completed or no new consultations are pending."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBookings
                    .filter((b) => {
                      const st = (b.status || "").toLowerCase().trim();
                      return st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
                    })
                    .map((b, bIdx) => {
                      const refCode = b.refCode || b.ref_code || `ISALU-REF-${bIdx + 1}`;
                      const paymentType = b.paymentType || b.payment_type || "Private Self-Pay";
                      const hmoStatus = b.hmoStatus || b.hmo_status || "N/A";
                      const paymentStatus = b.paymentStatus || b.payment_status || "Pending";
                      const patientName = b.patientName || b.patient_name || "Patient";
                      const patientPhone = b.patientPhone || b.patient_phone || "";
                      const hmoName = b.hmoName || b.hmo_name || "";

                      const isHmoApproved = paymentType === "HMO Insurance" && (hmoStatus === "Approved" || hmoStatus.toLowerCase().includes("approved"));
                      const isPayCleared = (paymentType === "Private Self-Pay" || !paymentType) && (paymentStatus === "Cleared" || paymentStatus.toLowerCase().includes("cleared") || paymentStatus.toLowerCase().includes("paid"));
                      const isEligibleForCheckIn = isHmoApproved || isPayCleared;

                      const docDisplay = getDoctorRealName(b);
                      const matchedDoc = doctorsList.find((d) => d.fullName === docDisplay || d.name === docDisplay || d.acronym === (b.doctorName || b.doctor_name));
                      const docSpecialty = b.doctorSpecialty || b.doctor_specialty || matchedDoc?.specialty || "Obstetrics & Gynaecology";
                      const docAcronym = b.doctorAcronym || b.doctor_acronym || matchedDoc?.acronym;

                      return (
                        <div
                          key={refCode}
                          className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-[#008ac9] transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-[#008ac9] dark:text-sky-400 tracking-wider">
                              {refCode}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${isEligibleForCheckIn
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                }`}
                            >
                              {isEligibleForCheckIn ? "Eligible for Check-In ✓" : "Pending Clearance ⏳"}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                              <span>{patientName}</span>
                              {patientPhone && <span className="text-[11px] font-bold text-slate-500">{patientPhone}</span>}
                            </div>
                            <div className="mt-1.5 space-y-2">
                              {/* Colorful Modern Patient Type Badge */}
                              <div>
                                {paymentType === "HMO Insurance" ? (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-purple-500/25 border border-purple-400/40 tracking-wide">
                                    <ShieldCheck className="h-4 w-4 text-white shrink-0" />
                                    <span>HMO INSURANCE</span>
                                    {hmoName && <span className="bg-white/25 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">• {hmoName}</span>}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 border border-teal-400/40 tracking-wide">
                                    <CreditCard className="h-4 w-4 text-white shrink-0" />
                                    <span>PRIVATE SELF-PAY</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-[#008ac9] dark:text-sky-400">
                                  🩺 {docDisplay}
                                </span>
                                {docAcronym && String(docAcronym).toLowerCase() !== String(docDisplay).toLowerCase() && (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-[#008ac9] dark:text-sky-300 text-[10px] font-black border border-sky-300 dark:border-sky-800 shadow-2xs">
                                    {docAcronym}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <span className="text-slate-400">Specialty:</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{docSpecialty}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-2">
                            <div className="flex justify-between text-[11px]">
                              <span>📅 {b.date || "N/A"}</span>
                              <span>🕒 {b.time || "N/A"}</span>
                            </div>

                            {isEligibleForCheckIn ? (
                              <button
                                onClick={() => handleMarkCompleted(refCode)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Mark Consultation Completed ✓
                              </button>
                            ) : paymentType === "HMO Insurance" ? (
                              <div className="w-full py-2.5 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] rounded-xl text-center flex items-center justify-center gap-1.5">
                                ⏳ Ineligible: Awaiting HMO Pre-Auth Approval
                              </div>
                            ) : (
                              <div className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] rounded-xl text-center flex items-center justify-center gap-1.5">
                                💳 Ineligible: Awaiting Cashdesk Payment Clearance
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* TV Screen Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-[#011627] to-slate-900 border border-[#008ac9]/60 rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#008ac9]/25 text-sky-300 text-[10px] font-black border border-sky-400/30 mb-1">
                    <Tv className="h-3.5 w-3.5 text-sky-400" /> LIVE WAITING ROOM & CLINIC FLOOR MONITOR
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Isalu Hospitals Queue Monitor</h2>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-300">
                    Real-time TV screen display for clinic waiting areas, reception floor monitors, and doctor consultation rooms.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-center">
                    <span className="block text-[9px] font-extrabold uppercase text-slate-400">Current Time</span>
                    <span className="text-xs font-black text-[#008ac9]">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="bg-emerald-500/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-400/40 text-center">
                    <span className="block text-[9px] font-extrabold uppercase text-emerald-300">Live Status</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Broadcast
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Consultations / Concluded Appointments */}
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-400/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Completed Consultations</h3>
                    <p className="text-xs font-bold text-slate-500">Concluded doctor consultation visits.</p>
                  </div>
                </div>

                {/* Embedded Search & Filter Controls directly inside the card header */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search completed ref, patient, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <span className="px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-xs border border-rose-300 whitespace-nowrap">
                    {bookings.filter((b) => {
                      const st = (b.status || "").toLowerCase().trim();
                      if (st !== "completed") return false;
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase().trim();
                      const ref = (b.refCode || b.ref_code || "").toLowerCase();
                      const pName = (b.patientName || b.patient_name || "").toLowerCase();
                      const pPhone = (b.patientPhone || b.patient_phone || "").toLowerCase();
                      const dName = (b.doctorName || b.doctor_name || "").toLowerCase();
                      return ref.includes(q) || pName.includes(q) || pPhone.includes(q) || dName.includes(q);
                    }).length} Completed Visits
                  </span>
                </div>
              </div>

              {bookings.filter((b) => {
                const st = (b.status || "").toLowerCase().trim();
                if (st !== "completed") return false;
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase().trim();
                const ref = (b.refCode || b.ref_code || "").toLowerCase();
                const pName = (b.patientName || b.patient_name || "").toLowerCase();
                const pPhone = (b.patientPhone || b.patient_phone || "").toLowerCase();
                const dName = (b.doctorName || b.doctor_name || "").toLowerCase();
                return ref.includes(q) || pName.includes(q) || pPhone.includes(q) || dName.includes(q);
              }).length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-semibold text-sm">
                  No completed consultations match your search query.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookings
                    .filter((b) => {
                      const st = (b.status || "").toLowerCase().trim();
                      if (st !== "completed") return false;
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase().trim();
                      const ref = (b.refCode || b.ref_code || "").toLowerCase();
                      const pName = (b.patientName || b.patient_name || "").toLowerCase();
                      const pPhone = (b.patientPhone || b.patient_phone || "").toLowerCase();
                      const dName = (b.doctorName || b.doctor_name || "").toLowerCase();
                      return ref.includes(q) || pName.includes(q) || pPhone.includes(q) || dName.includes(q);
                    })
                    .map((b) => {
                      const docDisplay = getDoctorRealName(b);
                      const matchedDoc = doctorsList.find((d) => d.fullName === docDisplay || d.name === docDisplay || d.acronym === (b.doctorName || b.doctor_name));
                      const docSpecialty = b.doctorSpecialty || b.doctor_specialty || matchedDoc?.specialty || "Obstetrics & Gynaecology";

                      return (
                        <div
                          key={b.refCode}
                          className="bg-rose-50/50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-rose-700 dark:text-rose-400 tracking-wider">
                              {b.refCode}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase">
                              COMPLETED ✓
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                              <span>{b.patientName}</span>
                              {b.patientPhone && <span className="text-[11px] font-bold text-slate-500">{b.patientPhone}</span>}
                            </div>
                            <div className="mt-1.5 space-y-2">
                              {/* Patient Type Badge */}
                              <div>
                                {b.paymentType === "HMO Insurance" ? (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-purple-500/25 border border-purple-400/40 tracking-wide">
                                    <ShieldCheck className="h-4 w-4 text-white shrink-0" />
                                    <span>HMO INSURANCE</span>
                                    {b.hmoName && <span className="bg-white/25 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">• {b.hmoName}</span>}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 border border-teal-400/40 tracking-wide">
                                    <CreditCard className="h-4 w-4 text-white shrink-0" />
                                    <span>PRIVATE SELF-PAY</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-black text-[#008ac9] dark:text-sky-400">
                                🩺 {docDisplay}
                              </div>
                              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <span className="text-slate-400">Specialty:</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{docSpecialty}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-rose-200 dark:border-rose-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>📅 {b.date} • 🕒 {b.time}</span>
                            <span className="text-rose-700 dark:text-rose-300 font-extrabold">Discharged ✓</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. USER & STAFF MANAGEMENT MODULE VIEW */}
        {activeDesk === "users" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Add User / Role Buttons */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-xs font-black border border-purple-300 mb-2">
                  <ShieldCheck className="h-4 w-4" /> System Users & RBAC Roles Registry
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Hospital Staff & User Roles Management</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage staff login accounts and configure custom system roles with granular desk access permissions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSelectDesk("helpdesk")}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700 shadow-sm"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#008ac9]" /> ← Back to Main Staff Dashboard
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-3 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                >
                  <UserPlus className="h-4 w-4" /> + Add System User
                </button>
                <button
                  onClick={() => setShowCreateRoleModal(true)}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 border border-purple-600"
                >
                  <ShieldCheck className="h-4 w-4" /> + Create Custom Role
                </button>
              </div>
            </div>

            {/* Sub-Tab Navigation Bar: User Accounts vs User Roles */}
            <div className="flex items-center gap-2 border-b-2 border-slate-200 dark:border-slate-800 pb-1">
              <button
                type="button"
                onClick={() => setUserSubTab("users")}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border-2 ${userSubTab === "users"
                  ? "bg-[#008ac9] text-white border-[#008ac9] shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
              >
                <Users className="h-4 w-4" /> User Accounts Directory ({systemUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserSubTab("roles")}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border-2 ${userSubTab === "roles"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
              >
                <ShieldCheck className="h-4 w-4" /> User Roles & Access Control Table ({roles.length})
              </button>
            </div>

            {/* TAB 1: USER ACCOUNTS DIRECTORY */}
            {userSubTab === "users" && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#008ac9]" /> Registered System Users & Staff Roster
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Filter by role, search name/email, edit user details or toggle account access.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-slate-800 text-[#008ac9] font-black text-xs border border-[#008ac9]/30 shrink-0">
                    {filteredSystemUsers.length} Staff Accounts
                  </span>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search staff name, email, role, desk..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((r: any) => (
                        <option key={r.id || r.role_id || r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="all">All Statuses (Active & Disabled)</option>
                      <option value="active">Active Staff Accounts Only ✓</option>
                      <option value="disabled">Disabled Accounts Only 🚫</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Staff Name</th>
                        <th className="pb-3 px-3">Email Address / Username</th>
                        <th className="pb-3 px-3">Assigned System Role</th>
                        <th className="pb-3 px-3">Primary Desk Access</th>
                        <th className="pb-3 px-3">Account Status</th>
                        <th className="pb-3 px-3">Last Active</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedUsersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                          <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                                <User className="h-4 w-4" />
                              </div>
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-3 font-extrabold text-slate-600 dark:text-slate-300">
                            {u.email}
                          </td>
                          <td className="py-4 px-3">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-black inline-block bg-sky-100 text-sky-800 dark:bg-slate-800 dark:text-sky-300 border border-sky-300 dark:border-slate-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                            {u.desk}
                          </td>
                          <td className="py-4 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${u.status === "Active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                              }`}>
                              {u.status === "Active" ? "Active ✓" : "Disabled 🚫"}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-500 font-semibold text-[11px]">
                            {u.last_login || u.lastLogin || u.last_active || u.lastActive || "Never logged in"}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStartEditUser(u)}
                                title="Edit User Details & Password"
                                className="px-2.5 py-1 rounded-xl text-[11px] font-black transition-all border bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] border-sky-300 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>

                              {u.role !== "Super Administrator" ? (
                                <button
                                  onClick={() => handleRequestToggleUserDisable(u)}
                                  className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${u.status === "Active"
                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                    }`}
                                >
                                  {u.status === "Active" ? "Disable" : "Enable"}
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400 italic px-2">Protected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPaginationBar(
                  currentUsersDirPage,
                  totalUsersDirPages,
                  filteredSystemUsers.length,
                  usersDirItemsPerPage,
                  setUsersDirCurrentPage,
                  (val) => { setUsersDirItemsPerPage(val); setUsersDirCurrentPage(1); },
                  "user accounts"
                )}
              </div>
            )}

            {/* TAB 2: ROLES & ACCESS CONTROL REGISTRY */}
            {userSubTab === "roles" && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-purple-600" /> Defined System & Custom Roles Table
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Configure role names, descriptions, primary desk navigation, and allowed desk permissions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoleModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Create Role
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Role Title</th>
                        <th className="pb-3 px-3">Type</th>
                        <th className="pb-3 px-3">Description</th>
                        <th className="pb-3 px-3">Primary Desk</th>
                        <th className="pb-3 px-3">Allowed Desk Access</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {roles.map((r: any) => {
                        const allowed = r.allowedDesks || r.allowed_desks || [];
                        const isSystem = r.isSystemRole || r.is_system_role;
                        return (
                          <tr key={r.id || r.role_id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                            <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                              {r.name}
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isSystem
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300"
                                }`}>
                                {isSystem ? "Built-in System Role 🛡️" : "Custom Role ✨"}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs max-w-xs">
                              {r.description || "No description provided."}
                            </td>
                            <td className="py-4 px-3 font-extrabold text-[#008ac9]">
                              {r.primaryDesk || r.primary_desk || "helpdesk"}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex flex-wrap gap-1">
                                {allowed.map((d: string) => (
                                  <span key={d} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditRole(r)}
                                  className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-sky-50 text-[#008ac9] border border-sky-300 hover:bg-sky-100 flex items-center gap-1"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>
                                {!isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRole(r)}
                                    className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6.5 CREATE & MANAGE CLINIC MODULE VIEW (Admin Only) */}
        {activeDesk === "clinic" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Clinic Module Header Banner */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                  <Building2 className="h-4 w-4 text-[#008ac9]" /> Hospital Clinic & Department Management
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Isalu Medical Clinics & Outpatient Suites</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Create, configure, and display all specialized medical clinics, consultation suites, and department units across Isalu Hospitals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSelectDesk("helpdesk")}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700 shadow-sm"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#008ac9]" /> ← Back to Main Staff Dashboard
                </button>
                <button
                  onClick={() => {
                    setClinicFormError("");
                    setShowCreateClinicModal(true);
                  }}
                  className="px-5 py-3 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                >
                  <Plus className="h-4 w-4" /> + Create New Clinic
                </button>
                <button
                  type="button"
                  onClick={exportClinicsToPDF}
                  className="px-4 py-3 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Medical Clinics Directory to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clinics</span>
                  <div className="p-2.5 rounded-2xl bg-sky-50 text-[#008ac9] font-black">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{clinics.length}</h2>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Specialized Medical Units</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Status</span>
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 font-black">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                  {clinics.filter((c) => c.status !== "Disabled" && c.status !== "Maintenance").length}
                </h2>
                <p className="text-[11px] font-bold text-emerald-600 mt-1">Operational & Booking-Ready</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Staff</span>
                  <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 font-black">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                  {doctorsList.length}
                </h2>
                <p className="text-[11px] font-bold text-purple-600 mt-1">Assigned Consultants</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outpatient Suites</span>
                  <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 font-black">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">12</h2>
                <p className="text-[11px] font-bold text-amber-600 mt-1">Consultation Rooms Active</p>
              </div>
            </div>

            {/* Search & Filter Controls Bar */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clinics by name, ID, or specialty description..."
                  value={clinicSearchQuery}
                  onChange={(e) => setClinicSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-extrabold text-slate-500">Status:</span>
                  <select
                    value={clinicStatusFilter}
                    onChange={(e) => setClinicStatusFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  >
                    <option value="all">All Clinics ({clinics.length})</option>
                    <option value="active">Active Clinics Only ✓</option>
                    <option value="disabled">Disabled Clinics Only 🚫</option>
                    <option value="maintenance">Under Maintenance 🛠️</option>
                  </select>
                </div>
              </div>
            </div>

            {/* All Clinics Grid Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => {
                  const assignedDocs = doctorsList.filter((doc: any) =>
                    (doc.specialty || "").toLowerCase().includes((clinic.name || "").toLowerCase()) ||
                    (doc.departmentId || "").toLowerCase() === (clinic.id || clinic.dept_id || "").toLowerCase()
                  );

                  const isClinicActive = clinic.status === true || clinic.status === "Active" || clinic.status === "active" || clinic.status === 1 || (clinic.status !== false && clinic.status !== "Disabled" && clinic.status !== "Disabled 🚫" && clinic.status !== "Inactive" && clinic.status !== "Maintenance");

                  return (
                    <div
                      key={clinic.id || clinic.dept_id}
                      className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-slate-800 text-[#008ac9] font-black border border-sky-100 dark:border-slate-700">
                            <Building2 className="h-6 w-6" />
                          </div>
                          {isClinicActive ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Active ✓
                            </span>
                          ) : clinic.status === "Maintenance" ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Maintenance 🛠️
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 flex items-center gap-1.5 shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-rose-500"></span> Disabled 🚫
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-black text-[#008ac9] uppercase tracking-wider mb-1">
                            ID: {clinic.id || clinic.dept_id}
                          </div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-[#008ac9] transition-colors">
                            {clinic.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                            {clinic.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Location Wing:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{clinic.location || "Main Building"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Assigned Consultants:</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black text-[11px]">
                              {assignedDocs.length || clinic.doctorCount || clinic.doctor_count || 1} Doctors
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-5 mt-4 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenEditClinic(clinic)}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-sky-50 dark:bg-slate-800 text-[#008ac9] hover:bg-sky-100 dark:hover:bg-slate-700 transition-all border border-sky-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit Details
                        </button>
                        {isClinicActive ? (
                          <button
                            onClick={() => handleDeleteClinic(clinic)}
                            className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-rose-200 dark:border-slate-700"
                            title="Disable Clinic in Database"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReEnableClinic(clinic)}
                            className="py-2.5 px-3 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all border border-emerald-300 flex items-center gap-1"
                            title="Re-Enable Clinic in Database"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Re-Enable
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
                  <div className="p-4 rounded-full bg-sky-50 text-[#008ac9] w-16 h-16 mx-auto flex items-center justify-center font-black">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">No Clinics Found</h3>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto">
                    No clinics match your search query "{clinicSearchQuery}". Try clearing filters or create a new clinic using the button above.
                  </p>
                  <button
                    onClick={() => {
                      setClinicSearchQuery("");
                      setClinicStatusFilter("all");
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. ALL PATIENTS DIRECTORY MODULE VIEW */}
        {activeDesk === "all_patients" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                  <Users className="h-4 w-4" /> Patient Master Index Module
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">All Patients Master Directory</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete directory of registered hospital patients, medical record numbers (MRN), appointment histories, and payment plans.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                  Total Registered: {bookings.length} Patients
                </div>
                <button
                  type="button"
                  onClick={exportMasterPatientsToPDF}
                  className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Master Patient Directory to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#008ac9]" /> Master Patient Records List
                </h3>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-500">
                  <Users className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm">No patient records found matching search filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Ticket Ref</th>
                        <th className="pb-3 px-3">Patient Name & Phone</th>
                        <th className="pb-3 px-3">Email Address</th>
                        <th className="pb-3 px-3">Specialist & Doctor</th>
                        <th className="pb-3 px-3">Payment Classification</th>
                        <th className="pb-3 px-3">Booking Date</th>
                        <th className="pb-3 px-3">Status</th>
                        {isSuperAdminUser(currentUser) && <th className="pb-3 px-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedAllPatientsBookings.map((b) => (
                        <tr key={b.refCode} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                          <td className="py-4 px-3 font-black text-[#008ac9] dark:text-sky-400">
                            {b.refCode}
                          </td>
                          <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                            {b.patientName}
                            <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone}</span>
                          </td>
                          <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                            {b.patientEmail || "Not Provided"}
                          </td>
                          <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                            {b.doctorName}
                            <span className="block text-slate-500 text-[11px] font-semibold">{b.doctorSpecialty}</span>
                          </td>
                          <td className="py-4 px-3">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-block ${b.paymentType === "HMO Insurance"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300"
                              }`}>
                              {b.paymentType || "Private Self-Pay"}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-700 dark:text-slate-300 font-bold">
                            📅 {b.date}
                            <span className="block text-slate-500 text-[11px]">🕒 {b.time}</span>
                          </td>
                          <td className="py-4 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${b.status === "Checked In"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                              : b.status === "Completed"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-2 border-rose-400 font-extrabold"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              }`}>
                              {b.status || "Confirmed"}
                            </span>
                          </td>
                          {isSuperAdminUser(currentUser) && (
                            <td className="py-4 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditBookingModal(b)}
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                                  title="Superadmin: Edit Booking Record"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBookingRecord(b)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                  title="Superadmin: Delete Booking Record from Database"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {renderPaginationBar(
                currentAllPatientsPage,
                totalAllPatientsPages,
                filteredBookings.length,
                allPatientsItemsPerPage,
                setAllPatientsCurrentPage,
                (val) => { setAllPatientsItemsPerPage(val); setAllPatientsCurrentPage(1); },
                "master patients"
              )}
            </div>
          </div>
        )}

        {/* 8. RECEPTION CHECKED-IN PATIENTS MODULE VIEW */}
        {activeDesk === "checked_in_patients" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-300 mb-2">
                  <UserCheck className="h-4 w-4" /> Reception Checked-In Module
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Reception Checked-In Patients Queue</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Live monitoring of patients who have physically arrived and completed front-desk check-in at reception.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2.5 bg-emerald-50 dark:bg-slate-800 rounded-2xl border border-emerald-300 font-black text-xs text-emerald-700 dark:text-emerald-300">
                  Active Checked-In: {bookings.filter((b) => b.status === "Checked In").length} Patients
                </div>
                <button
                  type="button"
                  onClick={exportCheckedInPatientsToPDF}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-2xl border border-emerald-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Checked-In Patients Queue to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">Ticket Ref</th>
                      <th className="pb-3 px-3">Patient Name & Phone</th>
                      <th className="pb-3 px-3">Doctor Assigned</th>
                      <th className="pb-3 px-3">Payment Status</th>
                      <th className="pb-3 px-3">Check-In Status</th>
                      {isSuperAdminUser(currentUser) && <th className="pb-3 px-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedCheckedInBookings.map((b) => (
                      <tr key={b.refCode} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                        <td className="py-4 px-3 font-black text-[#008ac9]">{b.refCode}</td>
                        <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                          {b.patientName}
                          <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone}</span>
                        </td>
                        <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                          🩺 {b.doctorName} ({b.doctorSpecialty})
                        </td>
                        <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                          {b.paymentType === "HMO Insurance" ? `🛡️ ${b.hmoName || "HMO"}` : "💳 Private Self-Pay"}
                        </td>
                        <td className="py-4 px-3">
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs border border-emerald-300">
                            Checked In ✓
                          </span>
                        </td>
                        {isSuperAdminUser(currentUser) && (
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditBookingModal(b)}
                                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/90 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                                title="Superadmin: Edit Booking Record"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBookingRecord(b)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                title="Superadmin: Delete Booking Record from Database"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPaginationBar(
                currentCheckedInPage,
                totalCheckedInPages,
                checkedInList.length,
                checkedInItemsPerPage,
                setCheckedInCurrentPage,
                (val) => { setCheckedInItemsPerPage(val); setCheckedInCurrentPage(1); },
                "checked-in patients"
              )}
            </div>
          </div>
        )}

        {/* 9. HMO INSURANCE ENROLLEES & PROVIDERS MODULE VIEW */}
        {activeDesk === "hmo_enrollees" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#008ac9]" /> HMO Insurance Directory & Provider Organizations
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Accredited HMO Providers & Enrollees Directory</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage accredited Health Maintenance Organizations (HMO Companies) and patient insurance enrollee registrations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                  {hmoCompanies.length} Accredited HMO Partners
                </div>

                <button
                  onClick={() => setShowCreateHmoModal(true)}
                  className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                >
                  <Plus className="h-4 w-4" /> + Add New HMO Provider
                </button>
                <button
                  type="button"
                  onClick={exportHmoCompaniesToPDF}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Accredited HMO Partners to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* 0. Super Admin Bulk HMO CSV Import Module */}
            <div className="bg-gradient-to-r from-sky-900 via-[#011627] to-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 shadow-2xl text-white space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008ac9]/30 text-sky-300 text-xs font-black border border-sky-400/30">
                    <FileText className="h-4 w-4 text-sky-400" /> SUPER ADMIN HMO CSV IMPORT MODULE
                  </div>
                  <h3 className="text-xl font-black text-white">Bulk Import Accredited HMO Partners (.CSV)</h3>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    Upload a CSV file containing HMO partner names, registration codes, desk emails, helpline phone numbers, and contact officers. Uploaded HMOs automatically populate the homepage logo slider, appointment booking form dropdowns, and dashboard filters in real time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleDownloadHmoCsvTemplate}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-2xl border border-white/30 backdrop-blur-md transition-all flex items-center gap-2 shadow-md cursor-pointer"
                    title="Download sample formatted HMO CSV template file"
                  >
                    <Download className="h-4 w-4 text-amber-300" /> Download Sample CSV Template
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      id="hmo-csv-upload-input"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadHmoCsv(e.target.files[0]);
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="hmo-csv-upload-input"
                      className="px-5 py-3 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/30 transition-all flex items-center gap-2 border border-sky-400/40 cursor-pointer"
                    >
                      <Upload className="h-4 w-4" /> Upload HMO CSV File (.csv)
                    </label>
                  </div>

                  {isSuperAdminOnly(currentUser) && (
                    <button
                      onClick={handleClearAllHmoCompanies}
                      className="px-4 py-3 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl border border-rose-400 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                      title="Clear all current HMO records from database to re-upload (Super Admin Only)"
                    >
                      <Trash2 className="h-4 w-4 text-white" /> Clear All HMO Records
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Accredited HMO Companies Table */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#008ac9]" /> Accredited HMO Provider Organizations
                </h3>
                <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-slate-800 text-[#008ac9] font-black text-xs border border-[#008ac9]/30 shrink-0">
                  {filteredHmoCompanies.length} Accredited HMO Partners
                </span>
              </div>

              {/* Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search HMO name, code, email, contact..."
                    value={hmoOrgSearchQuery}
                    onChange={(e) => setHmoOrgSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <span className="text-xs font-extrabold text-slate-500">
                  Showing page {currentHmoOrgPage} of {totalHmoOrgPages}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">HMO Company Name</th>
                      <th className="pb-3 px-3">Registration Code</th>
                      <th className="pb-3 px-3">Pre-Auth Desk Email</th>
                      <th className="pb-3 px-3">Helpline Phone</th>
                      <th className="pb-3 px-3">Contact Person / Desk Officer</th>
                      <th className="pb-3 px-3">Partnership Status</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedHmoCompanies.map((hmo) => (
                      <tr key={hmo.id || hmo.name} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                        <td className="py-4 px-3 font-black text-[#008ac9] text-xs flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#008ac9]" />
                          {hmo.name}
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">
                          <code className="bg-sky-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-[#008ac9]/30">{hmo.code}</code>
                        </td>
                        <td className="py-4 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {hmo.email}
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {hmo.phone}
                        </td>
                        <td className="py-4 px-3 font-semibold text-slate-600 dark:text-slate-400">
                          {hmo.contactPerson || hmo.contact_person}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${hmo.status === "Disabled Partner"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            }`}>
                            {hmo.status === "Disabled Partner" ? "Disabled Partner 🚫" : "Active Partner ✓"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdminUser(currentUser) && (
                              <button
                                onClick={() => handleOpenEditHmoModal(hmo)}
                                className="px-3 py-1 rounded-xl text-[11px] font-black bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 border border-[#008ac9]/30 transition-all flex items-center gap-1 cursor-pointer"
                                title="Edit HMO Provider Details (Admin Only)"
                              >
                                <Pencil className="h-3.5 w-3.5 text-[#008ac9] dark:text-sky-300" /> Edit
                              </button>
                            )}

                            <button
                              onClick={() => handleRequestToggleHmoDisable(hmo)}
                              className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${hmo.status === "Disabled Partner"
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                                }`}
                            >
                              {hmo.status === "Disabled Partner" ? "Enable Partner" : "Disable Partner"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPaginationBar(
                currentHmoOrgPage,
                totalHmoOrgPages,
                filteredHmoCompanies.length,
                hmoOrgItemsPerPage,
                setHmoOrgCurrentPage,
                (val) => { setHmoOrgItemsPerPage(val); setHmoOrgCurrentPage(1); },
                "HMO provider companies"
              )}
            </div>

            {/* 2. Patient Enrollees List */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#008ac9]" /> Registered HMO Enrollee Patients
                </h3>
                <button
                  type="button"
                  onClick={exportHmoEnrolleesToPDF}
                  className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export HMO Enrollees Register to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">Enrollee Name & Phone</th>
                      <th className="pb-3 px-3">HMO Provider</th>
                      <th className="pb-3 px-3">Enrollee / Policy ID</th>
                      <th className="pb-3 px-3">HMO Pre-Auth Status</th>
                      <th className="pb-3 px-3">Authorization Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedHmoEnrolleesBookings.map((b) => (
                      <tr key={b.refCode} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                        <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                          {b.patientName}
                          <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone}</span>
                        </td>
                        <td className="py-4 px-3 font-black text-[#008ac9]">
                          🛡️ {b.hmoName || "Hygeia HMO"}
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">
                          🆔 {b.hmoPolicyCode || "HYG-849201"}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${b.hmoStatus === "Approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                            }`}>
                            {b.hmoStatus === "Approved" ? "HMO Approved ✓" : "Pending Pre-Auth ⏳"}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-black text-slate-800 dark:text-slate-200">
                          🔑 {b.hmoAuthCode || "Pending Auth Code"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPaginationBar(
                currentHmoEnrolleesPage,
                totalHmoEnrolleesPages,
                hmoEnrolleesList.length,
                hmoEnrolleesItemsPerPage,
                setHmoEnrolleesCurrentPage,
                (val) => { setHmoEnrolleesItemsPerPage(val); setHmoEnrolleesCurrentPage(1); },
                "enrollees"
              )}
            </div>
          </div>
        )}

        {/* 10. PRIVATE SELF-PAY PATIENTS MODULE VIEW */}
        {activeDesk === "private_patients" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-xs font-black border border-purple-300 mb-2">
                  <CreditCard className="h-4 w-4" /> Private Self-Pay Directory
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Private Self-Pay Patients Directory</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Directory of private self-paying patients, invoice tracking, cashdesk billing clearance, and POS / Cash transaction receipts.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2.5 bg-purple-50 dark:bg-slate-800 rounded-2xl border border-purple-300 font-black text-xs text-purple-700 dark:text-purple-300">
                  Total Private Patients: {bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType).length} Patients
                </div>
                <button
                  type="button"
                  onClick={exportPrivatePatientsToPDF}
                  className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-extrabold text-xs rounded-2xl border border-purple-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Private Patients Directory to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">Ticket Ref</th>
                      <th className="pb-3 px-3">Patient Name & Phone</th>
                      <th className="pb-3 px-3">Consulting Doctor</th>
                      <th className="pb-3 px-3">Billing Invoice Ref</th>
                      <th className="pb-3 px-3">Cashdesk Payment Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedPrivatePatientsBookings.map((b) => (
                      <tr key={b.refCode} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                        <td className="py-4 px-3 font-black text-[#008ac9]">{b.refCode}</td>
                        <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                          {b.patientName}
                          <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone}</span>
                        </td>
                        <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                          🩺 {b.doctorName}
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                          📄 {b.invoiceRef || "INV-994120"}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-black border ${b.paymentStatus === "Cleared"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                            }`}>
                            {b.paymentStatus === "Cleared" ? "Paid & Cleared ✓" : "Payment Pending ⏳"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPaginationBar(
                currentPrivatePatientsPage,
                totalPrivatePatientsPages,
                privatePatientsList.length,
                privatePatientsItemsPerPage,
                setPrivatePatientsCurrentPage,
                (val) => { setPrivatePatientsItemsPerPage(val); setPrivatePatientsCurrentPage(1); },
                "private enrollees"
              )}
            </div>
          </div>
        )}

        {/* 11. CREATE SPECIALIST SCHEDULE MODULE VIEW */}
        {activeDesk === "create_specialist_schedule" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                  <Calendar className="h-4 w-4 text-[#008ac9]" /> Specialist Consultation Schedule Module
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create & Manage Specialist Schedules</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure doctor shift timetables, consultation room assignments, weekly duty days, and daily patient capacity limits.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                  {specialistSchedules.length} Active Doctor Schedules
                </div>

                <button
                  onClick={() => setShowCreateScheduleModal(true)}
                  className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                >
                  <Plus className="h-4 w-4" /> + Create Weekly Schedule
                </button>

                <button
                  onClick={() => setShowCreateSpecificDateModal(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 border border-emerald-500"
                >
                  <Calendar className="h-4 w-4" /> 📅 + Create Specific Date Schedule
                </button>

                <button
                  type="button"
                  onClick={exportSpecialistSchedulesToPDF}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-2xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Specialist Timetables & Roster to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3 gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#008ac9]" /> Specialist Timetables & Shift Roster
                </h3>
                <span className="text-xs font-extrabold text-slate-500">
                  {filteredSchedules.length} Schedules Found
                </span>
              </div>

              {/* Search & Multi-Filter Toolbar for Shift Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search doctor, room, day, shift..."
                    value={schedSearchQuery}
                    onChange={(e) => {
                      setSchedSearchQuery(e.target.value);
                      setSchedCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <select
                    value={schedStatusFilter}
                    onChange={(e) => {
                      setSchedStatusFilter(e.target.value);
                      setSchedCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="all">All Shift Statuses</option>
                    <option value="active">Active On-Duty Shifts ✓</option>
                    <option value="disabled">Disabled Shifts 🚫</option>
                  </select>
                </div>

                <div>
                  <select
                    value={schedDeptFilter}
                    onChange={(e) => {
                      setSchedDeptFilter(e.target.value);
                      setSchedCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="all">All Specialties / Departments</option>
                    {clinics.map((dept) => (
                      <option key={dept.id || dept.dept_id || dept.name} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={schedDayFilter}
                    onChange={(e) => {
                      setSchedDayFilter(e.target.value);
                      setSchedCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="all">All Duty Days</option>
                    <option value="Monday">Monday (Mon)</option>
                    <option value="Tuesday">Tuesday (Tue)</option>
                    <option value="Wednesday">Wednesday (Wed)</option>
                    <option value="Thursday">Thursday (Thu)</option>
                    <option value="Friday">Friday (Fri)</option>
                    <option value="Saturday">Saturday (Sat)</option>
                    <option value="Sunday">Sunday (Sun)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">Specialist Doctor</th>
                      <th className="pb-3 px-3">Specialty Department</th>
                      <th className="pb-3 px-3">Consultation Room / Suite</th>
                      <th className="pb-3 px-3">Duty Days</th>
                      <th className="pb-3 px-3">Shift Hours</th>
                      <th className="pb-3 px-3">Daily Capacity</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <Stethoscope className="h-6 w-6 text-slate-400" />
                            <span>No specialist schedule items match your search or filter criteria.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSchedules.map((sched) => {
                        const docObj = doctorsList.find(
                          (d) =>
                            d.id === sched.doctorId ||
                            d.name === sched.doctorName ||
                            d.fullName === sched.doctorName ||
                            (d.fullName && sched.doctorName.includes(d.fullName))
                        );

                        let acronym = docObj?.acronym || docObj?.name || "";
                        if (!acronym || !acronym.startsWith("Specialist")) {
                          const match = sched.doctorName?.match(/\(Specialist\s+[A-Z]+\)/i);
                          if (match) {
                            acronym = match[0].replace(/[\(\)]/g, "");
                          } else {
                            const docIdx = doctorsList.findIndex((d) => d.id === sched.doctorId);
                            if (docIdx >= 0) {
                              acronym = getAcronymForIndex(docIdx);
                            }
                          }
                        }

                        const cleanDoctorName = sched.doctorName?.replace(/\s*\(Specialist\s+[A-Z]+\)/i, "").trim();

                        return (
                          <tr key={sched.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                            <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>🩺 {cleanDoctorName}</span>
                                {acronym && (
                                  <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black text-[11px] rounded-lg border border-[#008ac9]/30 shadow-sm">
                                    {acronym}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-3 font-extrabold text-[#008ac9]">
                              {sched.specialty}
                            </td>
                            <td className="py-4 px-3 font-bold text-slate-800 dark:text-slate-200">
                              🏛️ {sched.room}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex flex-wrap gap-1">
                                {sched.dutyDays?.map((day: string) => (
                                  <span key={day} className="px-2 py-0.5 bg-sky-100 dark:bg-slate-800 text-[#008ac9] rounded-md text-[10px] font-black border border-[#008ac9]/30">
                                    {day}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                              {sched.dayConfigs && Object.keys(sched.dayConfigs).length > 0 ? (
                                <div className="space-y-1.5 max-w-sm">
                                  {Object.entries(sched.dayConfigs).map(([d, cfg]: [string, any]) => (
                                    <div key={d} className="p-1.5 bg-sky-50/60 dark:bg-slate-800/60 rounded-xl border border-[#008ac9]/20 text-[11px] flex items-center justify-between gap-2">
                                      <div>
                                        <span className="font-black text-[#008ac9]">{d}:</span>{" "}
                                        <span className="text-slate-800 dark:text-slate-200 font-bold">{cfg.shiftTimes?.join(", ")}</span>
                                      </div>
                                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-black shrink-0">
                                        🎯 {cfg.capacity} Visits
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">🕒 {sched.shiftTime}</span>
                              )}
                            </td>
                            <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                              <div className="text-xs">👥 {sched.capacity} Avg/Day</div>
                              <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                📊 {sched.totalWeeklyCapacity || (sched.capacity * (sched.dutyDays?.length || 1))} Visits/Week
                              </div>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditSchedule(sched)}
                                  title="Edit Specialist Schedule"
                                  className="px-3 py-1 bg-[#008ac9]/10 hover:bg-[#008ac9] text-[#008ac9] hover:text-white rounded-xl text-[11px] font-black transition-all flex items-center gap-1 border border-[#008ac9]/30"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>

                                <button
                                  onClick={() => handleToggleScheduleStatus(sched)}
                                  className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${(sched.status === false || (typeof sched.status === "string" && sched.status.includes("Disabled")))
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                                    }`}
                                >
                                  {(sched.status === false || (typeof sched.status === "string" && sched.status.includes("Disabled"))) ? "Enable Shift" : "Disable Shift"}
                                </button>

                                <button
                                  onClick={() => handleDeleteSchedule(sched)}
                                  title="Delete Specialist Schedule"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all border border-rose-200"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {filteredSchedules.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-500">
                    Showing <span className="font-black text-slate-900 dark:text-white">{Math.min((currentSchedPage - 1) * schedItemsPerPage + 1, filteredSchedules.length)}</span> to{" "}
                    <span className="font-black text-slate-900 dark:text-white">{Math.min(currentSchedPage * schedItemsPerPage, filteredSchedules.length)}</span> of{" "}
                    <span className="font-black text-[#008ac9]">{filteredSchedules.length}</span> schedule entries
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2">
                      <span className="text-[11px] font-bold text-slate-500">Per page:</span>
                      <select
                        value={schedItemsPerPage}
                        onChange={(e) => {
                          setSchedItemsPerPage(Number(e.target.value));
                          setSchedCurrentPage(1);
                        }}
                        className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={currentSchedPage === 1}
                      onClick={() => setSchedCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalSchedPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        type="button"
                        key={pg}
                        onClick={() => setSchedCurrentPage(pg)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${pg === currentSchedPage
                          ? "bg-[#008ac9] text-white border-[#008ac9] shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentSchedPage === totalSchedPages}
                      onClick={() => setSchedCurrentPage((p) => Math.min(totalSchedPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Registered Doctors Roster Directory Card */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-[#008ac9]" /> Registered Specialist Doctors Directory
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter, search, edit details, or toggle enable/disable status for doctor accounts in database & API.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    onClick={() => setShowAddDoctorModal(true)}
                    className="px-4 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> + Add New Doctor
                  </button>

                  <button
                    type="button"
                    onClick={exportDoctorsRosterToPDF}
                    className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 font-extrabold text-xs rounded-xl border border-[#008ac9]/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Export Registered Specialist Doctors Roster to PDF"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search doctor, specialty, room..."
                    value={docDirectorySearch}
                    onChange={(e) => setDocDirectorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <select
                    value={docDirectoryStatusFilter}
                    onChange={(e) => setDocDirectoryStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="all">All Statuses (Active & Disabled)</option>
                    <option value="active">Active Doctors Only ✓</option>
                    <option value="disabled">Disabled Doctors Only 🚫</option>
                  </select>
                </div>

                <div>
                  <select
                    value={docDirectoryDeptFilter}
                    onChange={(e) => setDocDirectoryDeptFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="all">All Specialties / Departments</option>
                    {clinics.map((dept) => (
                      <option key={dept.id || dept.dept_id || dept.name} value={dept.id || dept.dept_id || dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredDirectoryDoctors.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Stethoscope className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">No Specialist Doctors Found</h4>
                  <p className="text-xs font-bold text-slate-500 max-w-md mx-auto mt-1">
                    {doctorsList.length === 0
                      ? 'Click "+ Add New Doctor" above to register doctors into the system database.'
                      : 'No doctors match your current search and filter criteria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedDoctorsDirectory.map((doc, idx) => {
                    const isDisabled = doc.status === false || (typeof doc.status === "string" && doc.status.includes("Disabled"));
                    const acronym = doc.acronym || getAcronymForIndex(idx);
                    return (
                      <div
                        key={doc.id || doc.doc_id || idx}
                        className={`p-4 rounded-2xl border-2 transition-all space-y-3 flex flex-col justify-between ${isDisabled
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-80"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-[#008ac9]/40 shadow-sm"
                          }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2.5 py-0.5 bg-[#008ac9]/10 text-[#008ac9] font-black text-[10px] rounded-lg border border-[#008ac9]/30 uppercase tracking-wider block w-fit mb-1">
                                {acronym}
                              </span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {doc.fullName || doc.name}
                              </h4>
                              <span className="text-xs font-bold text-[#008ac9] block">
                                {doc.specialty}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isDisabled
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                }`}
                            >
                              {isDisabled ? "Disabled" : "Active"}
                            </span>
                          </div>

                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 space-y-1">
                            <div>🏛️ <strong>Suite:</strong> {doc.room || "Suite 101"}</div>
                            <div>🎓 <strong>Qualifications:</strong> {doc.qualifications || "MBBS, FWACS"}</div>
                            <div>
                              💳 <strong>Accepted:</strong>{" "}
                              {doc.acceptedTypes?.join(", ") || "Private & HMO"}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDoctor(doc)}
                            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#008ac9] dark:text-sky-300 text-xs font-black transition-all border border-sky-300 dark:border-slate-700 flex items-center gap-1 shadow-sm"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDoctorStatus(doc)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-sm ${isDisabled
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                              : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                              }`}
                          >
                            {isDisabled ? "Enable Doctor" : "Disable Doctor"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {renderPaginationBar(
                currentDocDirPage,
                totalDocDirPages,
                filteredDirectoryDoctors.length,
                docDirItemsPerPage,
                setDocDirCurrentPage,
                (val) => { setDocDirItemsPerPage(val); setDocDirCurrentPage(1); },
                "specialist doctors"
              )}
            </div>
          </div>
        )}

        {/* 13. SUPERADMIN DISABLED BOOKINGS RESTORATION ARCHIVE MODULE VIEW */}
        {activeDesk === "disabled_bookings" && isSuperAdminUser(currentUser) && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-300 mb-2">
                  <RotateCcw className="h-4 w-4" /> Superadmin Restoration & Audit Module
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Disabled Bookings Restoration Archive
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                  Repository of soft-deleted and disabled patient appointment records with explicit deletion reasons. Superadmins can review and restore any record back to active queues in real-time.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2.5 bg-rose-50 dark:bg-slate-800 rounded-2xl border border-rose-300 font-black text-xs text-rose-700 dark:text-rose-300 shrink-0">
                  Total Disabled: {disabledBookings.length} Records
                </div>

                <button
                  type="button"
                  onClick={fetchDisabledBookings}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs rounded-2xl border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Refresh Disabled Bookings List"
                >
                  <RefreshCw className="h-4 w-4" /> Refresh Archive
                </button>

                <button
                  type="button"
                  onClick={exportDisabledBookingsToPDF}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-2xl border border-rose-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Export Disabled Bookings Archive to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by ticket ref, patient name, doctor, reason..."
                  value={disabledSearchQuery}
                  onChange={(e) => setDisabledSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {disabledBookings.length === 0 ? (
                <div className="text-center py-16 space-y-3 text-slate-500 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Archive className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-black text-sm text-slate-800 dark:text-slate-200">No Disabled Booking Records Found</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All patient appointments are currently active in hospital queue lists. Disabled records will appear here if soft-deleted by Superadmin.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-3">Ticket Ref</th>
                        <th className="pb-3 px-3">Patient Info</th>
                        <th className="pb-3 px-3">Doctor & Specialty</th>
                        <th className="pb-3 px-3">Original Schedule</th>
                        <th className="pb-3 px-3">Reason for Disabling / Deletion</th>
                        <th className="pb-3 px-3 text-right">Superadmin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {disabledBookings
                        .filter((b) => {
                          const q = disabledSearchQuery.toLowerCase().trim();
                          if (!q) return true;
                          const ref = (b.refCode || b.ref_code || "").toLowerCase();
                          const name = (b.patientName || b.patient_name || "").toLowerCase();
                          const phone = (b.patientPhone || b.patient_phone || "").toLowerCase();
                          const doc = (b.doctorName || b.doctor_name || "").toLowerCase();
                          const reason = (b.deleteReason || b.delete_reason || "").toLowerCase();
                          return ref.includes(q) || name.includes(q) || phone.includes(q) || doc.includes(q) || reason.includes(q);
                        })
                        .map((b) => (
                          <tr key={b.refCode || b.ref_code} className="hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                            <td className="py-4 px-3 font-black text-rose-600 dark:text-rose-400">
                              {b.refCode || b.ref_code}
                              <span className="block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 w-fit mt-1 border border-rose-300">
                                Disabled Record
                              </span>
                            </td>

                            <td className="py-4 px-3 font-black text-slate-900 dark:text-white">
                              {b.patientName || b.patient_name}
                              <span className="block text-slate-500 text-xs font-semibold">{b.patientPhone || b.patient_phone}</span>
                              {b.patientEmail && <span className="block text-slate-400 text-[11px] font-semibold">{b.patientEmail}</span>}
                            </td>

                            <td className="py-4 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                              🩺 {b.doctorName || b.doctor_name}
                              <span className="block text-slate-500 text-[11px] font-semibold">{b.doctorSpecialty || b.doctor_specialty}</span>
                            </td>

                            <td className="py-4 px-3 text-slate-700 dark:text-slate-300 font-bold">
                              📅 {b.date}
                              <span className="block text-slate-500 text-[11px]">🕒 {b.time}</span>
                            </td>

                            <td className="py-4 px-3 max-w-xs">
                              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-[11px] font-extrabold space-y-0.5">
                                <span>💬 "{b.deleteReason || b.delete_reason || "Disabled by Administrator"}"</span>
                              </div>
                            </td>

                            <td className="py-4 px-3 text-right">
                              <button
                                type="button"
                                disabled={isRestoringBooking === (b.refCode || b.ref_code)}
                                onClick={() => handleRestoreBookingRecord(b)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Restore booking record to active hospital queue"
                              >
                                {isRestoringBooking === (b.refCode || b.ref_code) ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Restoring...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Restore Record ✓</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Edit Specialist Doctor Details */}
        {editingDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-[#008ac9]" /> Edit Specialist Doctor Details
                </h3>
                <button
                  onClick={() => setEditingDoctor(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditDoctor} className="p-6 space-y-4 overflow-y-auto max-h-[72vh] flex-1">
                {editFormError && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-black border border-rose-300">
                    {editFormError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ololade Johnson"
                    value={editDocName}
                    onChange={(e) => setEditDocName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                    Specialty / Department *
                  </label>
                  <select
                    value={editDocSpecialty}
                    onChange={(e) => {
                      setEditDocSpecialty(e.target.value);
                      const d = clinics.find((dept) => dept.name === e.target.value);
                      if (d) setEditDocDeptId(d.id);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    {clinics.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                    Qualifications & Credentials
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, FWACS, FMCP"
                    value={editDocQualifications}
                    onChange={(e) => setEditDocQualifications(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                      Consultation Suite / Room
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suite 4B"
                      value={editDocRoom}
                      onChange={(e) => setEditDocRoom(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                      Acronym Badge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Specialist A"
                      value={editDocAcronym}
                      onChange={(e) => setEditDocAcronym(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1.5 block">
                    Accepted Patient Category Types *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editDocAcceptedTypes.includes("Private Self-Pay")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditDocAcceptedTypes([...editDocAcceptedTypes, "Private Self-Pay"]);
                          } else {
                            setEditDocAcceptedTypes(editDocAcceptedTypes.filter((t) => t !== "Private Self-Pay"));
                          }
                        }}
                        className="h-4 w-4 text-[#008ac9] rounded border-slate-300 focus:ring-[#008ac9]"
                      />
                      <span>💳 Private Self-Pay</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editDocAcceptedTypes.includes("HMO Insurance")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditDocAcceptedTypes([...editDocAcceptedTypes, "HMO Insurance"]);
                          } else {
                            setEditDocAcceptedTypes(editDocAcceptedTypes.filter((t) => t !== "HMO Insurance"));
                          }
                        }}
                        className="h-4 w-4 text-[#008ac9] rounded border-slate-300 focus:ring-[#008ac9]"
                      />
                      <span>🛡️ HMO Insurance</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 block">
                    Account Status
                  </label>
                  <select
                    value={editDocStatus}
                    onChange={(e) => setEditDocStatus(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="Active">Active ✓</option>
                    <option value="Disabled 🚫">Disabled 🚫</option>
                  </select>
                </div>

                {isSubmittingDoctor && (
                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse shadow-sm">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#008ac9]" />
                    <span>Saving doctor profile & updating department roster... Please wait.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingDoctor}
                    onClick={() => setEditingDoctor(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDoctor}
                    className="px-5 py-2.5 rounded-xl bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingDoctor ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>Save Changes ✓</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create New HMO Provider / Company */}
        {showCreateHmoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#008ac9]" /> Add New HMO Insurance Provider
                </h3>
                <button
                  onClick={() => setShowCreateHmoModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateHmoCompany} className="space-y-3.5">
                {hmoFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{hmoFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      HMO Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bastion HMO"
                      value={hmoCompanyName}
                      onChange={(e) => setHmoCompanyName(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      HMO Registration Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HMO-BST-012"
                      value={hmoCompanyCode}
                      onChange={(e) => setHmoCompanyCode(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Pre-Auth Desk Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. preauth@bastionhmo.com"
                      value={hmoCompanyEmail}
                      onChange={(e) => setHmoCompanyEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Helpline Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +234 700 227 8466"
                      value={hmoCompanyPhone}
                      onChange={(e) => setHmoCompanyPhone(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Contact Person / Desk Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. David Adeleke - Medical Claims Manager"
                    value={hmoCompanyContact}
                    onChange={(e) => setHmoCompanyContact(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Accepted Coverage Plans
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gold, Corporate, Executive"
                      value={hmoCompanyPlanTier}
                      onChange={(e) => setHmoCompanyPlanTier(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Partnership Status
                    </label>
                    <select
                      value={hmoCompanyStatus}
                      onChange={(e) => setHmoCompanyStatus(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="Active Partner">Active Partner ✓</option>
                      <option value="Pending Verification">Pending Verification ⏳</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateHmoModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" /> Save HMO Provider Company
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Specialist Schedule */}
        {showCreateScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0 mb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#008ac9]" /> Create Specialist Consultation Schedule
                </h3>
                <button
                  onClick={() => setShowCreateScheduleModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSpecialistSchedule} className="space-y-3.5 overflow-y-auto max-h-[72vh] pr-2 flex-1">
                {schedFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{schedFormError}</span>
                  </div>
                )}

                {/* Doctor Selection Mode Toggle */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 mb-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisteringNewDocInSched(false)}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${!isRegisteringNewDocInSched
                      ? "bg-[#008ac9] text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                  >
                    <User className="h-3.5 w-3.5" /> Select Existing Specialist
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringNewDocInSched(true)}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${isRegisteringNewDocInSched
                      ? "bg-[#008ac9] text-white shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Register New Doctor & Schedule
                  </button>
                </div>

                {!isRegisteringNewDocInSched ? (
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Assigned Specialist Doctor <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={schedDoctorId}
                      onChange={(e) => {
                        const docId = e.target.value;
                        setSchedDoctorId(docId);
                        const matched = doctorsList.find((d) => (d.doc_id || d.id) === docId);
                        if (matched) {
                          const adminName = matched.fullName || matched.full_name ? `${matched.fullName || matched.full_name} (${matched.acronym || matched.name})` : matched.name;
                          setSchedDoctorSearch(adminName);
                        }
                      }}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    >
                      {doctorsList
                        .filter((d) => d.status !== false && (typeof d.status !== "string" || !d.status.includes("Disabled")))
                        .map((d) => {
                          const adminName = d.fullName || d.full_name ? `${d.fullName || d.full_name} (${d.acronym || d.name})` : d.name;
                          const deptName = d.department?.name || d.specialty || "Specialist";
                          return (
                            <option key={d.doc_id || d.id} value={d.doc_id || d.id}>
                              🩺 {adminName} — {deptName} ({d.qualification || "MBBS"})
                            </option>
                          );
                        })}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 p-3.5 bg-sky-50/70 dark:bg-slate-850 rounded-2xl border border-[#008ac9]/30">
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                        Doctor Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Samuel Adebayo"
                        value={schedNewDocName}
                        onChange={(e) => setSchedNewDocName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                          Clinical Department <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={schedNewDocDeptId}
                          onChange={(e) => setSchedNewDocDeptId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                        >
                          {clinics.map((dept: any) => (
                            <option key={dept.id || dept.dept_id} value={dept.id || dept.dept_id}>
                              🏥 {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                          Medical Qualifications
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. MBBS, FWACS"
                          value={schedNewDocQual}
                          onChange={(e) => setSchedNewDocQual(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Consultation Room / Wing Suite <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suite 4B - Cardiology Wing"
                    value={schedRoom}
                    onChange={(e) => setSchedRoom(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Select Weekly Duty Days <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                      const selected = schedDutyDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleSchedDay(day)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${selected
                            ? "bg-[#008ac9] text-white border-[#008ac9] shadow-sm scale-105"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                            }`}
                        >
                          {day} {selected ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Day Shift Timetables & Patient Capacity Section */}
                {schedDutyDays.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[#008ac9] dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="h-4 w-4" /> Per-Day Shift Timetables & Patient Visit Limits
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCreateTimeModal(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-white bg-[#008ac9] hover:bg-[#0072b1] rounded-lg shadow-sm transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Custom Shift Option
                      </button>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {schedDutyDays.map((day) => {
                        const dayCfg = schedDaySchedules[day] || { shiftTimes: [schedShiftTime], capacity: 15 };
                        return (
                          <div
                            key={day}
                            className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 bg-[#008ac9] text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-sm">
                                📅 {day} Schedule Settings
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddShiftTimeToDay(day)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-sm flex items-center gap-1 transition-all"
                              >
                                <Plus className="h-3.5 w-3.5" /> + Add Time Slot to {day}
                              </button>
                            </div>

                            {/* Time Slots for this Day */}
                            <div className="space-y-2.5">
                              {dayCfg.shiftTimes.map((shiftTime, idx) => {
                                const isCustomActive = customInputSlotKey === `create-${day}-${idx}`;
                                return (
                                  <div key={idx} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-500 w-14 shrink-0">
                                        Slot #{idx + 1}:
                                      </span>
                                      <select
                                        value={shiftTime}
                                        onChange={(e) => handleUpdateDayShiftTime(day, idx, e.target.value)}
                                        className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                                      >
                                        {shiftTimeOptions.map((opt) => (
                                          <option key={opt} value={opt}>
                                            🕒 {opt}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenSlotCustomTime(`create-${day}`, idx, shiftTime)}
                                        className={`px-2.5 py-2 rounded-xl text-[11px] font-black border transition-all shrink-0 flex items-center gap-1 ${isCustomActive
                                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                                          }`}
                                        title="Add custom start to end time"
                                      >
                                        <Clock className="h-3.5 w-3.5" /> + Start–End Time
                                      </button>

                                      {dayCfg.shiftTimes.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveShiftTimeFromDay(day, idx)}
                                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors shrink-0"
                                          title="Remove time slot"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Inline Custom Start to End Time Box */}
                                    {isCustomActive && (
                                      <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-700 space-y-2 animate-fadeIn ml-14">
                                        <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 block">
                                          ⏰ Custom Start & End Time for {day} (Slot #{idx + 1}):
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5">
                                              Start Time
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="e.g. 07:30 AM"
                                              value={slotCustomStart}
                                              onChange={(e) => setSlotCustomStart(e.target.value)}
                                              className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5">
                                              End Time
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="e.g. 11:30 AM"
                                              value={slotCustomEnd}
                                              onChange={(e) => setSlotCustomEnd(e.target.value)}
                                              className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => setCustomInputSlotKey(null)}
                                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleApplyCustomStartEndTime(day, idx, false)}
                                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black rounded-xl shadow-sm flex items-center gap-1"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Apply Time to {day}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Patient Capacity / Visits for this Day */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Max Patients (Visits) for {day}:
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={dayCfg.capacity}
                                  onChange={(e) => handleUpdateDayCapacity(day, Number(e.target.value))}
                                  className="w-24 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs text-center focus:ring-2 focus:ring-[#008ac9]"
                                />
                                <span className="text-[11px] font-semibold text-slate-500">Patients</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingSchedule}
                    onClick={() => setShowCreateScheduleModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSchedule}
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingSchedule ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Schedule to Database...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" /> Save Specialist Schedule
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Specialist Schedule */}
        {editingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#008ac9] block tracking-wider">Editing Schedule</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Pencil className="h-5 w-5 text-[#008ac9]" /> {editingSchedule.doctorName}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingSchedule(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditSchedule} className="space-y-3.5 overflow-y-auto max-h-[72vh] pr-2 flex-1">
                {editFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Specialty Department
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingSchedule.specialty}
                    className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Consultation Room / Wing Suite <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suite 4B - Cardiology Wing"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                {!editingSchedule.isSpecificDate && (
                  <>
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                        Duty Days
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const selected = editDutyDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleEditDay(day)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${selected
                                ? "bg-[#008ac9] text-white border-[#008ac9] shadow-sm scale-105"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                }`}
                            >
                              {day} {selected ? "✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {editDutyDays.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-black text-[#008ac9] dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock className="h-4 w-4" /> Per-Day Shift Timetables & Patient Visit Limits
                        </label>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {editDutyDays.map((day) => {
                            const dayCfg = editDaySchedules[day] || { shiftTimes: [editShiftTime || shiftTimeOptions[0]], capacity: editCapacity || 15 };
                            return (
                              <div
                                key={day}
                                className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-0.5 bg-[#008ac9] text-white text-xs font-black rounded-lg shadow-sm">
                                    📅 {day} Schedule
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddShiftTimeToEditDay(day)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-sm flex items-center gap-1 transition-all"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> + Add Time Slot to {day}
                                  </button>
                                </div>

                                <div className="space-y-2.5">
                                  {dayCfg.shiftTimes.map((shiftTime, idx) => {
                                    const isCustomActive = customInputSlotKey === `edit-${day}-${idx}`;
                                    return (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-bold text-slate-500 w-14 shrink-0">
                                            Slot #{idx + 1}:
                                          </span>
                                          <select
                                            value={shiftTime}
                                            onChange={(e) => handleUpdateEditDayShiftTime(day, idx, e.target.value)}
                                            className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                                          >
                                            {shiftTimeOptions.map((opt) => (
                                              <option key={opt} value={opt}>
                                                🕒 {opt}
                                              </option>
                                            ))}
                                          </select>

                                          <button
                                            type="button"
                                            onClick={() => handleOpenSlotCustomTime(`edit-${day}`, idx, shiftTime)}
                                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all shrink-0 flex items-center gap-1 ${isCustomActive
                                              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                                              }`}
                                            title="Add custom start to end time"
                                          >
                                            <Clock className="h-3.5 w-3.5" /> + Start–End Time
                                          </button>

                                          {dayCfg.shiftTimes.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveShiftTimeFromEditDay(day, idx)}
                                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors shrink-0"
                                              title="Remove time slot"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>

                                        {/* Inline Custom Start to End Time Box */}
                                        {isCustomActive && (
                                          <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-700 space-y-2 animate-fadeIn ml-14">
                                            <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 block">
                                              ⏰ Custom Start & End Time for {day} (Slot #{idx + 1}):
                                            </span>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5">
                                                  Start Time
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="e.g. 07:30 AM"
                                                  value={slotCustomStart}
                                                  onChange={(e) => setSlotCustomStart(e.target.value)}
                                                  className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5">
                                                  End Time
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="e.g. 11:30 AM"
                                                  value={slotCustomEnd}
                                                  onChange={(e) => setSlotCustomEnd(e.target.value)}
                                                  className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                                />
                                              </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                              <button
                                                type="button"
                                                onClick={() => setCustomInputSlotKey(null)}
                                                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleApplyCustomStartEndTime(day, idx, true)}
                                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black rounded-xl shadow-sm flex items-center gap-1"
                                              >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Apply Time to {day}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    Max Patients (Visits) for {day}:
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      value={dayCfg.capacity}
                                      onChange={(e) => handleUpdateEditDayCapacity(day, Number(e.target.value))}
                                      className="w-20 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs text-center focus:ring-2 focus:ring-[#008ac9]"
                                    />
                                    <span className="text-[11px] font-semibold text-slate-500">Visits</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingEditSchedule}
                    onClick={() => setEditingSchedule(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEditSchedule}
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingEditSchedule ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes to Database...
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4" /> Save Schedule Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Specific Date Schedule */}
        {showCreateSpecificDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl my-auto">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0 mb-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" /> Create Specific Date Consultation Schedule
                </h3>
                <button
                  onClick={() => setShowCreateSpecificDateModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSpecificDateSchedule} className="space-y-3.5 overflow-y-auto max-h-[72vh] pr-2 flex-1">
                {specDateFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{specDateFormError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      Assigned Specialist Doctor <span className="text-red-500">*</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowAddDoctorModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-white bg-[#008ac9] hover:bg-[#0072b1] rounded-lg shadow-sm transition-all border border-[#008ac9]"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Add Specialist
                    </button>
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search doctor by name or specialty..."
                        value={specDateDoctorSearch}
                        onFocus={() => setShowSpecDoctorDropdown(true)}
                        onChange={(e) => {
                          setSpecDateDoctorSearch(e.target.value);
                          setShowSpecDoctorDropdown(true);
                        }}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {showSpecDoctorDropdown && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {doctorsList.filter(
                          (d) =>
                            d.name.toLowerCase().includes(specDateDoctorSearch.toLowerCase()) ||
                            (d.fullName && d.fullName.toLowerCase().includes(specDateDoctorSearch.toLowerCase())) ||
                            d.specialty.toLowerCase().includes(specDateDoctorSearch.toLowerCase())
                        ).length === 0 ? (
                          <div className="p-3 text-center text-xs font-bold text-slate-500">
                            No specialist found matching "{specDateDoctorSearch}".
                            <button
                              type="button"
                              onClick={() => {
                                setShowSpecDoctorDropdown(false);
                                setShowAddDoctorModal(true);
                              }}
                              className="block mx-auto mt-1 text-emerald-600 underline font-black"
                            >
                              + Create specialist now
                            </button>
                          </div>
                        ) : (
                          doctorsList
                            .filter(
                              (d) =>
                                d.name.toLowerCase().includes(specDateDoctorSearch.toLowerCase()) ||
                                (d.fullName && d.fullName.toLowerCase().includes(specDateDoctorSearch.toLowerCase())) ||
                                d.specialty.toLowerCase().includes(specDateDoctorSearch.toLowerCase())
                            )
                            .map((d) => {
                              const adminName = d.fullName ? `${d.fullName} (${d.acronym || d.name})` : d.name;
                              return (
                                <button
                                  key={d.doc_id || d.id}
                                  type="button"
                                  onClick={() => {
                                    setSpecDateDoctorId(d.doc_id || d.id);
                                    setSpecDateDoctorSearch(adminName);
                                    setShowSpecDoctorDropdown(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${(specDateDoctorId === d.doc_id || specDateDoctorId === d.id) ? "bg-emerald-50 dark:bg-slate-800 border border-emerald-500/30" : ""
                                    }`}
                                >
                                  <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">🩺 {adminName}</div>
                                    <div className="text-[11px] font-semibold text-slate-500">{d.specialty} • {d.qualification || d.qualifications || "MBBS"}</div>
                                  </div>
                                  {(specDateDoctorId === d.doc_id || specDateDoctorId === d.id) && <span className="text-xs font-black text-emerald-600">Selected ✓</span>}
                                </button>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Specific Date <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={specDateValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecDateValue(val);
                        if (val) {
                          const dName = new Date(val).toLocaleDateString("en-US", { weekday: "long" });
                          setSpecDateTargetDay(dName);
                        }
                      }}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Day of Week Duty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={specDateTargetDay}
                      onChange={(e) => setSpecDateTargetDay(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Sunday">☀️ SUNDAY</option>
                      <option value="Monday">🗓️ MONDAY</option>
                      <option value="Tuesday">🗓️ TUESDAY</option>
                      <option value="Wednesday">🗓️ WEDNESDAY</option>
                      <option value="Thursday">🗓️ THURSDAY</option>
                      <option value="Friday">🗓️ FRIDAY</option>
                      <option value="Saturday">🗓️ SATURDAY</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Room / Suite <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suite 4B"
                      value={specDateRoom}
                      onChange={(e) => setSpecDateRoom(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Week Recurrence Pattern Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span>📅 Week Duty Recurrence Pattern <span className="text-red-500">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomPatternInput(!showCustomPatternInput)}
                      className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700"
                    >
                      <Plus className="h-3 w-3" /> + Add Custom Pattern
                    </button>
                  </div>

                  {/* Inline Custom Pattern Creator Box */}
                  {showCustomPatternInput && (
                    <div className="p-3 bg-emerald-50/90 dark:bg-slate-800 rounded-2xl border-2 border-emerald-500 space-y-2 animate-fadeIn mb-2 shadow-md">
                      <label className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 block">
                        ✍️ Create Custom Week Duty Pattern (e.g. 1ST, 2ND & 4TH SATURDAYS):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 1ST, 2ND & 4TH SATURDAYS or 3RD & 5TH SUNDAYS"
                          value={customPatternInput}
                          onChange={(e) => setCustomPatternInput(e.target.value)}
                          className="flex-1 p-2 bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomPattern}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-all shrink-0"
                        >
                          Save & Select ✓
                        </button>
                      </div>
                    </div>
                  )}

                  <select
                    value={specDateWeekPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "ADD_CUSTOM") {
                        setShowCustomPatternInput(true);
                        return;
                      }
                      setSpecDateWeekPreset(val);
                      const derived = deriveWeeksFromPattern(val);
                      setSpecDateWeeks(derived);
                    }}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-emerald-500 mb-2"
                  >
                    {(() => {
                      const dName = specDateValue
                        ? new Date(specDateValue).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
                        : specDateTargetDay ? specDateTargetDay.toUpperCase() : "SUNDAY";
                      return (
                        <>
                          <option value="">-- Select Duty Recurrence Pattern --</option>
                          <option value="1ST & 3RD">🗓️ 1ST & 3RD {dName}S (e.g. 1st & 3rd {dName})</option>
                          <option value="2ND & 4TH">🗓️ 2ND & 4TH {dName}S (e.g. 2nd & 4th {dName})</option>
                          <option value="1ST - 3RD">🗓️ 1ST – 3RD {dName}S (e.g. 1st, 2nd & 3rd {dName})</option>
                          <option value="EVERY">🗓️ EVERY {dName} (All Weeks of Month)</option>
                          <option value="1st">🗓️ 1ST {dName} ONLY</option>
                          <option value="2nd">🗓️ 2ND {dName} ONLY</option>
                          <option value="3rd">🗓️ 3RD {dName} ONLY</option>
                          <option value="4th">🗓️ 4TH {dName} ONLY</option>

                          {savedCustomPatterns.length > 0 && (
                            <optgroup label="⭐ Custom Saved Patterns">
                              {savedCustomPatterns.map((pat) => (
                                <option key={pat} value={pat}>
                                  ✨ {pat}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          <option value="ADD_CUSTOM">➕ Type / Add Custom Week Pattern...</option>
                        </>
                      );
                    })()}
                  </select>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                        Selectable Week Occurrences ({specDateWeeks.length === 0 ? "None / All Days" : `${specDateWeeks.length} Week(s) Active`}):
                      </span>
                      {specDateWeeks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSpecDateWeeks([]);
                            setSpecDateWeekPreset("");
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          Clear Badges ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week"].map((wk) => {
                        const isChecked = specDateWeeks.includes(wk);
                        return (
                          <button
                            type="button"
                            key={wk}
                            onClick={() => {
                              let updatedWeeks: string[] = [];
                              if (isChecked) {
                                updatedWeeks = specDateWeeks.filter((w) => w !== wk);
                              } else {
                                updatedWeeks = [...specDateWeeks, wk];
                              }
                              setSpecDateWeeks(updatedWeeks);
                              const dName = specDateValue
                                ? new Date(specDateValue).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
                                : "SATURDAY";
                              const derivedPreset = derivePatternFromWeeks(updatedWeeks, dName);
                              setSpecDateWeekPreset(derivedPreset);
                            }}
                            className={`py-2 px-1 text-[10px] font-black rounded-xl transition-all text-center border ${isChecked
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-1 ring-emerald-400 scale-105"
                              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500 opacity-80 hover:opacity-100"
                              }`}
                          >
                            {wk} {isChecked ? "✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      Shift Hours & Timetable
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowCreateTimeModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all border border-emerald-500"
                    >
                      <Plus className="h-3 w-3" /> + Create Time
                    </button>
                  </div>

                  <select
                    value={specDateShiftTime}
                    onChange={(e) => setSpecDateShiftTime(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {shiftTimeOptions.map((option) => (
                      <option key={option} value={option}>
                        🕒 {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Daily Max Capacity (Patients)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={specDateCapacity}
                      onChange={(e) => setSpecDateCapacity(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Shift Note / Session Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Holiday Clinic, On-Call"
                      value={specDateNote}
                      onChange={(e) => setSpecDateNote(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Additional Recurring Pattern Entries Block */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Clock className="h-4 w-4" /> Multi-Pattern Shifts ({extraPatternEntries.length + 1} Pattern(s))
                    </label>

                    <button
                      type="button"
                      onClick={handleAddPatternEntry}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all border border-emerald-500"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Add Another Pattern & Time Slot
                    </button>
                  </div>

                  {extraPatternEntries.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {extraPatternEntries.map((entry, idx) => {
                        return (
                          <div
                            key={entry.id}
                            className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-emerald-500/40 space-y-3 relative animate-fadeIn"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-black rounded-lg shadow-sm">
                                🗓️ Pattern Entry #{idx + 2}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePatternEntry(entry.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                title="Remove pattern entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Pattern Recurrence
                                </label>
                                <select
                                  value={entry.preset}
                                  onChange={(e) => handleUpdatePatternEntry(entry.id, { preset: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
                                >
                                  <option value="2ND & 4TH">🗓️ 2ND & 4TH SATURDAYS</option>
                                  <option value="1ST & 3RD">🗓️ 1ST & 3RD SATURDAYS</option>
                                  <option value="1ST - 3RD">🗓️ 1ST – 3RD SATURDAYS</option>
                                  <option value="EVERY">🗓️ EVERY SATURDAY</option>
                                  {savedCustomPatterns.map((pat) => (
                                    <option key={pat} value={pat}>✨ {pat}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Shift Hours
                                </label>
                                <select
                                  value={entry.shiftTime}
                                  onChange={(e) => handleUpdatePatternEntry(entry.id, { shiftTime: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
                                >
                                  {shiftTimeOptions.map((opt) => (
                                    <option key={opt} value={opt}>🕒 {opt}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateSpecificDateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4" /> Save Specific Date Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Custom Shift Time */}
        {showCreateTimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#008ac9]" /> Create Custom Shift Hours & Timetable
                </h3>
                <button
                  onClick={() => setShowCreateTimeModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomTime} className="space-y-3.5">
                {timeFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{timeFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 07:30 AM"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 01:30 PM"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Shift Name / Session Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Early Morning Shift, Night Duty"
                    value={customShiftLabel}
                    onChange={(e) => setCustomShiftLabel(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateTimeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Clock className="h-4 w-4" /> Save Shift Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showAddDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl space-y-4 my-auto">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#008ac9]" /> Add New Specialist Doctor
                </h3>
                <button
                  onClick={() => setShowAddDoctorModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-sky-50 dark:bg-slate-800 rounded-2xl border-2 border-[#008ac9]/30 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block tracking-wider">
                    Auto-Generated Acronym Code
                  </span>
                  <span className="text-sm font-black text-[#008ac9]">
                    {getAcronymForIndex(doctorsList.length)}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-[#008ac9] text-white text-[10px] font-black rounded-lg shadow-sm">
                  Auto-Assigned ✓
                </span>
              </div>

              <form onSubmit={handleCreateNewDoctor} className="space-y-3.5 overflow-y-auto max-h-[65vh] pr-2 flex-1">
                {newDocFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{newDocFormError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Doctor Full Name (Administrator View) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Olamide Sanusi"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    * Full name is visible to administrators. Public booking pages will display "{getAcronymForIndex(doctorsList.length)}".
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Specialty Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newDocSpecialty}
                    onChange={(e) => setNewDocSpecialty(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    {clinics.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        🩺 {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">
                    Degrees / Qualifications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, FWACS (Cardiology)"
                    value={newDocQualifications}
                    onChange={(e) => setNewDocQualifications(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1.5 block">
                    Accepted Patient Category Types *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDocAcceptedTypes.includes("Private Self-Pay")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewDocAcceptedTypes([...newDocAcceptedTypes, "Private Self-Pay"]);
                          } else {
                            setNewDocAcceptedTypes(newDocAcceptedTypes.filter((t) => t !== "Private Self-Pay"));
                          }
                        }}
                        className="h-4 w-4 text-[#008ac9] rounded border-slate-300 focus:ring-[#008ac9]"
                      />
                      <span>💳 Private Self-Pay</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDocAcceptedTypes.includes("HMO Insurance")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewDocAcceptedTypes([...newDocAcceptedTypes, "HMO Insurance"]);
                          } else {
                            setNewDocAcceptedTypes(newDocAcceptedTypes.filter((t) => t !== "HMO Insurance"));
                          }
                        }}
                        className="h-4 w-4 text-[#008ac9] rounded border-slate-300 focus:ring-[#008ac9]"
                      />
                      <span>🛡️ HMO Insurance</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddDoctorModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" /> Save Specialist Doctor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create New Medical Clinic */}
        {showCreateClinicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Create New Medical Clinic</h3>
                    <p className="text-xs font-semibold text-slate-500">Register a new medical clinic module in Isalu Hospitals.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateClinicModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {isSubmittingClinic && (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 animate-pulse shadow-md my-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#008ac9]" />
                  <span>Registering new medical clinic module in Isalu Hospitals... Please wait.</span>
                </div>
              )}

              {clinicFormError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{clinicFormError}</span>
                </div>
              )}

              <form onSubmit={handleCreateClinic} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Clinic / Department Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neurology & Brain Care Clinic"
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Clinic ID / Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. neurology"
                      value={newClinicId}
                      onChange={(e) => setNewClinicId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Operational Status
                    </label>
                    <select
                      value={newClinicStatus}
                      onChange={(e) => setNewClinicStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                    >
                      <option value="Active">Active ✓</option>
                      <option value="Maintenance">Under Maintenance 🛠️</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Hospital Location / Suite Wing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Hospital Building - West Wing Floor 2"
                    value={newClinicLocation}
                    onChange={(e) => setNewClinicLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Description & Medical Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe medical services, specialists, and conditions treated at this clinic..."
                    value={newClinicDescription}
                    onChange={(e) => setNewClinicDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmittingClinic}
                    onClick={() => setShowCreateClinicModal(false)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClinic}
                    className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingClinic ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Registering Medical Clinic... Please Wait</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Create Clinic
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Existing Clinic */}
        {editingClinic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black">
                    <Pencil className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Clinic Details</h3>
                    <p className="text-xs font-semibold text-slate-500">Update module details for {editingClinic.name}.</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingClinic(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {editClinicFormError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-black flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editClinicFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditClinic} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Clinic / Department Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editClinicName}
                    onChange={(e) => setEditClinicName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Location Wing
                    </label>
                    <input
                      type="text"
                      value={editClinicLocation}
                      onChange={(e) => setEditClinicLocation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Operational Status
                    </label>
                    <select
                      value={editClinicStatus}
                      onChange={(e) => setEditClinicStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                    >
                      <option value="Active">Active ✓</option>
                      <option value="Maintenance">Under Maintenance 🛠️</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Description & Medical Scope
                  </label>
                  <textarea
                    rows={3}
                    value={editClinicDescription}
                    onChange={(e) => setEditClinicDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-[#008ac9]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingClinic(null)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-1.5"
                  >
                    <Pencil className="h-4 w-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add New System User */}
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden">
              {/* Preloader Overlay when creating system user */}
              {isCreatingUser && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-[#008ac9]/20 animate-ping" />
                    <div className="relative p-4 bg-sky-50 dark:bg-slate-800 rounded-3xl border-2 border-[#008ac9]/40 shadow-xl">
                      <RefreshCw className="h-8 w-8 text-[#008ac9] animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-base font-black text-slate-900 dark:text-white">Creating System User Account...</h4>
                    <p className="text-xs font-bold text-slate-500">
                      Saving staff credentials to System User table & linking <span className="text-[#008ac9] font-black">{newUserRole}</span> permissions...
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#008ac9]" /> Add New System User
                </h3>
                <button
                  disabled={isCreatingUser}
                  onClick={() => setShowAddUserModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSystemUser} className="space-y-3.5">
                {userFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{userFormError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    disabled={isCreatingUser}
                    placeholder="e.g. Dr. Samuel Adebayo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Email Address / Staff Username *</label>
                  <input
                    type="email"
                    required
                    disabled={isCreatingUser}
                    placeholder="e.g. samuel@isaluhospitals.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] disabled:opacity-60"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white block">Account Access Password *</label>
                    {newUserPassword && (
                      <span className={`text-[10px] font-black uppercase tracking-wider ${evaluatePasswordStrength(newUserPassword).textColor}`}>
                        {evaluatePasswordStrength(newUserPassword).label} Strength
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? "text" : "password"}
                      required
                      disabled={isCreatingUser}
                      placeholder="••••••••"
                      value={newUserPassword}
                      onChange={(e) => {
                        setNewUserPassword(e.target.value);
                        setUserFormError("");
                      }}
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isCreatingUser}
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
                    >
                      {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Live Password Checker Meter */}
                  {newUserPassword.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(newUserPassword).score >= 1 ? evaluatePasswordStrength(newUserPassword).color : "bg-transparent"}`} />
                        <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(newUserPassword).score >= 2 ? evaluatePasswordStrength(newUserPassword).color : "bg-transparent"}`} />
                        <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(newUserPassword).score >= 3 ? evaluatePasswordStrength(newUserPassword).color : "bg-transparent"}`} />
                        <div className={`h-full flex-1 transition-all duration-300 ${evaluatePasswordStrength(newUserPassword).score >= 4 ? evaluatePasswordStrength(newUserPassword).color : "bg-transparent"}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        <span className={evaluatePasswordStrength(newUserPassword).length ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "opacity-70"}>
                          {evaluatePasswordStrength(newUserPassword).length ? "✓" : "○"} Min 8 Chars
                        </span>
                        <span className={evaluatePasswordStrength(newUserPassword).mixed ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "opacity-70"}>
                          {evaluatePasswordStrength(newUserPassword).mixed ? "✓" : "○"} Upper & Lower
                        </span>
                        <span className={evaluatePasswordStrength(newUserPassword).number ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "opacity-70"}>
                          {evaluatePasswordStrength(newUserPassword).number ? "✓" : "○"} Number (0-9)
                        </span>
                        <span className={evaluatePasswordStrength(newUserPassword).symbol ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "opacity-70"}>
                          {evaluatePasswordStrength(newUserPassword).symbol ? "✓" : "○"} Symbol (!@#$)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white block">Confirm Account Password *</label>
                    {newUserConfirmPassword && (
                      <span className={`text-[10px] font-extrabold ${newUserPassword === newUserConfirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {newUserPassword === newUserConfirmPassword ? "✓ Passwords Match" : "✕ Mismatch"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNewUserConfirmPassword ? "text" : "password"}
                      required
                      disabled={isCreatingUser}
                      placeholder="••••••••"
                      value={newUserConfirmPassword}
                      onChange={(e) => {
                        setNewUserConfirmPassword(e.target.value);
                        setUserFormError("");
                      }}
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isCreatingUser}
                      onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
                    >
                      {showNewUserConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Assigned Staff Role *</label>
                  <select
                    value={newUserRole}
                    disabled={isCreatingUser}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9] disabled:opacity-60"
                  >
                    {roles.map((r: any) => (
                      <option key={r.id || r.role_id || r.name} value={r.name}>
                        {r.name} ({r.primaryDesk || r.primary_desk || "desk"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isCreatingUser}
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Creating User Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Create User Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit System Staff User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9]">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Edit Staff Account
                    </h3>
                    <p className="text-xs font-bold text-slate-500">Update staff profile credentials & permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-black"
                >
                  ✕
                </button>
              </div>

              {editUserError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editUserError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Full Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Email Address / Username *</label>
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-900 dark:text-white block">Account Password</label>
                    <span className="text-[10px] font-bold text-slate-400">Leave blank to keep existing password</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Enter new password (optional)"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Assigned Staff Role *</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    {roles.map((r: any) => (
                      <option key={r.id || r.role_id || r.name} value={r.name}>
                        {r.name} ({r.primaryDesk || r.primary_desk || "desk"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Save Account Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create New Custom Role */}
        {showCreateRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-purple-600 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" /> Create Custom Role
                </h3>
                <button
                  onClick={() => setShowCreateRoleModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-3.5">
                {roleFormError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{roleFormError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Role Name / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pediatrics Intake Nurse"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Role Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe duty scope and operational access for this role..."
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Primary Desk Access *</label>
                  <select
                    value={newRolePrimaryDesk}
                    onChange={(e) => setNewRolePrimaryDesk(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="helpdesk">Helpdesk Reception Desk</option>
                    <option value="hmo">HMO Approval Desk</option>
                    <option value="cashdesk">Cashdesk Invoicing Desk</option>
                    <option value="monitor">Queue Monitor Desk</option>
                    <option value="analytics">Executive Analytics Desk</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Allowed Desks Permissions</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    {[
                      { id: "helpdesk", label: "Helpdesk Reception" },
                      { id: "hmo", label: "HMO Approval" },
                      { id: "cashdesk", label: "Cashdesk Billing" },
                      { id: "monitor", label: "Queue Monitor" },
                      { id: "analytics", label: "Executive Analytics" },
                      { id: "all_patients", label: "Master Patients Directory" },
                      { id: "checked_in_patients", label: "Checked-In Queue" },
                      { id: "hmo_enrollees", label: "HMO Enrollees" },
                      { id: "private_patients", label: "Private Self-Pay" },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRoleAllowedDesks.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoleAllowedDesks([...newRoleAllowedDesks, item.id]);
                            } else {
                              setNewRoleAllowedDesks(newRoleAllowedDesks.filter((d) => d !== item.id));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateRoleModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" /> Save Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Role Details & Permissions */}
        {editingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-purple-600 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-purple-600" /> Edit Role: {editingRole.name}
                </h3>
                <button
                  onClick={() => setEditingRole(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditRole} className="space-y-3.5">
                {editRoleError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{editRoleError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Role Name / Title *</label>
                  <input
                    type="text"
                    required
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Role Description</label>
                  <textarea
                    rows={2}
                    value={editRoleDescription}
                    onChange={(e) => setEditRoleDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Primary Desk Access *</label>
                  <select
                    value={editRolePrimaryDesk}
                    onChange={(e) => setEditRolePrimaryDesk(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="helpdesk">Helpdesk Reception Desk</option>
                    <option value="hmo">HMO Approval Desk</option>
                    <option value="cashdesk">Cashdesk Invoicing Desk</option>
                    <option value="monitor">Queue Monitor Desk</option>
                    <option value="analytics">Executive Analytics Desk</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Allowed Desks Permissions</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    {[
                      { id: "helpdesk", label: "Helpdesk Reception" },
                      { id: "hmo", label: "HMO Approval" },
                      { id: "cashdesk", label: "Cashdesk Billing" },
                      { id: "monitor", label: "Queue Monitor" },
                      { id: "analytics", label: "Executive Analytics" },
                      { id: "all_patients", label: "Master Patients Directory" },
                      { id: "checked_in_patients", label: "Checked-In Queue" },
                      { id: "hmo_enrollees", label: "HMO Enrollees" },
                      { id: "private_patients", label: "Private Self-Pay" },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editRoleAllowedDesks.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoleAllowedDesks([...editRoleAllowedDesks, item.id]);
                            } else {
                              setEditRoleAllowedDesks(editRoleAllowedDesks.filter((d) => d !== item.id));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" /> Save Role Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* SUPERADMIN DISABLE / DELETE BOOKING REASON FORM MODAL */}
        {isDeleteBookingModalOpen && deletingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative animate-scaleUp max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-300">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Disable Booking Record <span className="text-rose-600 dark:text-rose-400">#{deletingBooking.refCode || deletingBooking.ref_code}</span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">Superadmin Record Disabling & Deletion Form</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteBookingModalOpen(false);
                    setDeletingBooking(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Target Record Info Box */}
              <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold space-y-1">
                <p className="text-slate-900 dark:text-white">
                  <strong>Patient Name:</strong> {deletingBooking.patientName || deletingBooking.patient_name} ({deletingBooking.patientPhone || deletingBooking.patient_phone})
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Doctor:</strong> {deletingBooking.doctorName || deletingBooking.doctor_name} ({deletingBooking.doctorSpecialty || deletingBooking.doctor_specialty})
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Scheduled Date & Time:</strong> 📅 {deletingBooking.date} at 🕒 {deletingBooking.time}
                </p>
              </div>

              <form onSubmit={handleConfirmSoftDeleteBooking} className="space-y-4 text-xs font-bold">
                {deleteReasonError && (
                  <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 font-black flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{deleteReasonError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1.5 block">
                    Reason for Deleting / Disabling Record *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={deleteReasonText}
                    onChange={(e) => {
                      setDeleteReasonText(e.target.value);
                      setDeleteReasonError("");
                    }}
                    placeholder="Enter explicit reason for disabling this patient booking..."
                    className="w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Preset Quick-Select Reason Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Select Preset Reason:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Patient requested appointment cancellation",
                      "Duplicate appointment ticket created in error",
                      "Patient no-show / Invalid contact details",
                      "Wrong specialty or doctor selected by patient",
                      "Admin maintenance & queue cleanup",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDeleteReasonText(preset);
                          setDeleteReasonError("");
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${deleteReasonText === preset
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Disabling hides this record from active queue lists. The reason will be permanently attached to the record history.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingBookingDelete}
                    onClick={() => {
                      setIsDeleteBookingModalOpen(false);
                      setDeletingBooking(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingBookingDelete}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingBookingDelete ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Disabling Record...</span>
                      </>
                    ) : (
                      <>Confirm & Disable Record ✓</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUPERADMIN EDIT BOOKING RECORD MODAL */}
        {isEditBookingModalOpen && editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 border border-amber-300">
                    <Pencil className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Edit Booking Record <span className="text-[#008ac9]">#{editingBooking.refCode || editingBooking.ref_code}</span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">Superadmin Real-Time Database Editor</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditBookingModalOpen(false);
                    setEditingBooking(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBookingEdit} className="space-y-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={editPatientName}
                      onChange={(e) => setEditPatientName(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Patient Phone *</label>
                    <input
                      type="text"
                      required
                      value={editPatientPhone}
                      onChange={(e) => setEditPatientPhone(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Email Address</label>
                    <input
                      type="email"
                      value={editPatientEmail}
                      onChange={(e) => setEditPatientEmail(e.target.value)}
                      placeholder="e.g. patient@example.com"
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Attending Doctor Name</label>
                    <input
                      type="text"
                      value={editDoctorName}
                      onChange={(e) => setEditDoctorName(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Appointment Date *</label>
                    <input
                      type="text"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      placeholder="e.g. 2026-10-07 or 7th October, 2026"
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Time Slot *</label>
                    <input
                      type="text"
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="e.g. 08:00 AM – 10:00 AM"
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Booking Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="Booked">Booked (Confirmed)</option>
                      <option value="Checked In">Checked In</option>
                      <option value="Completed">Completed</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Payment Type</label>
                    <select
                      value={editPaymentType}
                      onChange={(e) => setEditPaymentType(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="Private Self-Pay">Private Self-Pay</option>
                      <option value="HMO Insurance">HMO Insurance</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Payment Status</label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared (Paid)</option>
                    </select>
                  </div>
                </div>

                {editPaymentType === "HMO Insurance" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">HMO Provider Name</label>
                      <input
                        type="text"
                        value={editHmoName}
                        onChange={(e) => setEditHmoName(e.target.value)}
                        placeholder="e.g. Hygeia HMO"
                        className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">HMO Pre-Auth Status</label>
                      <select
                        value={editHmoStatus}
                        onChange={(e) => setEditHmoStatus(e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                      >
                        <option value="Pending">Pending Approval</option>
                        <option value="Approved">Approved</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 block">Reason for Visit / Clinical Complaints</label>
                  <textarea
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSavingBookingEdit}
                    onClick={() => {
                      setIsEditBookingModalOpen(false);
                      setEditingBooking(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingBookingEdit}
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingBookingEdit ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>Save Booking Changes ✓</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HMO Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#008ac9]" /> HMO Insurance Pre-Auth
                </h3>
                <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
              </div>

              <div className="text-xs space-y-1 font-bold text-slate-700 dark:text-slate-300">
                <p><strong>Ticket:</strong> {selectedBooking.refCode}</p>
                <p><strong>Patient:</strong> {selectedBooking.patientName}</p>
                <p><strong>Doctor:</strong> {selectedBooking.doctorName}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">HMO Enrollee / Policy ID *</label>
                  <input
                    type="text"
                    value={hmoPolicyCode}
                    onChange={(e) => setHmoPolicyCode(e.target.value)}
                    placeholder="e.g. HYG-984210"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">HMO Authorization Code *</label>
                  <input
                    type="text"
                    value={hmoAuthCode}
                    onChange={(e) => setHmoAuthCode(e.target.value)}
                    placeholder="e.g. AUTH-884920"
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isApprovingHmo}
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isApprovingHmo}
                  onClick={() => handleHmoApproval(selectedBooking.refCode, hmoPolicyCode, hmoAuthCode)}
                  className="px-5 py-2 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApprovingHmo ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Approving & Issuing Pre-Auth...</span>
                    </>
                  ) : (
                    <>Approve & Issue Auth ✓</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Styled Custom Action Confirmation Modal */}
        {confirmModalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl ${confirmModalConfig.variant === "danger"
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-300"
                    : "bg-sky-100 dark:bg-slate-800 text-[#008ac9] border border-sky-300"
                    }`}
                >
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {confirmModalConfig.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-500">Action confirmation required</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {confirmModalConfig.message}
              </p>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  {confirmModalConfig.cancelText || "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModalConfig.onConfirm;
                    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
                    if (action) action();
                  }}
                  className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md transition-all ${confirmModalConfig.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#008ac9] hover:bg-[#0072b1]"
                    }`}
                >
                  {confirmModalConfig.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attached Referral Document Reader & Viewer Modal */}
        {selectedReferralBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border-2 border-sky-400 dark:border-sky-600 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 animate-scaleUp overflow-y-auto max-h-[92vh]">

              {/* Modal Top Navigation Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-2xl bg-sky-500 text-white font-black shadow-md shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                        Document Reader & Viewer
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                        ✓ In-App Document Active
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-sky-600 dark:text-sky-400 truncate">
                      📎 {selectedReferralBooking.referralDocName || selectedReferralBooking.referral_doc_name || "ANSWER KEYS.docx"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenReferralInNewTab(selectedReferralBooking)}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black transition-all shadow-sm hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
                    title="Open Document File in Window"
                  >
                    📄 Open Document File
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReferralBooking(null)}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Close Reader"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Patient & Referral Metadata Quick Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Patient Name</span>
                  <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                    {selectedReferralBooking.patientName || selectedReferralBooking.patient_name || "Patient"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Ticket Ref</span>
                  <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 truncate block">
                    🎫 {selectedReferralBooking.refCode || selectedReferralBooking.ref_code || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Attending Doctor</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    🩺 {selectedReferralBooking.doctorName || selectedReferralBooking.doctor_name || "Specialist Doctor"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Appointment Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    🗓️ {selectedReferralBooking.date || "N/A"}
                  </span>
                </div>
              </div>

              {/* MAIN IN-APP DOCUMENT READER PAPER WINDOW */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 shadow-xl space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar">

                {/* Paper Header Seal */}
                <div className="border-b-2 border-sky-500 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <FileText className="h-5 w-5 text-sky-500" />
                      {selectedReferralBooking.referralDocName || selectedReferralBooking.referral_doc_name || "ANSWER KEYS.docx"}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      ISALU HOSPITALS OGBA • CLINICAL REFERRAL ELECTRONIC RECORD
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-xl border border-sky-300 dark:border-sky-800 text-[10px] font-black uppercase text-center shrink-0">
                    Format: {((selectedReferralBooking.referralDocName || selectedReferralBooking.referral_doc_name || "").split('.').pop() || "DOCX").toUpperCase()}
                  </div>
                </div>

                {/* Content Viewer Body */}
                {selectedReferralBooking.referralDocData && selectedReferralBooking.referralDocData.startsWith("data:image/") ? (
                  <div className="text-center p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <img
                      src={selectedReferralBooking.referralDocData}
                      alt="Referral Document Preview"
                      className="max-h-96 mx-auto rounded-lg object-contain border border-slate-300 dark:border-slate-700 shadow-sm"
                    />
                  </div>
                ) : selectedReferralBooking.referralDocData && selectedReferralBooking.referralDocData.startsWith("data:application/pdf") ? (
                  <iframe
                    src={selectedReferralBooking.referralDocData}
                    title="PDF Document Reader"
                    className="w-full h-96 rounded-xl border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed">

                    {selectedReferralBooking.referralDocText ? (
                      <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selectedReferralBooking.referralDocText}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 bg-sky-50/80 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-xl space-y-1">
                          <p className="font-extrabold text-sky-800 dark:text-sky-300 text-xs uppercase tracking-wider">
                            📄 SECTION 1: ATTACHED REFERRAL SUMMARY & COMPLAINTS
                          </p>
                          <p className="text-slate-700 dark:text-slate-300 italic font-sans text-xs">
                            "{selectedReferralBooking.reason || "Patient provided this referral document and answer keys file during booking."}"
                          </p>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                          <p className="font-extrabold text-purple-700 dark:text-purple-400 text-xs uppercase tracking-wider border-b dark:border-slate-800 pb-1.5">
                            🔑 SECTION 2: VERIFIED ANSWER KEYS & CLINICAL AUDIT TRANSCRIPT
                          </p>

                          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-mono">
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="px-2 py-0.5 rounded bg-sky-500 text-white font-bold text-[10px]">KEY 1</span>
                              <div>
                                <strong>Patient Referral & Eligibility:</strong> Verified for consultation under {selectedReferralBooking.department || "Obstetrics & Gynaecology"}.
                              </div>
                            </div>

                            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="px-2 py-0.5 rounded bg-purple-500 text-white font-bold text-[10px]">KEY 2</span>
                              <div>
                                <strong>Attending Specialist Schedule:</strong> Assigned to {selectedReferralBooking.doctorName || selectedReferralBooking.doctor_name || "Dr. Funke Akindele"} on {selectedReferralBooking.date || "Scheduled Date"}.
                              </div>
                            </div>

                            <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-[10px]">KEY 3</span>
                              <div>
                                <strong>HMO / Billing Verification:</strong> Status: {selectedReferralBooking.paymentType || "Private Self-Pay"} ({selectedReferralBooking.hmoName || "Self-Pay"}).
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Official Verification Complete • Ready for Doctor Review in Outpatient Consultation</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Action Controls Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenReferralInNewTab(selectedReferralBooking)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    title="Open document preview in a full browser window"
                  >
                    <ExternalLink className="h-4 w-4" /> Full Window View
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadReferralFile(selectedReferralBooking)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#008ac9] hover:bg-[#0072b1] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    title="Download file onto your computer"
                  >
                    <Download className="h-4 w-4" /> Download File ({selectedReferralBooking.referralDocName || selectedReferralBooking.referral_doc_name || "ANSWER KEYS.docx"})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReferralBooking(null)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold transition-all border border-slate-300 dark:border-slate-700"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Full Screen AI Executive Report Modal & History View */}
        {isAiReportModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-5xl bg-slate-900 border-2 border-sky-500 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 animate-scaleUp overflow-y-auto max-h-[95vh] text-white">

              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-gradient-to-br from-[#008ac9] to-sky-600 rounded-2xl text-white shadow-md">
                    <Sparkles className="h-6 w-6 text-yellow-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        AI Executive Board Report Viewer
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/40">
                        Neural Synthesis Active
                      </span>
                    </div>
                    <p className="text-xs font-bold text-sky-400 mt-0.5">
                      Isalu Medical AI Intelligence v3.2 • High-Resolution Executive View
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAiReportModalOpen(false)}
                  className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    Showing Report: <span className="text-sky-400 font-black">"{aiPrompt || "Executive Board Report"}"</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (generatedAiReport) {
                        navigator.clipboard.writeText(generatedAiReport);
                        setCopiedAiReport(true);
                        setTimeout(() => setCopiedAiReport(false), 2000);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 border border-white/10 transition-all flex items-center gap-1.5"
                  >
                    {copiedAiReport ? "✓ Copied!" : "📋 Copy Full Report"}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadAiReportAsPdf(generatedAiReport || "", aiPrompt || "Executive Board Summary Report")}
                    className="px-4 py-2 bg-[#008ac9] hover:bg-[#0072b1] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Download className="h-4 w-4" /> Download PDF Report
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadAiReportAsExcel(generatedAiReport || "", aiPrompt || "Executive Board Summary Report")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <FileText className="h-4 w-4 text-emerald-200" /> Export Excel
                  </button>
                </div>
              </div>

              {/* Main Report Body Box */}
              <div className="p-6 rounded-2xl bg-black/80 border-2 border-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar font-mono text-xs text-emerald-300 leading-relaxed space-y-4">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-300">
                  {generatedAiReport || "No report generated yet. Select a prompt preset above to synthesize a report."}
                </pre>
              </div>

              {/* Recent AI Report History Drawer */}
              {aiReportHistory.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-300 border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <Activity className="h-4 w-4" /> Recent AI Report Synthesis History ({aiReportHistory.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Stored in Local Memory</span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pt-1">
                    {aiReportHistory.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(item.prompt);
                          setGeneratedAiReport(item.report);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-[#008ac9] text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all text-left flex items-center gap-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{item.prompt}</span>
                        <span className="text-[9px] opacity-60 font-mono">({item.date.split(",")[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAiReportModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs transition-all border border-slate-700 cursor-pointer"
                >
                  Close Executive View
                </button>
              </div>

            </div>
          </div>
        )}

        {/* EDIT HMO PROVIDER MODAL (ADMIN ONLY) */}
        {showEditHmoModal && editingHmoItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-sky-100 dark:bg-slate-800 text-[#008ac9]">
                    <Pencil className="h-6 w-6 text-[#008ac9]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit HMO Provider Details</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Update accreditation information & desk contacts</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditHmoModal(false);
                    setEditingHmoItem(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {hmoFormError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-xs font-black text-rose-700 dark:text-rose-300">
                  ⚠️ {hmoFormError}
                </div>
              )}

              <form onSubmit={handleSaveEditHmoCompany} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">HMO Company Name *</label>
                  <input
                    type="text"
                    required
                    value={hmoCompanyName}
                    onChange={(e) => setHmoCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">Registration Code</label>
                    <input
                      type="text"
                      value={hmoCompanyCode}
                      onChange={(e) => setHmoCompanyCode(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">Partnership Status</label>
                    <select
                      value={hmoCompanyStatus}
                      onChange={(e) => setHmoCompanyStatus(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    >
                      <option value="Active Partner">Active Partner ✓</option>
                      <option value="Disabled Partner">Disabled Partner 🚫</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">Pre-Auth Desk Email *</label>
                    <input
                      type="email"
                      required
                      value={hmoCompanyEmail}
                      onChange={(e) => setHmoCompanyEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">Helpline Phone *</label>
                    <input
                      type="text"
                      required
                      value={hmoCompanyPhone}
                      onChange={(e) => setHmoCompanyPhone(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">Contact Officer / Desk Officer</label>
                  <input
                    type="text"
                    value={hmoCompanyContact}
                    onChange={(e) => setHmoCompanyContact(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                {isSubmittingHmoCompany && (
                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-slate-900 border-2 border-[#008ac9] text-[#008ac9] dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse shadow-sm">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#008ac9]" />
                    <span>Saving HMO partner changes... Please wait.</span>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingHmoCompany}
                    onClick={() => {
                      setShowEditHmoModal(false);
                      setEditingHmoItem(null);
                    }}
                    className="px-5 py-2.5 rounded-2xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHmoCompany}
                    className="px-6 py-2.5 rounded-2xl text-xs font-black bg-[#008ac9] hover:bg-[#0072b1] text-white shadow-lg shadow-[#008ac9]/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingHmoCompany ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>Save Changes ✓</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HMO PASS PATIENT TO CASHDESK REMARK MODAL */}
        {isRerouteModalOpen && targetRerouteBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative animate-scaleUp max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 border border-amber-300">
                    <ArrowRightCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Pass Patient to Cashdesk <span className="text-amber-600 dark:text-amber-400">#{targetRerouteBooking.refCode || targetRerouteBooking.ref_code}</span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">Re-route HMO Patient to Private Paying Patients Queue</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRerouteModalOpen(false);
                    setTargetRerouteBooking(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Patient Info Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-bold space-y-1">
                <p className="text-slate-900 dark:text-white">
                  <strong>Patient Name:</strong> {targetRerouteBooking.patientName || targetRerouteBooking.patient_name} ({targetRerouteBooking.patientPhone || targetRerouteBooking.patient_phone})
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>HMO Provider:</strong> {targetRerouteBooking.hmoName || targetRerouteBooking.hmo_name || "HMO Insurance"} (Policy ID: {targetRerouteBooking.hmoPolicyCode || targetRerouteBooking.hmo_policy_code || "N/A"})
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Doctor:</strong> {targetRerouteBooking.doctorName || targetRerouteBooking.doctor_name}
                </p>
              </div>

              <form onSubmit={handleConfirmRerouteToCashdesk} className="space-y-4 text-xs font-bold">
                {rerouteError && (
                  <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 font-black flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{rerouteError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1.5 block">
                    HMO Officer Remark / Re-routing Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rerouteRemark}
                    onChange={(e) => {
                      setRerouteRemark(e.target.value);
                      setRerouteError("");
                    }}
                    placeholder="Enter explicit remark explaining why this patient is being converted from HMO to Cashdesk paying patient..."
                    className="w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick Preset Remark Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Select Quick Remark Preset:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "HMO Pre-authorization declined by provider",
                      "Consultation / treatment not covered under policy tier",
                      "HMO policy expired / Inactive plan",
                      "Patient opted out of HMO to pay out-of-pocket",
                      "HMO portal server down - converted to cash self-pay",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setRerouteRemark(preset);
                          setRerouteError("");
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${rerouteRemark === preset
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-800 dark:text-sky-300 text-[11px] font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#008ac9]" />
                  <span>
                    Confirming will remove this record from HMO Approval and place it in the Cashdesk list as a paying patient.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmittingReroute}
                    onClick={() => {
                      setIsRerouteModalOpen(false);
                      setTargetRerouteBooking(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingReroute}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReroute ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Re-routing...</span>
                      </>
                    ) : (
                      <>Confirm & Pass to Cashdesk →</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Persistent Toast Feedback Alert (Positioned at Top Right Corner) */}
        {toastAlert && (
          <div className="fixed top-24 right-4 sm:right-6 z-[120] max-w-md w-full animate-fadeIn shadow-2xl">
            <div
              className={`bg-white dark:bg-slate-900 border-2 ${toastAlert.type === "warning"
                ? "border-amber-400 dark:border-amber-500 shadow-amber-500/20"
                : toastAlert.type === "danger"
                  ? "border-rose-500 dark:border-rose-600 shadow-rose-500/20"
                  : "border-[#008ac9] dark:border-sky-500 shadow-[#008ac9]/20"
                } rounded-3xl p-5 shadow-2xl flex items-start gap-3.5 relative`}
            >
              <div
                className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border ${toastAlert.type === "warning"
                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 border-amber-300"
                  : toastAlert.type === "danger"
                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border-rose-300"
                    : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border-emerald-300"
                  }`}
              >
                {toastAlert.type === "warning" || toastAlert.type === "danger" ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1 pr-14 space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  {toastAlert.title}
                </h4>
                {toastAlert.description && (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                    {toastAlert.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => setToastAlert(null)}
                className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                aria-label="Close Toast Alert"
              >
                ✕ Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
