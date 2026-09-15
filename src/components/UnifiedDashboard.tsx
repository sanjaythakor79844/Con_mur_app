import React from 'react';
import { usePatient } from '../hooks/usePatient';

export default function UnifiedDashboard() {
  const { patient, reports, loading, error, refreshReports } = usePatient();

  if (loading) {
    return <div className="p-4 text-center">Loading patient data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Error: {error}</p>
        <button 
          onClick={refreshReports}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Welcome, {patient?.full_name || 'Patient'}</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Your Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-sm">Age</p>
            <p className="font-medium">{patient?.age || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Gender</p>
            <p className="font-medium capitalize">{patient?.gender || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-sm">Phone Number</p>
            <p className="font-medium">{patient?.mobile_number || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-semibold">Your Health Reports</h2>
          <button 
            onClick={refreshReports}
            className="text-sm text-blue-500 hover:underline"
          >
            Refresh
          </button>
        </div>
        
        {reports.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No reports found. Visit a kiosk to get assessed.</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div key={report.report_id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-lg text-blue-700">Report #{report.report_id}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">AWIS Score</p>
                    <p className="font-semibold">{report.awis_score}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Risk Level</p>
                    <p className={`font-semibold capitalize ${
                      report.prediction?.risk_level === 'high' ? 'text-red-600' :
                      report.prediction?.risk_level === 'moderate' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {report.prediction?.risk_level || 'Unknown'}
                    </p>
                  </div>
                </div>

                {report.prediction?.conditions && report.prediction.conditions.length > 0 && (
                  <div className="mb-2">
                    <strong className="text-sm text-gray-700">Conditions:</strong>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {report.prediction.conditions.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.prediction?.recommendations && report.prediction.recommendations.length > 0 && (
                  <div>
                    <strong className="text-sm text-gray-700">Recommendations:</strong>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {report.prediction.recommendations.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
