import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Draft = Database["public"]["Tables"]["content_drafts"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentEvent = Database["public"]["Tables"]["payment_events"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type Gateway = Database["public"]["Tables"]["payment_gateways"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

export const BUCKET = "course-assets";
export const UPLOAD_FOLDER = "uploads";

/** Same-origin URL for an image stored in the course-assets bucket (served by the asset proxy). */
export const assetUrl = (path: string) => `/api/public/asset/${path}`;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const MAX_IMAGE_MB = 10;

export function checkImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error("Formato não aceito. Use PNG, JPG, WEBP, GIF ou SVG.");
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Imagem maior que ${MAX_IMAGE_MB} MB.`);
}

/** Uploads an image and returns the URL to store in content. */
export async function uploadCourseImage(file: File) {
  checkImage(file);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${UPLOAD_FOLDER}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return assetUrl(path);
}

export async function audit(action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  await supabase.from("audit_log").insert({ actor_id: uid, action, entity, entity_id: entityId, details: details as never });
}

export const adminDataQuery = queryOptions({
  queryKey: ["admin-data"],
  queryFn: async () => {
    const [payments, plans, coupons, gateways, events] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("slug"),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_gateways").select("*").order("created_at"),
      supabase.from("payment_events").select("*").order("created_at", { ascending: false }),
    ]);
    const err = payments.error ?? plans.error ?? coupons.error ?? gateways.error ?? events.error;
    if (err) throw err;
    return {
      payments: payments.data ?? [],
      plans: plans.data ?? [],
      coupons: coupons.data ?? [],
      gateways: gateways.data ?? [],
      events: events.data ?? [],
    };
  },
});

export const contentQuery = queryOptions({
  queryKey: ["admin-content"],
  queryFn: async () => {
    const [settings, modules, lessons, drafts, plans] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("modules").select("*").order("sort_order"),
      supabase.from("lessons").select("*").order("sort_order"),
      supabase.from("content_drafts").select("*").order("created_at"),
      supabase.from("plans").select("*").eq("active", true).order("slug"),
    ]);
    const err = settings.error ?? modules.error ?? lessons.error ?? drafts.error;
    if (err) throw err;
    return {
      settings: settings.data ?? [],
      modules: modules.data ?? [],
      lessons: lessons.data ?? [],
      drafts: drafts.data ?? [],
      plans: plans.data ?? [],
    };
  },
});

/** Save (or replace) the draft for one entity. Modules/lessons are keyed by their id; settings by name. */
export async function saveDraft(entity: string, entityId: string | null, payload: Record<string, unknown>, action = "upsert") {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  let del = supabase.from("content_drafts").delete().eq("entity", entity);
  del = entityId ? del.eq("entity_id", entityId) : del.is("entity_id", null);
  const { error: delErr } = await del;
  if (delErr) throw delErr;
  const { error } = await supabase
    .from("content_drafts")
    .insert({ entity, entity_id: entityId, payload: payload as never, action, created_by: uid });
  if (error) throw error;
}

type Sortable = { id: string; sort_order: number };
export type DraftLike = { entity: string; entity_id: string | null; action: string; payload: unknown };

/** Published rows with pending drafts applied (edits, new rows and deletions), sorted for display. */
export function mergeDrafts<T extends Sortable>(rows: T[], drafts: DraftLike[], entity: string) {
  const out = new Map<string, T & { _draft: boolean; _new: boolean }>();
  for (const r of rows) out.set(r.id, { ...r, _draft: false, _new: false });
  for (const d of drafts) {
    if (d.entity !== entity || !d.entity_id) continue;
    if (d.action === "delete") out.delete(d.entity_id);
    else {
      const prev = out.get(d.entity_id);
      out.set(d.entity_id, { ...(prev ?? ({} as T)), ...(d.payload as object), id: d.entity_id, _draft: true, _new: !prev || prev._new } as T & {
        _draft: boolean;
        _new: boolean;
      });
    }
  }
  return [...out.values()].sort((a, b) => a.sort_order - b.sort_order);
}

/** Site settings with pending drafts applied. */
export function mergeSettings(settings: { key: string; value: unknown }[], drafts: DraftLike[]) {
  const map: Record<string, unknown> = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  for (const d of drafts) {
    if (d.entity.startsWith("site_setting:")) map[d.entity.slice("site_setting:".length)] = (d.payload as { value: unknown }).value;
  }
  return map;
}
