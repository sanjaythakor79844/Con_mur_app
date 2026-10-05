import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getReport, latestAnalysedReports, uploadReport } from "@/lib/aaha-api";
import { analyzeReport, runReportOcr } from "@/lib/report-ocr.functions";
import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-overview";

import { FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { VoiceStatus } from "@/components/voice-status";
import { useVoiceChat } from "@/hooks/use-voice";

export const Route = createFileRoute("/aaha")({
  head: () => ({
    meta: [
      { title: "Talk to Aaha | Aaha Companion" },
      {
        name: "description",
        content:
          "Ask Aaha about your reports, your screening result and what to do next — in your own words.",
      },
      { property: "og:title", content: "Talk to Aaha" },
      {
        property: "og:description",
        content: "Your friendly healthcare companion, always ready to explain.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    report: typeof search.report === "string" ? search.report : undefined,
  }),
  component: TalkToAaha,
});

const SUGGESTIONS = [
  "Explain my report",
  "Explain my thyroid result",
  "Why was Ferritin recommended?",
  "What should I do next?",
  "How can I improve my health?",
  "Explain my screening result",
  "Tell me about women's health",
  "What services are available at my nearest Aaha Health Centre?",
];

type ReportLike = {
  title: string;
  report_date: string;
  extracted_values: unknown;
  analysis: unknown;
};

function describeReport(r: ReportLike) {
  const values = Array.isArray(r.extracted_values)
    ? (r.extracted_values as { test_name: string; value: string; unit: string; status: string }[])
    : [];
  const summary =
    r.analysis && typeof r.analysis === "object" && "summary" in (r.analysis as object)
      ? String((r.analysis as { summary?: unknown }).summary ?? "")
      : "";
  return [
    `Report: ${r.title} (${new Date(r.report_date).toLocaleDateString()})`,
    values.length
      ? `Values: ${values.map((v) => `${v.test_name} ${v.value}${v.unit ? ` ${v.unit}` : ""} (${v.status})`).join("; ")}`
      : "",
    summary ? `Earlier explanation: ${summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function TalkToAaha() {
  const { firstName } = useDisplayName();
  const [input, setInput] = useState("");
  const [voiceTurn, setVoiceTurn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const spokenRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { report: reportId } = Route.useSearch();
  const { lang, t } = useI18n();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const ocr = useServerFn(runReportOcr);
  const analyse = useServerFn(analyzeReport);

  const focused = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReport(reportId as string),
    enabled: Boolean(reportId),
  });
  const recent = useQuery({
    queryKey: ["reports", "analysed"],
    queryFn: () => latestAnalysedReports(3),
    enabled: !reportId,
  });

  const reportContext = useMemo(() => {
    const list = focused.data ? [focused.data] : (recent.data ?? []);
    if (list.length === 0) return "";
    return list.map((r) => describeReport(r as unknown as ReportLike)).join("\n\n");
  }, [focused.data, recent.data]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { language: lang, reportContext } }),
    [lang, reportContext],
  );

  const voice = useVoiceChat(lang);

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) =>
      toast.error("Aaha couldn't reply just now", {
        description: error.message || "Please try again in a moment.",
      }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const ask = (text: string, fromVoice = false) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    setVoiceTurn(fromVoice);
    if (fromVoice) voice.stopSpeaking();
    void sendMessage({ text: value });
  };

  const last = messages[messages.length - 1];

  // Read Aaha's reply aloud as soon as it lands, when the turn started by voice.
  useEffect(() => {
    if (!voiceTurn || busy || !last || last.role !== "assistant") return;
    if (spokenRef.current === last.id) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (!text.trim()) return;
    spokenRef.current = last.id;
    voice.speak(text);
    // voice identity is stable per language; re-running on it would re-speak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceTurn, busy, last?.id, last?.role]);

  const startVoice = () => {
    if (!voice.supported) {
      toast.error(t("voice.unsupported"));
      return;
    }
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.startListening((text) => ask(text, true));
  };

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("That file is larger than 10 MB");
      return;
    }
    if (f.type && !ALLOWED.includes(f.type)) {
      toast.error("Please choose a JPG, PNG or PDF file");
      return;
    }
    setFile(f);
  };

  /** Uploads the attached report, reads it, then continues the conversation about it. */
  const sendReport = async (text: string) => {
    if (!file || uploading) return;
    if (!userId) {
      toast.error("Please sign in to share a report with Aaha");
      return;
    }
    const chosen = file;
    setUploading(true);
    try {
      const report = await uploadReport({
        userId,
        file: chosen,
        title: chosen.name.replace(/\.[^.]+$/, ""),
        category: "Lab reports",
        device_id: "general",
      });
      const url = report.file_url || report.file_path;
      if (url) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://aaha-api-405281288207.asia-south1.run.app/api/v2";
        const fullUrl = url.startsWith("http") ? url : apiBaseUrl.replace("/api/v2", "") + (url.startsWith("/") ? url : "/" + url);
        const res = await ocr({ data: { fileUrl: fullUrl } });
        if (res.ok && res.values && res.values.length > 0) {
          try {
            await analyse({ data: { values: res.values, language: lang, reportTitle: report.title, reportDate: report.created_at } });
          } catch {
            /* the values are saved even if the explanation fails */
          }
        }
      }
      await qc.invalidateQueries({ queryKey: ["reports"] });
      await qc.invalidateQueries({ queryKey: ["reports", "analysed"] });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      ask(
        text.trim() ||
          `I've uploaded my report "${report.title}". Please explain it in simple words.`,
      );
    } catch (e) {
      toast.error("Could not read that report", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (file) {
      void sendReport(message.text ?? input);
      return;
    }
    ask(message.text ?? input);
  };

  return (
    <Screen>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-card/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-col">
          <h1 className="text-[18px] font-bold">{t("Ask Aaha")}</h1>
          <p className="text-[13px] text-muted-foreground">{t("Here to explain, anytime")}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { /* qc.clear or something, let's just reload */ window.location.reload(); }} className="h-8 px-3 rounded-full bg-muted text-[13px] font-semibold text-primary">
            New chat
          </button>
        )}
      </header>

      {messages.length === 0 && (
        <div className="px-5 pt-8 pb-4">
          <h2 className="text-[28px] font-bold leading-tight">
            {firstName ? `Hello ${firstName},` : "Hello,"}<br/>I'm Aaha
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
            Ask me anything about your health, your reports or your next steps.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <Section>
          <Conversation className="relative w-full">
            <ConversationContent className="space-y-3 p-0">
              {messages.map((message) => {
                const text = message.parts
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");
                if (!text) return null;
                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "max-w-[85%] rounded-[24px] rounded-tr-sm bg-primary p-4 text-[15px] leading-relaxed text-primary-foreground shadow-sm self-end"
                          : "max-w-[85%] rounded-[24px] rounded-tl-sm bg-card border border-border p-4 text-[15px] leading-relaxed text-foreground shadow-sm self-start"
                      }
                    >
                      <MessageResponse>{text}</MessageResponse>
                    </MessageContent>
                  </Message>
                );
              })}
              {status === "submitted" && (
                <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-card p-4 text-sm shadow-soft">
                  <Shimmer>{voiceTurn ? t("voice.listening") : t("voice.thinking")}</Shimmer>
                </div>
              )}
            </ConversationContent>
          </Conversation>
        </Section>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col gap-2 mt-2 px-5">
          {['What can you help me with?', 'How does the Aaha score work?', 'What happens at a kiosk screening?'].map((s) => (
            <button
              key={s}
              type="button"
              className="text-left bg-card border border-border p-4 rounded-[20px] text-[15px] font-semibold flex justify-between items-center transition-colors hover:border-primary shadow-sm"
              onClick={() => ask(s)}
              disabled={busy}
            >
              <span>{s}</span>
              <Icon name="chevron_right" className="text-muted-foreground text-[20px]" />
            </button>
          ))}
        </div>
      )}

      <div className="h-40" />

      <div className="fixed bottom-20 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4">
        {voice.listening || voice.speaking ? (
          <div className="mb-2">
            <VoiceStatus
              state={voice.listening ? "listening" : "speaking"}
              label={voice.listening ? voice.interim || t("voice.tapToSpeak") : t("voice.speaking")}
              onStop={voice.listening ? voice.stopListening : voice.stopSpeaking}
              stopLabel={t("voice.stop")}
            />
          </div>
        ) : null}
        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card px-2 pt-1 shadow-lifted"
        >
          {file ? (
            <div className="mx-1 mt-1 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
              <Icon name="description" className="text-[18px] text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{file.name}</span>
              <button
                type="button"
                aria-label="Remove attached report"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs font-semibold text-destructive"
              >
                Remove
              </button>
            </div>
          ) : null}
          <PromptInputTextarea
            ref={textareaRef}
            aria-label="Ask Aaha a question"
            placeholder={file ? "Add a note about this report…" : "Ask Aaha…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-transparent text-sm"
          />
          <PromptInputFooter className="justify-between border-0 pb-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach a report"
                disabled={uploading}
                className="grid size-9 place-items-center rounded-full bg-muted text-primary disabled:opacity-60"
              >
                <Icon
                  name={uploading ? "progress_activity" : "attach_file"}
                  className={`text-[20px] ${uploading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={startVoice}
                aria-label={voice.listening ? t("voice.stop") : t("voice.tapToSpeak")}
                className={`grid size-9 place-items-center rounded-full ${
                  voice.listening ? "bg-brand text-primary-foreground" : "bg-muted text-primary"
                }`}
              >
                <Icon name={voice.listening ? "graphic_eq" : "mic"} className="text-[20px]" />
              </button>
            </div>
            <PromptInputSubmit
              status={uploading ? "submitted" : status}
              disabled={!input.trim() && !file && !busy}
              className="rounded-full bg-brand text-primary-foreground"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>


    </Screen>
  );
}
