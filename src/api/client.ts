/**
 * REST API Client for Isalu Hospitals Django Backend
 * Connects React Frontend with Django REST API (http://127.0.0.1:8000/api/)
 * Includes graceful LocalStorage fallbacks for zero-downtime offline operation.
 */

const API_HOSTNAME = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1";
const API_BASE_URL = `http://${API_HOSTNAME}:8000/api`;

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      console.warn(`API Warning [${response.status}] at ${endpoint}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    // API Server offline or unreachable -> fallback handled by caller
    return null;
  }
}

// 1. Doctors API
export async function getDoctorsAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/doctors/");
}

export async function createDoctorAPI(doctorData: any): Promise<any | null> {
  return apiRequest<any>("/doctors/", {
    method: "POST",
    body: JSON.stringify(doctorData),
  });
}

export async function updateDoctorAPI(docId: string, doctorData: any): Promise<any | null> {
  return apiRequest<any>(`/doctors/${docId}/`, {
    method: "PATCH",
    body: JSON.stringify(doctorData),
  });
}

export async function deleteDoctorAPI(docId: string): Promise<boolean> {
  const res = await apiRequest<any>(`/doctors/${docId}/`, {
    method: "DELETE",
  });
  return res !== null;
}

// 2. Schedules API
export async function getSchedulesAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/schedules/");
}

export async function createScheduleAPI(schedData: any): Promise<any | null> {
  return apiRequest<any>("/schedules/", {
    method: "POST",
    body: JSON.stringify(schedData),
  });
}

export async function updateScheduleAPI(schedId: string, schedData: any): Promise<any | null> {
  return apiRequest<any>(`/schedules/${schedId}/`, {
    method: "PATCH",
    body: JSON.stringify(schedData),
  });
}

// 3. Bookings API
export async function getBookingsAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/bookings/");
}

export async function createBookingAPI(bookingData: any): Promise<any | null> {
  return apiRequest<any>("/bookings/", {
    method: "POST",
    body: JSON.stringify(bookingData),
  });
}

export async function updateBookingAPI(refCode: string, bookingData: any): Promise<any | null> {
  return apiRequest<any>(`/bookings/${refCode}/`, {
    method: "PATCH",
    body: JSON.stringify(bookingData),
  });
}

export async function checkInBookingAPI(refCode: string): Promise<any | null> {
  return apiRequest<any>(`/bookings/${refCode}/check-in/`, {
    method: "POST",
  });
}

export async function approveHmoBookingAPI(refCode: string, policyCode: string, authCode: string): Promise<any | null> {
  return apiRequest<any>(`/bookings/${refCode}/approve-hmo/`, {
    method: "POST",
    body: JSON.stringify({ policyCode, authCode }),
  });
}

export async function payCashdeskBookingAPI(refCode: string, paymentMethod: string): Promise<any | null> {
  return apiRequest<any>(`/bookings/${refCode}/pay-cashdesk/`, {
    method: "POST",
    body: JSON.stringify({ paymentMethod }),
  });
}

// 4. HMO Companies API
export async function getHmoCompaniesAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/hmo-companies/");
}

export async function createHmoCompanyAPI(hmoData: any): Promise<any | null> {
  return apiRequest<any>("/hmo-companies/", {
    method: "POST",
    body: JSON.stringify(hmoData),
  });
}

export async function updateHmoCompanyAPI(hmoId: string, hmoData: any): Promise<any | null> {
  return apiRequest<any>(`/hmo-companies/${hmoId}/`, {
    method: "PATCH",
    body: JSON.stringify(hmoData),
  });
}

// 5. System Users API
export async function getSystemUsersAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/users/");
}

export async function createSystemUserAPI(userData: any): Promise<any | null> {
  return apiRequest<any>("/users/", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateSystemUserAPI(userId: string, userData: any): Promise<any | null> {
  return apiRequest<any>(`/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
}

// 6. Custom Shift Hours / Time Slots API
export async function getCustomTimeSlotsAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/time-slots/");
}

export async function createCustomTimeSlotAPI(slotData: any): Promise<any | null> {
  return apiRequest<any>("/time-slots/", {
    method: "POST",
    body: JSON.stringify(slotData),
  });
}

// 7. Analytics API
export async function getAnalyticsSummaryAPI(): Promise<any | null> {
  return apiRequest<any>("/bookings/summary/");
}

// 8. Staff Authentication API
export async function loginStaffAPI(username: string, password: string): Promise<any | null> {
  return apiRequest<any>("/auth/staff-login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// 9. Departments API
export async function getDepartmentsAPI(): Promise<any[] | null> {
  return apiRequest<any[]>("/departments/");
}

export async function createDepartmentAPI(deptData: any): Promise<any | null> {
  return apiRequest<any>("/departments/", {
    method: "POST",
    body: JSON.stringify(deptData),
  });
}

export async function updateDepartmentAPI(deptId: string, deptData: any): Promise<any | null> {
  return apiRequest<any>(`/departments/${deptId}/`, {
    method: "PATCH",
    body: JSON.stringify(deptData),
  });
}

export async function deleteDepartmentAPI(deptId: string): Promise<boolean> {
  const res = await apiRequest<any>(`/departments/${deptId}/`, {
    method: "DELETE",
  });
  return res !== null;
}
