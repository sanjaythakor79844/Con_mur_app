import { useState, useEffect } from 'react';
import apiService, { PatientData, ReportData } from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export const usePatient = () => {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      loadPatientData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      if (token) {
        apiService.setToken(token);
      }

      // Load profile
      const profileRes = await apiService.getMyProfile();
      setPatient(profileRes.patient);

      // Load reports
      const reportsRes = await apiService.getMyReports();
      setReports(reportsRes.reports);

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const refreshReports = async () => {
    try {
      const reportsRes = await apiService.getMyReports();
      setReports(reportsRes.reports);
    } catch (err) {
      console.error('Error refreshing reports:', err);
    }
  };

  return {
    patient,
    reports,
    loading,
    error,
    refreshReports
  };
};
