import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useDisplayName, useOverview } from "@/hooks/use-overview";

import { BottomNav, FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { VoiceStatus } from "@/components/voice-status";
import { useVoiceChat } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

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

  const { latestAssessment } = useOverview();
  const hasAssessment = Boolean(latestAssessment);

  const { messages, sendMessage, status, setMessages } = useChat({
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

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
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://aaha-api-REDACTED_SENDER_ID.asia-south1.run.app/api/v2";
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

  const handleSend = () => {
    if (busy || uploading) return;
    if (file) {
      void sendReport(input);
      return;
    }
    if (input.trim()) {
      ask(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Screen
      nav={false}
      containerClassName="h-[100dvh] max-h-[100dvh] overflow-hidden"
      className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden"
    >
      <header className="shrink-0 z-20 flex items-center justify-between border-b border-border/70 bg-card/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="grid size-9 place-items-center rounded-full bg-muted text-foreground ml-2"
            aria-label="Go back"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold">{t("Ask Aaha")}</h1>
            <p className="text-[13px] text-muted-foreground">{t("Here to explain, anytime")}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-2 mr-2">
            <Link
              to="/checkup"
              className="h-8 px-3 rounded-full bg-accent text-[12px] font-semibold text-primary flex items-center gap-1.5 transition-colors hover:bg-accent/80 active:scale-95"
              title={t(hasAssessment ? "Do a new check-up" : "Start a guided check-up")}
            >
              <Icon name="favorite" className="text-[15px]" />
              <span>{t("Check-up")}</span>
            </Link>
            <button
              onClick={() => setMessages([])}
              className="h-8 px-3 rounded-full bg-muted text-[13px] font-semibold text-primary transition-colors hover:bg-muted/80 active:scale-95"
            >
              {t("New chat")}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col w-full relative pb-6">
        {messages.length === 0 && (
          <div className="px-5 pt-8 pb-3">
            <h2 className="text-[28px] font-bold leading-tight">
              {firstName ? `${t("Hello")} ${firstName},` : t("Hello,")}<br/>{t("I'm Aaha")}
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
              {t("Ask me anything about your health, your reports or your next steps.")}
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <Section className="pb-4">
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
            {!busy && messages.length > 0 && (
              <div className="mt-4">
                <Link
                  to="/checkup"
                  className="flex items-center gap-3.5 min-h-[64px] p-2.5 px-4 rounded-[22px] bg-card/90 border border-border w-full text-left transition-colors hover:border-primary shadow-xs active:scale-[0.99]"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-accent text-primary shrink-0">
                    <Icon name="favorite" className="text-[18px]" />
                  </span>
                  <span className="flex-1 flex flex-col min-w-0">
                    <span className="text-[15px] font-semibold text-foreground">
                      {t(hasAssessment ? "Do a new check-up" : "Start a guided check-up")}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {t("Aaha asks five short questions")}
                    </span>
                  </span>
                  <Icon name="chevron_right" className="text-muted-foreground shrink-0 text-[18px]" />
                </Link>
              </div>
            )}
          </Section>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col gap-2.5 mt-1 px-5 pb-4">
            <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">
              {t("Try asking")}
            </div>
            {['What can you help me with?', 'How does the Aaha score work?', 'What happens at a kiosk screening?'].map((s) => (
              <button
                key={s}
                type="button"
                className="text-left bg-card border border-border p-4 rounded-[20px] text-[15px] font-semibold flex justify-between items-center transition-colors hover:border-primary shadow-sm"
                onClick={() => ask(s)}
                disabled={busy}
              >
                <span>{t(s)}</span>
                <Icon name="chevron_right" className="text-muted-foreground text-[20px]" />
              </button>
            ))}

            {/* Guided Check-up card */}
            <Link
              to="/checkup"
              id="start-guided-checkup-card"
              className="flex items-center gap-3.5 min-h-[68px] p-2.5 px-4 rounded-[22px] bg-card border border-border w-full text-left transition-colors hover:border-primary shadow-sm mt-1 active:scale-[0.99]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-accent text-primary shrink-0">
                <Icon name="favorite" className="text-[20px]" />
              </span>
              <span className="flex-1 flex flex-col min-w-0">
                <span className="text-[16px] font-semibold text-foreground">
                  {t(hasAssessment ? "Do a new check-up" : "Start a guided check-up")}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {t("Aaha asks five short questions")}
                </span>
              </span>
              <Icon name="chevron_right" className="text-muted-foreground shrink-0 text-[20px]" />
            </Link>
          </div>
        )}
      </div>

      <div className="shrink-0 w-full px-3.5 sm:px-4 pt-1 pb-2 bg-background relative z-20">
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="rounded-[22px] border border-border/80 bg-card p-1.5 shadow-[0_2px_12px_-4px_rgba(36,27,31,0.08)] transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10"
        >
          {file ? (
            <div className="mx-1.5 mt-1 mb-1.5 flex items-center gap-2 rounded-[12px] bg-muted/80 px-3 py-1.5">
              <Icon name="description" className="text-[18px] text-primary shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{file.name}</span>
              <button
                type="button"
                aria-label="Remove attached report"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs font-semibold text-destructive hover:underline shrink-0"
              >
                {t("Remove")}
              </button>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            aria-label="Ask Aaha a question"
            placeholder={file ? t("Add a note about this report…") : t("Ask Aaha…")}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-none border-0 bg-transparent px-3 pt-2 pb-1 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60 shadow-none focus:ring-0 leading-normal min-h-[42px] max-h-[140px] block"
          />

          <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5">
            <div className="flex items-center gap-1.5">
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
                className="grid size-9 place-items-center rounded-full bg-muted/70 text-foreground/80 hover:bg-muted hover:text-foreground active:scale-95 transition-all disabled:opacity-50"
              >
                <Icon
                  name={uploading ? "progress_activity" : "attach_file"}
                  className={cn("text-[20px]", uploading && "animate-spin")}
                />
              </button>
              <button
                type="button"
                onClick={startVoice}
                aria-label={voice.listening ? t("voice.stop") : t("voice.tapToSpeak")}
                className={cn(
                  "grid size-9 place-items-center rounded-full transition-all active:scale-95",
                  voice.listening
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "bg-muted/70 text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon name={voice.listening ? "graphic_eq" : "mic"} className="text-[20px]" />
              </button>
            </div>

            <button
              type="submit"
              disabled={(!input.trim() && !file) || busy || uploading}
              aria-label={uploading ? "Uploading report" : busy ? "Sending message" : "Send message"}
              className={cn(
                "grid size-9 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              <Icon
                name={uploading ? "progress_activity" : busy ? "hourglass_empty" : "arrow_upward"}
                className={cn("text-[20px]", (uploading || busy) && "animate-spin")}
              />
            </button>
          </div>
        </form>
      </div>

      {/* Spacer to reserve exact height of the fixed bottom navigation */}
      <div className="shrink-0 h-[calc(74px+env(safe-area-inset-bottom))]" />
      <BottomNav />
    </Screen>
  );
}
