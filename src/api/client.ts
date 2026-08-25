/**
 * REST API Client for Isalu Hospitals Django Backend
 * Connects React Frontend with Django REST API (http://127.0.0.1:8000/api/)
 * Includes graceful LocalStorage fallbacks for zero-downtime offline operation.
 */

const API_HOSTNAME = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1";
const API_BASE_URL = `http://${API_HOSTNAME}:8000/api`;

/**
 * Helper to retrieve active JWT token from sessionStorage or localStorage
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const isValidJwt = (t: any): boolean => {
    if (!t || typeof t !== "string") return false;
    const trimmed = t.trim();
    if (
      !trimmed ||
      trimmed.startsWith("{") ||
      trimmed.startsWith("token-") ||
      trimmed.startsWith("refresh-")
    ) {
      return false;
    }
    return true;
  };

  // 1. Check direct string token stored in sessionStorage / localStorage
  const directJwt =
    sessionStorage.getItem("isalu_staff_jwt") ||
    localStorage.getItem("isalu_staff_jwt") ||
    localStorage.getItem("isalu_access_token");

  if (isValidJwt(directJwt)) {
    return directJwt!.trim();
  }

  // 2. Check JSON objects in localStorage / sessionStorage
  const tokenSources = [
    localStorage.getItem("isalu_auth_tokens"),
    sessionStorage.getItem("isalu_auth_tokens"),
    localStorage.getItem("isalu_staff_session"),
    sessionStorage.getItem("isalu_staff_session"),
    sessionStorage.getItem("isalu_staff_user_profile"),
  ];

  for (const src of tokenSources) {
    if (src) {
      try {
        const parsed = JSON.parse(src);
        const token =
          parsed.tokens?.access ||
          parsed.access ||
          parsed.token ||
          parsed.access_token;
        if (isValidJwt(token)) {
          return token.trim();
        }
      } catch {}
    }
  }

  return null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    let authHeader: Record<string, string> = {};
    const token = getStoredAuthToken();

    if (token) {
      authHeader = { "Authorization": `Bearer ${token}` };
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...authHeader,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {}

      const serverMsg =
        errorData?.error ||
        errorData?.detail ||
        (typeof errorData === "string" ? errorData : null);

      const isAuthEndpoint = endpoint.includes("/auth/");

      // 401 Unauthorized / Token Expired handling
      if (response.status === 401) {
        if (isAuthEndpoint) {
          return {
            error: serverMsg || "Invalid login credentials. Please check your username and password.",
            status: 401,
            isAuthError: true,
          } as unknown as T;
        }

        if (token) {
          console.error(`[401 Unauthorized] Session expired for endpoint: ${endpoint}`);

          // Purge expired tokens
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("isalu_staff_jwt");
            sessionStorage.removeItem("isalu_staff_authenticated");
            localStorage.removeItem("isalu_auth_tokens");
            localStorage.removeItem("isalu_access_token");

            // Dispatch event to surface 401 to UI
            window.dispatchEvent(
              new CustomEvent("isalu_auth_401", {
                detail: {
                  endpoint,
                  message: "Session Expired: Your security token has expired. Please log in again to perform staff actions.",
                },
              })
            );
          }
        }

        return {
          error: serverMsg || "Session Expired: Please log in again to authorize this action.",
          status: 401,
          isAuthError: true,
        } as unknown as T;
      }

      if (serverMsg) {
        return {
          error: serverMsg,
          status: response.status,
        } as unknown as T;
      }

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

export async function deleteHmoCompanyAPI(hmoId: string): Promise<boolean> {
  const res = await apiRequest<any>(`/hmo-companies/${hmoId}/`, {
    method: "DELETE",
  });
  return res !== null;
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
  const res = await apiRequest<any>("/auth/staff-login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res && res.tokens) {
    localStorage.setItem("isalu_auth_tokens", JSON.stringify(res.tokens));
  }
  return res;
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
