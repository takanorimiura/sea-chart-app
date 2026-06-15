import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

// GET /api/sea-chart/projects?user_id=<uuid>&skill=ai
// ユーザー＋スキルのプロジェクト一覧（クロス端末で残る本体）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || "";
  const skill = searchParams.get("skill") || "";
  if (!UUID_RE.test(userId)) {
    // 未ログイン/UUIDでない場合は空（chart.html 側は localStorage にフォールバック）
    return Response.json({ projects: [] });
  }
  try {
    const sb = getSupabaseAdmin();
    let q = sb
      .from("sea_chart_projects")
      .select("id, name, data, is_current, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (skill) q = q.eq("skill", skill);
    const { data, error } = await q;
    if (error) throw error;
    return Response.json({ projects: data || [] });
  } catch (e) {
    console.error("[sea-chart/projects GET]", e);
    return Response.json({ projects: [], error: "load_failed" });
  }
}

// POST /api/sea-chart/projects  { user_id, skill, name, data, is_current? }
// 同一(user_id, skill, name)があれば更新、無ければ作成（best-effort・localStorageと併設）
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const userId = String(body.user_id || "");
  const skill = String(body.skill || "");
  const name = String(body.name || "").trim();
  const data = body.data ?? {};
  const isCurrent = body.is_current === true;

  if (!UUID_RE.test(userId)) {
    // UUIDでなければ保存しない（FK違反回避）。chart.html は localStorage で保持。
    return Response.json({ saved: false, reason: "no_uuid_user" });
  }
  if (!name) {
    return Response.json({ error: "name_required" }, { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    // 既存（user_id, skill, name）を検索 → 更新 or 新規
    const { data: existing, error: selErr } = await sb
      .from("sea_chart_projects")
      .select("id")
      .eq("user_id", userId)
      .eq("skill", skill)
      .eq("name", name)
      .limit(1);
    if (selErr) throw selErr;

    if (existing && existing.length > 0) {
      const { error } = await sb
        .from("sea_chart_projects")
        .update({ data, is_current: isCurrent, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id);
      if (error) throw error;
      return Response.json({ saved: true, id: existing[0].id, mode: "update" });
    } else {
      const { data: ins, error } = await sb
        .from("sea_chart_projects")
        .insert({ user_id: userId, skill, name, data, is_current: isCurrent })
        .select("id")
        .single();
      if (error) throw error;
      return Response.json({ saved: true, id: ins?.id, mode: "insert" });
    }
  } catch (e) {
    console.error("[sea-chart/projects POST]", e);
    return Response.json({ saved: false, error: "save_failed" }, { status: 200 });
  }
}
