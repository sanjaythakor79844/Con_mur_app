// Backend API Service
// Connects to Flask backend (DB_AHHA) for patient and report data

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v2';

export interface Patient {
  patient_id: number;
  mobile_number: string;
  full_name: string;
  age: number;
  gender: string;
  firebase_uid: string;
  created_at: string;
}

export interface Report {
  report_id: number;
  patient_id: number;
  awis_score: number;
  prediction: {
    risk_level: 'low' | 'moderate' | 'high';
    conditions?: string[];
    recommendations?: string[];
  };
  report_data?: {
    blood_pressure?: string;
    heart_rate?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    temperature?: number;
    spo2?: number;
    measurements?: {
      systolic?: number;
      diastolic?: number;
    };
    symptoms?: string[];
    test_date?: string;
    notes?: string;
    [key: string]: any;
  };
  created_at: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed: ${response.status}`);
      }

      return data as T;
    } catch (error) {
      console.error('API Error:', error);
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
    age: number;
    gender: string;
  }): Promise<{ message: string; patient: Patient }> {
    return await this.request<{ message: string; patient: Patient }>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get logged-in user's patient profile
   * GET /api/v2/patients/me
   */
  async getMyProfile(): Promise<{ patient: Patient }> {
    return await this.request<{ patient: Patient }>('/patients/me');
  }

  /**
   * Update logged-in user's patient profile
   * PUT /api/v2/patients/me
   */
  async updateMyProfile(data: Partial<{
    full_name: string;
    age: number;
    gender: string;
  }>): Promise<{ message: string; patient: Patient }> {
    return await this.request<{ message: string; patient: Patient }>('/patients/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ===== Reports APIs =====

  /**
   * Create new health report
   * POST /api/v2/reports
   */
  async createReport(data: {
    awis_score: number;
    prediction: {
      risk_level: 'low' | 'moderate' | 'high';
      conditions?: string[];
      recommendations?: string[];
    };
    report_data?: any;
  }): Promise<{ message: string; report: Report }> {
    return await this.request<{ message: string; report: Report }>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all reports for logged-in user
   * GET /api/v2/reports/me
   */
  async getMyReports(): Promise<{ reports: Report[] }> {
    return await this.request<{ reports: Report[] }>('/reports/me');
  }

  /**
   * Get specific report by ID
   * GET /api/v2/reports/:id
   */
  async getReport(reportId: number): Promise<{ report: Report }> {
    return await this.request<{ report: Report }>(`/reports/${reportId}`);
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
    }>
  }> {
    const endpoint = mobileFilter 
      ? `/admin/reports?mobile=${encodeURIComponent(mobileFilter)}`
      : '/admin/reports';
    
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
    }>('/health');
  }

  // ===== File Upload APIs =====

  /**
   * Upload medical report file
   * POST /api/v2/uploads/upload
   */
  async uploadReport(
    file: File, 
    reportType?: string, 
    description?: string
  ): Promise<{ 
    message: string; 
    upload: {
      upload_id: number;
      patient_id: number;
      filename: string;
      original_filename: string;
      file_path: string;
      file_size: number;
      file_type: string;
      report_type: string;
      description: string;
      uploaded_at: string;
    }
  }> {
    console.log('📤 Uploading report file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (reportType) {
      formData.append('report_type', reportType);
    }
    
    if (description) {
      formData.append('description', description);
    }

    try {
      const url = `${API_BASE_URL}/uploads/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          // Don't set Content-Type - browser will set it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Upload failed: ${response.status}`);
      }

      console.log('✅ Report uploaded:', data);
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
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
      file_size: number;
      file_type: string;
      report_type: string;
      description: string;
      uploaded_at: string;
    }>
  }> {
    return await this.request('/uploads/my-uploads');
  }

  /**
   * Delete uploaded file
   * DELETE /api/v2/uploads/:id
   */
  async deleteUpload(uploadId: number): Promise<{ message: string }> {
    return await this.request(`/uploads/${uploadId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
