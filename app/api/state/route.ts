import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * /api/state — SEA-CHART の localStorage 限定データ（ユーザー作成テンプレート等）を
 * アカウント(UUID)単位で共通テーブル sea_learning_kv にミラーする補完エンドポイント。
 * プロジェクト本体は /api/sea-chart/projects（sea_chart_projects）で別途同期済み。
 * UUID 以外は no-op、Supabase 失敗も soft fail（回帰ゼロ）。
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const TABLE = "sea_learning_kv";
const APP = "sea-chart";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || "";
  if (!UUID_RE.test(userId)) return Response.json({ state: {} });
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("key,value")
      .eq("user_id", userId)
      .eq("app", APP);
    if (error) throw error;
    const state: Record<string, unknown> = {};
    for (const row of data || []) {
      state[(row as { key: string }).key] = (row as { value: unknown }).value;
    }
    return Response.json({ state });
  } catch (e) {
    console.error("[sea-chart/state GET]", e);
    return Response.json({ state: {} });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const userId = String(body.user_id || "");
  if (!UUID_RE.test(userId)) return Response.json({ ok: true, skipped: "non-uuid" });

  const rawEntries =
    body.entries && typeof body.entries === "object" && !Array.isArray(body.entries)
      ? (body.entries as Record<string, unknown>)
      : body.key !== undefined
        ? { [String(body.key)]: body.value }
        : {};

  const now = new Date().toISOString();
  const upserts: Array<{ user_id: string; app: string; key: string; value: unknown; updated_at: string }> = [];
  const deletes: string[] = [];
  for (const [key, value] of Object.entries(rawEntries)) {
    if (value === null || value === undefined) deletes.push(key);
    else upserts.push({ user_id: userId, app: APP, key, value, updated_at: now });
  }

  try {
    const sb = getSupabaseAdmin();
    if (upserts.length) {
      const { error } = await sb.from(TABLE).upsert(upserts, { onConflict: "user_id,app,key" });
      if (error) throw error;
    }
    if (deletes.length) {
      const { error } = await sb
        .from(TABLE)
        .delete()
        .eq("user_id", userId)
        .eq("app", APP)
        .in("key", deletes);
      if (error) throw error;
    }
    return Response.json({ ok: true, upserted: upserts.length, deleted: deletes.length });
  } catch (e) {
    console.error("[sea-chart/state POST]", e);
    return Response.json({ ok: false }, { status: 200 }); // soft fail — localStorage が残る
  }
}
