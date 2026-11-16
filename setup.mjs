// GET /api/setup?k=PLAN_KEY → se llama UNA vez tras el primer despliegue.
// Comprueba variables, carga el plan inicial, registra el webhook de Telegram y manda un mensaje de prueba.
import { loadPlan, seedLogsIfEmpty, getState, saveState, safeEq, tg, sendMessage } from "../lib/common.mjs";

const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const REQUERIDAS = ["ANTHROPIC_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_WEBHOOK_SECRET", "PLAN_KEY"];

const out = (obj, status = 200) => new Response(JSON.stringify(obj, null, 2), { status, headers: H });

export default async (req) => {
  try {
    const url = new URL(req.url);
    if (!safeEq(url.searchParams.get("k"), process.env.PLAN_KEY)) return out({ error: "clave incorrecta" }, 401);

    const faltan = REQUERIDAS.filter((n) => !process.env[n]);
    if (faltan.length) return out({ ok: false, faltan_variables: faltan }, 400);

    const plan = await loadPlan();
    await seedLogsIfEmpty();

    const origin = url.origin;
    const state = await getState();
    state.site_url = origin;
    await saveState(state);

    await tg("setWebhook", {
      url: `${origin}/api/telegram`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    });
    const info = await tg("getWebhookInfo", {});
    await sendMessage("Conexión lista. Soy tu entrenador Hyrox. Escribe /ayuda para ver los comandos. Mañana a las 8:00 te pregunto qué tal ha ido el entreno.");

    return out({
      ok: true,
      webhook: info.url,
      plan_dias: plan.dias.length,
      plan_desde: plan.dias[0]?.fecha,
      plan_hasta: plan.dias[plan.dias.length - 1]?.fecha,
    });
  } catch (e) {
    console.error("setup:", e?.stack || e);
    return out({ ok: false, error: String(e?.message || e) }, 500);
  }
};

export const config = { path: "/api/setup" };
