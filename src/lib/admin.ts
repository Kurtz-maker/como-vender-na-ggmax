import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Draft = Database["public"]["Tables"]["content_drafts"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type Gateway = Database["public"]["Tables"]["payment_gateways"]["Row"];

/** Public URL for an image stored in the course-assets bucket (served via the asset proxy). */
export const assetUrl = (path: string | null | undefined) =>
  path ? (path.startsWith("http") ? path : `/api/public/asset/${path}`) : null;

export async function uploadCourseImage(file: File, folder = "uploads") {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Imagem maior que 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("course-assets").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function audit(action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  await supabase.from("audit_log").insert({ actor_id: uid, action, entity, entity_id: entityId, details });
}

export const adminDataQuery = queryOptions({
  queryKey: ["admin-data"],
  queryFn: async () => {
    const [payments, plans, coupons, gateways, drafts, events] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("slug"),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_gateways").select("*").order("created_at"),
      supabase.from("content_drafts").select("*").order("updated_at", { ascending: false }),
      supabase.from("payment_events").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      payments: payments.data ?? [],
      plans: plans.data ?? [],
      coupons: coupons.data ?? [],
      gateways: gateways.data ?? [],
      drafts: drafts.data ?? [],
      events: events.data ?? [],
    };
  },
});

export const contentQuery = queryOptions({
  queryKey: ["admin-content"],
  queryFn: async () => {
    const [settings, modules, lessons, drafts] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.from("lessons").select("*").order("sort_order"),
      supabase.from("content_drafts").select("*"),
    ]);
    return {
      settings: settings.data ?? [],
      modules: modules.data ?? [],
      lessons: lessons.data ?? [],
      drafts: drafts.data ?? [],
    };
  },
});

/** Save (or replace) a draft for an entity. entityId null = new entity or site setting. */
export async function saveDraft(entity: string, entityId: string | null, payload: Record<string, unknown>, action = "upsert") {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  let del = supabase.from("content_drafts").delete().eq("entity", entity);
  del = entityId ? del.eq("entity_id", entityId) : del.is("entity_id", null);
  await del;
  const { error } = await supabase
    .from("content_drafts")
    .insert({ entity, entity_id: entityId, payload, action, created_by: uid });
  if (error) throw error;
}

export async function removeDraft(id: string) {
  const { error } = await supabase.from("content_drafts").delete().eq("id", id);
  if (error) throw error;
}

type Sortable = { id: string; sort_order: number };

/** Merge base rows with pending drafts for preview/editing. */
export function mergeDrafts<T extends Sortable>(rows: T[], drafts: Draft[], entity: string) {
  let out = rows.map((r) => ({ ...r, _draft: false })) as (T & { _draft: boolean })[];
  for (const d of drafts.filter((d) => d.entity === entity)) {
    if (d.action === "delete") {
      out = out.filter((r) => r.id !== d.entity_id);
    } else if (d.entity_id) {
      out = out.map((r) => (r.id === d.entity_id ? ({ ...r, ...(d.payload as object), _draft: true } as T & { _draft: boolean }) : r));
    } else {
      out.push({ ...(d.payload as unknown as T), _draft: true });
    }
  }
  return out.sort((a, b) => a.sort_order - b.sort_order);
}
