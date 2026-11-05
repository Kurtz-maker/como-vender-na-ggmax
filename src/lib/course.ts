import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Block =
  | { type: "text"; body: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "warning"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "link"; label: string; url: string }
  | { type: "image"; url: string | null; caption?: string }
  | { type: "video"; url: string }
  | { type: "code"; text: string };

export type Hero = { badge?: string; title: string; subtitle: string; image_url: string | null };
export type Faq = { q: string; a: string; support?: boolean; access?: boolean }[];
export type Support = { url: string | null; label?: string };

export const formatPrice = (cents: number | null) =>
  cents == null ? null : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const landingQuery = queryOptions({
  queryKey: ["landing"],
  queryFn: async () => {
    const [settings, plans, modules, outline] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("plans").select("*").eq("active", true).order("slug"),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.rpc("lesson_outline"),
    ]);
    const map: Record<string, unknown> = Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value]));
    return {
      hero: (map["hero"] ?? null) as Hero | null,
      faq: (map["faq"] ?? []) as Faq,
      support: (map["support"] ?? null) as Support | null,
      plans: plans.data ?? [],
      modules: modules.data ?? [],
      outline: outline.data ?? [],
    };
  },
});

export const studentQuery = queryOptions({
  queryKey: ["student"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const [profile, enrollments, roles, modules, outline, progress, lessons] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("enrollments").select("*").eq("user_id", uid),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.rpc("lesson_outline"),
      supabase.from("lesson_progress").select("*").eq("user_id", uid),
      supabase.from("lessons").select("id"),
    ]);
    const isAdmin = (roles.data ?? []).some((r) => r.role === "admin");
    const active = (enrollments.data ?? []).filter((e) => e.status === "active");
    const plan = isAdmin || active.some((e) => e.plan === "pro") ? "pro" : active.length ? "basic" : null;
    return {
      user: u.user!,
      profile: profile.data,
      isAdmin,
      plan: plan as "basic" | "pro" | null,
      modules: modules.data ?? [],
      outline: (outline.data ?? []).sort((a, b) => a.sort_order - b.sort_order),
      progress: progress.data ?? [],
      accessible: new Set((lessons.data ?? []).map((l) => l.id)),
    };
  },
});

export const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*, modules(title, sort_order)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
