import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/upload-report")({
  head: () => ({
    meta: [
      { title: "Upload Health Report | Aaha Companion" },
      { name: "description", content: "Upload your health screening report to Kiosk database" },
    ],
  }),
  component: UploadReportPage,
});

function UploadReportPage() {
  return (
    <Screen>
      <TopBar title="Upload Report" subtitle="Add to Kiosk Database" />
      <RequireAuth message="Sign in to upload health reports.">
        <UploadReportForm />
      </RequireAuth>
    </Screen>
  );
}

function UploadReportForm() {
  const { patient } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [awisScore, setAwisScore] = useState("");
  const [riskLevel, setRiskLevel] = useState<"low" | "moderate" | "high">("moderate");
  
  // Vitals
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  
  // Conditions
  const [conditions, setConditions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to meters
    if (w && h && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!awisScore || parseFloat(awisScore) < 0 || parseFloat(awisScore) > 100) {
      toast.error("Please enter valid AWIS score (0-100)");
      return;
    }

    setLoading(true);

    try {
      // Prepare conditions array
      const conditionsArray = conditions
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Prepare recommendations array
      const recommendationsArray = recommendations
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      // Prepare report data
      const reportData: any = {};
      
      if (bloodPressure) reportData.blood_pressure = bloodPressure;
      if (heartRate) reportData.heart_rate = parseInt(heartRate);
      if (weight) reportData.weight = parseFloat(weight);
      if (height) reportData.height = parseFloat(height);
      if (temperature) reportData.temperature = parseFloat(temperature);
      if (spo2) reportData.spo2 = parseInt(spo2);
      if (notes) reportData.notes = notes;
      
      const bmi = calculateBMI();
      if (bmi) reportData.bmi = parseFloat(bmi);
      
      reportData.test_date = new Date().toISOString().split('T')[0];

      // Call backend API
      const response = await apiService.createReport({
        awis_score: parseFloat(awisScore),
        prediction: {
          risk_level: riskLevel,
          conditions: conditionsArray.length > 0 ? conditionsArray : undefined,
          recommendations: recommendationsArray.length > 0 ? recommendationsArray : undefined,
        },
        report_data: reportData,
      });

      toast.success("Report uploaded successfully!", {
        description: `Report ID: ${response.report.report_id}`,
      });

      console.log("✅ Report created:", response.report);

      // Navigate to reports page
      setTimeout(() => {
        navigate({ to: "/reports" });
      }, 1500);

    } catch (error) {
      console.error("Failed to upload report:", error);
      toast.error("Failed to upload report", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <Section>
        <Card className="text-center">
          <Icon name="error" className="text-[32px] text-destructive" />
          <p className="mt-2 text-sm font-bold">Patient profile not found</p>
          <p className="text-xs text-muted-foreground">
            Please complete your profile first
          </p>
        </Card>
      </Section>
    );
  }

  return (
    <>
      <Section>
        <Card className="bg-accent/30">
          <div className="flex items-center gap-3">
            <Icon name="upload" className="text-[24px] text-primary" />
            <div>
              <p className="text-sm font-bold">Upload to Kiosk Database</p>
              <p className="text-xs text-muted-foreground">
                Patient: {patient.full_name} (ID: {patient.patient_id})
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Health Report Details">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AWIS Score */}
          <Card>
            <label className="text-xs font-semibold text-muted-foreground">
              AWIS Score * (0-100)
            </label>
            <input
              type="number"
              value={awisScore}
              onChange={(e) => setAwisScore(e.target.value)}
              placeholder="75.5"
              min="0"
              max="100"
              step="0.1"
              required
              className="mt-2 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
            />
          </Card>

          {/* Risk Level */}
          <Card>
            <label className="text-xs font-semibold text-muted-foreground">
              Risk Level *
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["low", "moderate", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  className={`rounded-xl py-3 text-sm font-bold transition ${
                    riskLevel === level
                      ? level === "low"
                        ? "bg-green-500/20 text-green-700 ring-2 ring-green-500"
                        : level === "moderate"
                          ? "bg-amber-500/20 text-amber-700 ring-2 ring-amber-500"
                          : "bg-red-500/20 text-red-700 ring-2 ring-red-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </Card>

          {/* Vital Signs */}
          <Card>
            <h3 className="mb-3 text-sm font-bold">Vital Signs</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Blood Pressure</label>
                  <input
                    type="text"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="72"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    step="0.1"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {calculateBMI() && (
                <div className="rounded-lg bg-accent/50 p-2 text-xs">
                  <span className="text-muted-foreground">BMI: </span>
                  <span className="font-semibold">{calculateBMI()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Temperature (°F)</label>
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="98.6"
                    step="0.1"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    min="0"
                    max="100"
                    className="mt-1 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Conditions */}
          <Card>
            <label className="text-xs font-semibold text-muted-foreground">
              Detected Conditions (comma-separated)
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Hypertension, Diabetes"
              className="mt-2 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty if no conditions detected
            </p>
          </Card>

          {/* Recommendations */}
          <Card>
            <label className="text-xs font-semibold text-muted-foreground">
              Recommendations (one per line)
            </label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Regular monitoring needed&#10;Exercise daily for 30 minutes&#10;Reduce salt intake"
              rows={4}
              className="mt-2 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Card>

          {/* Notes */}
          <Card>
            <label className="text-xs font-semibold text-muted-foreground">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations or notes..."
              rows={3}
              className="mt-2 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Card>

          {/* Submit Button */}
          <div className="sticky bottom-4 space-y-3 pt-4">
            <Btn
              type="submit"
              disabled={loading}
              icon={loading ? "progress_activity" : "upload"}
              className={loading ? "animate-pulse" : ""}
            >
              {loading ? "Uploading to Kiosk..." : "Upload Report to Kiosk"}
            </Btn>
            <Btn
              type="button"
              variant="outline"
              icon="cancel"
              onClick={() => navigate({ to: "/reports" })}
              disabled={loading}
            >
              Cancel
            </Btn>
          </div>
        </form>
      </Section>
    </>
  );
}
