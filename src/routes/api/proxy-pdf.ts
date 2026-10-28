// src/routes/api/proxy-pdf.ts
// Proxy endpoint to stream Longevity Report PDFs safely to browser avoiding CORS restrictions
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/proxy-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const urlObj = new URL(request.url);
        const targetUrl = urlObj.searchParams.get("url");

        if (!targetUrl) {
          return new Response("Missing url query parameter", { status: 400 });
        }

        // Security check: Only allow storage.googleapis.com (Google Cloud Storage)
        let parsedTarget: URL;
        try {
          parsedTarget = new URL(targetUrl);
        } catch {
          return new Response("Invalid target URL", { status: 400 });
        }

        if (
          parsedTarget.hostname !== "storage.googleapis.com" &&
          !parsedTarget.hostname.endsWith(".googleusercontent.com")
        ) {
          return new Response("Unauthorized target hostname", { status: 403 });
        }

        try {
          // Direct fetch without client headers to preserve signed URL signature
          const upstream = await fetch(targetUrl);
          if (!upstream.ok) {
            return new Response(`Upstream storage returned status ${upstream.status}`, {
              status: upstream.status,
            });
          }

          const blob = await upstream.blob();
          return new Response(blob, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (err: any) {
          console.error("[PDF Proxy Error]:", err?.message || err);
          return new Response(`Failed to fetch upstream PDF: ${err?.message || "Unknown error"}`, {
            status: 502,
          });
        }
      },
    },
  },
});
