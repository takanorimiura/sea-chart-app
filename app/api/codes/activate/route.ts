import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function POST(request: Request) {
  const { code, user_id } = await request.json();

  if (!code || !user_id) {
    return Response.json({ error: "code and user_id are required" }, { status: 400 });
  }

  // Check code
  const supabaseAdmin = getSupabaseAdmin();

  const { data: codeData, error: codeErr } = await supabaseAdmin
    .from("access_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (codeErr || !codeData) {
    return Response.json({ error: "無効なアクセスコードです" }, { status: 404 });
  }

  if (codeData.used_count >= codeData.max_uses) {
    return Response.json({ error: "このコードは使用上限に達しています" }, { status: 400 });
  }

  // Check if already used
  const { data: existing } = await supabaseAdmin
    .from("access_code_uses")
    .select("id")
    .eq("code", code.toUpperCase())
    .eq("user_id", user_id);

  if (existing && existing.length > 0) {
    return Response.json({ error: "このコードは既に使用済みです" }, { status: 400 });
  }

  // Record use
  await supabaseAdmin.from("access_code_uses").insert({
    code: code.toUpperCase(),
    user_id,
  });

  // Increment used_count
  await supabaseAdmin
    .from("access_codes")
    .update({ used_count: codeData.used_count + 1 })
    .eq("code", code.toUpperCase());

  // Grant types
  const typesToGrant: string[] = codeData.unlock_types || [];
  for (const typeKey of typesToGrant) {
    await supabaseAdmin.from("purchased_types").upsert(
      { user_id, type_key: typeKey, source: "access_code" },
      { onConflict: "user_id,type_key" }
    );
  }

  return Response.json({
    success: true,
    granted_types: typesToGrant,
    message: `アクセスコード「${code}」を適用しました`,
  });
}
