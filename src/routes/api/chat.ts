import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";

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
        const body = (await request.json()) as {
          messages?: unknown;
          language?: unknown;
          reportContext?: unknown;
        };
        const { messages } = body;
        const lang =
          body.language === "hi" ? "Hindi" : body.language === "mr" ? "Marathi" : "English";
        const reportContext =
          typeof body.reportContext === "string" ? body.reportContext.slice(0, 6000) : "";
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: [
            SYSTEM_PROMPT,
            `Always reply in ${lang}, using simple everyday words.`,
            reportContext
              ? `Here are the person's saved report values. Use them when they ask about their results, and quote the exact value and range:\n${reportContext}`
              : "The person has no saved report values yet. If they ask about their report, invite them to upload it.",
          ].join("\n\n"),
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
