// Función programada: se ejecuta cada hora en punto (UTC) y decide con la hora de Madrid
// si toca check-in (8:00), recordatorio del domingo (18:00) o menú de mañana (20:00).
// Así no hay que tocar el cron al cambiar de horario de verano a invierno.
import { nowMadrid, addDays, getState, saveState, sendMessage, loadPlan, safeEq } from "../lib/common.mjs";
import { checkinText, menuSoloCodigo } from "../lib/agent.mjs";

export default async () => {
  try {
    await run();
  } catch (e) {
    console.error("tick:", e?.stack || e);
  }
  return new Response("ok");
};

export const config = { schedule: "0 * * * *" };

async function lanzarJob(job, state) {
  const site = (state.site_url || process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
  if (!site) return false;
  const r = await fetch(`${site}/api/job`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-job-secret": process.env.TELEGRAM_WEBHOOK_SECRET || "" },
    body: JSON.stringify({ job }),
  });
  return r.ok;
}

async function run() {
  const now = nowMadrid();
  const state = await getState();
  const sent = state.sent;
  const hecho = (k) => Boolean(sent[k]);
  const marca = async (k) => {
    sent[k] = new Date().toISOString();
    for (const key of Object.keys(sent)) if (key.slice(0, 10) < addDays(now.date, -10)) delete sent[key];
    await saveState(state);
  };

  // Check-in de la mañana (ventana 8:00-11:59 por si un tick se retrasa).
  if (now.hour >= 8 && now.hour <= 11 && !hecho(`${now.date}-8`)) {
    await sendMessage(await checkinText());
    await marca(`${now.date}-8`);
  }

  const plan = await loadPlan();
  const manana = addDays(now.date, 1);
  const hayManana = plan.dias.some((d) => d.fecha === manana);

  // Domingo 18:00: recordatorio si la semana siguiente aún no existe.
  if (now.dow === 0 && now.hour >= 18 && now.hour < 20 && !hayManana && !hecho(`${now.date}-18`)) {
    await sendMessage("Es domingo y aún no tengo la semana nueva. Envíame /semana con tu feedback (peso medio, fatiga, sensaciones, adherencia, eventos sociales). Si no, a las 20:00 la preparo solo con tus registros.");
    await marca(`${now.date}-18`);
  }

  // 20:00: menú de mañana (o, el domingo sin plan, revisión automática + menú).
  if (now.hour >= 20 && now.hour <= 21 && !hecho(`${now.date}-20`)) {
    const job = now.dow === 0 && !hayManana ? "semana-auto" : "menu";
    if (job === "menu" && !hayManana) {
      await menuSoloCodigo(1);
      await marca(`${now.date}-20`);
      return;
    }
    let ok = false;
    try { ok = await lanzarJob(job, state); } catch (e) { console.error("lanzarJob:", e.message); }
    if (ok) await marca(`${now.date}-20`);
    else if (job === "menu") {
      await menuSoloCodigo(1);
      await marca(`${now.date}-20`);
    }
  }
}
