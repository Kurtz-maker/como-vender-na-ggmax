import { createFileRoute } from "@tanstack/react-router";

// Serves images from the private course-assets bucket through a same-origin URL,
// so the public landing page can display them without exposing storage internals.
export const Route = createFileRoute("/api/public/asset/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("course-assets").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=60",
          },
        });
      },
    },
  },
});
