// GET /api/plan?k=PLAN_KEY → plan vigente en JSON (lo lee el dashboard).
import { loadPlan, safeEq } from "../lib/common.mjs";

const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export default async (req) => {
  try {
    const expected = process.env.PLAN_KEY;
    if (!expected) return new Response(JSON.stringify({ error: "PLAN_KEY no configurada" }), { status: 500, headers: H });
    const k = new URL(req.url).searchParams.get("k");
    if (!safeEq(k, expected)) return new Response(JSON.stringify({ error: "clave incorrecta" }), { status: 401, headers: H });
    return new Response(JSON.stringify(await loadPlan()), { status: 200, headers: H });
  } catch (e) {
    console.error("plan:", e?.stack || e);
    return new Response(JSON.stringify({ error: "error interno" }), { status: 500, headers: H });
  }
};

export const config = { path: "/api/plan" };
