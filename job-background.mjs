// Trabajos largos lanzados por tick.mjs (las funciones programadas solo tienen 30 s).
// Se protege con un secreto compartido en la cabecera x-job-secret.
import { safeEq, sendMessage, nowMadrid } from "../lib/common.mjs";
import { menuMessage, revisionSemanal } from "../lib/agent.mjs";

export default async (req) => {
  try {
    if (req.method !== "POST") return new Response("ok");
    if (!safeEq(req.headers.get("x-job-secret"), process.env.TELEGRAM_WEBHOOK_SECRET)) return new Response("ok");
    const { job } = await req.json();
    if (job === "menu") await menuMessage(1);
    else if (job === "semana-auto") {
      const ok = await revisionSemanal("(Sin feedback escrito de Igor: no has recibido su /semana. Usa solo los registros y dilo en el resumen.)");
      if (ok && nowMadrid().dow === 0) await menuMessage(1);
    }
  } catch (e) {
    console.error("job:", e?.stack || e);
    try { await sendMessage(`No he podido completar la tarea programada: ${String(e?.message || e).slice(0, 160)}`); } catch {}
  }
  return new Response("ok");
};

export const config = { path: "/api/job", background: true };
