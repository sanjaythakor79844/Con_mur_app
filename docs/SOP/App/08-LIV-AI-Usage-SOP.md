# SOP-LIV-08: LIV AI Usage

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the AI companion ("Liv") chat interface as implemented. Source files: `src/routes/liv.tsx` (Ask Liv sheet, `askLiv`, `livPresetQuestions`), `src/routes/api/chat.ts`, `src/routes/api/adaptive/$.ts`.

---

## 2. AI Provider

The app uses **Vercel AI SDK** (`@ai-sdk/react`) with `useChat` and `DefaultChatTransport`. Messages are sent to `POST /api/chat` (a TanStack Start server-side route). The actual model and provider are configured server-side and not visible in the client code.

---

## 3. Ask Liv Sheet

Accessible via:
- FAB "Ask Liv" button (visible only when `hasReport = true`)
- "Ask Liv about this" button on marker detail screen
- Preset question chips in the chat

### 3.1 Layout

- Header: "Your AI companion / Liv" with close button
- Scroll area: conversation bubbles (`.bub.liv` for AI, `.bub.me` for patient)
- Input row: text input + send button (Enter key or tap)
- Greeting: "Hi [firstName]. I'm Liv, your longevity companion."

### 3.2 Preset Questions

Computed dynamically by `livPresetQuestions` (useMemo, defined in component scope). Questions use real values:

| Question | Real data used |
|---|---|
| Bio age question | `verifiedBiologicalAge`, `verifiedBiologicalAgeDiff` |
| Priority focus | `recordedPriorityMarkers` names |
| HbA1c question | `hba1c` marker value and status |
| TSH question | `tsh` marker value and status |
| Next appointment | Directs to Care tab (no hardcoded dates) |

When data is not available, generic questions substitute without any hardcoded values.

Preset chips are shown only when `chatDisplayItems` is empty (no prior conversation).

---

## 4. `askLiv(question, legacyAnswer)` Function

```typescript
const askLiv = (q: string, _legacyAns?: string | (() => string)) => {
  const text = q.trim();
  if (!text || chatBusy) return;
  void sendAiMessage({ text });
};
```

The `_legacyAns` parameter (second argument) is accepted for backwards compatibility but ignored — the app always sends to the real AI backend.

When called from marker detail ("Ask Liv about this"):
```typescript
askLiv(`Tell me about my ${marker.n} of ${marker.v} ${marker.u}`, marker.m);
```
The marker meaning (`marker.m`) was previously used as a preset answer. It is now ignored; the AI backend generates the response.

---

## 5. Server-Side API Route (`/api/chat`)

Located at `src/routes/api/chat.ts`. Accepts the AI SDK message stream. The route forwards messages to the configured AI gateway.

> **⚠️ Note:** The route file has pre-existing TypeScript errors (`server` property not in type). This is a framework compatibility issue with TanStack Start's route type definitions and does not affect runtime behaviour.

---

## 6. Adaptive AI Route (`/api/adaptive/$`)

Located at `src/routes/api/adaptive/$.ts`. This appears to be a secondary AI endpoint for adaptive health recommendations. It has the same pre-existing TypeScript errors. Its integration with the main Liv AI chat is not confirmed from the client-side code.

---

## 7. AI Safety Disclaimers

The app includes these disclaimers in context:
- Marker detail "About this result" card: "This is information, not a diagnosis. Ask your doctor what it means for you."
- LivLearn topic sections: "General information, not medical advice. Wording is pending physician sign-off."
- Age sheet heading: "not a diagnosis" in copy

> **⚠️ CLINICAL NOTE:** The AI chat does not have guardrails visible in client code. The safety of AI responses is entirely dependent on the server-side model configuration and system prompt, which are not audited here.

---

## 8. Chat State

`chatDisplayItems` — derived from `useChat` messages, formatted for display. `chatBusy` — true while AI is generating. `chatInput` — controlled input string. Chat state does not persist across page reloads (session storage is not used).

---

## 9. Mock / Incomplete Items

| Item | Status |
|---|---|
| Chat persistence across page reloads | ❌ Not persisted |
| Specific AI model identity | ❌ Not visible in client code |
| System prompt content | ❌ Server-side, not audited |
| AI response clinical guardrails | ❌ Not verifiable from client code |
| Adaptive AI route integration | ⚠️ Present but integration with Liv chat not confirmed |

---

*End of SOP-LIV-08.*
