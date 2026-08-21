export interface Doctor {
  id: string;
  name: string; // Public display name
  fullName?: string; // Full real name for Admin
  acronym?: string; // Specialty or acronym badge
  specialty: string;
  departmentId: string;
  qualification: string;
  qualifications?: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  availability: string[];
  availableDays?: string[];
  timeSlots: string[];
  image: string;
  bio: string;
  roomNumber: string;
  status?: string;
  doc_id?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  iconName: string;
  doctorCount: number;
}

export function getAcronymForIndex(index: number): string {
  let letterStr = "";
  let n = index;
  while (n >= 0) {
    letterStr = String.fromCharCode(65 + (n % 26)) + letterStr;
    n = Math.floor(n / 26) - 1;
  }
  return `Specialist ${letterStr}`;
}

export function getDoctorRealName(doctorOrBooking: any): string {
  if (!doctorOrBooking) return "Dr. Funke Akindele";

  if (typeof doctorOrBooking === "string") {
    const raw = doctorOrBooking.trim();
    if (!raw.toLowerCase().startsWith("specialist")) return raw;
    const match = DOCTORS.find(
      (d) =>
        (d.acronym && d.acronym.toLowerCase() === raw.toLowerCase()) ||
        (d.name && d.name.toLowerCase() === raw.toLowerCase()) ||
        (d.fullName && d.fullName.toLowerCase() === raw.toLowerCase()) ||
        (d.id && d.id.toLowerCase() === raw.toLowerCase())
    );
    return match?.fullName || match?.name || "Dr. Funke Akindele";
  }

  const b = doctorOrBooking;
  const rawName = String(b.doctorName || b.doctor_name || b.fullName || b.name || "").trim();
  const rawId = String(b.doctorId || b.doctor_id || b.doc_id || b.id || "").trim();
  const rawSpec = String(b.doctorSpecialty || b.doctor_specialty || b.specialty || "").trim();

  // If rawName is already a real doctor name (not "Specialist X")
  if (rawName && !rawName.toLowerCase().startsWith("specialist")) {
    return rawName;
  }

  // 1. Find doctor by ID
  let match = DOCTORS.find((d) => rawId && (d.id.toLowerCase() === rawId.toLowerCase() || (d.doc_id && d.doc_id.toLowerCase() === rawId.toLowerCase())));

  // 2. Find doctor by Acronym
  if (!match && rawName) {
    match = DOCTORS.find((d) => d.acronym && d.acronym.toLowerCase() === rawName.toLowerCase());
  }

  // 3. Find doctor by Name substring
  if (!match && rawName) {
    match = DOCTORS.find(
      (d) =>
        d.name.toLowerCase() === rawName.toLowerCase() ||
        (d.fullName && d.fullName.toLowerCase() === rawName.toLowerCase()) ||
        rawName.toLowerCase().includes(d.name.toLowerCase()) ||
        d.name.toLowerCase().includes(rawName.toLowerCase())
    );
  }

  // 4. Find doctor by Exact / Category Specialty match (prevent substring collision like "urology" inside "neurology")
  if (!match && rawSpec) {
    const target = rawSpec.toLowerCase().trim();
    match = DOCTORS.find((d) => {
      const spec = d.specialty.toLowerCase().trim();
      if (spec === target) return true;
      if ((spec.includes("urolog") || spec.includes("urinary")) && (target.includes("urolog") || target.includes("urinary"))) return true;
      if ((spec.includes("neurolog") || spec.includes("brain")) && (target.includes("neurolog") || target.includes("brain"))) return true;
      if ((spec.includes("gynaec") || spec.includes("obs")) && (target.includes("gynaec") || target.includes("obs"))) return true;
      if (spec.includes("cardio") && target.includes("cardio")) return true;
      if (spec.includes("derma") && target.includes("derma")) return true;
      if (spec.includes("ortho") && target.includes("ortho")) return true;
      if (spec.includes("pedia") && target.includes("pedia")) return true;
      if (spec.includes("pulmo") && target.includes("pulmo")) return true;
      if (spec.includes("gastro") && target.includes("gastro")) return true;
      return false;
    });
  }

  return match?.fullName || match?.name || (rawName && !rawName.toLowerCase().startsWith("specialist") ? rawName : "Dr. Funke Akindele");
}

export function getDoctorDisplayAcronym(doctorOrBooking: any): string {
  if (!doctorOrBooking) return "Specialist";
  if (typeof doctorOrBooking === "string") {
    const s = doctorOrBooking.trim();
    if (s.startsWith("Specialist")) return s;
    const match = DOCTORS.find((d) => d.id === s || d.fullName?.toLowerCase() === s.toLowerCase() || d.name?.toLowerCase() === s.toLowerCase());
    return match ? (match.acronym || match.name) : "Specialist";
  }
  if (doctorOrBooking.acronym) return doctorOrBooking.acronym;
  if (doctorOrBooking.name && String(doctorOrBooking.name).startsWith("Specialist")) return doctorOrBooking.name;
  if (doctorOrBooking.doctorName && String(doctorOrBooking.doctorName).startsWith("Specialist")) return doctorOrBooking.doctorName;
  if (doctorOrBooking.doctor_name && String(doctorOrBooking.doctor_name).startsWith("Specialist")) return doctorOrBooking.doctor_name;

  const dId = doctorOrBooking.doctorId || doctorOrBooking.doctor_id || doctorOrBooking.id || doctorOrBooking.doc_id;
  const rawName = doctorOrBooking.doctorName || doctorOrBooking.doctor_name || doctorOrBooking.fullName || doctorOrBooking.full_name || doctorOrBooking.name;

  const match = DOCTORS.find(
    (d) =>
      (dId && (d.id === dId || d.doc_id === dId)) ||
      (rawName && d.fullName && d.fullName.toLowerCase() === String(rawName).toLowerCase()) ||
      (rawName && d.name && d.name.toLowerCase() === String(rawName).toLowerCase())
  );

  if (match) return match.acronym || match.name;
  if (rawName && String(rawName).startsWith("Specialist")) return String(rawName);
  return "Specialist";
}

export const DEPARTMENTS: Department[] = [
  {
    id: "endocrinology",
    name: "Endocrinology",
    description: "Diabetes, thyroid disorders, metabolism, and hormonal balance care.",
    iconName: "Syringe",
    doctorCount: 3,
  },
  {
    id: "general-surgery",
    name: "General Surgery",
    description: "Comprehensive surgical evaluations, procedures, and post-operative care.",
    iconName: "Scissors",
    doctorCount: 3,
  },
  {
    id: "gynaecology",
    name: "Obstetrics & Gynaecology",
    description: "Women's health, prenatal care, fertility, and gynecological surgeries.",
    iconName: "Heart",
    doctorCount: 3,
  },
  {
    id: "general-physician",
    name: "General Physician",
    description: "Primary healthcare, preventive medicine, and general medical outpatient care.",
    iconName: "Stethoscope",
    doctorCount: 1,
  },
  {
    id: "pulmonology",
    name: "Chest Physician / Pulmonology",
    description: "Respiratory health, asthma, lung diseases, and chest consultations.",
    iconName: "Wind",
    doctorCount: 1,
  },
  {
    id: "cardiology",
    name: "Cardiology",
    description: "Heart care, ECG, echocardiography, and cardiovascular management.",
    iconName: "HeartPulse",
    doctorCount: 3,
  },
  {
    id: "dermatology",
    name: "Dermatology",
    description: "Clinical skin care, hair, nail treatments, and dermatological therapies.",
    iconName: "Sparkles",
    doctorCount: 1,
  },
  {
    id: "ent",
    name: "ENT & Head/Neck Surgery",
    description: "Ear, nose, throat consultations, sinus treatment, and head & neck surgery.",
    iconName: "Ear",
    doctorCount: 2,
  },
  {
    id: "nephrology",
    name: "Nephrology",
    description: "Kidney health, hypertension, renal care, and dialysis consultations.",
    iconName: "Droplet",
    doctorCount: 1,
  },
  {
    id: "haematology",
    name: "Haematology",
    description: "Blood disorders, anemia, blood transfusion, and haematological care.",
    iconName: "Droplets",
    doctorCount: 1,
  },
  {
    id: "gastroenterology",
    name: "Gastroenterology",
    description: "Digestive system, stomach, liver, endoscopy, and gut health care.",
    iconName: "Activity",
    doctorCount: 2,
  },
  {
    id: "orthopedics",
    name: "Orthopedic Surgery",
    description: "Bone fractures, joint care, spine, and musculoskeletal surgery.",
    iconName: "Bone",
    doctorCount: 1,
  },
  {
    id: "pediatrics",
    name: "Paediatrics & Child Health",
    description: "Medical care for newborns, infants, children, and adolescents.",
    iconName: "Baby",
    doctorCount: 3,
  },
  {
    id: "neurology",
    name: "Neurology",
    description: "Diagnosis and care for brain, nerve, stroke, and spinal conditions.",
    iconName: "Brain",
    doctorCount: 2,
  },
  {
    id: "rheumatology",
    name: "Rheumatology",
    description: "Arthritis, joint inflammation, and autoimmune disease management.",
    iconName: "Bone",
    doctorCount: 1,
  },
  {
    id: "psychiatry",
    name: "Psychiatry & Mental Health",
    description: "Behavioral health, stress management, counseling, and psychiatric care.",
    iconName: "Smile",
    doctorCount: 1,
  },
  {
    id: "dietetics",
    name: "Dietetics & Clinical Nutrition",
    description: "Nutritional therapy, diet plans, weight management, and clinical nutrition.",
    iconName: "Apple",
    doctorCount: 2,
  },
  {
    id: "urology",
    name: "Urology",
    description: "Urinary tract care, prostate health, and male reproductive system care.",
    iconName: "ShieldCheck",
    doctorCount: 1,
  },
  {
    id: "physiotherapy",
    name: "Physiotherapy & Rehabilitation",
    description: "Physical therapy, stroke rehab, posture correction, and injury recovery.",
    iconName: "Dumbbell",
    doctorCount: 2,
  },
  {
    id: "specialty-surgery",
    name: "Specialty Surgeons (On Appointment)",
    description: "Plastic, Neuro, Maxillofacial, and Cardio-Thoracic surgical specialists.",
    iconName: "Scissors",
    doctorCount: 4,
  },
  {
    id: "paediatric-surgery",
    name: "Paediatric Surgery",
    description: "Specialized surgical procedures and emergency surgery for children.",
    iconName: "Baby",
    doctorCount: 1,
  },
  {
    id: "oncology",
    name: "Oncology & Cancer Care",
    description: "Cancer diagnosis, tumor care, chemotherapy, and oncological management.",
    iconName: "Ribbon",
    doctorCount: 1,
  },
];

export const DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    doc_id: "doc-1",
    name: "Dr. Adewale Olusola",
    fullName: "Dr. Adewale Olusola",
    acronym: "Specialist A",
    specialty: "Cardiology",
    departmentId: "cardiology",
    qualification: "MBBS, FWACS (Cardiology)",
    qualifications: "MBBS, FWACS (Cardiology)",
    experienceYears: 14,
    rating: 4.9,
    reviewCount: 42,
    consultationFee: 25000,
    availability: ["Monday", "Wednesday", "Friday"],
    availableDays: ["Monday", "Wednesday", "Friday"],
    timeSlots: ["08:00 AM – 12:00 PM", "01:00 PM – 05:00 PM"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    bio: "Senior Consultant Cardiologist specializing in interventional cardiology and heart failure care.",
    roomNumber: "Suite 4B - Cardiology Wing",
    status: "Active",
  },
  {
    id: "doc-2",
    doc_id: "doc-2",
    name: "Dr. Folashade Adebayo",
    fullName: "Dr. Folashade Adebayo",
    acronym: "Specialist B",
    specialty: "General Physician",
    departmentId: "general-physician",
    qualification: "MBBS, FMCP",
    qualifications: "MBBS, FMCP",
    experienceYears: 11,
    rating: 4.8,
    reviewCount: 38,
    consultationFee: 20000,
    availability: ["Tuesday", "Thursday", "Saturday"],
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    timeSlots: ["09:00 AM – 01:00 PM", "02:00 PM – 06:00 PM"],
    image: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Physician with expertise in primary care and general adult internal medicine.",
    roomNumber: "Room 102 - Outpatient Wing",
    status: "Active",
  },
  {
    id: "doc-3",
    doc_id: "doc-3",
    name: "Dr. Chidi Nnamdi",
    fullName: "Dr. Chidi Nnamdi",
    acronym: "Specialist C",
    specialty: "Paediatrics & Child Health",
    departmentId: "pediatrics",
    qualification: "MBBS, FWAP (Pediatrics)",
    qualifications: "MBBS, FWAP (Pediatrics)",
    experienceYears: 16,
    rating: 5.0,
    reviewCount: 55,
    consultationFee: 22000,
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    timeSlots: ["08:30 AM – 12:30 PM", "01:30 PM – 04:30 PM"],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
    bio: "Chief Consultant Pediatrician dedicated to neonatal care, child growth, and childhood immunizations.",
    roomNumber: "Pediatric Clinic Wing A",
    status: "Active",
  },
  {
    id: "doc-4",
    doc_id: "doc-4",
    name: "Dr. Funke Akindele",
    fullName: "Dr. Funke Akindele",
    acronym: "Specialist D",
    specialty: "Obstetrics & Gynaecology",
    departmentId: "gynaecology",
    qualification: "MBBS, FWACS (Obs & Gynae)",
    qualifications: "MBBS, FWACS (Obs & Gynae)",
    experienceYears: 13,
    rating: 4.9,
    reviewCount: 47,
    consultationFee: 25000,
    availability: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday", "Sunday"],
    availableDays: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday", "Sunday"],
    timeSlots: ["10:00 AM – 05:00 PM (Mon, Tue, Fri, Sat)", "02:00 PM – 05:00 PM (Wed)", "04:00 PM – 08:00 PM (Sun)"],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    bio: "Senior Consultant Obstetrician & Gynecologist specializing in high-risk obstetrics and fertility.",
    roomNumber: "Maternity Suite 2",
    status: "Active",
  },
  {
    id: "doc-5",
    doc_id: "doc-5",
    name: "Dr. Babatunde Lawal",
    fullName: "Dr. Babatunde Lawal",
    acronym: "Specialist E",
    specialty: "Dermatology",
    departmentId: "dermatology",
    qualification: "MBBS, FICO (Dermatology)",
    qualifications: "MBBS, FICO (Dermatology)",
    experienceYears: 10,
    rating: 4.7,
    reviewCount: 29,
    consultationFee: 22000,
    availability: ["Tuesday", "Friday"],
    availableDays: ["Tuesday", "Friday"],
    timeSlots: ["08:00 AM – 01:00 PM"],
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Dermatologist providing comprehensive care for complex skin conditions and aesthetic dermatology.",
    roomNumber: "Dermatology Clinic Room 3",
    status: "Active",
  },
  {
    id: "doc-6",
    doc_id: "doc-6",
    name: "Dr. Ngozi Eze",
    fullName: "Dr. Ngozi Eze",
    acronym: "Specialist F",
    specialty: "Orthopedic Surgery",
    departmentId: "orthopedics",
    qualification: "MBBS, FWACS (Orthopedics)",
    qualifications: "MBBS, FWACS (Orthopedics)",
    experienceYears: 15,
    rating: 4.9,
    reviewCount: 51,
    consultationFee: 30000,
    availability: ["Wednesday", "Saturday"],
    availableDays: ["Wednesday", "Saturday"],
    timeSlots: ["11:00 AM – 04:00 PM"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    bio: "Chief Consultant Orthopedic Surgeon specializing in joint replacement, trauma, and spine surgery.",
    roomNumber: "Orthopedic Wing B",
    status: "Active",
  },
  {
    id: "doc-7",
    doc_id: "doc-7",
    name: "Dr. Olayinka Sanusi",
    fullName: "Dr. Olayinka Sanusi",
    acronym: "Specialist G",
    specialty: "Endocrinology",
    departmentId: "endocrinology",
    qualification: "MBBS, FMCP (Endocrinology)",
    qualifications: "MBBS, FMCP (Endocrinology)",
    experienceYears: 12,
    rating: 4.8,
    reviewCount: 33,
    consultationFee: 25000,
    availability: ["Monday", "Wednesday", "Friday"],
    availableDays: ["Monday", "Wednesday", "Friday"],
    timeSlots: ["09:00 AM – 02:00 PM"],
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Endocrinologist specializing in diabetes management and hormonal disorders.",
    roomNumber: "Endocrine Suite 1",
    status: "Active",
  },
  {
    id: "doc-8",
    doc_id: "doc-8",
    name: "Dr. Kenneth Okafor",
    fullName: "Dr. Kenneth Okafor",
    acronym: "Specialist H",
    specialty: "General Surgery",
    departmentId: "general-surgery",
    qualification: "MBBS, FWACS (Surgery)",
    qualifications: "MBBS, FWACS (Surgery)",
    experienceYears: 14,
    rating: 4.9,
    reviewCount: 45,
    consultationFee: 28000,
    availability: ["Tuesday", "Thursday", "Saturday"],
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    timeSlots: ["10:00 AM – 04:00 PM"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    bio: "Senior Consultant General Surgeon expert in laparoscopic and abdominal procedures.",
    roomNumber: "Surgical Wing Room 4",
    status: "Active",
  },
  {
    id: "doc-9",
    doc_id: "doc-9",
    name: "Dr. Amina Bello",
    fullName: "Dr. Amina Bello",
    acronym: "Specialist I",
    specialty: "Pulmonology",
    departmentId: "pulmonology",
    qualification: "MBBS, FWACS (Chest)",
    qualifications: "MBBS, FWACS (Chest)",
    experienceYears: 11,
    rating: 4.8,
    reviewCount: 27,
    consultationFee: 24000,
    availability: ["Monday", "Thursday"],
    availableDays: ["Monday", "Thursday"],
    timeSlots: ["08:30 AM – 01:30 PM"],
    image: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Pulmonologist with focus on asthma, COPD, and critical respiratory care.",
    roomNumber: "Chest Clinic Suite A",
    status: "Active",
  },
  {
    id: "doc-10",
    doc_id: "doc-10",
    name: "Dr. Tariq Alabi",
    fullName: "Dr. Tariq Alabi",
    acronym: "Specialist J",
    specialty: "ENT & Head/Neck Surgery",
    departmentId: "ent",
    qualification: "MBBS, FWACS (ENT)",
    qualifications: "MBBS, FWACS (ENT)",
    experienceYears: 13,
    rating: 4.9,
    reviewCount: 39,
    consultationFee: 26000,
    availability: ["Wednesday", "Saturday"],
    availableDays: ["Wednesday", "Saturday"],
    timeSlots: ["10:00 AM – 03:00 PM"],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant ENT Surgeon dealing with hearing loss, sinus surgery, and throat pathologies.",
    roomNumber: "ENT Clinic Room 2",
    status: "Active",
  },
  {
    id: "doc-11",
    doc_id: "doc-11",
    name: "Dr. Grace Utomi",
    fullName: "Dr. Grace Utomi",
    acronym: "Specialist K",
    specialty: "Nephrology",
    departmentId: "nephrology",
    qualification: "MBBS, FMCP (Renal)",
    qualifications: "MBBS, FMCP (Renal)",
    experienceYears: 15,
    rating: 5.0,
    reviewCount: 41,
    consultationFee: 27000,
    availability: ["Tuesday", "Friday"],
    availableDays: ["Tuesday", "Friday"],
    timeSlots: ["09:00 AM – 02:00 PM"],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    bio: "Chief Consultant Nephrologist specializing in kidney disease prevention and dialysis management.",
    roomNumber: "Renal Suite B",
    status: "Active",
  },
  {
    id: "doc-12",
    doc_id: "doc-12",
    name: "Dr. Samuel Oladipo",
    fullName: "Dr. Samuel Oladipo",
    acronym: "Specialist L",
    specialty: "Haematology",
    departmentId: "haematology",
    qualification: "MBBS, FMCPath",
    qualifications: "MBBS, FMCPath",
    experienceYears: 10,
    rating: 4.7,
    reviewCount: 22,
    consultationFee: 23000,
    availability: ["Monday", "Wednesday"],
    availableDays: ["Monday", "Wednesday"],
    timeSlots: ["08:00 AM – 01:00 PM"],
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Haematologist expert in blood disorders, sickle cell anemia, and coagulation.",
    roomNumber: "Haematology Room 5",
    status: "Active",
  },
  {
    id: "doc-13",
    doc_id: "doc-13",
    name: "Dr. Fatimah Ibrahim",
    fullName: "Dr. Fatimah Ibrahim",
    acronym: "Specialist M",
    specialty: "Gastroenterology",
    departmentId: "gastroenterology",
    qualification: "MBBS, FWACS (Gastro)",
    qualifications: "MBBS, FWACS (Gastro)",
    experienceYears: 12,
    rating: 4.8,
    reviewCount: 36,
    consultationFee: 26000,
    availability: ["Tuesday", "Thursday", "Saturday"],
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    timeSlots: ["10:00 AM – 03:00 PM"],
    image: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Gastroenterologist specializing in digestive disorders, liver health, and endoscopy.",
    roomNumber: "Gastro Clinic Suite 3",
    status: "Active",
  },
  {
    id: "doc-14",
    doc_id: "doc-14",
    name: "Dr. Victoria Danjuma",
    fullName: "Dr. Victoria Danjuma",
    acronym: "Specialist N",
    specialty: "Neurology",
    departmentId: "neurology",
    qualification: "MBBS, FMCP (Neuro)",
    qualifications: "MBBS, FMCP (Neuro)",
    experienceYears: 16,
    rating: 4.9,
    reviewCount: 50,
    consultationFee: 29000,
    availability: ["Monday", "Friday"],
    availableDays: ["Monday", "Friday"],
    timeSlots: ["09:00 AM – 03:00 PM"],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    bio: "Senior Consultant Neurologist specializing in stroke management, epilepsy, and neuropathy.",
    roomNumber: "Neurology Clinic Wing B",
    status: "Active",
  },
  {
    id: "doc-15",
    doc_id: "doc-15",
    name: "Dr. Emeka Nwankwo",
    fullName: "Dr. Emeka Nwankwo",
    acronym: "Specialist O",
    specialty: "Rheumatology",
    departmentId: "rheumatology",
    qualification: "MBBS, FWACS (Rheum)",
    qualifications: "MBBS, FWACS (Rheum)",
    experienceYears: 11,
    rating: 4.7,
    reviewCount: 25,
    consultationFee: 24000,
    availability: ["Wednesday", "Saturday"],
    availableDays: ["Wednesday", "Saturday"],
    timeSlots: ["11:00 AM – 04:00 PM"],
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Rheumatologist specializing in joint disease, lupus, and inflammatory arthritis.",
    roomNumber: "Rheumatology Room 1",
    status: "Active",
  },
  {
    id: "doc-16",
    doc_id: "doc-16",
    name: "Dr. Helen Bassey",
    fullName: "Dr. Helen Bassey",
    acronym: "Specialist P",
    specialty: "Psychiatry",
    departmentId: "psychiatry",
    qualification: "MBBS, FWACP (Psych)",
    qualifications: "MBBS, FWACP (Psych)",
    experienceYears: 14,
    rating: 4.9,
    reviewCount: 40,
    consultationFee: 25000,
    availability: ["Monday", "Thursday"],
    availableDays: ["Monday", "Thursday"],
    timeSlots: ["10:00 AM – 03:00 PM"],
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=400",
    bio: "Consultant Psychiatrist providing compassionate mental health care, stress therapy, and counseling.",
    roomNumber: "Behavioral Suite A",
    status: "Active",
  },
  {
    id: "doc-17",
    doc_id: "doc-17",
    name: "Dr. Rita Mensah",
    fullName: "Dr. Rita Mensah",
    acronym: "Specialist Q",
    specialty: "Dietetics",
    departmentId: "dietetics",
    qualification: "BSc, RD, MSc Clinical Nutrition",
    qualifications: "BSc, RD, MSc Clinical Nutrition",
    experienceYears: 9,
    rating: 4.8,
    reviewCount: 31,
    consultationFee: 18000,
    availability: ["Tuesday", "Friday"],
    availableDays: ["Tuesday", "Friday"],
    timeSlots: ["08:30 AM – 01:30 PM"],
    image: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400",
    bio: "Clinical Dietitian providing therapeutic nutrition plans for metabolic conditions and health.",
    roomNumber: "Nutrition Room 4",
    status: "Active",
  },
  {
    id: "doc-18",
    doc_id: "doc-18",
    name: "Dr. Yakubu Usman",
    fullName: "Dr. Yakubu Usman",
    acronym: "Specialist R",
    specialty: "Urology",
    departmentId: "urology",
    qualification: "MBBS, FWACS (Urology)",
    qualifications: "MBBS, FWACS (Urology)",
    experienceYears: 15,
    rating: 5.0,
    reviewCount: 48,
    consultationFee: 28000,
    availability: ["Monday", "Wednesday", "Saturday"],
    availableDays: ["Monday", "Wednesday", "Saturday"],
    timeSlots: ["09:00 AM – 02:00 PM"],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
    bio: "Chief Consultant Urologist expert in prostate care, kidney stone surgery, and urinary tract health.",
    roomNumber: "Urology Suite 2",
    status: "Active",
  },
  {
    id: "doc-19",
    doc_id: "doc-19",
    name: "Dr. Deborah Ajayi",
    fullName: "Dr. Deborah Ajayi",
    acronym: "Specialist S",
    specialty: "Physiotherapy",
    departmentId: "physiotherapy",
    qualification: "B.Physiotherapy, MCSP",
    qualifications: "B.Physiotherapy, MCSP",
    experienceYears: 12,
    rating: 4.9,
    reviewCount: 52,
    consultationFee: 20000,
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    timeSlots: ["08:00 AM – 04:00 PM"],
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
    bio: "Lead Consultant Physiotherapist specializing in stroke rehab, sports injury recovery, and pain relief.",
    roomNumber: "Physiotherapy Gym Suite",
    status: "Active",
  },
];
