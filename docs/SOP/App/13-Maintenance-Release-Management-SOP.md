# SOP-LIV-13: App Maintenance and Release Management

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the build, release, and maintenance process for the LIV Patient Application.

---

## 2. Tech Stack Versions (at audit date)

| Package | Version |
|---|---|
| React | 18.3.1 |
| TanStack Router | 1.170.46 |
| TanStack Start | 1.168.60 |
| TanStack Query | 5.101.1 |
| Vite | 7.3.6 |
| TypeScript | 5.8.3 |
| Tailwind CSS | 4.2.1 |
| Firebase | 10.8.0 |
| Capacitor | 6.2.2 |
| Vercel AI SDK (`ai`) | (see package.json) |
| pdfjs-dist | 4.10.38 |

---

## 3. Build Commands

| Command | Action |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:8080` with HMR |
| `npm run build` | Production build to `.output/` |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npx vite preview` | Preview production build locally |
| `npx nitro deploy --prebuilt` | Deploy to configured cloud (Cloudflare Workers / Vercel) |

---

## 4. Environment Configuration

All environment variables are prefixed `VITE_` for client exposure. Required variables:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=
VITE_BLOOD_REPORT_API_BASE_URL=
VITE_FEATURE_API_BASE_URL=
```

> **Security:** These environment variables are bundled into the client JavaScript at build time (Vite `import.meta.env`). Firebase API keys are designed to be public; they are protected by Firebase Security Rules. Backend API URLs should not expose internal infrastructure details.

---

## 5. Git Workflow

The project is connected to [Lovable](https://lovable.dev). The `AGENTS.md` rule states:

> **Avoid rewriting published git history** — no force pushing, rebasing/amending/squashing commits already pushed. Commits push to `main` and sync back to Lovable.

Branch: `main`. All changes are committed directly to `main`.

---

## 6. Known Pre-Existing TypeScript Errors (do not introduce more)

At audit date, `npx tsc --noEmit` reports 14 errors, all pre-existing:

| File | Error | Notes |
|---|---|---|
| `src/components/BookVisit.tsx` | Property `due` not in union type | Pre-existing type narrowing issue |
| `src/components/notification-bell.tsx` | `post` not in `ApiService` / duplicate key | Pre-existing |
| `src/lib/push-notifications.ts` | `PushNotificationSchema` missing `data` | Pre-existing |
| `src/routes/api/adaptive/$.ts` | `server` not in route type, implicit `any` | Framework compat |
| `src/routes/api/chat.ts` | Same as above | Framework compat |
| `src/routes/api/proxy-pdf.ts` | Same as above | Framework compat |
| `src/routes/liv.tsx` | `"loader"` / `"rotate-cw"` not in icon name union | Pre-existing |
| `src/routes/sitemap[.]xml.ts` | `server` not in route type | Framework compat |

None of these block the build. They must not increase in count across releases.

---

## 7. Code Architecture Notes for Maintainers

### 7.1 Single-File Component Risk

`src/routes/liv.tsx` is approximately 7 500 lines containing the entire LIV app. Future work should split this into:
- Auth screens (Splash, SignUp, SignIn, Welcome)
- Main view tabs (Home, Markers, Plan, Care)
- Sheet components
- Data hooks

### 7.2 Demo vs Production Toggle

`demoHasReport` defaults to `true` for the unauthenticated prototype preview. When `session` is present, `hasReport` is computed from `totalReportCount` only. Never set `demoHasReport = true` in a production-only build without understanding the demo/session logic.

### 7.3 Adding New Icons

LivIcon accepts only names in the `LIV_ICONS` const (defined in `src/components/liv.tsx`). Adding a new icon requires adding it to `LIV_ICONS` and updating the `LivIconName` type.

### 7.4 Adding New Sheets

New sheets must be added as new `{activeSheet === "name" && ...}` blocks inside the sheet scrim container in `liv.tsx`. The existing `handleAction` dispatcher handles `sheet:*` actions generically via `setActiveSheet(parts.slice(1).join(":"))` — no dispatcher changes needed for new sheet names.

---

## 8. Release Checklist

Before each release:

- [ ] `npx tsc --noEmit` returns no more than 14 errors (pre-existing count)
- [ ] `npm run build` succeeds with no errors
- [ ] Demo hardcoded values confirmed: streak=6, XP=288, start date, re-test date reviewed for accuracy
- [ ] `demoHasReport` behaviour confirmed correct for real users (session-present path uses API only)
- [ ] AI preset questions use real marker data (no hardcoded patient values)
- [ ] No new PII written to localStorage
- [ ] Video placeholders reviewed — are any videos ready to replace them?
- [ ] `.env` variables documented and not committed to git

---

*End of SOP-LIV-13.*
