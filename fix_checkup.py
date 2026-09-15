import sys
import re

content = open('src/routes/checkup.tsx').read()

# 1. Fix Resume Block
old_resume_pattern = r'const resumed = useRef\(false\);\s*useEffect\(\(\) => \{.*?\}\, \[active\, savedReadings\, state\]\);'
new_resume_block = """  const resumed = useRef(false);
  useEffect(() => {
    const stored = active?.screening;
    if (resumed.current || !stored || state) return;
    const storedState = stored.state as unknown as ConversationState | null;
    if (!storedState?.session_id) return;
    resumed.current = true;
    setScreeningId(stored.id);
    void run(async () => {
      // The answer row is written before the screening state update. If a
      // refresh catches that small window, recover the canonical answers too.
      const savedAnswers = {} as Record<string, string>;
      for (const a of active?.answers ?? []) savedAnswers[a.question_id] = a.answer;

      const data = await call("resume", {
        state: {
          ...storedState,
          answers: { ...savedAnswers, ...(storedState.answers ?? {}) },
          readings: { ...(storedState.readings ?? {}), ...savedReadings },
        },
      });
      // Rebuild the transcript from the stored answers, including the questions Aaha asked.
      const history: Turn[] = [
        {
          role: "aaha",
          text: "Tell me in your own words what is troubling you. I'll ask a few questions, look at any recent reports you have, and explain what it all means.",
        },
        { role: "user", text: stored.complaint },
      ];
      for (const a of active?.answers ?? []) {
        if (a.question_text) history.push({ role: "aaha", text: a.question_text });
        history.push({ role: "user", text: a.answer });
      }
      setTurns(history);
      apply(data);
    });
  }, [active, savedReadings, state]);"""

content = re.sub(old_resume_pattern, new_resume_block, content, flags=re.DOTALL)

# 2. Add persistState calls to actions
# answerConsentGate
content = content.replace(
    'const data = await call("reports_consent", { state, has_reports: hasReports });\n      apply(data, hasReports ? "Yes, I have some of them" : "No, I don\\'t have these reports");',
    'const data = await call("reports_consent", { state, has_reports: hasReports });\n      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });\n      apply(data, hasReports ? "Yes, I have some of them" : "No, I don\'t have these reports");'
)

# skipReport
content = content.replace(
    'if (reading) await storeReading(deviceId, reading);\n      apply(data, `I don\\'t have my ${step.device_name} report`);',
    'if (reading) await storeReading(deviceId, reading);\n      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });\n      apply(data, `I don\'t have my ${step.device_name} report`);'
)

# submitManual
content = content.replace(
    'if (reading) await storeReading(deviceId, reading);\n      apply(data, `${step.device_name}: ${numeric}`);',
    'if (reading) await storeReading(deviceId, reading);\n      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });\n      apply(data, `${step.device_name}: ${numeric}`);'
)

# uploadFile
content = content.replace(
    'if (reading) await storeReading(deviceId, reading);\n      apply(data, `Shared my ${step.device_name} report`);',
    'if (reading) await storeReading(deviceId, reading);\n      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });\n      apply(data, `Shared my ${step.device_name} report`);'
)

open('src/routes/checkup.tsx', 'w').write(content)
