import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();
  const {
    current_state = "",
    goal,
    selected_tools = [],
    minimal_mode = false,
    chart_type = "all",
    system_prompt = "",
  } = body;

  let extra = "";
  if (selected_tools.length > 0) {
    extra += `\n\nユーザーが契約済みのAI: ${selected_tools.join(", ")}\nこれらのAIを優先的に使用してフローを設計してください。`;
  }
  if (minimal_mode) {
    extra +=
      "\n\n重要: できるだけ少ない種類のAIで実現してください。1〜2種類のAIで完結できるフローが理想です。";
  }
  if (chart_type !== "all") {
    extra += `\n\n現在のチャートタイプは「${chart_type}」です。このスキル領域のノードタイプを中心にフローを構成してください。`;
  }

  let userMsg = "";
  if (current_state) userMsg += `Before（現状）：${current_state}\n`;
  userMsg += `After（ゴール）：${goal}${extra}`;

  try {
    const resp = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: system_prompt || "あなたはワークフロー設計の専門家です。",
      messages: [{ role: "user", content: userMsg }],
    });

    const text = resp.content[0].type === "text" ? resp.content[0].text : "";

    // Extract JSON from response
    try {
      return Response.json(JSON.parse(text));
    } catch {
      const m = text.match(/```(?:json)?\s*\n([\s\S]*?)```/);
      if (m) return Response.json(JSON.parse(m[1]));
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  } catch (e: any) {
    return Response.json({ error: e.message || "AI generation failed" }, { status: 500 });
  }
}
