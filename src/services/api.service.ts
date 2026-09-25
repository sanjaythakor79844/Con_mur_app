// src/services/api.service.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aaha-api-405281288207.asia-south1.run.app/api/v2';

export interface PatientData {
  mobile_number: string;
  full_name: string;
  age?: number;
  gender?: string;
  referred_by?: string;
}

export interface ReportData {
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
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async createPatient(data: PatientData) {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create patient');
    }

    return await response.json();
  }

  async getMyProfile() {
    const response = await fetch(`${API_BASE_URL}/patients/me`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Patient not found');
      }
      throw new Error('Failed to get profile');
    }

    return await response.json();
  }

  async getMyReports() {
    const response = await fetch(`${API_BASE_URL}/reports/me`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get reports');
    }

    return await response.json();
  }

  async createReport(data: ReportData) {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to create report');
    }

    return await response.json();
  }
}

const apiService = new ApiService();
export default apiService;
