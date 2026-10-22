import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, CheckCircle2, Download, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Upload, X, XCircle } from "lucide-react";
import { createCompanyAPI, deleteCompanyAPI, getCompaniesAPI, updateCompanyAPI, uploadCompaniesAPI } from "../../../api/client";

/**
 * Companies module: the companies whose staff book as "Company" patients.
 * Company patients are covered by their company and approved at the HMO desk,
 * like HMO patients, but don't need an enrollee ID. Administrators add, edit,
 * upload (CSV / Excel) and remove companies; patients pick from this list on
 * the booking form.
 */

type Tab = "companies" | "patients";
type Form = { name: string; code: string; email: string; phone: string; contactPerson: string; address: string; status: boolean };
const EMPTY: Form = { name: "", code: "", email: "", phone: "", contactPerson: "", address: "", status: true };
const PAGE_SIZE = 15;

const csvCell = (v: any) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (name: string, rows: any[][]) => {
  const url = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const isCompanyBooking = (b: any) => String(b?.paymentType ?? b?.payment_type ?? "").toLowerCase().includes("company");
const companyOf = (b: any) => String(b?.companyName || b?.hmoName || b?.hmo_name || "").trim();

export default function CompaniesDesk({ isDarkMode, isAdmin, bookings = [] }: { isDarkMode: boolean; isAdmin: boolean; bookings?: any[] }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("companies");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);   // null = closed, {} = new
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientCompany, setPatientCompany] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res: any = await getCompaniesAPI();
    if (Array.isArray(res)) { setCompanies(res); setError(""); }
    else setError(res?.error || "Couldn't load the companies. Check your connection and try again.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 5000); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter === "active" && !c.status) return false;
      if (statusFilter === "inactive" && c.status) return false;
      return !q || [c.name, c.code, c.email, c.phone, c.contactPerson, c.address].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [companies, search, statusFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const rows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const companyPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return bookings
      .filter((b) => isCompanyBooking(b) && b.isActive !== false && b.is_active !== false && String(b.status || "").toLowerCase() !== "disabled")
      .filter((b) => patientCompany === "all" || companyOf(b).toLowerCase() === patientCompany.toLowerCase())
      .filter((b) => !q || [b.patientName, b.patient_name, b.patientPhone, b.patient_phone, b.refCode, b.ref_code, companyOf(b), b.doctorSpecialty, b.doctor_specialty]
        .some((v) => String(v ?? "").toLowerCase().includes(q)))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [bookings, patientSearch, patientCompany]);

  const openForm = (c: any | null) => {
    setEditing(c || {});
    setFormError("");
    setForm(c ? { name: c.name || "", code: c.code || "", email: c.email || "", phone: c.phone || "", contactPerson: c.contactPerson || c.contact_person || "", address: c.address || "", status: Boolean(c.status) } : EMPTY);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Enter the company name."); return; }
    setSaving(true); setFormError("");
    const payload = { name: form.name.trim(), code: form.code.trim(), email: form.email.trim(), phone: form.phone.trim(), contactPerson: form.contactPerson.trim(), address: form.address.trim(), status: form.status };
    const id = editing?.id || editing?.company_id;
    const res: any = id ? await updateCompanyAPI(id, payload) : await createCompanyAPI(payload);
    setSaving(false);
    if (!res || res.error) {
      const fieldError = res && typeof res === "object" ? (res.name || res.email || res.error) : "";
      setFormError(String((Array.isArray(fieldError) ? fieldError[0] : fieldError) || "Couldn't save the company.").replace(/^name:\s*/i, ""));
      return;
    }
    setEditing(null);
    flash(id ? `${payload.name} updated.` : `${payload.name} added.`);
    load();
  };

  const toggleStatus = async (c: any) => {
    const res: any = await updateCompanyAPI(c.id || c.company_id, { status: !c.status });
    if (!res || res.error) { setError(res?.error || "Couldn't change the status."); return; }
    flash(`${c.name} is now ${c.status ? "inactive (hidden from the booking form)" : "active"}.`);
    load();
  };

  const remove = async (c: any) => {
    const res: any = await deleteCompanyAPI(c.id || c.company_id);
    setConfirmDelete("");
    if (!res || res.error) { setError(res?.error || "Couldn't delete the company."); return; }
    flash(`${c.name} deleted. Existing bookings keep the company name.`);
    load();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true); setUploadResult(null); setError("");
    const res: any = await uploadCompaniesAPI(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res || res.error) { setUploadResult({ failed: true, message: res?.error || "The upload failed. Try again." }); return; }
    setUploadResult({ ...res, fileName: file.name });
    load();
  };

  const card = `${isDarkMode ? "bg-slate-900/80 border-sky-500/20" : "bg-white/80 border-sky-100 shadow-xl"} backdrop-blur-xl border rounded-3xl p-6`;
  const field = `w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-500 ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`;
  const th = `border-b ${isDarkMode ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"} text-[10px] font-black uppercase tracking-wider`;
  const tbody = `divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"} text-xs`;
  const strong = isDarkMode ? "text-white" : "text-slate-900";
  const btn = `px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`;
  const activeCount = companies.filter((c) => c.status).length;

  return (
    <div className="space-y-6" data-testid="companies-desk">
      <div className={card}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold ${strong} flex items-center gap-2`}><Building2 className="w-5 h-5 text-sky-500" /> Companies</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Companies whose staff book as <strong>Company</strong> patients. Patients pick their company on the booking form (no enrollee ID needed);
              their bookings go to the HMO desk for approval, like HMO bookings. Only active companies appear on the booking form.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30">{companies.length} companies</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">{activeCount} active</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">{bookings.filter(isCompanyBooking).length} company bookings</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black inline-flex items-center gap-1.5" onClick={() => openForm(null)} data-testid="company-add">
                <Plus className="w-3.5 h-3.5" /> Add company
              </button>
              <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="company-upload-button">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload CSV / Excel
              </button>
              <input ref={fileRef} type="file" className="hidden" data-testid="company-upload-input"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => upload(e.target.files?.[0])} />
              <button type="button" className={btn} onClick={() => downloadCsv("companies-template.csv", [
                ["name", "code", "email", "phone", "contact_person", "address", "status"],
                ["Example Company Ltd", "EXC", "hr@example.com", "08012345678", "HR Manager", "Victoria Island, Lagos", "Active"],
              ])}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Template
              </button>
            </div>
          )}
        </div>

        {uploadResult && (
          <div role="status" data-testid="company-upload-result" className={`mt-4 p-4 rounded-2xl border text-xs font-semibold ${uploadResult.failed ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {uploadResult.failed ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div>
                  <div className="font-black">{uploadResult.failed ? "Upload failed" : `Uploaded ${uploadResult.fileName}`}</div>
                  <div className="mt-0.5">{uploadResult.message}</div>
                  {uploadResult.errors?.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-amber-700 dark:text-amber-300 space-y-0.5">
                      {uploadResult.errors.map((e: string) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setUploadResult(null)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {isAdmin && !uploadResult && (
          <p className="text-[11px] text-slate-400 mt-4">
            Upload a CSV or Excel (.xlsx) file with a <strong>name</strong> column; code, email, phone, contact_person, address and status are optional.
            Companies already in the list (same name) are updated, new ones are added.
          </p>
        )}
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-bold">
          <XCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className={card}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className={`inline-flex p-1 rounded-2xl ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`} role="tablist">
            {([["companies", `Companies (${companies.length})`], ["patients", `Company patients (${bookings.filter(isCompanyBooking).length})`]] as [Tab, string][]).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} data-testid={`companies-tab-${key}`} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${tab === key ? "bg-sky-600 text-white shadow" : isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={btn} onClick={() => tab === "companies"
            ? downloadCsv("companies.csv", [["Name", "Code", "Email", "Phone", "Contact person", "Address", "Status", "Bookings"],
              ...filtered.map((c) => [c.name, c.code, c.email, c.phone, c.contactPerson, c.address, c.status ? "Active" : "Inactive", c.bookingCount ?? 0])])
            : downloadCsv("company-patients.csv", [["Ref", "Appointment date", "Patient", "Phone", "Company", "Clinic", "Doctor", "Approval", "Booking status"],
              ...companyPatients.map((b) => [b.refCode || b.ref_code, b.date, b.patientName || b.patient_name, b.patientPhone || b.patient_phone, companyOf(b),
                b.doctorSpecialty || b.doctor_specialty, b.doctorName || b.doctor_name, b.hmoStatus || b.hmo_status, b.status])])}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {tab === "companies" && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, code, email, phone, contact..."
                  className={`${field} pl-10`} data-testid="companies-search" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className={`${field} sm:w-auto`}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <table className="w-full text-left border-collapse min-w-[860px]" data-testid="companies-table">
                <thead>
                  <tr className={th}>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-right">Bookings</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading companies…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      {companies.length === 0 ? (isAdmin ? "No companies yet. Add one or upload a CSV / Excel file." : "No companies yet.") : "No companies match these filters."}
                    </td></tr>
                  ) : rows.map((c) => {
                    const id = c.id || c.company_id;
                    return (
                      <tr key={id} className={isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}>
                        <td className="py-3 px-4">
                          <div className={`font-bold ${strong}`}>{c.name}</div>
                          {c.code && <div className="font-mono text-[10px] text-slate-400">{c.code}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{c.contactPerson || "—"}</div>
                          <div className="text-[11px] text-slate-400">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[220px]">{c.address || "—"}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">{c.bookingCount ?? 0}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${c.status ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-slate-500/15 text-slate-500 border-slate-500/30"}`}>
                            {c.status ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button type="button" className={btn} onClick={() => openForm(c)} aria-label={`Edit ${c.name}`}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                              <button type="button" className={btn} onClick={() => toggleStatus(c)}>{c.status ? "Deactivate" : "Activate"}</button>
                              {confirmDelete === id ? (
                                <>
                                  <button type="button" className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-black" onClick={() => remove(c)}>Confirm delete</button>
                                  <button type="button" className={btn} onClick={() => setConfirmDelete("")}>Cancel</button>
                                </>
                              ) : (
                                <button type="button" className={`${btn} !text-rose-500`} onClick={() => setConfirmDelete(id)} aria-label={`Delete ${c.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>{filtered.length === 0 ? "0" : `${(pageSafe - 1) * PAGE_SIZE + 1}–${Math.min(pageSafe * PAGE_SIZE, filtered.length)}`} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <button type="button" className={btn} disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Previous</button>
                <span className="font-bold">Page {pageSafe} of {pages}</span>
                <button type="button" className={btn} disabled={pageSafe >= pages} onClick={() => setPage(pageSafe + 1)}>Next</button>
              </div>
            </div>
          </>
        )}

        {tab === "patients" && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="search" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient, phone, reference, clinic..." className={`${field} pl-10`} />
              </div>
              <select value={patientCompany} onChange={(e) => setPatientCompany(e.target.value)} className={`${field} sm:w-auto`} data-testid="company-patients-filter">
                <option value="all">All companies</option>
                {Array.from(new Set(bookings.filter(isCompanyBooking).map(companyOf).filter(Boolean))).sort().map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <table className="w-full text-left border-collapse min-w-[860px]" data-testid="company-patients-table">
                <thead>
                  <tr className={th}>
                    <th className="py-3 px-4">Ref & date</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Clinic & doctor</th>
                    <th className="py-3 px-4">Approval</th>
                    <th className="py-3 px-4">Booking</th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {companyPatients.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No company patients yet.</td></tr>
                  ) : companyPatients.slice(0, 200).map((b) => {
                    const approval = String(b.hmoStatus || b.hmo_status || "Pending Pre-Auth");
                    const tone = /approved/i.test(approval) ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : /declined/i.test(approval) ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
                    return (
                      <tr key={b.refCode || b.ref_code} className={isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">{b.refCode || b.ref_code}</div>
                          <div className="text-[11px] text-slate-400">{b.date}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`font-bold ${strong}`}>{b.patientName || b.patient_name}</div>
                          <div className="text-[11px] text-slate-400">{b.patientPhone || b.patient_phone}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold">{companyOf(b)}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{b.doctorSpecialty || b.doctor_specialty}</div>
                          <div className="text-[11px] text-slate-400">{b.doctorName || b.doctor_name}</div>
                        </td>
                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${tone}`}>{approval}</span></td>
                        <td className="py-3 px-4 text-slate-500">{b.status || "Confirmed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Company bookings are approved (or declined) at the HMO Insurance Desk, like HMO bookings.</p>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onMouseDown={() => !saving && setEditing(null)}>
          <form onSubmit={save} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="company-form-title" data-testid="company-form"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 id="company-form-title" className="text-xl font-black text-slate-900 dark:text-white">{editing.id || editing.company_id ? "Edit company" : "Add company"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-2 text-slate-400" aria-label="Close"><X /></button>
            </div>
            {formError && <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold" role="alert">{formError}</div>}
            <label className="block text-[11px] font-bold text-slate-500">Company name *
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${field} mt-1`} required data-testid="company-form-name" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-[11px] font-bold text-slate-500">Code
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${field} mt-1`} />
              </label>
              <label className="block text-[11px] font-bold text-slate-500">Contact person
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className={`${field} mt-1`} />
              </label>
              <label className="block text-[11px] font-bold text-slate-500">Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${field} mt-1`} />
              </label>
              <label className="block text-[11px] font-bold text-slate-500">Phone
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${field} mt-1`} />
              </label>
            </div>
            <label className="block text-[11px] font-bold text-slate-500">Address
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Active (shown on the booking form)
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-sky-600 text-white text-xs font-black disabled:opacity-50 inline-flex items-center gap-1.5" data-testid="company-form-save">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {editing.id || editing.company_id ? "Save changes" : "Add company"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
