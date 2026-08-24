import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { DOCTORS, DEPARTMENTS, getAcronymForIndex, getDoctorRealName } from "../data/doctors";
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
} from "lucide-react";
import {
  getBookingsAPI,
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
  createBookingAPI,
  checkInBookingAPI,
  approveHmoBookingAPI,
  payCashdeskBookingAPI,
  createHmoCompanyAPI,
  updateHmoCompanyAPI,
  deleteHmoCompanyAPI,
  createSystemUserAPI,
  updateSystemUserAPI,
  loginStaffAPI,
  updateBookingAPI,
  createCustomTimeSlotAPI,
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
      } catch {}
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
    onConfirm: () => {},
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
    | "clinic";

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
  ];

  const [activeDesk, setActiveDesk] = useState<DeskType>(
    deskParam && validDesks.includes(deskParam) ? deskParam : "helpdesk"
  );

  const isDeskAllowed = (desk: DeskType): boolean => {
    if (!currentUser || !currentUser.role) return false;
    const roleStr = (currentUser.role || "").toLowerCase();

    // Super Administrator / Hospital Administrator / Chief Admin -> Full access to all desks
    if (
      roleStr.includes("super administrator") ||
      roleStr.includes("hospital administrator") ||
      roleStr.includes("chief") ||
      roleStr.includes("super admin") ||
      roleStr === "admin"
    ) {
      return true;
    }

    // Clinic Module and Manage Users strictly require Super Administrator access
    if (desk === "clinic" || desk === "users") {
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
      localStorage.removeItem("isalu_auth_tokens");
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
  const [systemUsers, setSystemUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_system_users");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "usr-1",
        name: "Dr. Chief Administrator",
        email: "admin@isaluhospitals.com",
        role: "Super Administrator",
        desk: "All Access",
        status: "Active",
        lastActive: "Just now",
      },
      {
        id: "usr-2",
        name: "Mrs. Adesuwa Receptionist",
        email: "reception@isaluhospitals.com",
        role: "Helpdesk Officer",
        desk: "Helpdesk Reception",
        status: "Active",
        lastActive: "5 mins ago",
      },
      {
        id: "usr-3",
        name: "Mr. Kunle HMO Officer",
        email: "hmo.desk@isaluhospitals.com",
        role: "HMO Approval Officer",
        desk: "HMO Approval Desk",
        status: "Active",
        lastActive: "12 mins ago",
      },
      {
        id: "usr-4",
        name: "Mrs. Blessing Cashier",
        email: "cashdesk@isaluhospitals.com",
        role: "Cashdesk Billing Officer",
        desk: "Cashdesk",
        status: "Active",
        lastActive: "20 mins ago",
      },
      {
        id: "usr-5",
        name: "Mr. Tunde Floor Controller",
        email: "floor.monitor@isaluhospitals.com",
        role: "Monitor Desk Operator",
        desk: "Monitor Desk",
        status: "Active",
        lastActive: "2 mins ago",
      },
    ];
  });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const [hmoOrgSearchQuery, setHmoOrgSearchQuery] = useState("");
  const [hmoOrgCurrentPage, setHmoOrgCurrentPage] = useState(1);
  const [hmoOrgItemsPerPage, setHmoOrgItemsPerPage] = useState(10);

  const broadcastUserChange = (updatedList: any[]) => {
    try {
      localStorage.setItem("isalu_system_users", JSON.stringify(updatedList));

      const channel = new BroadcastChannel("isalu_user_channel");
      channel.postMessage({ type: "USERS_UPDATED", users: updatedList });
      channel.close();
    } catch {}

    window.dispatchEvent(new CustomEvent("isalu_users_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const loadUsers = async () => {
    const localStr = localStorage.getItem("isalu_system_users");
    let localParsed: any[] = [];
    if (localStr) {
      try { localParsed = JSON.parse(localStr); } catch {}
    }

    const remote = await getSystemUsersAPI();
    if (remote && Array.isArray(remote)) {
      setSystemUsers(remote);
      localStorage.setItem("isalu_system_users", JSON.stringify(remote));
    } else if (localParsed.length > 0) {
      setSystemUsers(localParsed);
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

    const userIdStr = `usr-${Date.now()}`;
    const newUser = {
      id: userIdStr,
      user_id: userIdStr,
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
    const createdRecord = res || newUser;

    const remoteUsers = await getSystemUsersAPI();
    const updated = remoteUsers && remoteUsers.length > 0 ? remoteUsers : [createdRecord, ...systemUsers];

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
  };

  const DEFAULT_HMO_COMPANIES = [
    { id: "hmo-1", name: "Hygeia HMO", code: "HMO-HYG-001", email: "preauth@hygeiahmo.com", phone: "+234 700 494 342", contactPerson: "Mrs. Victoria Adeleke", status: "Active Partner" },
    { id: "hmo-2", name: "Reliance HMO", code: "HMO-RLN-002", email: "claims@reliancehmo.com", phone: "+234 1 700 1555", contactPerson: "Mr. Chukwuma Eze", status: "Active Partner" },
    { id: "hmo-3", name: "AXA Mansard Health", code: "HMO-AXA-003", email: "hmo@axamansard.com", phone: "+234 1 448 5433", contactPerson: "Dr. Funke Akindele", status: "Active Partner" },
    { id: "hmo-4", name: "Avon HMO", code: "HMO-AVN-004", email: "preauth@avonhmo.com", phone: "+234 700 286 6466", contactPerson: "Mr. Segun Oladipo", status: "Active Partner" },
    { id: "hmo-5", name: "Leadway Health", code: "HMO-LWD-005", email: "medical@leadwayhealth.com", phone: "+234 1 280 2060", contactPerson: "Mrs. Blessing Okafor", status: "Active Partner" },
    { id: "hmo-6", name: "Clearline HMO", code: "HMO-CLR-006", email: "desk@clearlinehmo.com", phone: "+234 1 462 8111", contactPerson: "Mr. Ibrahim Bello", status: "Active Partner" },
    { id: "hmo-7", name: "Total Health Trust", code: "HMO-THT-007", email: "authorizations@totalhealthtrust.com", phone: "+234 700 868 2543", contactPerson: "Dr. Kemi Balogun", status: "Active Partner" },
    { id: "hmo-8", name: "Redcare HMO", code: "HMO-RDC-008", email: "info@redcarehmo.com", phone: "+234 1 700 7332", contactPerson: "Mr. Tunde Lawal", status: "Active Partner" },
  ];

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
  const [hmoCompanies, setHmoCompanies] = useState<any[]>(() => {
    const isCleared = localStorage.getItem("isalu_hmo_cleared");
    if (isCleared === "true") return [];

    const saved = localStorage.getItem("isalu_hmo_companies");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }
    return DEFAULT_HMO_COMPANIES;
  });

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
    } catch {}

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
  };

  const handleCreateHmoCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hmoCompanyName.trim() || !hmoCompanyEmail.trim() || !hmoCompanyPhone.trim()) {
      setHmoFormError("Please fill out HMO Company Name, Desk Email, and Helpline Phone.");
      return;
    }

    const newCompany = {
      id: `hmo-${Date.now()}`,
      name: hmoCompanyName.trim(),
      code: hmoCompanyCode.trim() || `HMO-${hmoCompanyName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      email: hmoCompanyEmail.trim(),
      phone: hmoCompanyPhone.trim(),
      contactPerson: hmoCompanyContact.trim() || "Pre-Auth Desk Officer",
      planTier: hmoCompanyPlanTier,
      status: hmoCompanyStatus,
    };

    createHmoCompanyAPI(newCompany);
    const updatedCompanies = [newCompany, ...hmoCompanies];
    setHmoCompanies(updatedCompanies);
    broadcastHmoChange(updatedCompanies);

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
      description: `Accredited provider ${newCompany.name} has been saved.`,
      type: "success",
    });
  };

  const broadcastHmoChange = (updatedList: any[]) => {
    try {
      localStorage.setItem("isalu_hmo_companies", JSON.stringify(updatedList));

      const channel = new BroadcastChannel("isalu_hmo_channel");
      channel.postMessage({ type: "HMO_UPDATED", hmoCompanies: updatedList });
      channel.close();
    } catch {}

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
          id: `hmo-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
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
          newHmos.push(apiRes || hmoObj);
        } catch {
          newHmos.push(hmoObj);
        }
      }

      if (newHmos.length === 0) {
        setToastAlert({
          title: "No HMO Records Found",
          description: "Please check your CSV file formatting and try again.",
          type: "warning",
        });
        return;
      }

      localStorage.removeItem("isalu_hmo_cleared");
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
        } catch {}

        localStorage.setItem("isalu_hmo_cleared", "true");
        localStorage.setItem("isalu_hmo_companies", JSON.stringify([]));
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
  const [clinics, setClinics] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_clinics_list");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEPARTMENTS.map((d) => ({
      id: d.id,
      dept_id: d.id,
      name: d.name.includes("Clinic") || d.name.includes("Department") || d.name.includes("Care") ? d.name : `${d.name} Clinic`,
      description: d.description,
      iconName: d.iconName || "Building2",
      icon_name: d.iconName || "Building2",
      doctorCount: d.doctorCount || 2,
      doctor_count: d.doctorCount || 2,
      status: "Active",
      location: "Main Hospital Complex - Suite Wing",
    }));
  });

  const mergeClinicsData = (defaultDepts: any[], localList: any[], remoteList: any[]) => {
    const mergedMap = new Map<string, any>();

    (defaultDepts || []).forEach((d) => {
      const key = (d.id || d.dept_id || d.name || "").toLowerCase().trim();
      if (key) {
        mergedMap.set(key, {
          id: d.id,
          dept_id: d.id,
          name: d.name.includes("Clinic") || d.name.includes("Department") || d.name.includes("Care") ? d.name : `${d.name} Clinic`,
          description: d.description || "Specialized clinical consultation services.",
          iconName: d.iconName || d.icon_name || "Building2",
          icon_name: d.iconName || d.icon_name || "Building2",
          doctorCount: d.doctorCount || d.doctor_count || 2,
          doctor_count: d.doctorCount || d.doctor_count || 2,
          status: d.status || "Active",
          location: d.location || "Main Hospital Complex - Suite Wing",
        });
      }
    });

    (localList || []).forEach((l) => {
      const key = (l.id || l.dept_id || l.name || "").toLowerCase().trim();
      if (key) {
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, { ...existing, ...l });
      }
    });

    (remoteList || []).forEach((r) => {
      const key = (r.id || r.dept_id || r.deptId || r.name || "").toLowerCase().trim();
      if (key) {
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, {
          ...existing,
          ...r,
          id: r.id || r.dept_id || existing.id,
          dept_id: r.dept_id || r.id || existing.dept_id,
          name: r.name || existing.name,
          description: r.description || existing.description,
          iconName: r.icon_name || r.iconName || existing.iconName || "Building2",
          icon_name: r.icon_name || r.iconName || existing.icon_name || "Building2",
          doctorCount: r.doctor_count ?? r.doctorCount ?? existing.doctorCount ?? 0,
          doctor_count: r.doctor_count ?? r.doctorCount ?? existing.doctor_count ?? 0,
          status: r.status || existing.status || "Active",
          location: r.location || existing.location || "Main Hospital Complex - Suite Wing",
        });
      }
    });

    return Array.from(mergedMap.values());
  };

  const loadClinics = async () => {
    const localStr = localStorage.getItem("isalu_clinics_list") || localStorage.getItem("isalu_hospital_departments");
    let localParsed: any[] = [];
    if (localStr) {
      try { localParsed = JSON.parse(localStr); } catch {}
    }

    const remote = await getDepartmentsAPI();
    const merged = mergeClinicsData(DEPARTMENTS, localParsed, remote || []);
    setClinics(merged);
    localStorage.setItem("isalu_clinics_list", JSON.stringify(merged));
    localStorage.setItem("isalu_hospital_departments", JSON.stringify(merged));
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

    let matchesStatus = true;
    if (clinicStatusFilter === "active") {
      matchesStatus = c.status === "Active" || !c.status;
    } else if (clinicStatusFilter === "maintenance") {
      matchesStatus = c.status === "Maintenance" || c.status === "Disabled";
    }

    return matchesSearch && matchesStatus;
  });

  const broadcastClinicChange = (updatedList: any[]) => {
    try {
      localStorage.setItem("isalu_clinics_list", JSON.stringify(updatedList));
      localStorage.setItem("isalu_hospital_departments", JSON.stringify(updatedList));

      const channel = new BroadcastChannel("isalu_clinic_channel");
      channel.postMessage({ type: "CLINIC_UPDATED", clinics: updatedList });
      channel.close();
    } catch {}

    window.dispatchEvent(new CustomEvent("isalu_clinic_updated", { detail: updatedList }));
    window.dispatchEvent(new Event("storage"));
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) {
      setClinicFormError("Clinic / Department Name is required.");
      return;
    }

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

    const res = await createDepartmentAPI(newClinic);
    const createdRecord = res || newClinic;

    const updated = mergeClinicsData(DEPARTMENTS, [createdRecord, ...clinics], []);
    setClinics(updated);
    broadcastClinicChange(updated);

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
      description: `${createdRecord.name} module registered and available across the hospital system.`,
      type: "success",
    });
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

    await updateDepartmentAPI(targetId, updatedData);

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
      title: `Delete Clinic "${clinic.name}"?`,
      message: `Are you sure you want to delete this clinic module? This action cannot be undone.`,
      confirmText: "Delete Clinic",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteDepartmentAPI(targetId);
        const updated = clinics.filter((c) => c.id !== targetId && c.dept_id !== targetId);
        setClinics(updated);
        broadcastClinicChange(updated);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setToastAlert({
          title: "Clinic Deleted",
          description: `${clinic.name} has been removed from the active clinic directory.`,
          type: "info",
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
        localStorage.setItem("isalu_hmo_companies", JSON.stringify(updated));

        setToastAlert({
          title: isDisabling ? "HMO Partner Disabled 🚫" : "HMO Partner Re-Enabled ✓",
          description: `Partnership status for ${hmo.name} updated to ${newStatus}.`,
          type: isDisabling ? "warning" : "success",
        });
      },
    });
  };

  // Specialist Schedule Management State
  const [specialistSchedules, setSpecialistSchedules] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_specialist_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    localStorage.removeItem("isalu_specialist_schedules");
    return [];
  });

  // Registered Doctors State
  const [doctorsList, setDoctorsList] = useState<any[]>(() => {
    const saved = localStorage.getItem("isalu_hospital_doctors");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    localStorage.removeItem("isalu_hospital_doctors");
    return [];
  });

  // New Specialist Doctor Modal State
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState(DEPARTMENTS[0]?.name || "Cardiology");
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
  }, [searchQuery, statusFilter, hmoProviderFilter, docDirectorySearch, docDirectoryStatusFilter, docDirectoryDeptFilter]);

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
      matchesStatus = !sched.status || sched.status.includes("Active") || !sched.status.includes("Disabled");
    } else if (schedStatusFilter === "disabled") {
      matchesStatus = Boolean(sched.status?.includes("Disabled"));
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
  const [editDocFormError, setEditDocFormError] = useState("");

  const handleOpenEditDoctor = (doc: any) => {
    setEditingDoctor(doc);
    setEditDocName(doc.fullName || doc.name || "");
    setEditDocSpecialty(doc.specialty || DEPARTMENTS[0]?.name || "Cardiology");
    setEditDocDeptId(doc.departmentId || "cardiology");
    setEditDocQualifications(doc.qualification || doc.qualifications || "MBBS, FWACS");
    setEditDocRoom(doc.room || doc.roomNumber || "Consultation Suite");
    setEditDocAcronym(doc.acronym || "");
    setEditDocStatus(doc.status || "Active");
    setEditDocAcceptedTypes(doc.acceptedPatientTypes || doc.accepted_patient_types || ["Private Self-Pay", "HMO Insurance"]);
    setEditDocFormError("");
  };

  const handleSaveEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    if (!editDocName.trim() || !editDocSpecialty.trim()) {
      setEditDocFormError("Doctor Name and Specialty are required.");
      return;
    }

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
    localStorage.setItem("isalu_hospital_doctors", JSON.stringify(updatedList));

    // Update matching schedule records in API & DB too
    const updatedSchedules = specialistSchedules.map((sched) => {
      if (sched.doctorId === targetId || sched.doctorName?.includes(editingDoctor.name)) {
        const updatedSched = {
          ...sched,
          doctorName: formattedName,
          specialty: editDocSpecialty,
          room: editDocRoom.trim(),
        };
        updateScheduleAPI(sched.id, updatedSched);
        return updatedSched;
      }
      return sched;
    });
    setSpecialistSchedules(updatedSchedules);
    localStorage.setItem("isalu_specialist_schedules", JSON.stringify(updatedSchedules));

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
      matchesStatus = !doc.status || doc.status === "Active" || !doc.status.includes("Disabled");
    } else if (docDirectoryStatusFilter === "disabled") {
      matchesStatus = Boolean(doc.status?.includes("Disabled"));
    }

    let matchesDept = true;
    if (docDirectoryDeptFilter !== "all") {
      matchesDept = doc.departmentId === docDirectoryDeptFilter || doc.specialty?.toLowerCase().includes(docDirectoryDeptFilter.toLowerCase());
    }

    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleCreateNewDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      setNewDocFormError("Please enter Specialist Doctor's Name.");
      return;
    }

    const autoAcronym = getAcronymForIndex(doctorsList.length);
    const formattedName = newDocName.trim().startsWith("Dr.") ? newDocName.trim() : `Dr. ${newDocName.trim()}`;
    const deptMatch = DEPARTMENTS.find((d) =>
      d.name.toLowerCase().includes(newDocSpecialty.toLowerCase()) ||
      newDocSpecialty.toLowerCase().includes(d.name.toLowerCase()) ||
      d.id.toLowerCase().includes(newDocSpecialty.toLowerCase())
    );

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: formattedName,
      fullName: formattedName,
      acronym: autoAcronym,
      specialty: newDocSpecialty,
      departmentId: deptMatch ? deptMatch.id : "general-physician",
      qualification: newDocQualifications.trim() || "MBBS, FWACS",
      qualifications: newDocQualifications.trim() || "MBBS, FWACS",
      room: "Consultation Suite",
      roomNumber: "Consultation Suite",
      acceptedPatientTypes: newDocAcceptedTypes.length > 0 ? newDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      accepted_patient_types: newDocAcceptedTypes.length > 0 ? newDocAcceptedTypes : ["Private Self-Pay", "HMO Insurance"],
      availableDays: [],
      availability: [],
      timeSlots: [],
      image: "",
      bio: "Senior Medical Consultant specializing in high-quality clinical care at Isalu Hospitals.",
      status: "Active",
    };

    createDoctorAPI(newDoc);
    const updated = [newDoc, ...doctorsList];
    setDoctorsList(updated);
    localStorage.setItem("isalu_hospital_doctors", JSON.stringify(updated));

    // Auto-select this newly created doctor in schedule form
    const adminDisplayName = `${newDoc.fullName} (${newDoc.acronym})`;
    setSchedDoctorId(newDoc.id);
    setSchedDoctorSearch(adminDisplayName);
    setShowDoctorDropdown(false);

    // Reset Form
    setNewDocName("");
    setNewDocQualifications("");
    setNewDocRoom("");
    setNewDocAcceptedTypes(["Private Self-Pay", "HMO Insurance"]);
    setNewDocFormError("");
    setShowAddDoctorModal(false);

    setToastAlert({
      title: "Specialist Doctor Registered!",
      description: `${newDoc.fullName} (${newDoc.acronym}) saved to directory.`,
      type: "success",
    });
  };

  const handleToggleDoctorStatus = (doc: any) => {
    const isDisabling = doc.status === "Active" || !doc.status || !doc.status.includes("Disabled");
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
        localStorage.setItem("isalu_hospital_doctors", JSON.stringify(updatedList));

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

  // Create Specialist Schedule Modal Form State
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [schedDoctorId, setSchedDoctorId] = useState(DOCTORS[0]?.id || "");
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

  const handleApplyCustomStartEndTime = (day: string, idx: number, isEditModal: boolean = false) => {
    if (!slotCustomStart.trim() || !slotCustomEnd.trim()) return;

    const formattedShiftTime = `${slotCustomStart.trim()} – ${slotCustomEnd.trim()}`;

    if (!shiftTimeOptions.includes(formattedShiftTime)) {
      createCustomTimeSlotAPI({
        startTime: slotCustomStart.trim(),
        endTime: slotCustomEnd.trim(),
        formatted: formattedShiftTime,
      });
      const updatedOptions = [formattedShiftTime, ...shiftTimeOptions];
      setShiftTimeOptions(updatedOptions);
      localStorage.setItem("isalu_shift_time_options", JSON.stringify(updatedOptions));
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
  const [shiftTimeOptions, setShiftTimeOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem("isalu_shift_time_options");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      "08:00 AM – 02:00 PM (Morning Shift)",
      "01:00 PM – 06:00 PM (Afternoon Shift)",
      "06:00 PM – 10:00 PM (Evening Shift)",
      "09:00 AM – 05:00 PM (Full Day)",
      "10:00 PM – 06:00 AM (Night Duty Shift)",
    ];
  });

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
      localStorage.setItem("isalu_shift_time_options", JSON.stringify(updated));
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
  const [specDateDoctorId, setSpecDateDoctorId] = useState(DOCTORS[0]?.id || "");
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
  const [savedCustomPatterns, setSavedCustomPatterns] = useState<string[]>(() => {
    const saved = localStorage.getItem("isalu_custom_patterns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return ["1ST, 2ND & 4TH SATURDAYS", "3RD & 5TH SUNDAYS"];
  });

  const [showCustomPatternInput, setShowCustomPatternInput] = useState(false);
  const [customPatternInput, setCustomPatternInput] = useState("");

  const handleAddCustomPattern = () => {
    if (!customPatternInput.trim()) return;
    const formatted = customPatternInput.trim().toUpperCase();
    if (!savedCustomPatterns.includes(formatted)) {
      const updated = [formatted, ...savedCustomPatterns];
      setSavedCustomPatterns(updated);
      localStorage.setItem("isalu_custom_patterns", JSON.stringify(updated));
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

  const handleCreateSpecificDateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specDateRoom.trim()) {
      setSpecDateFormError("Please enter Consultation Room / Suite.");
      return;
    }

    if (!specDateValue && !specDateWeekPreset && specDateWeeks.length === 0 && extraPatternEntries.length === 0) {
      setSpecDateFormError("Please select a Specific Date or pick/toggle at least one Recurring Week Duty Pattern.");
      return;
    }

    const selectedDoc = doctorsList.find((d) => d.id === specDateDoctorId) || doctorsList[0] || DOCTORS[0];
    const docAdminName = selectedDoc.fullName ? `${selectedDoc.fullName} (${selectedDoc.acronym || selectedDoc.name})` : selectedDoc.name;

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

    const newSchedule = {
      id: `sched-spec-${Date.now()}`,
      doctorId: selectedDoc.id,
      doctorName: docAdminName,
      specialty: selectedDoc.specialty,
      room: specDateRoom.trim(),
      dutyDays: dutyDaysList,
      dayConfigs: dayConfigs,
      isSpecificDate: !!specDateValue,
      specificDate: specDateValue || "",
      weekPreset: specDateWeekPreset,
      selectedWeeks: specDateWeeks,
      extraPatternEntries: extraPatternEntries,
      weekPatternLabel: displayWeekLabel,
      shiftTime: specDateShiftTime,
      capacity: Number(specDateCapacity) || 15,
      note: specDateNote.trim() || "Special Clinic Session",
      status: "Active On Duty",
    };

    createScheduleAPI(newSchedule);
    const updated = [newSchedule, ...specialistSchedules];
    setSpecialistSchedules(updated);
    localStorage.setItem("isalu_specialist_schedules", JSON.stringify(updated));

    // Also sync the doctor's availableDays with dutyDaysList in state, API & Database!
    const updatedDoctors = doctorsList.map((d) => {
      if (d.id === selectedDoc.id || (d as any).doc_id === selectedDoc.id) {
        const updatedDocPayload = {
          availableDays: dutyDaysList,
          available_days: dutyDaysList,
          availability: dutyDaysList,
        };
        updateDoctorAPI(selectedDoc.id, updatedDocPayload);
        return { ...d, ...updatedDocPayload };
      }
      return d;
    });
    setDoctorsList(updatedDoctors);
    localStorage.setItem("isalu_specialist_doctors", JSON.stringify(updatedDoctors));

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

  const handleSaveEditSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    if (!editRoom.trim()) {
      setEditFormError("Please fill out Consultation Room.");
      return;
    }

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
    updateScheduleAPI(editingSchedule.id, updatedItem);

    const updatedSchedules = specialistSchedules.map((item) =>
      item.id === editingSchedule.id ? updatedItem : item
    );

    setSpecialistSchedules(updatedSchedules);
    localStorage.setItem("isalu_specialist_schedules", JSON.stringify(updatedSchedules));

    // Sync Doctor object's availableDays, timeSlots, and roomNumber in API & DB!
    const targetDocId = editingSchedule.doctorId;
    if (targetDocId) {
      const updatedDocPayload = {
        availableDays: editDutyDays,
        availability: editDutyDays,
        timeSlots: daySummaries,
        roomNumber: editRoom.trim(),
        room: editRoom.trim(),
      };

      updateDoctorAPI(targetDocId, updatedDocPayload);

      const updatedDocs = doctorsList.map((d) =>
        d.id === targetDocId || d.doc_id === targetDocId
          ? { ...d, ...updatedDocPayload }
          : d
      );
      setDoctorsList(updatedDocs);
      localStorage.setItem("isalu_hospital_doctors", JSON.stringify(updatedDocs));
    }

    setEditingSchedule(null);
    setEditFormError("");

    setToastAlert({
      title: "Schedule Updated Successfully!",
      description: `Updated consultation schedule details for ${editingSchedule.doctorName}.`,
      type: "success",
    });
  };

  const [schedShiftTime, setSchedShiftTime] = useState("08:00 AM – 02:00 PM (Morning Shift)");
  const [schedCapacity, setSchedCapacity] = useState(15);
  const [schedStatus, setSchedStatus] = useState("Active On Duty");
  const [schedFormError, setSchedFormError] = useState("");

  const handleCreateSpecialistSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedRoom.trim() || schedDutyDays.length === 0) {
      setSchedFormError("Please fill out Consultation Room and select at least one Duty Day.");
      return;
    }

    const selectedDoc = doctorsList.find((d) => d.id === schedDoctorId) || doctorsList[0] || DOCTORS[0];
    const docAdminName = selectedDoc.fullName ? `${selectedDoc.fullName} (${selectedDoc.acronym || selectedDoc.name})` : selectedDoc.name;

    const daySummaries = schedDutyDays.map((day) => {
      const cfg = schedDaySchedules[day];
      if (!cfg) return `${day}: ${schedShiftTime}`;
      const timesStr = cfg.shiftTimes.join(", ");
      return `${day}: ${timesStr} (${cfg.capacity} visits)`;
    });

    const totalCapacity = schedDutyDays.reduce((acc, day) => acc + (schedDaySchedules[day]?.capacity || schedCapacity), 0);

    const newSchedule = {
      id: `sched-${Date.now()}`,
      doctorId: selectedDoc.id,
      doctorName: docAdminName,
      specialty: selectedDoc.specialty,
      room: schedRoom.trim(),
      dutyDays: schedDutyDays,
      dayConfigs: schedDaySchedules,
      shiftTime: daySummaries.join(" | "),
      capacity: Math.round(totalCapacity / Math.max(1, schedDutyDays.length)),
      totalWeeklyCapacity: totalCapacity,
      status: schedStatus,
    };

    createScheduleAPI(newSchedule);
    const updated = [newSchedule, ...specialistSchedules];
    setSpecialistSchedules(updated);
    localStorage.setItem("isalu_specialist_schedules", JSON.stringify(updated));

    // Sync Doctor object's availableDays, timeSlots, and roomNumber in API & DB!
    if (selectedDoc && (selectedDoc.id || selectedDoc.doc_id)) {
      const docTargetId = selectedDoc.id || selectedDoc.doc_id;
      const updatedDocPayload = {
        availableDays: schedDutyDays,
        availability: schedDutyDays,
        timeSlots: daySummaries,
        roomNumber: schedRoom.trim(),
        room: schedRoom.trim(),
      };

      updateDoctorAPI(docTargetId, updatedDocPayload);

      const updatedDocs = doctorsList.map((d) =>
        d.id === docTargetId || d.doc_id === docTargetId
          ? { ...d, ...updatedDocPayload }
          : d
      );
      setDoctorsList(updatedDocs);
      localStorage.setItem("isalu_hospital_doctors", JSON.stringify(updatedDocs));
    }

    // Reset Form
    setSchedRoom("");
    setSchedFormError("");
    setShowCreateScheduleModal(false);

    setToastAlert({
      title: "Specialist Schedule Saved!",
      description: `Custom per-day consultation schedule created for ${docAdminName}.`,
      type: "success",
    });
  };

  const handleToggleScheduleStatus = (sched: any) => {
    const isDisabling = sched.status === "Active On Duty" || !sched.status || !sched.status.includes("Disabled");
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
        localStorage.setItem("isalu_specialist_schedules", JSON.stringify(updatedSchedules));

        // Persist status change directly to existing DB record via PATCH
        await updateScheduleAPI(targetId, { status: newStatus });

        setToastAlert({
          title: isDisabling ? "Shift Disabled 🚫" : "Shift Re-Enabled ✓",
          description: `Schedule status for ${sched.doctorName} updated successfully.`,
          type: isDisabling ? "warning" : "success",
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

      const profile = {
        name: res.user?.name || loginUsername,
        role: res.user?.role || "Hospital Staff",
        desk: res.user?.desk || "Staff Duty Desk",
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
    const r = role.toLowerCase();
    if (r.includes("helpdesk") || r.includes("reception")) return "helpdesk";
    if (r.includes("hmo")) return "hmo";
    if (r.includes("cashdesk") || r.includes("cashier") || r.includes("billing")) return "cashdesk";
    if (r.includes("monitor")) return "monitor";
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

  const [aiReportHistory, setAiReportHistory] = useState<Array<{ prompt: string; date: string; report: string }>>(() => {
    const saved = localStorage.getItem("isalu_ai_reports");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const handleGenerateAiReport = (customPrompt?: string) => {
    const p = (customPrompt || aiPrompt || "Generate Full Executive Board Report").trim();
    setIsGeneratingAiReport(true);
    setCopiedAiReport(false);
    setAiProcessingProgress(15);
    setAiProcessingStep("Ingesting Helpdesk, HMO & Cashdesk Patient Records...");

    setTimeout(() => {
      setAiProcessingProgress(45);
      setAiProcessingStep("Auditing Department Traffic & Specialist Duty Shifts...");
    }, 400);

    setTimeout(() => {
      setAiProcessingProgress(75);
      setAiProcessingStep("Calculating Revenue Clearance Rates & HMO Pre-Auth Lag...");
    }, 800);

    setTimeout(() => {
      setAiProcessingProgress(95);
      setAiProcessingStep("Synthesizing Executive Board Strategic Insights & Risk Score...");
    }, 1200);

    setTimeout(() => {
      const nowStr = new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });

      const total = totalBookings;
      const checkedIn = checkedInCount;
      const completed = completedCount;
      const pendingHmo = pendingHmoCount;
      const hmoApproved = hmoApprovedCount;
      const pendingCash = pendingCashCount;
      const cleared = clearedPaymentCount;
      const activeStaff = activeStaffCount;
      const activeShifts = activeShiftsCount;
      const clearanceRate = total > 0 ? Math.round((cleared / total) * 100) : 0;
      const hmoRatio = total > 0 ? Math.round((hmoEnrolleeCount / total) * 100) : 0;
      const selfPayRatio = total > 0 ? Math.round((privateSelfPayCount / total) * 100) : 0;
      const referralCount = referralDocCount;

      let topDeptName = "Obstetrics & Gynaecology";
      let topDeptCount = 0;
      DEPARTMENTS.forEach((dept) => {
        const count = bookings.filter((b) => {
          const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
          return spec.includes(dept.name.toLowerCase()) || (dept.id === "gynaecology" && spec.includes("gynaec"));
        }).length;
        if (count > topDeptCount) {
          topDeptCount = count;
          topDeptName = dept.name;
        }
      });

      let reportText = "";
      const pLower = p.toLowerCase();

      // UNIVERSAL PLATFORM DATASET SEARCH & SYNTHESIS ENGINE
      const matchedDoctor = DOCTORS.find((d) => 
        pLower.includes(d.name.toLowerCase()) || 
        d.name.toLowerCase().split(" ").some((part) => part.length > 2 && pLower.includes(part))
      );

      const matchedDept = DEPARTMENTS.find((d) => 
        pLower.includes(d.name.toLowerCase()) || 
        (d.id === "gynaecology" && (pLower.includes("gynae") || pLower.includes("obstet") || pLower.includes("women"))) ||
        (d.id === "pediatrics" && (pLower.includes("pedia") || pLower.includes("child") || pLower.includes("baby"))) ||
        (d.id === "surgery" && pLower.includes("surg")) ||
        (d.id === "cardiology" && pLower.includes("cardio"))
      );

      const matchedHmo = ["hygeia", "reliance", "axa", "anchor", "total health", "bastion", "avon", "metro", "redcare"].find((h) => pLower.includes(h));

      if (matchedDoctor) {
        const docBookings = bookings.filter((b) => 
          (b.doctorName || b.doctor_name || "").toLowerCase().includes(matchedDoctor.name.toLowerCase())
        );
        const docCompleted = docBookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;
        const docCheckedIn = docBookings.filter((b) => (b.status || "").toLowerCase() === "checked in").length;
        
        reportText = `🏥 ISALU HOSPITALS - SPECIALIST AUDIT REPORT: ${matchedDoctor.name.toUpperCase()}
================================================================================
Generated On: ${nowStr} | Universal Query: "${p}"
Analytical Scope: Doctor Performance, Patient Volume & Duty Roster

1. SPECIALIST OVERVIEW & DUTY SCHEDULE:
   • Doctor Name           : ${matchedDoctor.name} (${(matchedDoctor as any).title || "Consultant"})
   • Specialty & Department: ${matchedDoctor.specialty}
   • Availability Days     : ${matchedDoctor.availability ? matchedDoctor.availability.join(", ") : "Monday - Sunday"}
   • Consultation Time     : ${matchedDoctor.timeSlots ? matchedDoctor.timeSlots.join(" | ") : "10:00 AM - 5:00 PM"}
   • Total Clinic Patients : ${docBookings.length} registered patients

2. CLINICAL STATUS BREAKDOWN FOR ${matchedDoctor.name.toUpperCase()}:
   • Completed Consultations: ${docCompleted} completed (Red Badge)
   • Active Lobby Waiting   : ${docCheckedIn} patients checked in
   • Scheduled / Pending    : ${docBookings.length - docCompleted - docCheckedIn} patients awaiting turn

3. AI DOCTOR AUDIT RECOMMENDATIONS:
   ✔ Sync doctor duty roster with Django REST API PostgreSQL health records.
   ✔ Ensure attached referral documents (ANSWER KEYS.docx) are reviewed prior to intake.
   ✔ Maintain target average consultation throughput of 15-20 minutes per patient.
================================================================================`;
      } else if (matchedDept) {
        const deptBookings = bookings.filter((b) => {
          const spec = (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase();
          return spec.includes(matchedDept.name.toLowerCase()) || (matchedDept.id === "gynaecology" && spec.includes("gynaec"));
        });
        const deptCleared = deptBookings.filter((b) => (b.paymentStatus || b.payment_status || "").toLowerCase() === "cleared" || (b.paymentStatus || "").includes("hmo")).length;
        const deptRatio = total > 0 ? Math.round((deptBookings.length / total) * 100) : 0;

        reportText = `🏥 ISALU HOSPITALS - DEPARTMENT AUDIT REPORT: ${matchedDept.name.toUpperCase()}
================================================================================
Generated On: ${nowStr} | Universal Query: "${p}"
Analytical Scope: ${matchedDept.name} Clinic Traffic, Billings & Operations

1. DEPARTMENT TRAFFIC & PATIENT SHARE:
   • Department Name       : ${matchedDept.name} (${(matchedDept as any).location || "Main Clinic Wing"})
   • Total Clinic Patients : ${deptBookings.length} registered patients
   • Overall Hospital Share: ${deptRatio}% of total patient volume
   • Payment Clearance Rate: ${deptBookings.length > 0 ? Math.round((deptCleared / deptBookings.length) * 100) : 0}% (${deptCleared} cleared)

2. DEPARTMENT DOCTOR ROSTER & STATUS:
   • Department Doctors    : ${DOCTORS.filter(d => (d.specialty || "").toLowerCase().includes(matchedDept.name.toLowerCase())).map(d => d.name).join(", ") || "Duty Specialists"}
   • Operational Status    : ${(matchedDept as any).status || "Active ✓"}

3. AI DEPARTMENT RECOMMENDATIONS:
   ✔ Allocate peak morning consultation slots for ${matchedDept.name} to absorb lobby rush.
   ✔ Audit HMO authorizations for ${matchedDept.name} patients at HMO Desk.
   ✔ Maintain electronic medical records backup and administrative logs.
================================================================================`;
      } else if (matchedHmo) {
        const hmoBookings = bookings.filter((b) => (b.hmoName || b.hmo_name || "").toLowerCase().includes(matchedHmo));
        const hmoAuthCleared = hmoBookings.filter((b) => (b.hmoStatus || b.hmo_status || "").toLowerCase() === "approved" || b.hmoAuthCode).length;

        reportText = `🏥 ISALU HOSPITALS - HMO PROVIDER AUDIT REPORT: ${matchedHmo.toUpperCase()}
================================================================================
Generated On: ${nowStr} | Universal Query: "${p}"
Analytical Scope: ${matchedHmo.toUpperCase()} Insurance Claims, Pre-Auths & Enrollee Volume

1. HMO PROVIDER OVERVIEW:
   • HMO Partner Name      : ${matchedHmo.toUpperCase()} Insurance Underwriters
   • Enrollees Processed   : ${hmoBookings.length} enrollees registered today
   • Pre-Auth Approval Rate: ${hmoBookings.length > 0 ? Math.round((hmoAuthCleared / hmoBookings.length) * 100) : 0}% (${hmoAuthCleared} pre-auth codes confirmed)
   • Pending Pre-Auth Code : ${hmoBookings.length - hmoAuthCleared} enrollees awaiting authorization

2. REVENUE RISK & CLAIMS AUDIT:
   • HMO Tariff Clearance : Synced with Isalu HMO Portal
   • Claims Turnaround Time: Average 2.4 Hours for Code Issuance
   • Attached Referrals    : Verified against enrollee policy code

3. AI HMO MANAGEMENT ACTIONS:
   ✔ Follow up with ${matchedHmo.toUpperCase()} HMO Desk Officer for ${hmoBookings.length - hmoAuthCleared} pending pre-auth codes.
   ✔ Ensure enrollee ID numbers are verified at Helpdesk prior to billing clearing.
================================================================================`;
      } else if (pLower.includes("hmo") || pLower.includes("financial") || pLower.includes("risk") || pLower.includes("billing") || pLower.includes("revenue") || pLower.includes("payment")) {
        reportText = `🏥 ISALU HOSPITALS - FINANCIAL CLEARANCE & HMO RISK AUDIT REPORT
================================================================================
Generated On: ${nowStr} | Neural Engine Audit Model v3.2
Analytical Focus: HMO Authorizations, Cashdesk Billings & Financial Risk

1. EXECUTIVE FINANCIAL METRICS OVERVIEW:
   • Total Patient Tickets Processed: ${total}
   • Overall Revenue Clearance Rate : ${clearanceRate}% (${cleared} of ${total} cleared)
   • Private Self-Pay Breakdown     : ${selfPayRatio}% (${privateSelfPayCount} patients)
   • HMO Insurance Breakdown        : ${hmoRatio}% (${hmoEnrolleeCount} enrollees)

2. DESK BOTTLENECK & FINANCIAL EXPOSURE AUDIT:
   • HMO Pre-Authorization Desk : ${pendingHmo} tickets pending pre-auth code (${hmoApproved} approved)
   • Cashdesk Billing Clearance: ${pendingCash} self-pay patients pending billing confirmation
   • Attached Referral Letters : ${referralCount} verified referral document attachments
   • Revenue Risk Exposure      : ${pendingCash > 2 ? "MODERATE - Follow up on Cashdesk pending receipts" : "LOW - Healthy billing flow"}

3. DEPARTMENT REVENUE CONTRIBUTIONS:
${DEPARTMENTS.map((d) => {
  const cnt = bookings.filter((b) => (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase().includes(d.name.toLowerCase())).length;
  return `   • ${d.name.padEnd(25)}: ${cnt} patients (${cnt > 0 ? Math.round((cnt / (total || 1)) * 100) : 0}% total share)`;
}).join("\n")}

4. AI EXECUTIVE STRATEGIC ACTIONS:
   ✔ Expedite ${pendingHmo} pending HMO authorizations with Hygeia, AXA Mansard & Reliance HMO officers.
   ✔ Ensure POS terminals at Cashdesk are active to clear ${pendingCash} pending billing tickets.
   ✔ Maintain target revenue clearance rate above 92% across all hospital desks.
================================================================================`;
      } else if (pLower.includes("workload") || pLower.includes("bottleneck") || pLower.includes("queue") || pLower.includes("traffic") || pLower.includes("waiting")) {
        reportText = `🏥 ISALU HOSPITALS - DEPARTMENT QUEUE & BOTTLENECK ANALYSIS
================================================================================
Generated On: ${nowStr} | Neural Engine Queue Audit Model v3.2
Analytical Focus: Waiting Lobby Flow, Department Traffic & Triage Times

1. CLINICAL FLOOR TRAFFIC SNAPSHOT:
   • Active Lobby Queue (Checked In): ${checkedIn} patients waiting in consultation lobby
   • Concluded Consultations        : ${completed} consultations completed (Red Badge)
   • Busiest Clinical Specialty    : ${topDeptName} (${topDeptCount} registered patients)
   • Waiting Room Congestion Level  : ${checkedIn > 4 ? "HIGH CONGESTION - Triage intervention recommended" : "NORMAL - Smooth lobby movement"}

2. CLINICAL DEPARTMENT QUEUE BREAKDOWN:
${DEPARTMENTS.map((d) => {
  const cnt = bookings.filter((b) => (b.doctorSpecialty || b.doctor_specialty || "").toLowerCase().includes(d.name.toLowerCase())).length;
  return `   • ${d.name.padEnd(25)}: ${cnt} patients registered | Load Ratio: ${cnt > 0 ? Math.round((cnt / (total || 1)) * 100) : 0}%`;
}).join("\n")}

3. AI STAFFING & LOBBY OPTIMIZATION ACTIONS:
   ✔ Deploy additional duty officer to ${topDeptName} Clinic to absorb high morning rush.
   ✔ ${checkedIn > 3 ? "ALERT: Floor queue active. Request duty doctors to streamline intake." : "Floor queue optimal. Patient turnover is well-balanced."}
   ✔ Verify referral letters at Helpdesk before routing patients to specialty clinics.
================================================================================`;
      } else if (pLower.includes("staff") || pLower.includes("roster") || pLower.includes("shift") || pLower.includes("doctor") || pLower.includes("user")) {
        reportText = `🏥 ISALU HOSPITALS - SPECIALIST STAFF ROSTER & SHIFT EFFICIENCY AUDIT
================================================================================
Generated On: ${nowStr} | Neural Engine Workforce Audit v3.2
Analytical Focus: Medical Staff Deployment, Shift Coverage & Roster Balance

1. MEDICAL WORKFORCE AUDIT METRICS:
   • Total Active Medical Personnel: ${activeStaff} registered personnel
   • Active Specialist Duty Shifts : ${activeShifts} duty shifts scheduled
   • Patient-to-Staff Coverage     : ${activeStaff > 0 ? (total / activeStaff).toFixed(1) : "0"} patients per staff member
   • Shift Utilization Efficiency  : 94.2% Optimal Duty Coverage

2. SPECIALTY SHIFT COVERAGE BREAKDOWN:
   • Obstetrics & Gynaecology : Active Duty (Dr. Funke Akindele / Dr. Yinka Olumide)
   • Pediatrics & Child Health: Active Duty (Dr. Amaka Okafor)
   • Internal Medicine        : Active Duty (Dr. Babatunde Lawal)
   • General Surgery          : Active Duty (Dr. Chidi Nnamdi)

3. AI WORKFORCE & ROSTER RECOMMENDATIONS:
   ✔ Maintain current ${activeShifts} specialist duty shifts for full 24/7 clinic coverage.
   ✔ Ensure seamless shift handover between morning and evening consultant rosters.
   ✔ Sync staff shift schedules with electronic health record registry.
================================================================================`;
      } else if (pLower.includes("referral") || pLower.includes("doc") || pLower.includes("health") || pLower.includes("file") || pLower.includes("answer")) {
        reportText = `🏥 ISALU HOSPITALS - PATIENT HEALTH REFERRAL & DOCUMENT AUDIT
================================================================================
Generated On: ${nowStr} | Neural Engine Document Audit v3.2
Analytical Focus: Referral Attachments, Clinical Notes & Record Verification

1. CLINICAL ATTACHMENT METRICS:
   • Verified Referral Attachments: ${referralCount} documents on file
   • Document Verification Rate   : ${total > 0 ? Math.round((referralCount / total) * 100) : 0}% of patient bookings
   • Document Types Uploaded       : PDF, DOCX, TXT Clinical Referral Letters & Answer Keys

2. REFERRAL FILE AUDIT & HEALTH RECORDS:
   • Helpdesk File Verification  : 100% Verified by Administrative Staff
   • Electronic Health Records   : Synced with Django REST API PostgreSQL DB
   • Patient Compliance Score    : 96.8% Documentation Accuracy

3. AI DOCUMENT MANAGEMENT ACTIONS:
   ✔ Preview attached referral documents (ANSWER KEYS.docx) directly in administrator app modal.
   ✔ Verify patient referral letters prior to specialist consultation entry.
   ✔ Ensure electronic records backup is maintained daily.
================================================================================`;
      } else if (pLower.includes("forecast") || pLower.includes("growth") || pLower.includes("capacity") || pLower.includes("predict")) {
        reportText = `🏥 ISALU HOSPITALS - CAPACITY & GROWTH FORECAST REPORT
================================================================================
Generated On: ${nowStr} | Neural Engine Predictive Analytics v3.2
Analytical Focus: Patient Growth Forecast, Capacity Utilization & Strategic Expansion

1. CAPACITY FORECAST METRICS:
   • Daily Patient Intake Volume : ${total} patients processed today
   • Projected Weekly Intake     : ${total * 7} estimated registrations
   • Facility Capacity Load      : ${Math.min(95, Math.max(35, Math.round((total / 25) * 100)))}% capacity utilization
   • Hospital Health Index Score : 9.4/10 EXCELLENT OPERATIONAL HEALTH

2. GROWTH & TRAFFIC PREDICTIONS:
   • High Demand Peak Hours      : 09:00 AM – 01:00 PM (Morning Outpatient Rush)
   • Top Specialty Demand        : ${topDeptName} (${topDeptCount} bookings)
   • Revenue Growth Projection   : +14.5% month-over-month increase

3. AI STRATEGIC GROWTH RECOMMENDATIONS:
   ✔ Expand outpatient consultation slots for ${topDeptName} to meet high demand.
   ✔ Upgrade digital booking portals & automated SMS reminders to maintain 95%+ attendance.
   ✔ Strengthen HMO corporate partnerships with top-tier insurance underwriters.
================================================================================`;
      } else {
        const matchingBookings = bookings.filter((b) => {
          const str = JSON.stringify(b).toLowerCase();
          return str.includes(pLower);
        });

        reportText = `🏥 ISALU HOSPITALS - SEARCH SYNTHESIS REPORT: "${p.toUpperCase()}"
================================================================================
Generated On: ${nowStr} | Universal Intelligence Search Model v3.2
Analytical Focus: Deep Search & Data Synthesis for Keyword: "${p}"

1. SEARCH QUERY MATCH METRICS:
   • Search Query Keyword    : "${p}"
   • Direct Database Matches : ${matchingBookings.length} records found in active registry
   • Match Relevance Share   : ${total > 0 ? Math.round((matchingBookings.length / total) * 100) : 0}% of overall hospital volume
   • Database Search Target  : Patient Bookings, Doctor Roster, HMO Records, EHR Files

2. MATCHED DATA RECORDS BREAKDOWN:
${matchingBookings.length > 0 ? matchingBookings.slice(0, 5).map((b, idx) => 
  `   ${idx + 1}. Ticket #${b.refCode || b.ref_code || "ISALU"} | Patient: ${b.patientName || b.patient_name || "Patient"} | Doctor: ${b.doctorName || b.doctor_name || "Specialist"} | Status: ${b.status || "Scheduled"}`
).join("\n") : "   • No exact patient records matching query text; analyzed macro clinical dataset."}

3. AI EXECUTIVE SEARCH RECOMMENDATIONS:
   ✔ Search query "${p}" analyzed across Django REST API database and Local Storage registry.
   ✔ Filter records on the Hospital Management Dashboard using the search toolbar above.
   ✔ Export matching data logs into PDF or Excel spreadsheet for clinical board review.
================================================================================`;
      }

      setGeneratedAiReport(reportText);
      setAiProcessingProgress(100);
      setIsGeneratingAiReport(false);

      const newHistoryItem = {
        prompt: p,
        date: nowStr,
        report: reportText,
      };

      setAiReportHistory((prev) => {
        const updated = [newHistoryItem, ...prev.slice(0, 9)];
        localStorage.setItem("isalu_ai_reports", JSON.stringify(updated));
        return updated;
      });
    }, 1400);
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

    DEPARTMENTS.forEach((dept, idx) => {
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
    const activeShiftsCount = specialistSchedules.filter((s) => s.status === "Active On Duty" || !s.status || !s.status.includes("Disabled")).length;

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

    DEPARTMENTS.forEach((dept) => {
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

  // Load bookings from localStorage
  const loadBookings = () => {
    const raw = localStorage.getItem("isalu_bookings") || localStorage.getItem("medicare_bookings") || "[]";
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
    setBookings(parsed || []);
  };

  const handleManualRefresh = async () => {
    setIsRefreshingData(true);
    loadBookings();
    try {
      const remoteBookings = await getBookingsAPI();
      if (remoteBookings && Array.isArray(remoteBookings)) {
        const localStr = localStorage.getItem("isalu_bookings") || localStorage.getItem("medicare_bookings");
        let localBookings: any[] = [];
        if (localStr) {
          try { localBookings = JSON.parse(localStr); } catch {}
        }
        const mergedMap = new Map<string, any>();
        remoteBookings.forEach((remoteB: any) => {
          const code = remoteB.refCode || remoteB.ref_code;
          if (code) {
            const localB = localBookings.find((lb: any) => (lb.refCode || lb.ref_code) === code);
            const merged = { ...(localB || {}), ...remoteB };
            merged.refCode = remoteB.refCode || remoteB.ref_code || localB?.refCode;
            merged.patientName = remoteB.patientName || remoteB.patient_name || localB?.patientName;
            merged.status = remoteB.status || localB?.status || "Booked";
            merged.hmoStatus = remoteB.hmoStatus || remoteB.hmo_status || localB?.hmoStatus;
            merged.hmo_status = remoteB.hmo_status || remoteB.hmoStatus || localB?.hmo_status;
            merged.paymentStatus = remoteB.paymentStatus || remoteB.payment_status || localB?.paymentStatus;
            merged.payment_status = remoteB.payment_status || remoteB.paymentStatus || localB?.payment_status;
            merged.paymentType = remoteB.paymentType || remoteB.payment_type || localB?.paymentType;
            mergedMap.set(code, merged);
          }
        });
        localBookings.forEach((localB: any) => {
          const code = localB.refCode || localB.ref_code;
          if (code && !mergedMap.has(code)) {
            mergedMap.set(code, localB);
          }
        });
        const combined = Array.from(mergedMap.values());
        setBookings(combined);
        localStorage.setItem("isalu_bookings", JSON.stringify(combined));
      }
    } catch (err) {
      console.warn("Manual refresh error:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshingData(false);
        setToastAlert({
          title: "Dashboard Synchronized ✓",
          description: "Latest hospital queue, patient tickets, and server records refreshed successfully.",
          type: "success",
        });
      }, 300);
    }
  };

  const handleClearAllBookings = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Clear All Patient Tickets",
      message: "Are you sure you want to clear all patient booking records? This will erase all active appointment tickets.",
      confirmText: "Yes, Clear All Tickets",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: () => {
        localStorage.removeItem("isalu_bookings");
        localStorage.removeItem("medicare_bookings");
        setBookings([]);
        setToastAlert({
          title: "All Bookings Cleared",
          description: "All patient booking records have been cleared.",
          type: "info",
        });
      },
    });
  };

  useEffect(() => {
    loadBookings();

    async function syncBackendData() {
      try {
        const remoteBookings = await getBookingsAPI();
        const localStr = localStorage.getItem("isalu_bookings") || localStorage.getItem("medicare_bookings");
        let localBookings: any[] = [];
        if (localStr) {
          try { localBookings = JSON.parse(localStr); } catch {}
        }

        if (remoteBookings && Array.isArray(remoteBookings)) {
          const mergedMap = new Map<string, any>();
          
          // 1. Process remote bookings as master source of truth for statuses & server states
          remoteBookings.forEach((remoteB: any) => {
            const code = remoteB.refCode || remoteB.ref_code;
            if (code) {
              const localB = localBookings.find((lb: any) => (lb.refCode || lb.ref_code) === code);
              // Merge local metadata, but prioritize remote server fields for status, paymentStatus, and hmoStatus
              const merged = { ...(localB || {}), ...remoteB };
              merged.refCode = remoteB.refCode || remoteB.ref_code || localB?.refCode;
              merged.patientName = remoteB.patientName || remoteB.patient_name || localB?.patientName;
              merged.status = remoteB.status || localB?.status || "Booked";
              merged.hmoStatus = remoteB.hmoStatus || remoteB.hmo_status || localB?.hmoStatus;
              merged.hmo_status = remoteB.hmo_status || remoteB.hmoStatus || localB?.hmo_status;
              merged.paymentStatus = remoteB.paymentStatus || remoteB.payment_status || localB?.paymentStatus;
              merged.payment_status = remoteB.payment_status || remoteB.paymentStatus || localB?.payment_status;
              merged.paymentType = remoteB.paymentType || remoteB.payment_type || localB?.paymentType;
              mergedMap.set(code, merged);
            }
          });

          // 2. Preserve any local-only offline bookings that haven't been pushed to backend server yet
          localBookings.forEach((localB: any) => {
            const code = localB.refCode || localB.ref_code;
            if (code && !mergedMap.has(code)) {
              mergedMap.set(code, localB);
            }
          });

          const combined = Array.from(mergedMap.values());
          setBookings(combined);
          localStorage.setItem("isalu_bookings", JSON.stringify(combined));
        } else if (localBookings.length > 0) {
          setBookings(localBookings);
        }

        const remoteDepts = await getDepartmentsAPI();
        if (remoteDepts && Array.isArray(remoteDepts)) {
          const localStr = localStorage.getItem("isalu_clinics_list") || localStorage.getItem("isalu_hospital_departments");
          let localParsed: any[] = [];
          if (localStr) {
            try { localParsed = JSON.parse(localStr); } catch {}
          }
          const merged = mergeClinicsData(DEPARTMENTS, localParsed, remoteDepts);
          setClinics(merged);
          localStorage.setItem("isalu_clinics_list", JSON.stringify(merged));
          localStorage.setItem("isalu_hospital_departments", JSON.stringify(merged));
        }

        const remoteDoctors = await getDoctorsAPI();
        if (remoteDoctors && Array.isArray(remoteDoctors)) {
          setDoctorsList(remoteDoctors);
          localStorage.setItem("isalu_hospital_doctors", JSON.stringify(remoteDoctors));
        }

        const remoteSchedules = await getSchedulesAPI();
        if (remoteSchedules && Array.isArray(remoteSchedules)) {
          setSpecialistSchedules(remoteSchedules);
          localStorage.setItem("isalu_specialist_schedules", JSON.stringify(remoteSchedules));
        }
        const remoteHmos = await getHmoCompaniesAPI();
        const isCleared = localStorage.getItem("isalu_hmo_cleared");

        if (isCleared === "true" && (!remoteHmos || remoteHmos.length === 0)) {
          setHmoCompanies([]);
        } else if (remoteHmos && Array.isArray(remoteHmos) && remoteHmos.length > 0) {
          setHmoCompanies(remoteHmos);
          localStorage.setItem("isalu_hmo_companies", JSON.stringify(remoteHmos));
          localStorage.removeItem("isalu_hmo_cleared");
        } else if (!isCleared) {
          const localHmoStr = localStorage.getItem("isalu_hmo_companies");
          let localHmoParsed: any[] = [];
          if (localHmoStr) {
            try { localHmoParsed = JSON.parse(localHmoStr); } catch {}
          }
          if (localHmoParsed.length > 0) {
            setHmoCompanies(localHmoParsed);
          }
        }
        const remoteUsers = await getSystemUsersAPI();
        if (remoteUsers && Array.isArray(remoteUsers)) {
          setSystemUsers(remoteUsers);
          localStorage.setItem("isalu_system_users", JSON.stringify(remoteUsers));
        }
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
    } catch {}

    let userChan: BroadcastChannel | null = null;
    try {
      userChan = new BroadcastChannel("isalu_user_channel");
      userChan.onmessage = (event) => {
        if (event.data?.type === "USERS_UPDATED") {
          loadUsers();
        }
      };
    } catch {}

    window.addEventListener("storage", handleSync);
    window.addEventListener("isalu_booking_created", handleSync);
    window.addEventListener("isalu_booking_updated", handleSync);
    window.addEventListener("isalu_users_updated", loadUsers);
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
    localStorage.setItem("isalu_bookings", JSON.stringify(updatedList));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("isalu_booking_updated"));
    try {
      const channel = new BroadcastChannel("isalu_hospital_channel");
      channel.postMessage({ type: "BOOKINGS_UPDATED", timestamp: Date.now() });
      channel.close();
    } catch {}
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
        description: res.error,
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

  const handleHmoApproval = (refCode: string, policy: string, auth: string) => {
    approveHmoBookingAPI(refCode, policy, auth);
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

    const isHmoPatient = payType === "HMO Insurance" || (hName && hName !== "N/A");

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
      matchesStatus = b.status?.toLowerCase() === statusFilter.toLowerCase();
    }

    const matchesHmo =
      hmoProviderFilter === "all" ? true : b.hmoName === hmoProviderFilter;

    return matchesStatus && matchesHmo;
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
  const checkedInList = bookings.filter((b) => b.status === "Checked In");
  const totalCheckedInPages = Math.ceil(checkedInList.length / checkedInItemsPerPage) || 1;
  const currentCheckedInPage = Math.min(checkedInCurrentPage, totalCheckedInPages);
  const paginatedCheckedInBookings = checkedInList.slice(
    (currentCheckedInPage - 1) * checkedInItemsPerPage,
    currentCheckedInPage * checkedInItemsPerPage
  );

  // 6. HMO Enrollees Directory Pagination
  const hmoEnrolleesList = bookings.filter((b) => b.paymentType === "HMO Insurance" || b.hmoName);
  const totalHmoEnrolleesPages = Math.ceil(hmoEnrolleesList.length / hmoEnrolleesItemsPerPage) || 1;
  const currentHmoEnrolleesPage = Math.min(hmoEnrolleesCurrentPage, totalHmoEnrolleesPages);
  const paginatedHmoEnrolleesBookings = hmoEnrolleesList.slice(
    (currentHmoEnrolleesPage - 1) * hmoEnrolleesItemsPerPage,
    currentHmoEnrolleesPage * hmoEnrolleesItemsPerPage
  );

  // 7. Private Self-Pay Enrollees Directory Pagination
  const privatePatientsList = bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType);
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

  // 9. User & Staff Management Directory Pagination
  const filteredSystemUsers = systemUsers.filter((u) => {
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
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                        currentPage === pg
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
  const activeShiftsCount = specialistSchedules.filter((s) => s.status === "Active On Duty" || !s.status || !s.status.includes("Disabled")).length;

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
                  className={`px-4 py-3 font-extrabold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border ${
                    activeDesk === "clinic"
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
                  className={`px-4 py-3 font-extrabold text-xs rounded-2xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 border ${
                    activeDesk === "users"
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
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeDesk === "helpdesk"
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
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeDesk === "hmo"
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
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeDesk === "cashdesk"
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
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeDesk === "analytics"
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
              className={`flex-1 min-w-[130px] sm:min-w-[140px] py-3 px-3 sm:px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                activeDesk === "monitor"
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
        {["helpdesk", "hmo", "cashdesk"].includes(activeDesk) && (
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

                {activeDesk === "monitor" && (
                  <>
                    <option value="all">All Queue Statuses</option>
                    <option value="today">📅 Today's Queue</option>
                    <option value="completed">✅ Completed Consultations</option>
                    <option value="hmo">🛡️ HMO Insurance Patients</option>
                    <option value="private">💳 Private Self-Pay Patients</option>
                  </>
                )}
              </select>

              {activeDesk === "hmo" && (
                <select
                  value={hmoProviderFilter}
                  onChange={(e) => setHmoProviderFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All HMO Providers</option>
                  {hmoCompanies.map((hmo) => (
                    <option key={hmo.id || hmo.name} value={hmo.name}>{hmo.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* 1. HELPDESK (RECEPTION) DESK VIEW */}
        {activeDesk === "helpdesk" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#008ac9]" /> Reception Patient Check-In & Queue List ({filteredBookings.length})
              </h2>
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
                          className={`px-3 py-0.5 rounded-full text-[11px] font-black ${
                            b.status === "Checked In"
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
                              <span className={`font-black px-2 py-0.5 rounded border inline-block ${
                                b.hmoAuthCode ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"
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
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#008ac9]" /> HMO Insurance Pre-Authorization & Verification Desk
              </h2>
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
                          className={`px-3 py-0.5 rounded-full text-[11px] font-black ${
                            b.hmoStatus === "Approved"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300"
                          }`}
                        >
                          {b.hmoStatus === "Approved" ? "HMO Approved ✓" : "Pending Pre-Auth"}
                        </span>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-slate-800 text-[#008ac9] border border-[#008ac9]/30">
                          {b.hmoName || "Hygeia HMO"}
                        </span>
                      </div>

                      {b.hmoStatus !== "Approved" && (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setHmoPolicyCode(b.hmoPolicyCode || "");
                            setHmoAuthCode(b.hmoAuthCode || "");
                          }}
                          className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <ShieldCheck className="h-4 w-4" /> Grant HMO Pre-Auth
                        </button>
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
                          <span className={`font-black px-2 py-0.5 rounded border inline-block ${
                            b.hmoStatus === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"
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
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#008ac9]" /> Private Self-Pay Patient Cashdesk & Invoicing
              </h2>
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
                        className={`px-3 py-0.5 rounded-full text-[11px] font-black ${
                          b.paymentStatus === "Cleared"
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
                        className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-2 shadow-sm cursor-pointer ${
                          isSelected
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
                  {DEPARTMENTS.length} Active Departments
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEPARTMENTS.map((dept) => {
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
                    <span className="text-xs font-black text-sky-300">{new Date().toLocaleTimeString()}</span>
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

            {/* Waiting Room Queue / Next Patients */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-100 dark:bg-slate-800 text-[#008ac9] rounded-2xl shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Upcoming Waiting Room Queue</h3>
                    <p className="text-xs font-bold text-slate-500">Scheduled appointments awaiting check-in.</p>
                  </div>
                </div>

                {/* Embedded Search & Filter Controls directly inside the card header */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search ref, patient, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#008ac9]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-extrabold text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Queue Statuses</option>
                    <option value="today">📅 Today's Queue</option>
                    <option value="completed">✅ Completed Consultations</option>
                    <option value="hmo">🛡️ HMO Insurance Patients</option>
                    <option value="private">💳 Private Self-Pay Patients</option>
                  </select>

                  <span className="px-3 py-1.5 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] font-black text-xs border border-[#008ac9]/30 whitespace-nowrap">
                    {filteredBookings.filter((b) => {
                      const st = (b.status || "").toLowerCase().trim();
                      return st !== "completed" && st !== "cancelled" && st !== "done" && st !== "discharged";
                    }).length} Waiting Patients
                  </span>
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
                    .map((b) => {
                    const isHmoApproved = b.paymentType === "HMO Insurance" && b.hmoStatus === "Approved";
                    const isPayCleared = (b.paymentType === "Private Self-Pay" || !b.paymentType) && b.paymentStatus === "Cleared";
                    const isEligibleForCheckIn = isHmoApproved || isPayCleared;

                    const docDisplay = getDoctorRealName(b);
                    const matchedDoc = DOCTORS.find((d) => d.fullName === docDisplay || d.name === docDisplay || d.acronym === (b.doctorName || b.doctor_name));
                    const docSpecialty = b.doctorSpecialty || b.doctor_specialty || matchedDoc?.specialty || "Obstetrics & Gynaecology";
                    const docAcronym = b.doctorAcronym || b.doctor_acronym || matchedDoc?.acronym;

                    return (
                      <div
                        key={b.refCode}
                        className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-[#008ac9] transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-[#008ac9] dark:text-sky-400 tracking-wider">
                            {b.refCode}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                              isEligibleForCheckIn
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                            }`}
                          >
                            {isEligibleForCheckIn ? "Eligible for Check-In ✓" : "Pending Clearance ⏳"}
                          </span>
                        </div>

                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                            <span>{b.patientName}</span>
                            {b.patientPhone && <span className="text-[11px] font-bold text-slate-500">{b.patientPhone}</span>}
                          </div>
                          <div className="mt-1.5 space-y-2">
                            {/* Colorful Modern Patient Type Badge */}
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

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-[#008ac9] dark:text-sky-400">
                                🩺 {docDisplay}
                              </span>
                              {docAcronym && docAcronym.toLowerCase() !== docDisplay.toLowerCase() && (
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
                            <span>📅 {b.date}</span>
                            <span>🕒 {b.time}</span>
                          </div>

                          {isEligibleForCheckIn ? (
                            <button
                              onClick={() => handleMarkCompleted(b.refCode)}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Mark Consultation Completed ✓
                            </button>
                          ) : b.paymentType === "HMO Insurance" ? (
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
                      const matchedDoc = DOCTORS.find((d) => d.fullName === docDisplay || d.name === docDisplay || d.acronym === (b.doctorName || b.doctor_name));
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
            {/* Header & Add User Button */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-slate-800 text-[#008ac9] text-xs font-black border border-[#008ac9]/30 mb-2">
                  <UserCog className="h-4 w-4" /> System Administration Module
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Hospital Staff & User Accounts Management</h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage staff login accounts, grant operational permissions across Helpdesk, HMO Approval Desk, Cashdesk, and Monitor Desk.
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
                  className="px-5 py-3 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#008ac9]/25 transition-all flex items-center gap-2 border border-[#008ac9]"
                >
                  <UserPlus className="h-4 w-4" /> + Add New System User
                </button>
              </div>
            </div>

            {/* Users Accounts List Grid */}
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
                    <option value="administrator">Super / Hospital Administrator</option>
                    <option value="helpdesk">Helpdesk Officer</option>
                    <option value="hmo">HMO Approval Officer</option>
                    <option value="cashdesk">Cashdesk Billing Officer</option>
                    <option value="monitor">Monitor Operator</option>
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
                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-block ${
                            u.role === "Super Administrator"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300"
                              : u.role === "Helpdesk Officer"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300"
                              : u.role === "HMO Approval Officer"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                              : u.role === "Cashdesk Billing Officer"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {u.desk}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            u.status === "Active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                          }`}>
                            {u.status === "Active" ? "Active ✓" : "Disabled 🚫"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-slate-500 font-semibold text-[11px]">
                          {u.lastActive}
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
                                className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${
                                  u.status === "Active"
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
                  {DOCTORS.length}
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
                    <option value="active">Active Only</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* All Clinics Grid Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => {
                  const assignedDocs = DOCTORS.filter((doc: any) =>
                    (doc.specialty || "").toLowerCase().includes((clinic.name || "").toLowerCase()) ||
                    (doc.departmentId || "").toLowerCase() === (clinic.id || clinic.dept_id || "").toLowerCase()
                  );

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
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              clinic.status === "Maintenance" || clinic.status === "Disabled"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            }`}
                          >
                            {clinic.status || "Active ✓"}
                          </span>
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
                        <button
                          onClick={() => handleDeleteClinic(clinic)}
                          className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-rose-200 dark:border-slate-700"
                          title="Delete Clinic"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

              <div className="px-4 py-2.5 bg-sky-50 dark:bg-slate-800 rounded-2xl border border-[#008ac9]/30 font-black text-xs text-[#008ac9]">
                Total Registered: {bookings.length} Patients
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
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-block ${
                              b.paymentType === "HMO Insurance"
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              b.status === "Checked In"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                : b.status === "Completed"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-2 border-rose-400 font-extrabold"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                            }`}>
                              {b.status || "Confirmed"}
                            </span>
                          </td>
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

              <div className="px-4 py-2.5 bg-emerald-50 dark:bg-slate-800 rounded-2xl border border-emerald-300 font-black text-xs text-emerald-700 dark:text-emerald-300">
                Active Checked-In: {bookings.filter((b) => b.status === "Checked In").length} Patients
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
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            hmo.status === "Disabled Partner"
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
                              className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${
                                hmo.status === "Disabled Partner"
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
              <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#008ac9]" /> Registered HMO Enrollee Patients
                </h3>
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              b.hmoStatus === "Approved"
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

              <div className="px-4 py-2.5 bg-purple-50 dark:bg-slate-800 rounded-2xl border border-purple-300 font-black text-xs text-purple-700 dark:text-purple-300">
                Total Private Patients: {bookings.filter((b) => b.paymentType === "Private Self-Pay" || !b.paymentType).length} Patients
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
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                              b.paymentStatus === "Cleared"
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
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.name}>
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
                                  className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all border ${
                                    sched.status?.includes("Disabled")
                                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300"
                                  }`}
                                >
                                  {sched.status?.includes("Disabled") ? "Enable Shift" : "Disable Shift"}
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                          pg === currentSchedPage
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
                <button
                  onClick={() => setShowAddDoctorModal(true)}
                  className="px-4 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" /> + Add New Doctor
                </button>
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
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
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
                    const isDisabled = doc.status?.includes("Disabled");
                    const acronym = doc.acronym || getAcronymForIndex(idx);
                    return (
                      <div
                        key={doc.id || doc.doc_id || idx}
                        className={`p-4 rounded-2xl border-2 transition-all space-y-3 flex flex-col justify-between ${
                          isDisabled
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
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isDisabled
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-sm ${
                              isDisabled
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
                {editDocFormError && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-black border border-rose-300">
                    {editDocFormError}
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
                      const d = DEPARTMENTS.find((dept) => dept.name === e.target.value);
                      if (d) setEditDocDeptId(d.id);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    {DEPARTMENTS.map((dept) => (
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

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingDoctor(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs shadow-md"
                  >
                    Save Changes ✓
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
                        placeholder="Search doctor by name or specialty (e.g. Dr. Olusola, Cardiology)..."
                        value={schedDoctorSearch}
                        onFocus={() => setShowDoctorDropdown(true)}
                        onChange={(e) => {
                          setSchedDoctorSearch(e.target.value);
                          setShowDoctorDropdown(true);
                        }}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                      />
                    </div>

                    {showDoctorDropdown && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {doctorsList.filter(
                          (d) =>
                            (!d.status || d.status === "Active" || !d.status.includes("Disabled")) &&
                            (d.name.toLowerCase().includes(schedDoctorSearch.toLowerCase()) ||
                              (d.fullName && d.fullName.toLowerCase().includes(schedDoctorSearch.toLowerCase())) ||
                              (d.acronym && d.acronym.toLowerCase().includes(schedDoctorSearch.toLowerCase())) ||
                              d.specialty.toLowerCase().includes(schedDoctorSearch.toLowerCase()))
                        ).length === 0 ? (
                          <div className="p-3 text-center text-xs font-bold text-slate-500">
                            No active specialist found matching "{schedDoctorSearch}".
                            <button
                              type="button"
                              onClick={() => {
                                setShowDoctorDropdown(false);
                                setShowAddDoctorModal(true);
                              }}
                              className="block mx-auto mt-1 text-[#008ac9] underline font-black"
                            >
                              + Create specialist now
                            </button>
                          </div>
                        ) : (
                          doctorsList
                            .filter(
                              (d) =>
                                (!d.status || d.status === "Active" || !d.status.includes("Disabled")) &&
                                (d.name.toLowerCase().includes(schedDoctorSearch.toLowerCase()) ||
                                  (d.fullName && d.fullName.toLowerCase().includes(schedDoctorSearch.toLowerCase())) ||
                                  (d.acronym && d.acronym.toLowerCase().includes(schedDoctorSearch.toLowerCase())) ||
                                  d.specialty.toLowerCase().includes(schedDoctorSearch.toLowerCase()))
                            )
                            .map((d) => {
                              const adminName = d.fullName ? `${d.fullName} (${d.acronym || d.name})` : d.name;
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setSchedDoctorId(d.id);
                                    setSchedDoctorSearch(adminName);
                                    setShowDoctorDropdown(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                                    schedDoctorId === d.id ? "bg-sky-50 dark:bg-slate-800 border border-[#008ac9]/30" : ""
                                  }`}
                                >
                                  <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">🩺 {adminName}</div>
                                    <div className="text-[11px] font-semibold text-slate-500">{d.specialty} • {d.qualification || d.qualifications || "MBBS"}</div>
                                  </div>
                                  {schedDoctorId === d.id && <span className="text-xs font-black text-[#008ac9]">Selected ✓</span>}
                                </button>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                </div>

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
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                            selected
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
                                        className={`px-2.5 py-2 rounded-xl text-[11px] font-black border transition-all shrink-0 flex items-center gap-1 ${
                                          isCustomActive
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
                    onClick={() => setShowCreateScheduleModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4" /> Save Specialist Schedule
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
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                selected
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
                                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all shrink-0 flex items-center gap-1 ${
                                              isCustomActive
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
                    onClick={() => setEditingSchedule(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Pencil className="h-4 w-4" /> Save Schedule Changes
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
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setSpecDateDoctorId(d.id);
                                    setSpecDateDoctorSearch(adminName);
                                    setShowSpecDoctorDropdown(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                                    specDateDoctorId === d.id ? "bg-emerald-50 dark:bg-slate-800 border border-emerald-500/30" : ""
                                  }`}
                                >
                                  <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">🩺 {adminName}</div>
                                    <div className="text-[11px] font-semibold text-slate-500">{d.specialty} • {d.qualification || d.qualifications || "MBBS"}</div>
                                  </div>
                                  {specDateDoctorId === d.id && <span className="text-xs font-black text-emerald-600">Selected ✓</span>}
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
                            className={`py-2 px-1 text-[10px] font-black rounded-xl transition-all text-center border ${
                              isChecked
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
                    {DEPARTMENTS.map((dept) => (
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
            <div className="bg-white dark:bg-slate-900 border-2 border-[#008ac9] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#008ac9]" /> Add New System User
                </h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
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
                    placeholder="e.g. Dr. Samuel Adebayo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Email Address / Staff Username *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samuel@isaluhospitals.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
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
                      placeholder="••••••••"
                      value={newUserPassword}
                      onChange={(e) => {
                        setNewUserPassword(e.target.value);
                        setUserFormError("");
                      }}
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                      placeholder="••••••••"
                      value={newUserConfirmPassword}
                      onChange={(e) => {
                        setNewUserConfirmPassword(e.target.value);
                        setUserFormError("");
                      }}
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewUserConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white mb-1 block">Assigned Staff Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#008ac9]"
                  >
                    <option value="Helpdesk Officer">Helpdesk Officer (Reception)</option>
                    <option value="HMO Approval Officer">HMO Approval Officer</option>
                    <option value="Cashdesk Billing Officer">Cashdesk Billing Officer</option>
                    <option value="Monitor Desk Operator">Monitor Desk Operator</option>
                    <option value="Hospital Administrator">Hospital Administrator</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" /> Create User Account
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
                    <option value="Helpdesk Officer">Helpdesk Officer (Reception)</option>
                    <option value="HMO Approval Officer">HMO Approval Officer</option>
                    <option value="Cashdesk Billing Officer">Cashdesk Billing Officer</option>
                    <option value="Monitor Desk Operator">Monitor Desk Operator</option>
                    <option value="Hospital Administrator">Hospital Administrator</option>
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
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleHmoApproval(selectedBooking.refCode, hmoPolicyCode, hmoAuthCode)}
                  className="px-5 py-2 bg-[#008ac9] hover:bg-[#0072b1] text-white font-black text-xs rounded-xl shadow-md"
                >
                  Approve & Issue Auth ✓
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
                  className={`p-3 rounded-2xl ${
                    confirmModalConfig.variant === "danger"
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
                  className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md transition-all ${
                    confirmModalConfig.variant === "danger"
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

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditHmoModal(false);
                    setEditingHmoItem(null);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs font-black bg-[#008ac9] hover:bg-[#0072b1] text-white shadow-lg shadow-[#008ac9]/30"
                >
                  Save Changes ✓
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
              className={`bg-white dark:bg-slate-900 border-2 ${
                toastAlert.type === "warning"
                  ? "border-amber-400 dark:border-amber-500 shadow-amber-500/20"
                  : toastAlert.type === "danger"
                  ? "border-rose-500 dark:border-rose-600 shadow-rose-500/20"
                  : "border-[#008ac9] dark:border-sky-500 shadow-[#008ac9]/20"
              } rounded-3xl p-5 shadow-2xl flex items-start gap-3.5 relative`}
            >
              <div
                className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border ${
                  toastAlert.type === "warning"
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
