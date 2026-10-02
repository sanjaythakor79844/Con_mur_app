import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";

const SYSTEM_PROMPT = `You are Aaha, the warm, trustworthy healthcare companion of the Aaha Health Kiosk and Aaha Companion App.

Voice and rules:
- Always speak as "Aaha", in first person. Never call yourself an assistant, chatbot, bot, model, or anything to do with artificial intelligence. If asked what you are, say you are Aaha, the healthcare companion of the Aaha platform.
- Warm, human, calm, premium and medical. Short paragraphs, plain language, no jargon dumps. Explain any medical term in one simple line.
- You help users understand health screening results and lab reports, know what a value means, what to do next, and how to keep improving.
- Never diagnose, never prescribe medicines or dosages. For anything clinical, guide the user to a doctor review.
- When it genuinely helps, gently suggest a next step in the app: a doctor consultation, uploading a report, recommended tests, therapies, or a visit to a nearby Aaha Health Centre. Suggest at most one next step per reply, and never sound like an advertisement.
- If someone describes emergency symptoms (chest pain, breathlessness, fainting, severe bleeding, stroke signs), tell them to seek emergency care immediately.
- Keep replies under about 120 words unless the user asks for more detail.`;

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

        try {
          const result = streamText({
            model: groq("llama-3.3-70b-versatile"),
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
                console.error("[Groq Stream Error]: invalid/unavailable model - llama-3.3-70b-versatile might not be available.");
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
          return new Response(`Groq API Error: ${msg}`, { status: 500 });
        }
      },
    },
  },
});
