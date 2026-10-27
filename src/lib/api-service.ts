// Backend API Service
// Connects to Flask backend (DB_AHHA) for patient and report data

import { auth } from "@/lib/firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api/v2" : "https://aaha-api-REDACTED_SENDER_ID.asia-south1.run.app/api/v2");

const BLOOD_REPORT_API_BASE_URL =
  import.meta.env.VITE_BLOOD_REPORT_API_BASE_URL ||
  (import.meta.env.DEV ? "/api/v2" : "https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2");

const FEATURE_API_BASE_URL =
  import.meta.env.VITE_FEATURE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api/v2" : "https://aaha-feature-backend.onrender.com/api/v2");

export interface Patient {
  patient_id: number;
  mobile_number: string;
  full_name: string;
  age?: number;
  gender?: string;
  firebase_uid: string;
  referred_by?: string;
  created_at: string;
}

export interface Appointment {
  appointment_id?: string;
  id?: string;
  _id?: string;
  patient_id?: string;
  doctor_name?: string;
  doctor_id?: string;
  kiosk_id?: string;
  speciality?: string;
  centre?: string;
  appointment_date: string;
  scheduled_for?: string;
  appointment_time?: string;
  slot_label?: string;
  appointment_type: string;
  booking_type?: string;
  mode?: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at?: string;
}

export interface Report {
  report_id: number;
  patient_id: number;
  awis_score: number | string;
  prediction: {
    conditions_found?: string[];
    risk_band?: string;
    awis_label?: string;
    refer_to_doctor?: boolean;
    recommended_tests?: string[];
    [key: string]: any;
  };
  report_data?: any;
  created_at: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    backend: "common" | "feature" | "blood_report" | boolean = "common"
  ): Promise<T> {
    let baseUrl = API_BASE_URL;
    if (backend === "feature" || backend === true) {
      baseUrl = FEATURE_API_BASE_URL;
    } else if (backend === "blood_report") {
      baseUrl = BLOOD_REPORT_API_BASE_URL;
    }
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    // Ensure Firebase auth is initialized before making the request
    await auth.authStateReady();

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (auth.currentUser) {
      // Fallback: If token wasn't set yet but user is logged in, fetch it centrally
      const fallbackToken = await auth.currentUser.getIdToken();
      this.token = fallbackToken;
      headers["Authorization"] = `Bearer ${fallbackToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Request failed: ${response.status}`;
        const error = new Error(errorMsg);
        (error as any).status = response.status;
        throw error;
      }

      return data as T;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // ===== Patient APIs =====

  /**
   * Create new patient profile
   * POST /api/v2/patients
   */
  async createPatient(data: {
    mobile_number: string;
    full_name: string;
    age?: number;
    gender?: string;
    referred_by?: string;
  }): Promise<{ message: string; patient: Patient }> {
    return await this.request<{ message: string; patient: Patient }>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get logged-in user's patient profile
   * GET /api/v2/patients/me
   */
  async getMyProfile(): Promise<{ patient: Patient }> {
    return await this.request<{ patient: Patient }>("/patients/me");
  }

  /**
   * Link Firebase UID to existing patient by phone number
   * POST /api/v2/patients/link-by-phone
   */
  async linkPatientByPhone(phoneNumber: string): Promise<{ message: string; patient: Patient }> {
    return await this.request<{ message: string; patient: Patient }>("/patients/link-by-phone", {
      method: "POST",
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  /**
   * Update logged-in user's patient profile
   * PUT /api/v2/patients/me
   */
  async updateMyProfile(
    data: Partial<{
      full_name: string;
      age: number;
      gender: string;
    }>,
  ): Promise<{ message: string; patient: Patient }> {
    return await this.request<{ message: string; patient: Patient }>("/patients/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ===== Appointments APIs =====

  /**
   * Get available appointment slots for a date
   * GET /api/v2/appointments/slots?date=YYYY-MM-DD&centre=string
   */
  async getAvailableSlots(date: string, centre?: string): Promise<{ slots: string[] }> {
    const query = new URLSearchParams({ date });
    if (centre) query.append("centre", centre);
    return await this.request<{ slots: string[] }>(`/appointments/slots?${query.toString()}`, {}, true);
  }

  /**
   * Book a new appointment
   * POST /api/v2/appointments
   */
  async bookAppointment(data: {
    appointment_date: string;
    appointment_time: string;
    appointment_type: string;
    centre?: string;
    doctor_name?: string;
    doctor_id?: string;
    kiosk_id?: string;
    booking_type?: string;
    mode?: string;
    notes?: string;
  }): Promise<{ message: string; appointment: Appointment }> {
    return await this.request<{ message: string; appointment: Appointment }>(
      "/appointments",
      {
        method: "POST",
        body: JSON.stringify({
          ...data,
          doctor_id: data.doctor_id || data.doctor_name,
          booking_type: data.booking_type || (data.doctor_id || data.doctor_name ? "doctor" : data.kiosk_id ? "kiosk" : "general")
        }),
      },
      true,
    );
  }

  /**
   * Get logged-in user's appointments
   * GET /api/v2/appointments/me
   */
  async getMyAppointments(): Promise<{ appointments: Appointment[] }> {
    const res = await this.request<{ appointments: any[] }>("/appointments/me", {}, true).catch(
      () => ({ appointments: [] as any[] }),
    );
    const appointments = (res.appointments || []).map((a: any) => ({
      appointment_id: String(a.appointment_id || a.id || a._id || ""),
      id: String(a.appointment_id || a.id || a._id || ""),
      _id: a._id,
      patient_id: String(a.patient_id || ""),
      doctor_name:
        a.doctor_name ||
        a.doctor_id ||
        (a.booking_type === "kiosk" || a.kiosk_id ? "Aaha Kiosk" : "Doctor"),
      doctor_id: a.doctor_id,
      kiosk_id: a.kiosk_id,
      speciality:
        a.speciality ||
        (a.booking_type === "kiosk" || a.kiosk_id ? "Kiosk Screening" : "General Medicine"),
      mode: a.mode || "In person",
      slot_label: a.slot_label || a.appointment_time || "",
      appointment_time: a.appointment_time || a.slot_label || "",
      appointment_date:
        a.appointment_date || a.scheduled_for || (a.created_at ? a.created_at.split("T")[0] : ""),
      scheduled_for: a.scheduled_for || a.appointment_date || "",
      status: (a.status || "confirmed").toLowerCase() as "pending" | "confirmed" | "cancelled" | "completed",
      booking_type: a.booking_type || (a.kiosk_id ? "kiosk" : "doctor"),
      centre: a.centre || "Aaha Health Centre, Aundh, Pune",
      appointment_type:
        a.appointment_type || (a.booking_type === "kiosk" ? "Screening" : "Consultation"),
      notes: a.notes,
      created_at: a.created_at || new Date().toISOString(),
    }));
    return { appointments };
  }

  async getAppointmentSlots(date: string, doctor_id?: string, kiosk_id?: string): Promise<{
    date: string;
    slots: string[];
  }> {
    let url = `/appointments/slots?date=${encodeURIComponent(date)}`;
    if (doctor_id) url += `&doctor_id=${encodeURIComponent(doctor_id)}`;
    if (kiosk_id) url += `&kiosk_id=${encodeURIComponent(kiosk_id)}`;
    return await this.request<{
      date: string;
      slots: string[];
    }>(url, {}, true);
  }

  /**
   * Cancel an appointment
   * DELETE /api/v2/appointments/:id
   */
  async cancelAppointment(
    appointmentId: string,
  ): Promise<{ message: string; appointment: Appointment }> {
    return await this.request<{ message: string; appointment: Appointment }>(
      `/appointments/${appointmentId}`,
      {
        method: "DELETE",
      },
      true,
    );
  }

  // ===== Preferences APIs =====

  async getPreferences(): Promise<any> {
    try {
      return await this.request("/preferences/me", {}, true);
    } catch {
      return {
        language: typeof window !== "undefined" ? localStorage.getItem("aaha.lang") || "en" : "en",
        theme:
          typeof window !== "undefined" ? localStorage.getItem("aaha.theme") || "light" : "light",
        marketing_consent: false,
        data_sharing_consent: true,
      };
    }
  }

  async updatePreferences(data: Record<string, any>): Promise<any> {
    try {
      return await this.request(
        "/preferences/me",
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
        true,
      );
    } catch (err: any) {
      if (err?.status === 405 || err?.status === 404) {
        return await this.request(
          "/preferences/me",
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
          true,
        );
      }
      throw err;
    }
  }

  // ===== Notification APIs =====

  async getMyNotifications(): Promise<{ notifications: any[] }> {
    return await this.request<{ notifications: any[] }>("/notifications/me", {}, true).catch(() => ({
      notifications: [],
    }));
  }

  async markNotificationRead(id: string): Promise<any> {
    try {
      return await this.request(`/notifications/${id}/read`, { method: "POST" }, true);
    } catch {
      return await this.request(`/notifications/${id}/read`, { method: "PUT" }, true);
    }
  }

  // ===== Reports APIs =====

  /**
   * Create new health report
   * POST /api/v2/reports
   */
  async createReport(data: {
    awis_score: number | string;
    prediction: {
      conditions_found?: string[];
      risk_band?: string;
      awis_label?: string;
      refer_to_doctor?: boolean;
      recommended_tests?: string[];
      [key: string]: any;
    };
    report_data?: any;
  }): Promise<{ message: string; report: Report }> {
    return await this.request<{ message: string; report: Report }>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all reports for logged-in user
   * GET /api/v2/reports/me
   */
  async getMyReports(): Promise<{ reports: Report[] }> {
    return await this.request<{ reports: Report[] }>("/reports/me");
  }

  /**
   * Get specific report by ID
   * Fetches from /reports/me and finds by ID since /reports/:id is removed
   */
  async getReport(reportId: number): Promise<{ report: Report }> {
    const data = await this.getMyReports();
    const report = data.reports.find((r) => r.report_id === reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }
    return { report };
  }

  // ===== Admin APIs =====

  /**
   * Get all patients and reports (Admin only)
   * GET /api/v2/admin/reports
   * GET /api/v2/admin/reports?mobile=+919876543210
   */
  async getAdminReports(mobileFilter?: string): Promise<{
    results: Array<{
      patient_id: number;
      mobile_number: string;
      full_name: string;
      age: number;
      gender: string;
      firebase_uid: string;
      patient_created_at: string;
      report_id: number;
      awis_score: number;
      prediction: any;
      report_data: any;
      report_created_at: string;
    }>;
  }> {
    const endpoint = mobileFilter
      ? `/admin/reports?mobile=${encodeURIComponent(mobileFilter)}`
      : "/admin/reports";

    return await this.request(endpoint);
  }

  // ===== Health Check =====

  /**
   * Check backend and database health
   * GET /api/v2/health
   */
  async checkHealth(): Promise<{
    status: string;
    database: string;
    database_name?: string;
    database_user?: string;
  }> {
    return await this.request<{
      status: string;
      database: string;
      database_name?: string;
      database_user?: string;
    }>("/health");
  }

  // ===== Blood Report APIs =====

  /**
   * Upload blood report file
   * POST /api/v2/blood-reports
   */
  async uploadBloodReport(file: File): Promise<{
    message: string;
    blood_report: {
      blood_report_id: number;
      lab_name?: string | null;
      original_filename: string;
      parameters_read: number;
      report_date?: string | null;
      status: "valid" | "review" | "invalid" | "pending";
      uploaded_at: string;
      validation_note?: string;
      parameters?: any[];
    };
    report: {
      stage?: string;
      updated?: boolean;
      biological_age_available?: boolean;
      [key: string]: any;
    } | null;
    biological_age?: {
      available?: boolean;
      missing?: string[];
      needs?: string[];
      reason?: string | null;
    };
  }> {
    console.log("📤 Uploading blood report file:", file.name);

    // Validate size (10 MB max)
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("File exceeds 10 MB limit. Please upload a smaller file.");
    }

    // Determine and validate MIME type
    const fileName = file.name.toLowerCase();
    let mimeType = file.type;
    if (!mimeType) {
      if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (fileName.endsWith(".png")) mimeType = "image/png";
    }

    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedMimes.includes(mimeType)) {
      throw new Error("Unsupported file format. Please upload your complete laboratory report as a JPG, JPEG, PNG, or PDF file.");
    }

    const normalizedBlob = file.type === mimeType ? file : new Blob([file], { type: mimeType });
    const formData = new FormData();
    formData.append("file", normalizedBlob, file.name);

    try {
      await auth.authStateReady();
      let authToken: string | null = null;
      if (auth.currentUser) {
        authToken = await auth.currentUser.getIdToken(true);
        this.token = authToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 105000);

      const url = `${BLOOD_REPORT_API_BASE_URL}/blood-reports`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (response.status === 200 || response.status === 201) {
        console.log("✅ Blood report uploaded:", data);
        return data;
      }

      const errorMsg = data.error || data.message;
      const error = new Error(
        response.status === 400
          ? errorMsg || "Invalid blood report. Please verify your file and try again."
          : response.status === 401
          ? "Your session has expired. Please sign in again."
          : response.status === 404
          ? "Patient profile not found. Please complete signup first."
          : response.status === 429
          ? "Upload limit reached. Please wait a moment before trying again."
          : response.status === 500 || response.status === 503
          ? "Server is temporarily unavailable. Please try again later."
          : errorMsg || `Upload failed: ${response.status}`
      );
      (error as any).status = response.status;
      throw error;
    } catch (error: any) {
      if (error.name === "AbortError") {
        const timeoutErr = new Error("Upload request timed out after 100 seconds while reading the report. Please check your upload history before trying again.");
        (timeoutErr as any).isTimeout = true;
        (timeoutErr as any).status = 408;
        throw timeoutErr;
      }
      console.error("Upload error:", error);
      throw error;
    }
  }

  /**
   * Backward-compatible uploadReport
   */
  async uploadReport(file: File): Promise<any> {
    return await this.uploadBloodReport(file);
  }

  /**
   * Get blood reports info and validation specs
   * GET /api/v2/blood-reports/info
   */
  async getBloodReportsInfo(): Promise<{
    accepted_formats: string[];
    max_bytes: number;
    biological_age_needs: string[];
    statuses: Record<string, string>;
    validity_days: number;
  }> {
    return await this.request("/blood-reports/info", {}, "blood_report");
  }

  /**
   * Backward-compatible getUploadTypes
   */
  async getUploadTypes(): Promise<any> {
    return await this.getBloodReportsInfo();
  }

  /**
   * Get all blood reports for logged-in user
   * GET /api/v2/blood-reports/me
   */
  async getMyBloodReports(): Promise<{
    blood_reports: Array<{
      blood_report_id: number;
      original_filename: string;
      lab_name: string | null;
      report_date: string | null;
      uploaded_at: string;
      status: "valid" | "review" | "invalid" | "pending";
      validation_note?: string;
      parameters_read?: number;
      parameters?: any[];
    }>;
    biological_age?: {
      available?: boolean;
      missing?: string[];
      needs?: string[];
      reason?: string | null;
    };
  }> {
    return await this.request("/blood-reports/me", {}, "blood_report");
  }

  /**
   * Backward-compatible getMyUploads
   */
  async getMyUploads(): Promise<any> {
    const data = await this.getMyBloodReports();
    return {
      uploads: (data.blood_reports || []).map((br) => ({
        upload_id: br.blood_report_id,
        patient_id: 0,
        filename: br.original_filename,
        original_filename: br.original_filename,
        file_path: `/blood-reports/${br.blood_report_id}/file`,
        file_url: `${BLOOD_REPORT_API_BASE_URL}/blood-reports/${br.blood_report_id}/file`,
        file_size: 0,
        file_type: "application/pdf",
        report_type: "blood_report",
        description: br.original_filename,
        uploaded_at: br.uploaded_at,
        status: br.status,
        validation_note: br.validation_note,
      })),
    };
  }

  /**
   * Delete uploaded blood report
   * DELETE /api/v2/blood-reports/:id
   */
  async deleteBloodReport(bloodReportId: number | string): Promise<{ message: string }> {
    return await this.request(`/blood-reports/${bloodReportId}`, {
      method: "DELETE",
    }, "blood_report");
  }

  /**
   * Backward-compatible deleteUpload
   */
  async deleteUpload(uploadId: number | string): Promise<{ message: string }> {
    return await this.deleteBloodReport(uploadId);
  }

  /**
   * Retry processing blood report
   * POST /api/v2/blood-reports/:id/retry
   */
  async retryBloodReport(bloodReportId: number | string): Promise<any> {
    return await this.request(
      `/blood-reports/${bloodReportId}/retry`,
      {
        method: "POST",
      },
      "blood_report",
    );
  }

  /**
   * Backward-compatible processReport
   */
  async processReport(uploadId: number | string): Promise<any> {
    return await this.retryBloodReport(uploadId);
  }

  /**
   * Fetch blood report file blob
   * GET /api/v2/blood-reports/:id/file
   */
  async getBloodReportFileBlob(bloodReportId: number | string): Promise<Blob> {
    await auth.authStateReady();
    let authToken = this.token;
    if (!authToken && auth.currentUser) {
      authToken = await auth.currentUser.getIdToken();
      this.token = authToken;
    }

    const response = await fetch(`${BLOOD_REPORT_API_BASE_URL}/blood-reports/${bloodReportId}/file`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized or expired session");
      }
      if (response.status === 404) {
        throw new Error("Blood report file not found (404)");
      }
      throw new Error(`Failed to fetch report file: ${response.status}`);
    }

    return await response.blob();
  }

  /**
   * Fetch a file (either signed URL or authenticated backend endpoint)
   */
  async getFileBlob(urlOrPath: string, uploadId?: number): Promise<Blob> {
    if (uploadId) {
      return await this.getBloodReportFileBlob(uploadId);
    }

    const isSignedUrl = urlOrPath.startsWith("http");
    if (isSignedUrl) {
      try {
        const response = await fetch(urlOrPath);
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            throw new Error("Expired or unauthorized file URL");
          }
          if (response.status === 404) {
            throw new Error("File not found (404)");
          }
          throw new Error(`API error: ${response.status}`);
        }
        return await response.blob();
      } catch (error) {
        console.error("File fetch error:", error);
        throw error;
      }
    } else {
      throw new Error("Invalid file URL or path provided");
    }
  }

  // ===== Appointment APIs =====

  /**
   * Create a new appointment
   * POST /api/v2/appointments
   * NOTE: Update endpoint/payload when backend developer provides exact spec.
   */
  async createAppointment(data: {
    appointment_date: string; // ISO date string e.g. "2024-12-25"
    appointment_time?: string; // e.g. "10:30"
    appointment_type: string; // e.g. "General", "Follow-up", "Screening"
    centre?: string;
    doctor_name?: string;
    notes?: string;
  }): Promise<{ message: string; appointment: Appointment }> {
    return await this.request<{ message: string; appointment: Appointment }>(
      "/appointments",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      true,
    );
  }
}

export const apiService = new ApiService();
export default apiService;
