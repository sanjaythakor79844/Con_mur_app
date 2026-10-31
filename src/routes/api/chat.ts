import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";

const SYSTEM_PROMPT = `You are Liv, the friendly and supportive longevity companion in the Liv Consumer App.

Voice and tone:
- You are Liv, not an assistant or AI. Speak naturally in first person. If asked who you are, say: "I'm Liv, your longevity companion. I'm here to help you understand your health and support your wellness journey."
- Be warm, clear, empathetic and conversational. Use simple, everyday language. Explain medical terms in plain words.
- Break long responses into short paragraphs (2-3 sentences each). Use headings (prefix with **) and bullet points (prefix with -) when helpful.
- Address the user directly and personally. Show you understand and care.

What you do:
- Help users understand their health results, what values mean, and practical next steps.
- Explain biomarkers, biological age, and AWIS scores using only the actual patient data provided.
- Never diagnose, never prescribe medicines or dosages. Guide users to consult their doctor for clinical decisions.
- If genuinely helpful, suggest one next step: a doctor consultation, uploading a report, or visiting an Aaha Health Centre. Never sound promotional.
- For emergency symptoms (chest pain, breathlessness, fainting, severe bleeding, stroke), tell them to seek emergency care immediately.

Response structure:
- Start with a brief, direct answer (1-2 sentences).
- Add context or explanation in a new paragraph.
- Use "**What does this mean?**" or "**What can you do?**" as section headings when appropriate.
- List multiple items with bullet points (use "- " prefix).
- Keep total response under 150 words unless the user asks for more detail.
- End with empathy: "I'm here to help you understand, one step at a time." or similar, when appropriate.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          console.error("[Gemini Stream Error]: Malformed request body", e);
          return new Response("Malformed request", { status: 400 });
        }

        const { messages } = body as any;
        const lang = body.language === "hi" ? "Hindi" : body.language === "mr" ? "Marathi" : "English";
        const reportContext = typeof body.reportContext === "string" ? body.reportContext.slice(0, 6000) : "";
        if (!Array.isArray(messages)) {
          console.error("[Gemini Stream Error]: Malformed request, messages array missing");
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.GROQ_API_KEY;
        if (!key) {
          console.error("[Groq Stream Error]: missing GROQ_API_KEY");
          return new Response("Error: GROQ_API_KEY is missing.", { status: 500 });
        }

        const groq = createGroq({ apiKey: key });
        const GROQ_MODEL = "openai/gpt-oss-20b";

        try {
          const result = streamText({
            model: groq(GROQ_MODEL),
            system: [
              SYSTEM_PROMPT,
              `Always reply in ${lang}, using simple everyday words.`,
              reportContext
                ? `Here are the person's saved report values. Use them when they ask about their results, and quote the exact value and range:\n${reportContext}`
                : "The person has no saved report values yet. If they ask about their report, invite them to upload it.",
            ].join("\n\n"),
            messages: (messages as any[]).map(m => ({
              role: m.role,
              content: m.content || (m.parts && m.parts[0]?.text) || ""
            })),
            onError: ({ error }) => {
              const msg = error instanceof Error ? error.message : String(error);
              if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
                console.error("[Groq Stream Error]: invalid API key - The provided GROQ_API_KEY was rejected.");
              } else if (msg.includes("quota") || msg.includes("429")) {
                console.error("[Groq Stream Error]: quota/rate limit - The Groq API key has run out of quota.");
              } else if (msg.includes("model") || msg.includes("not found")) {
                console.error(`[Groq Stream Error]: invalid/unavailable model - ${GROQ_MODEL} might not be available.`);
              } else if (msg.includes("timeout") || msg.includes("abort")) {
                console.error("[Groq Stream Error]: timeout - The Groq API took too long to respond.");
              } else {
                console.error("[Groq Stream Error]: Groq API error -", msg);
              }
            }
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as any[]
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error("[Groq Stream Error]: response streaming error -", msg);
          return new Response("An error occurred while communicating with the health companion.", { status: 500 });
        }
      },
    },
  },
});
