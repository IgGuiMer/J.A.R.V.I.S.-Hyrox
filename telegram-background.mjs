// Webhook de Telegram. Es una función en segundo plano: responde 202 al instante
// y puede tardar hasta 15 min en llamar a Claude. NUNCA debe lanzar excepciones
// (Netlify reintentaría y duplicaría mensajes).
import { getJSON, setJSON, safeEq, sendMessage, tg, nowMadrid, addDays, mondayOf, addLog, loadPlan, getLogs, weeklyWeights } from "../lib/common.mjs";
import { chat, revisionSemanal, menuMessage, prediccion, estado, sesionTexto, AYUDA } from "../lib/agent.mjs";

export default async (req) => {
  try {
    await handle(req);
  } catch (e) {
    console.error("telegram:", e?.stack || e);
    try { await sendMessage(`Ha fallado algo por mi lado: ${String(e?.message || e).slice(0, 160)}. Reinténtalo en un minuto.`); } catch {}
  }
  return new Response("ok");
};

export const config = { path: "/api/telegram", background: true };

async function handle(req) {
  if (req.method !== "POST") return;
  if (!safeEq(req.headers.get("x-telegram-bot-api-secret-token"), process.env.TELEGRAM_WEBHOOK_SECRET)) return;

  const update = await req.json();
  const msg = update?.message;
  if (!msg) return;

  // Sin TELEGRAM_CHAT_ID configurado solo respondemos con tu chat id (paso de instalación).
  if (!process.env.TELEGRAM_CHAT_ID) {
    await tg("sendMessage", { chat_id: msg.chat.id, text: `Tu chat id es ${msg.chat.id}. Guárdalo en Netlify como TELEGRAM_CHAT_ID y vuelve a desplegar.` });
    return;
  }
  if (String(msg.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) return;

  // Deduplicación por update_id.
  const tgState = await getJSON("tg", { last_update_id: 0 });
  if (typeof update.update_id === "number") {
    if (update.update_id <= tgState.last_update_id) return;
    await setJSON("tg", { last_update_id: update.update_id });
  }

  const text = (msg.text || "").trim();
  if (!text) {
    await sendMessage("Por ahora solo entiendo mensajes de texto.");
    return;
  }

  const cmd = text.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (!cmd) {
    await chat(text);
    return;
  }
  const name = cmd[1].toLowerCase();
  const arg = (cmd[2] || "").trim();
  const now = nowMadrid();

  switch (name) {
    case "start":
    case "ayuda":
    case "help":
      await sendMessage(`Soy tu entrenador y nutricionista Hyrox.\n\n${AYUDA}`);
      break;
    case "hoy":
    case "manana": {
      const f = name === "hoy" ? now.date : addDays(now.date, 1);
      const plan = await loadPlan();
      await sendMessage(sesionTexto(plan.dias.find((d) => d.fecha === f), f));
      break;
    }
    case "menu":
      await menuMessage(/^hoy/i.test(arg) ? 0 : 1);
      break;
    case "peso": {
      const n = parseFloat(arg.replace(",", "."));
      if (!(n >= 40 && n <= 200)) {
        await sendMessage("Dime el peso así: /peso 83.4");
        break;
      }
      await addLog({ fecha: now.date, peso_kg: n }, now.date);
      const w = weeklyWeights(await getLogs()).find((x) => x.semana === mondayOf(now.date));
      await sendMessage(`Anotado: ${n} kg. Media de esta semana: ${w ? `${w.media} kg (${w.n} pesaje${w.n > 1 ? "s" : ""})` : `${n} kg`}. Decido con la media, no con un día suelto.`);
      break;
    }
    case "prediccion":
      await prediccion();
      break;
    case "semana":
      await revisionSemanal(arg);
      break;
    case "estado":
      await estado();
      break;
    default:
      await sendMessage(`No conozco /${name}.\n\n${AYUDA}`);
  }
}
