// Backend API Service
// Connects to Flask backend (DB_AHHA) for patient and report data

import { auth } from "@/lib/firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api/v2" : "https://aaha-api-405281288207.asia-south1.run.app/api/v2");

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
  appointment_id: string;
  patient_id: string;
  doctor_name?: string;
  speciality?: string;
  centre?: string;
  appointment_date: string;
  appointment_time?: string;
  slot_label?: string;
  appointment_type: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
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

  private async request<T>(endpoint: string, options: RequestInit = {}, useFeatureBackend = false): Promise<T> {
    const baseUrl = useFeatureBackend ? FEATURE_API_BASE_URL : API_BASE_URL;
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
    notes?: string;
  }): Promise<{ message: string; appointment: Appointment }> {
    return await this.request<{ message: string; appointment: Appointment }>(
      "/appointments",
      {
        method: "POST",
        body: JSON.stringify({
          ...data,
          booking_type: "general"
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
    return await this.request<{ appointments: Appointment[] }>("/appointments/me", {}, true);
  }

  /**
   * Get available appointment slots for a specific date
   * GET /api/v2/appointments/slots?date=YYYY-MM-DD
   */
  async getAppointmentSlots(date: string): Promise<{
    date: string;
    slots: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string;
      availableSlots: string[];
    }>;
  }> {
    return await this.request<{
      date: string;
      slots: Array<{
        doctorId: string;
        doctorName: string;
        specialty: string;
        availableSlots: string[];
      }>;
    }>(`/appointments/slots?date=${date}`, {}, true);
  }

  /**
   * Cancel an appointment
   * PUT /api/v2/appointments/:id/cancel
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

  // ===== File Upload APIs =====

  /**
   * Upload medical report file
   * POST /api/v2/uploads/upload
   */
  async uploadReport(
    file: File,
    reportType?: string,
    description?: string,
    deviceId?: string,
  ): Promise<{
    message: string;
    upload: {
      upload_id: number;
      patient_id: number;
      filename: string;
      original_filename: string;
      file_path: string;
      file_url?: string;
      file_size: number;
      file_type: string;
      report_type: string;
      description: string;
      uploaded_at: string;
      status?: string;
      validation_note?: string;
    };
  }> {
    console.log("📤 Uploading report file:", file.name);

    const formData = new FormData();
    formData.append("file", file);

    if (reportType) {
      formData.append("report_type", reportType);
    }

    if (description) {
      formData.append("description", description);
    }

    if (deviceId) {
      formData.append("device_id", deviceId);
    }

    try {
      const url = `${API_BASE_URL}/uploads`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          // Don't set Content-Type - browser will set it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Upload failed: ${response.status}`);
      }

      console.log("✅ Report uploaded:", data);
      return data;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  /**
   * Get dynamic upload types from backend
   * GET /api/v2/uploads/types
   */
  async getUploadTypes(): Promise<{
    accepted_formats: string[];
    max_bytes: number;
    types: Array<{ device_id: string; name: string; validity_days: number }>;
  }> {
    return await this.request("/uploads/types");
  }

  /**
   * Get all uploaded files for logged-in user
   * GET /api/v2/uploads/my-uploads
   */
  async getMyUploads(): Promise<{
    uploads: Array<{
      upload_id: number;
      patient_id: number;
      filename: string;
      original_filename: string;
      file_path: string;
      file_url?: string;
      file_size: number;
      file_type: string;
      report_type: string;
      description: string;
      uploaded_at: string;
      status?: string;
      validation_note?: string;
    }>;
  }> {
    return await this.request("/uploads/me");
  }

  /**
   * Delete uploaded file
   * DELETE /api/v2/uploads/:id
   */
  async deleteUpload(uploadId: number): Promise<{ message: string }> {
    return await this.request(`/uploads/${uploadId}`, {
      method: "DELETE",
    });
  }

  /**
   * Fetch a file (either signed URL or authenticated backend endpoint)
   */
  async getFileBlob(urlOrPath: string, uploadId?: number): Promise<Blob> {
    const isSignedUrl = urlOrPath.startsWith("http");
    const headers: Record<string, string> = {};

    if (isSignedUrl) {
      // Since it's a signed URL, no Authorization headers are needed
      try {
        const response = await fetch(urlOrPath, { headers });
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
    }

    else {
      throw new Error("BACKEND FILE RETRIEVAL MISSING. The backend API does not provide a file_url or a documented download endpoint.");
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
