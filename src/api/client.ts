/**
 * Isalu Hospitals - Production REST API Client
 *
 * Django REST API is the ONLY source of truth for:
 * - Doctors
 * - Departments
 * - Schedules
 * - Bookings
 * - HMO companies
 * - Users
 * - Roles
 * - Analytics
 *
 * React is a UI/API client only.
 *
 * Production features:
 * - Environment-based API URL
 * - JWT authentication
 * - Single-flight JWT refresh
 * - Request timeout
 * - Safe JSON parsing
 * - Consistent API errors
 * - Booking response validation
 * - SSE event subscription
 * - No hard-coded hospital data
 * - No fake/default doctor names
 * - No automatic request retry storms
 */

/* =========================================================
   TYPES
========================================================= */

export interface ApiError {
  error: string;
  detail?: string;
  status: number;
  code?: string;
  isAuthError?: boolean;
}

export interface Doctor {
  id: string | number;
  name: string;

  fullName?: string;
  full_name?: string;

  acronym?: string;

  specialty?: string;

  departmentId?: string | number;
  department_id?: string | number;
  departmentName?: string;
  department_name?: string;

  qualification?: string;
  qualifications?: string;

  experienceYears?: number;
  experience_years?: number;

  rating?: number;
  reviewCount?: number;
  review_count?: number;

  consultationFee?: number;
  consultation_fee?: number;

  availability?: string[];
  availableDays?: string[];
  available_days?: string[];

  timeSlots?: string[];
  time_slots?: string[];

  image?: string;
  bio?: string;

  roomNumber?: string;
  room_number?: string;

  status?: string | boolean;

  doc_id?: string | number;

  schedules?: Schedule[];
}

export interface Schedule {
  id: string | number;

  doctorId?: string | number;
  doctor_id?: string | number;

  dayOfWeek?: string;
  day_of_week?: string;
  day?: string;

  startTime?: string;
  start_time?: string;

  endTime?: string;
  end_time?: string;

  roomNumber?: string;
  room_number?: string;

  isActive?: boolean;
  is_active?: boolean;

  status?: string | boolean;
}

export interface Department {
  id: string | number;
  name: string;

  description?: string;

  iconName?: string;
  icon_name?: string;

  doctorCount?: number;
  doctor_count?: number;

  status?: string | boolean;
}

export interface Booking {
  id?: string | number;

  refCode?: string;
  ref_code?: string;

  reference?: string;

  doctorId?: string | number;
  doctor_id?: string | number;

  doctorName?: string;
  doctor_name?: string;

  patientId?: string | number;
  patient_id?: string | number;

  patientName?: string;
  patient_name?: string;

  appointmentDate?: string;
  appointment_date?: string;

  appointmentTime?: string;
  appointment_time?: string;

  status?: string;

  paymentStatus?: string;
  payment_status?: string;

  [key: string]: unknown;
}

/* =========================================================
   CONFIGURATION
========================================================= */

const DEFAULT_API_PORT = "8000";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Do not automatically retry ordinary API requests.
 *
 * Retrying POST requests can accidentally create duplicate
 * bookings/payments.
 *
 * Authentication refresh is handled separately.
 */
const ENABLE_DEBUG_LOGGING =
  import.meta.env.DEV ||
  import.meta.env.VITE_API_DEBUG === "true";

/* =========================================================
   API BASE URL
========================================================= */

function getApiBaseUrl(): string {
  const configured =
    import.meta.env.VITE_API_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${DEFAULT_API_PORT}/api`;
  }

  const hostname =
    window.location.hostname || "127.0.0.1";

  const protocol =
    window.location.protocol === "https:"
      ? "https:"
      : "http:";

  /**
   * Production recommendation:
   *
   * VITE_API_BASE_URL=https://your-domain.com/api
   *
   * This avoids browser requests such as:
   *
   * http://your-domain.com:8000/api
   *
   * which should normally NOT be exposed directly in production.
   */
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

/* =========================================================
   URL BUILDER
========================================================= */

function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  return `${API_BASE_URL}${normalizedEndpoint}`;
}

/* =========================================================
   AUTH STORAGE
========================================================= */

const ACCESS_TOKEN_KEY = "isalu_staff_jwt";
const AUTH_TOKENS_KEY = "isalu_auth_tokens";
const AUTHENTICATED_KEY = "isalu_staff_authenticated";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredAuthToken(): string | null {
  if (!isBrowser()) return null;

  const direct =
    sessionStorage.getItem(ACCESS_TOKEN_KEY);

  if (direct?.trim()) {
    return direct.trim();
  }

  const raw =
    sessionStorage.getItem(AUTH_TOKENS_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    const token =
      parsed?.access ??
      parsed?.tokens?.access ??
      null;

    return typeof token === "string" && token.trim()
      ? token.trim()
      : null;
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  if (!isBrowser()) return null;

  const raw =
    sessionStorage.getItem(AUTH_TOKENS_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    const token =
      parsed?.refresh ??
      parsed?.refresh_token ??
      parsed?.tokens?.refresh ??
      null;

    return typeof token === "string" && token.trim()
      ? token.trim()
      : null;
  } catch {
    return null;
  }
}

function storeAccessToken(accessToken: string): void {
  if (!isBrowser()) return;

  const token = accessToken.trim();

  if (!token) return;

  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    token
  );

  const raw =
    sessionStorage.getItem(AUTH_TOKENS_KEY);

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    parsed.access = token;

    sessionStorage.setItem(
      AUTH_TOKENS_KEY,
      JSON.stringify(parsed)
    );
  } catch {
    // Invalid existing auth object.
    // Keep direct access token storage intact.
  }
}

export function clearStoredAuthentication(): void {
  if (!isBrowser()) return;

  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  sessionStorage.removeItem(
    AUTH_TOKENS_KEY
  );

  sessionStorage.removeItem(
    AUTHENTICATED_KEY
  );
}

/* =========================================================
   AUTH EVENTS
========================================================= */

function dispatchAuthExpiredEvent(
  endpoint?: string
): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent("isalu_auth_401", {
      detail: {
        endpoint,
        message:
          "Your session has expired. Please log in again.",
      },
    })
  );
}

/* =========================================================
   JWT REFRESH
========================================================= */

/**
 * Single-flight refresh.
 *
 * If 10 requests receive 401 at approximately the same time,
 * we DO NOT send 10 refresh requests.
 *
 * They all wait for this same promise.
 */
let refreshPromise: Promise<string | null> | null =
  null;

export async function refreshTokenAPI(): Promise<
  string | null
> {
  if (!isBrowser()) return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken =
    getStoredRefreshToken();

  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS
        );

      const response = await fetch(
        buildApiUrl("/auth/token-refresh/"),
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
          signal: controller.signal,
        }
      );

      window.clearTimeout(timeout);

      if (!response.ok) {
        clearStoredAuthentication();
        dispatchAuthExpiredEvent(
          "/auth/token-refresh/"
        );

        return null;
      }

      const data =
        await safeJson(response);

      const access =
        data?.access;

      if (
        typeof access !== "string" ||
        !access.trim()
      ) {
        clearStoredAuthentication();
        return null;
      }

      storeAccessToken(access);

      if (ENABLE_DEBUG_LOGGING) {
        console.debug(
          "[API] JWT token refreshed successfully."
        );
      }

      return access.trim();
    } catch (error) {
      if (ENABLE_DEBUG_LOGGING) {
        console.warn(
          "[API] JWT refresh failed:",
          error
        );
      }

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* =========================================================
   SAFE JSON
========================================================= */

async function safeJson(
  response: Response
): Promise<any> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

/* =========================================================
   ERROR EXTRACTION
========================================================= */

function extractServerMessage(
  data: any,
  fallback: string
): string {
  if (!data) return fallback;

  if (typeof data === "string") {
    return data;
  }

  if (
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

  if (
    typeof data.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail;
  }

  if (
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  /**
   * Django REST Framework validation errors.
   */
  if (
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const messages: string[] = [];

    for (const [
      field,
      value,
    ] of Object.entries(data)) {
      if (field === "status") continue;

      if (Array.isArray(value)) {
        messages.push(
          `${field}: ${value.join(", ")}`
        );
      } else if (
        typeof value === "string"
      ) {
        messages.push(
          `${field}: ${value}`
        );
      }
    }

    if (messages.length) {
      return messages.join(" | ");
    }
  }

  return fallback;
}

/* =========================================================
   REQUEST OPTIONS
========================================================= */

export interface ApiRequestOptions
  extends RequestInit {
  /**
   * Prevent automatic JWT refresh for this request.
   */
  skipAuthRefresh?: boolean;

  /**
   * Override request timeout.
   */
  timeoutMs?: number;
}

/* =========================================================
   CORE REQUEST
========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
  isRetry = false
): Promise<T | null> {
  const {
    skipAuthRefresh,
    timeoutMs = REQUEST_TIMEOUT_MS,
    ...fetchOptions
  } = options;

  const url =
    buildApiUrl(endpoint);

  const token =
    getStoredAuthToken();

  const headers = new Headers(
    fetchOptions.headers
  );

  /**
   * Do not force Content-Type on requests
   * that already provide their own body type.
   */
  if (
    fetchOptions.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  headers.set(
    "Accept",
    "application/json"
  );

  if (
    token &&
    !headers.has("Authorization")
  ) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  const startedAt =
    performance.now();

  try {
    const response =
      await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

    const elapsed =
      Math.round(
        performance.now() -
        startedAt
      );

    const data =
      await safeJson(response);

    if (ENABLE_DEBUG_LOGGING) {
      console.debug(
        `[API] ${fetchOptions.method || "GET"} ${endpoint} -> ${response.status} (${elapsed}ms)`
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    if (response.ok) {
      if (response.status === 204) {
        return {} as T;
      }

      return data as T;
    }

    /* =====================================================
       401 - JWT EXPIRED
    ===================================================== */

    if (
      response.status === 401 &&
      !skipAuthRefresh &&
      !isRetry &&
      !endpoint.includes("/auth/")
    ) {
      const newToken =
        await refreshTokenAPI();

      if (newToken) {
        return apiRequest<T>(
          endpoint,
          {
            ...options,
          },
          true
        );
      }

      clearStoredAuthentication();

      dispatchAuthExpiredEvent(
        endpoint
      );

      return {
        error:
          "Your session has expired. Please log in again.",
        status: 401,
        isAuthError: true,
      } as unknown as T;
    }

    /* =====================================================
       401 AUTH ENDPOINT
    ===================================================== */

    if (
      response.status === 401 &&
      endpoint.includes("/auth/")
    ) {
      return {
        error: extractServerMessage(
          data,
          "Invalid login credentials."
        ),
        status: 401,
        isAuthError: true,
      } as unknown as T;
    }

    /* =====================================================
       403
    ===================================================== */

    if (response.status === 403) {
      return {
        error: extractServerMessage(
          data,
          "You do not have permission to perform this action."
        ),
        status: 403,
      } as unknown as T;
    }

    /* =====================================================
       404
    ===================================================== */

    if (response.status === 404) {
      return {
        error: extractServerMessage(
          data,
          "The requested resource was not found."
        ),
        status: 404,
      } as unknown as T;
    }

    /* =====================================================
       409
    ===================================================== */

    if (response.status === 409) {
      return {
        error: extractServerMessage(
          data,
          "The request conflicts with existing data."
        ),
        status: 409,
      } as unknown as T;
    }

    /* =====================================================
       429
    ===================================================== */

    if (response.status === 429) {
      return {
        error: extractServerMessage(
          data,
          "Too many requests. Please wait a moment and try again."
        ),
        status: 429,
      } as unknown as T;
    }

    /* =====================================================
       500+
    ===================================================== */

    if (response.status >= 500) {
      return {
        error: extractServerMessage(
          data,
          "The hospital server encountered an error. Please try again."
        ),
        status: response.status,
      } as unknown as T;
    }

    /* =====================================================
       OTHER ERROR
    ===================================================== */

    return {
      error: extractServerMessage(
        data,
        `Request failed with status ${response.status}.`
      ),
      status: response.status,
    } as unknown as T;
  } catch (error: any) {
    if (ENABLE_DEBUG_LOGGING) {
      console.error(
        `[API] Request failed: ${endpoint}`,
        error
      );
    }

    if (
      error?.name === "AbortError"
    ) {
      return {
        error:
          "The hospital server took too long to respond. Please try again.",
        status: 408,
        isTimeout: true,
      } as unknown as T;
    }

    return {
      error:
        "Unable to connect to the hospital server. Please check your connection and try again.",
      status: 0,
      isNetworkError: true,
    } as unknown as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* =========================================================
   RESPONSE HELPERS
========================================================= */

export function isApiError(
  value: unknown
): value is ApiError {
  return Boolean(
    value &&
    typeof value === "object" &&
    "error" in value &&
    "status" in value
  );
}

export function isSuccessfulApiResponse(
  value: unknown
): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !isApiError(value)
  );
}

/* =========================================================
   DOCTORS
========================================================= */

export async function getDoctorsAPI(
  deptId?: string
): Promise<Doctor[] | null> {
  const query =
    deptId &&
      deptId !== "all"
      ? `?department=${encodeURIComponent(
        deptId
      )}`
      : "";

  return apiRequest<Doctor[]>(
    `/doctors/${query}`
  );
}

export async function createDoctorAPI(
  doctorData: Partial<Doctor> &
    Record<string, unknown>
): Promise<Doctor | null> {
  return apiRequest<Doctor>(
    "/doctors/",
    {
      method: "POST",
      body: JSON.stringify(
        doctorData
      ),
    }
  );
}

export async function updateDoctorAPI(
  docId: string | number,
  doctorData: Record<string, unknown>
): Promise<Doctor | null> {
  return apiRequest<Doctor>(
    `/doctors/${encodeURIComponent(
      String(docId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        doctorData
      ),
    }
  );
}

export async function deleteDoctorAPI(
  docId: string | number
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/doctors/${encodeURIComponent(
        String(docId)
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

export async function getDoctorAvailableDatesAPI(
  docId: string | number,
  days: number = 90
): Promise<any | null> {
  return apiRequest<any>(
    `/doctors/${encodeURIComponent(String(docId))}/available-dates/?days=${days}`
  );
}

/* =========================================================
   SCHEDULES
========================================================= */

export async function getSchedulesAPI(): Promise<
  Schedule[] | null
> {
  return apiRequest<Schedule[]>(
    "/schedules/"
  );
}

export async function createScheduleAPI(
  scheduleData: Record<string, unknown>
): Promise<Schedule | null> {
  return apiRequest<Schedule>(
    "/schedules/",
    {
      method: "POST",
      body: JSON.stringify(
        scheduleData
      ),
    }
  );
}

export async function updateScheduleAPI(
  scheduleId: string | number,
  scheduleData: Record<string, unknown>
): Promise<Schedule | null> {
  return apiRequest<Schedule>(
    `/schedules/${encodeURIComponent(
      String(scheduleId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        scheduleData
      ),
    }
  );
}

export async function deleteScheduleAPI(
  scheduleId: string | number
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/schedules/${encodeURIComponent(
        String(scheduleId)
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

/* =========================================================
   BOOKINGS
========================================================= */

export async function getBookingsAPI(): Promise<
  Booking[] | null
> {
  return apiRequest<Booking[]>(
    "/bookings/"
  );
}

/**
 * IMPORTANT:
 *
 * Booking creation does NOT assume success.
 *
 * The server must return a real booking object
 * or an explicit error.
 */
export async function createBookingAPI(
  bookingData: Record<string, unknown>
): Promise<Booking | null> {
  const response =
    await apiRequest<any>(
      "/bookings/",
      {
        method: "POST",
        body: JSON.stringify(
          bookingData
        ),
        /**
         * Do not automatically retry this POST.
         *
         * A retry could create duplicate bookings.
         */
        skipAuthRefresh: false,
      }
    );

  if (!response) {
    return null;
  }

  if (isApiError(response)) {
    return response as unknown as Booking;
  }

  /**
   * Some APIs return:
   *
   * { data: {...booking...} }
   *
   * while others return:
   *
   * {...booking...}
   */
  const booking =
    response?.data &&
      typeof response.data === "object"
      ? response.data
      : response;

  /**
   * Validate that the backend actually returned
   * a booking record.
   *
   * This prevents the frontend from displaying
   * "booking successful" when Django returned
   * an empty/unexpected response.
   */
  const hasBookingIdentity = Boolean(
    booking?.id ||
    booking?.refCode ||
    booking?.ref_code ||
    booking?.reference
  );

  if (!hasBookingIdentity) {
    if (ENABLE_DEBUG_LOGGING) {
      console.error(
        "[BOOKING] Backend did not return a valid booking record:",
        response
      );
    }

    return {
      error:
        "The hospital server did not return a valid booking record.",
      status: 502,
    } as unknown as Booking;
  }

  return booking as Booking;
}

export async function updateBookingAPI(
  refCode: string,
  bookingData: Record<string, unknown>
): Promise<Booking | null> {
  return apiRequest<Booking>(
    `/bookings/${encodeURIComponent(
      refCode
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        bookingData
      ),
    }
  );
}

export async function deleteBookingAPI(
  refCode: string
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/bookings/${encodeURIComponent(
        refCode
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

export async function getDisabledBookingsAPI(): Promise<
  Booking[] | null
> {
  return apiRequest<Booking[]>(
    "/bookings/disabled/"
  );
}

export async function restoreBookingAPI(
  refCode: string
): Promise<Booking | null> {
  return apiRequest<Booking>(
    `/bookings/${encodeURIComponent(
      refCode
    )}/restore/`,
    {
      method: "POST",
    }
  );
}

export async function checkInBookingAPI(
  refCode: string
): Promise<Booking | null> {
  return apiRequest<Booking>(
    `/bookings/${encodeURIComponent(
      refCode
    )}/check-in/`,
    {
      method: "POST",
    }
  );
}

export async function approveHmoBookingAPI(
  refCode: string,
  policyCode: string,
  authCode: string
): Promise<Booking | null> {
  return apiRequest<Booking>(
    `/bookings/${encodeURIComponent(
      refCode
    )}/approve-hmo/`,
    {
      method: "POST",
      body: JSON.stringify({
        policyCode,
        authCode,
      }),
    }
  );
}

export async function payCashdeskBookingAPI(
  refCode: string,
  paymentMethod: string
): Promise<Booking | null> {
  return apiRequest<Booking>(
    `/bookings/${encodeURIComponent(
      refCode
    )}/pay-cashdesk/`,
    {
      method: "POST",
      body: JSON.stringify({
        paymentMethod,
      }),
    }
  );
}

export async function rerouteHmoBookingToCashdeskAPI(
  refCode: string,
  remark: string
): Promise<Booking | null> {
  const response =
    await apiRequest<any>(
      `/bookings/${encodeURIComponent(
        refCode
      )}/reroute-cashdesk/`,
      {
        method: "POST",
        body: JSON.stringify({
          remark,
        }),
      }
    );

  if (
    response &&
    !isApiError(response)
  ) {
    const data =
      response?.data &&
        typeof response.data === "object"
        ? response.data
        : response;

    return data as Booking;
  }

  /**
   * Only use PATCH fallback if the dedicated
   * endpoint is genuinely unavailable.
   */
  if (
    isApiError(response) &&
    ![404, 405].includes(
      Number(response.status)
    )
  ) {
    return response as unknown as Booking;
  }

  return updateBookingAPI(
    refCode,
    {
      payment_type:
        "Private Self-Pay",
      paymentType:
        "Private Self-Pay",

      hmo_status:
        `Re-routed to Cashdesk (Self-Pay): ${remark}`,
      hmoStatus:
        `Re-routed to Cashdesk (Self-Pay): ${remark}`,

      payment_status:
        "Pending",
      paymentStatus:
        "Pending",

      delete_reason:
        `Re-routed from HMO to Cashdesk: ${remark}`,
      deleteReason:
        `Re-routed from HMO to Cashdesk: ${remark}`,
    }
  );
}

/* =========================================================
   BOOKING AVAILABILITY
========================================================= */

export async function getBookingAvailabilityAPI(
  params: {
    doctor_id: string;
    date: string;
  }
): Promise<any | null> {
  const query =
    new URLSearchParams(
      params
    ).toString();

  return apiRequest<any>(
    `/bookings/availability/?${query}`
  );
}

/* =========================================================
   PUBLIC BOOKING LOOKUP
========================================================= */

export async function lookupBookingAPI(
  value: string,
  phone?: string
): Promise<Booking | null> {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const isReference =
    /^ISALU-/i.test(clean);

  const params = isReference
    ? {
      ref_code: clean,
      ...(phone
        ? { phone }
        : {}),
    }
    : {
      phone: clean,
    };

  const query =
    new URLSearchParams(
      params
    ).toString();

  return apiRequest<Booking>(
    `/bookings/public-lookup/?${query}`
  );
}

/* =========================================================
   HMO COMPANIES
========================================================= */

export async function getHmoCompaniesAPI(): Promise<
  any[] | null
> {
  return apiRequest<any[]>(
    "/hmo-companies/"
  );
}

export async function createHmoCompanyAPI(
  hmoData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    "/hmo-companies/",
    {
      method: "POST",
      body: JSON.stringify(
        hmoData
      ),
    }
  );
}

export async function updateHmoCompanyAPI(
  hmoId: string | number,
  hmoData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    `/hmo-companies/${encodeURIComponent(
      String(hmoId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        hmoData
      ),
    }
  );
}

export async function deleteHmoCompanyAPI(
  hmoId: string | number
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/hmo-companies/${encodeURIComponent(
        String(hmoId)
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

/* =========================================================
   SYSTEM USERS
========================================================= */

export async function getSystemUsersAPI(): Promise<
  any[] | null
> {
  return apiRequest<any[]>(
    "/users/"
  );
}

export async function createSystemUserAPI(
  userData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    "/users/",
    {
      method: "POST",
      body: JSON.stringify(
        userData
      ),
    }
  );
}

export async function updateSystemUserAPI(
  userId: string | number,
  userData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    `/users/${encodeURIComponent(
      String(userId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        userData
      ),
    }
  );
}

/* =========================================================
   TIME SLOTS
========================================================= */

export async function getCustomTimeSlotsAPI(): Promise<
  any[] | null
> {
  return apiRequest<any[]>(
    "/time-slots/"
  );
}

export async function createCustomTimeSlotAPI(
  slotData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    "/time-slots/",
    {
      method: "POST",
      body: JSON.stringify(
        slotData
      ),
    }
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

export async function getAnalyticsSummaryAPI(): Promise<
  any | null
> {
  return apiRequest<any>(
    "/bookings/summary/"
  );
}

export async function generateAiReportAPI(
  prompt: string
): Promise<any | null> {
  return apiRequest<any>(
    "/analytics/ai-report/",
    {
      method: "POST",
      body: JSON.stringify({
        prompt,
      }),
    }
  );
}

/* =========================================================
   DEPARTMENTS
========================================================= */

export async function getDepartmentsAPI(
  options?: {
    include_disabled?: boolean;
  }
): Promise<Department[] | null> {
  const query =
    options?.include_disabled
      ? "?include_disabled=true"
      : "";

  return apiRequest<Department[]>(
    `/departments/${query}`
  );
}

export async function createDepartmentAPI(
  departmentData: Record<string, unknown>
): Promise<Department | null> {
  return apiRequest<Department>(
    "/departments/",
    {
      method: "POST",
      body: JSON.stringify(
        departmentData
      ),
    }
  );
}

export async function updateDepartmentAPI(
  departmentId: string | number,
  departmentData: Record<string, unknown>
): Promise<Department | null> {
  return apiRequest<Department>(
    `/departments/${encodeURIComponent(
      String(departmentId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        departmentData
      ),
    }
  );
}

export async function deleteDepartmentAPI(
  departmentId: string | number
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/departments/${encodeURIComponent(
        String(departmentId)
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

/* =========================================================
   ROLES
========================================================= */

export async function getRolesAPI(): Promise<
  any[] | null
> {
  return apiRequest<any[]>(
    "/roles/"
  );
}

export async function createRoleAPI(
  roleData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    "/roles/",
    {
      method: "POST",
      body: JSON.stringify(
        roleData
      ),
    }
  );
}

export async function updateRoleAPI(
  roleId: string | number,
  roleData: Record<string, unknown>
): Promise<any | null> {
  return apiRequest<any>(
    `/roles/${encodeURIComponent(
      String(roleId)
    )}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        roleData
      ),
    }
  );
}

export async function deleteRoleAPI(
  roleId: string | number
): Promise<boolean> {
  const response =
    await apiRequest<any>(
      `/roles/${encodeURIComponent(
        String(roleId)
      )}/`,
      {
        method: "DELETE",
      }
    );

  return (
    response !== null &&
    !isApiError(response)
  );
}

/* =========================================================
   AUTHENTICATION
========================================================= */

export async function loginStaffAPI(
  username: string,
  password: string
): Promise<any | null> {
  const response =
    await apiRequest<any>(
      "/auth/staff-login/",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
        skipAuthRefresh: true,
      }
    );

  if (
    !response ||
    isApiError(response)
  ) {
    return response;
  }

  /**
   * Support both:
   *
   * {
   *   tokens: {
   *     access,
   *     refresh
   *   }
   * }
   *
   * and:
   *
   * {
   *   access,
   *   refresh
   * }
   */
  const tokens =
    response.tokens ||
    response;

  if (
    tokens?.access
  ) {
    sessionStorage.setItem(
      AUTH_TOKENS_KEY,
      JSON.stringify({
        access:
          tokens.access,
        refresh:
          tokens.refresh ||
          tokens.refresh_token ||
          null,
      })
    );

    sessionStorage.setItem(
      ACCESS_TOKEN_KEY,
      tokens.access
    );

    sessionStorage.setItem(
      AUTHENTICATED_KEY,
      "true"
    );
  }

  return response;
}

/* =========================================================
   APP SETTINGS
========================================================= */

export async function getAppSettingAPI(
  key: string
): Promise<any | null> {
  return apiRequest<any>(
    `/settings/${encodeURIComponent(
      key
    )}/`
  );
}

export async function saveAppSettingAPI(
  key: string,
  value: unknown
): Promise<any | null> {
  const encodedKey =
    encodeURIComponent(key);

  const existing =
    await apiRequest<any>(
      `/settings/${encodedKey}/`
    );

  if (
    existing &&
    !isApiError(existing)
  ) {
    return apiRequest<any>(
      `/settings/${encodedKey}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          value,
        }),
      }
    );
  }

  return apiRequest<any>(
    "/settings/",
    {
      method: "POST",
      body: JSON.stringify({
        key,
        value,
      }),
    }
  );
}

/* =========================================================
   CLEAR BOOKINGS
========================================================= */

export async function clearAllBookingsAPI(
  reason =
    "Cleared by authorized administrator"
): Promise<any | null> {
  return apiRequest<any>(
    "/bookings/clear-all/",
    {
      method: "POST",
      body: JSON.stringify({
        reason,
      }),
    }
  );
}

/* =========================================================
   SSE REAL-TIME EVENTS
========================================================= */

export interface HospitalEvent {
  type?: string;
  event?: string;
  data?: unknown;

  [key: string]: unknown;
}

/**
 * Subscribe to hospital events.
 *
 * IMPORTANT:
 *
 * Native EventSource does not support custom
 * Authorization headers.
 *
 * Therefore this works correctly only if your
 * Django SSE endpoint is authenticated by:
 *
 * - same-site/session authentication, or
 * - another server-supported mechanism.
 *
 * Do NOT put a JWT access token into a URL query
 * string unless you deliberately accept the security
 * implications.
 */
export function subscribeToHospitalEvents(
  onEvent: (
    event: HospitalEvent
  ) => void,
  options?: {
    onError?: (
      error: Event
    ) => void;
    reconnect?: boolean;
    reconnectDelayMs?: number;
  }
): () => void {
  if (
    typeof window === "undefined" ||
    !("EventSource" in window)
  ) {
    return () => { };
  }

  const {
    onError,
    reconnect = true,
    reconnectDelayMs = 5000,
  } = options || {};

  let eventSource:
    EventSource | null = null;

  let reconnectTimer:
    ReturnType<typeof setTimeout> | null =
    null;

  let closedByCaller =
    false;

  function connect(): void {
    if (closedByCaller) {
      return;
    }

    try {
      eventSource =
        new EventSource(
          buildApiUrl(
            "/stream/events/"
          )
        );

      eventSource.onmessage = (
        event
      ) => {
        try {
          const parsed =
            JSON.parse(
              event.data
            );

          onEvent(parsed);
        } catch {
          if (ENABLE_DEBUG_LOGGING) {
            console.warn(
              "[SSE] Invalid event payload:",
              event.data
            );
          }
        }
      };

      eventSource.onerror = (
        error
      ) => {
        onError?.(error);

        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        if (
          reconnect &&
          !closedByCaller &&
          !reconnectTimer
        ) {
          reconnectTimer =
            setTimeout(() => {
              reconnectTimer =
                null;

              connect();
            }, reconnectDelayMs);
        }
      };
    } catch (error) {
      if (ENABLE_DEBUG_LOGGING) {
        console.warn(
          "[SSE] Connection failed:",
          error
        );
      }

      if (
        reconnect &&
        !closedByCaller &&
        !reconnectTimer
      ) {
        reconnectTimer =
          setTimeout(() => {
            reconnectTimer =
              null;

            connect();
          }, reconnectDelayMs);
      }
    }
  }

  connect();

  return () => {
    closedByCaller =
      true;

    if (reconnectTimer) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

/* =========================================================
   DOCTOR NAME HELPERS
========================================================= */

/**
 * Backend-authoritative doctor name resolver.
 *
 * IMPORTANT:
 *
 * There is intentionally NO hard-coded doctor fallback.
 *
 * If Django cannot provide a name, return
 * "Unknown Specialist" rather than assigning the
 * booking to an unrelated doctor.
 */
export function getDoctorRealName(
  doctorOrBooking: unknown
): string {
  if (!doctorOrBooking) {
    return "Unknown Specialist";
  }

  if (
    typeof doctorOrBooking === "string"
  ) {
    const value =
      doctorOrBooking.trim();

    return value ||
      "Unknown Specialist";
  }

  if (
    typeof doctorOrBooking !==
    "object"
  ) {
    return "Unknown Specialist";
  }

  const value =
    doctorOrBooking as Record<
      string,
      unknown
    >;

  const doctor =
    value.doctor;

  if (
    doctor &&
    typeof doctor === "object"
  ) {
    const nested =
      doctor as Record<
        string,
        unknown
      >;

    const nestedName =
      nested.fullName ||
      nested.full_name ||
      nested.name ||
      nested.doctorName ||
      nested.doctor_name;

    if (
      typeof nestedName ===
      "string" &&
      nestedName.trim()
    ) {
      return nestedName.trim();
    }
  }

  const rawName =
    value.doctorName ||
    value.doctor_name ||
    value.fullName ||
    value.full_name ||
    value.name;

  if (
    typeof rawName === "string" &&
    rawName.trim()
  ) {
    return rawName.trim();
  }

  return "Unknown Specialist";
}

/**
 * Returns a backend-provided acronym/name.
 *
 * No local DOCTORS lookup is performed.
 */
export function getDoctorDisplayAcronym(
  doctorOrBooking: unknown
): string {
  if (!doctorOrBooking) {
    return "Specialist";
  }

  if (
    typeof doctorOrBooking ===
    "string"
  ) {
    const value =
      doctorOrBooking.trim();

    return value ||
      "Specialist";
  }

  if (
    typeof doctorOrBooking !==
    "object"
  ) {
    return "Specialist";
  }

  const value =
    doctorOrBooking as Record<
      string,
      unknown
    >;

  const doctor =
    value.doctor;

  if (
    doctor &&
    typeof doctor === "object"
  ) {
    const nested =
      doctor as Record<
        string,
        unknown
      >;

    const acronym =
      nested.acronym ||
      nested.name;

    if (
      typeof acronym ===
      "string" &&
      acronym.trim()
    ) {
      return acronym.trim();
    }
  }

  const acronym =
    value.acronym;

  if (
    typeof acronym ===
    "string" &&
    acronym.trim()
  ) {
    return acronym.trim();
  }

  const name =
    value.doctorName ||
    value.doctor_name ||
    value.name;

  if (
    typeof name === "string" &&
    name.trim()
  ) {
    return name.trim();
  }

  return "Specialist";
}

/* =========================================================
   LEGACY COMPATIBILITY
========================================================= */

/**
 * Kept for existing imports.
 *
 * DO NOT use this as a database source.
 */
export function getAcronymForIndex(
  index: number
): string {
  let letters = "";
  let n = Math.max(
    0,
    Math.floor(index)
  );

  do {
    letters =
      String.fromCharCode(
        65 + (n % 26)
      ) + letters;

    n =
      Math.floor(n / 26) - 1;
  } while (n >= 0);

  return `Specialist ${letters}`;
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export const api = {
  getDoctorsAPI,
  createDoctorAPI,
  updateDoctorAPI,
  deleteDoctorAPI,

  getSchedulesAPI,
  createScheduleAPI,
  updateScheduleAPI,
  deleteScheduleAPI,

  getBookingsAPI,
  createBookingAPI,
  updateBookingAPI,
  deleteBookingAPI,

  getDisabledBookingsAPI,
  restoreBookingAPI,
  checkInBookingAPI,

  approveHmoBookingAPI,
  payCashdeskBookingAPI,
  rerouteHmoBookingToCashdeskAPI,

  getHmoCompaniesAPI,
  createHmoCompanyAPI,
  updateHmoCompanyAPI,
  deleteHmoCompanyAPI,

  getSystemUsersAPI,
  createSystemUserAPI,
  updateSystemUserAPI,

  getCustomTimeSlotsAPI,
  createCustomTimeSlotAPI,

  getAnalyticsSummaryAPI,
  generateAiReportAPI,

  getDepartmentsAPI,
  createDepartmentAPI,
  updateDepartmentAPI,
  deleteDepartmentAPI,

  getRolesAPI,
  createRoleAPI,
  updateRoleAPI,
  deleteRoleAPI,

  loginStaffAPI,
  refreshTokenAPI,
  clearStoredAuthentication,

  getBookingAvailabilityAPI,
  lookupBookingAPI,

  getAppSettingAPI,
  saveAppSettingAPI,

  clearAllBookingsAPI,

  subscribeToHospitalEvents,

  getDoctorRealName,
  getDoctorDisplayAcronym,
  getAcronymForIndex,
};

export default api;
