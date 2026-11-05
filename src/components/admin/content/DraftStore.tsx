import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { discardDrafts, publishDrafts } from "@/lib/admin.functions";
import { mergeDrafts, mergeSettings, saveDraft, type DraftLike, type Lesson, type Module, type Plan } from "@/lib/admin";
import { buildLanding, type LandingData } from "@/lib/landing-content";

type ContentData = {
  settings: { key: string; value: unknown }[];
  modules: Module[];
  lessons: Lesson[];
  drafts: DraftLike[];
  plans: Plan[];
};
type Staged = { entity: string; entityId: string | null; payload: Record<string, unknown>; action: "upsert" | "delete" };
export type EditableModule = Module & { _draft: boolean; _new: boolean };
export type EditableLesson = Lesson & { _draft: boolean; _new: boolean };

const keyOf = (entity: string, id: string | null) => `${entity}|${id ?? ""}`;
const MODULE_FIELDS = ["title", "description", "image_url", "required_plan", "published", "sort_order"] as const;
const LESSON_FIELDS = ["module_id", "title", "summary", "content", "published", "sort_order", "is_free", "image_url"] as const;
const pick = (row: Record<string, unknown>, keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));

type Store = {
  settings: Record<string, unknown>;
  modules: EditableModule[];
  lessons: EditableLesson[];
  landing: LandingData;
  unsaved: number;
  pending: number;
  setSetting: (key: string, value: unknown) => void;
  putModule: (m: Partial<Module> & { id: string }) => void;
  removeModule: (id: string) => void;
  putLesson: (l: Partial<Lesson> & { id: string }) => void;
  removeLesson: (id: string) => void;
  saveAll: () => Promise<void>;
  publish: () => Promise<number>;
  discard: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
export const useDrafts = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDrafts outside DraftProvider");
  return c;
};

/**
 * Holds unsaved edits in memory, merges them over saved drafts and published content for editing and preview,
 * and flushes them to drafts (Salvar rascunho) or to the live course (Publicar).
 */
export function DraftProvider({ data, children }: { data: ContentData; children: ReactNode }) {
  const qc = useQueryClient();
  const publishFn = useServerFn(publishDrafts);
  const discardFn = useServerFn(discardDrafts);
  const [staged, setStaged] = useState<Record<string, Staged>>({});

  const effective = useMemo<DraftLike[]>(() => {
    const map = new Map<string, DraftLike>();
    for (const d of data.drafts) map.set(keyOf(d.entity, d.entity_id), d);
    for (const s of Object.values(staged)) map.set(keyOf(s.entity, s.entityId), { entity: s.entity, entity_id: s.entityId, action: s.action, payload: s.payload });
    return [...map.values()];
  }, [data.drafts, staged]);

  const settings = useMemo(() => mergeSettings(data.settings, effective), [data.settings, effective]);
  const modules = useMemo(() => mergeDrafts(data.modules, effective, "module") as EditableModule[], [data.modules, effective]);
  const lessons = useMemo(
    () => (mergeDrafts(data.lessons, effective, "lesson") as EditableLesson[]).filter((l) => modules.some((m) => m.id === l.module_id)),
    [data.lessons, effective, modules],
  );
  const landing = useMemo(() => {
    const live = modules.filter((m) => m.published);
    return buildLanding(settings, {
      plans: data.plans,
      modules: live,
      outline: lessons.filter((l) => l.published && live.some((m) => m.id === l.module_id)).map((l) => ({ id: l.id, module_id: l.module_id, sort_order: l.sort_order, title: l.title })),
    });
  }, [settings, modules, lessons, data.plans]);

  const stage = useCallback((s: Staged) => setStaged((prev) => ({ ...prev, [keyOf(s.entity, s.entityId)]: s })), []);

  const store: Store = {
    settings,
    modules,
    lessons,
    landing,
    unsaved: Object.keys(staged).length,
    pending: effective.length,
    setSetting: (key, value) => stage({ entity: `site_setting:${key}`, entityId: null, payload: { value }, action: "upsert" }),
    putModule: (m) => {
      const current = modules.find((x) => x.id === m.id) ?? {};
      stage({ entity: "module", entityId: m.id, payload: pick({ ...current, ...m }, MODULE_FIELDS), action: "upsert" });
    },
    removeModule: (id) => {
      stage({ entity: "module", entityId: id, payload: {}, action: "delete" });
      for (const l of lessons.filter((x) => x.module_id === id)) stage({ entity: "lesson", entityId: l.id, payload: {}, action: "delete" });
    },
    putLesson: (l) => {
      const current = lessons.find((x) => x.id === l.id) ?? {};
      stage({ entity: "lesson", entityId: l.id, payload: pick({ ...current, ...l }, LESSON_FIELDS), action: "upsert" });
    },
    removeLesson: (id) => stage({ entity: "lesson", entityId: id, payload: {}, action: "delete" }),
    saveAll: async () => {
      for (const s of Object.values(staged)) await saveDraft(s.entity, s.entityId, s.payload, s.action);
      setStaged({});
      await qc.invalidateQueries({ queryKey: ["admin-content"] });
    },
    publish: async () => {
      for (const s of Object.values(staged)) await saveDraft(s.entity, s.entityId, s.payload, s.action);
      setStaged({});
      const r = await publishFn();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-content"] }),
        qc.invalidateQueries({ queryKey: ["landing"] }),
        qc.invalidateQueries({ queryKey: ["student"] }),
      ]);
      return r.applied;
    },
    discard: async () => {
      setStaged({});
      await discardFn();
      await qc.invalidateQueries({ queryKey: ["admin-content"] });
    },
  };

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!Object.keys(staged).length) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [staged]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
