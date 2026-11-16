// Infraestructura compartida: tiempo, almacenamiento, Telegram, Claude y plan.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
import SEED_PLAN, { SEED_LOGS } from "./seed.mjs";

export const TZ = "Europe/Madrid";
export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// ───────── Tiempo ─────────
// HYROX_NOW solo se usa en las pruebas locales.
export function nowMadrid(d) {
  const base = d || (process.env.HYROX_NOW ? new Date(process.env.HYROX_NOW) : new Date());
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(base).map((x) => [x.type, x.value]));
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    dow,
  };
}
export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function mondayOf(iso) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);
}

// ───────── Seguridad ─────────
export function safeEq(a, b) {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// ───────── Almacenamiento (Netlify Blobs) ─────────
// En pruebas locales (HYROX_TEST=1) se usa memoria.
const mem = new Map();
function store() {
  if (process.env.HYROX_TEST === "1") {
    return {
      get: async (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null),
      setJSON: async (k, v) => void mem.set(k, JSON.stringify(v)),
    };
  }
  return getStore({ name: "hyrox", consistency: "strong" });
}
export async function getJSON(key, fallback) {
  const v = await store().get(key, { type: "json" });
  return v ?? fallback;
}
export async function setJSON(key, value) {
  await store().setJSON(key, value);
}

export const getState = async () => {
  const s = await getJSON("state", {});
  s.sent ||= {};
  return s;
};
export const saveState = (s) => setJSON("state", s);

// ───────── Telegram ─────────
function splitText(text, max = 3800) {
  const out = [];
  let rest = String(text || "").trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}
export async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`telegram ${method}: ${r.status} ${j.description || ""}`);
  return j.result;
}
export async function sendMessage(text) {
  for (const chunk of splitText(text)) {
    await tg("sendMessage", {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: chunk,
      disable_web_page_preview: true,
    });
  }
}
export const typing = () =>
  tg("sendChatAction", { chat_id: process.env.TELEGRAM_CHAT_ID, action: "typing" }).catch(() => {});

// ───────── Claude (streaming para soportar respuestas largas) ─────────
export async function claude({ system, messages, maxTokens = 1200, model }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || process.env.MODEL_CHAT || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  let text = "";
  let buf = "";
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ev = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const line = ev.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      let j;
      try { j = JSON.parse(line.slice(6)); } catch { continue; }
      if (j.type === "content_block_delta" && j.delta?.type === "text_delta") text += j.delta.text;
      else if (j.type === "error") throw new Error(`anthropic stream: ${j.error?.message || "error"}`);
    }
  }
  return text.trim();
}

// Separa el texto visible de los bloques <registro> y <plan>.
export function splitOutput(raw) {
  const grab = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    if (!m) return { obj: null, err: null };
    const body = m[1].trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return { obj: JSON.parse(body), err: null }; } catch (e) { return { obj: null, err: e.message }; }
  };
  const reg = grab("registro");
  const plan = grab("plan");
  const visible = raw
    .replace(/<registro>[\s\S]*?<\/registro>/g, "")
    .replace(/<plan>[\s\S]*?<\/plan>/g, "")
    .replace(/<\/?(registro|plan)>/g, "")
    .trim();
  return { visible, registro: reg.obj, plan: plan.obj, planError: plan.err };
}

// ───────── Plan ─────────
const TIPOS = ["Alta", "Media", "Baja"];
const COM = ["piz", "car", "bol"];
const CEN = ["bur", "pla"];
const POS = ["mag", "gal", "cho"];

export function validatePlan(p) {
  if (!p || !Array.isArray(p.dias) || p.dias.length !== 7) return ["'dias' debe tener exactamente 7 elementos"];
  const err = [];
  p.dias.forEach((d, i) => {
    const t = `día ${i + 1}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.fecha || "")) err.push(`${t}: fecha inválida`);
    if (!d?.titulo || !d?.subtitulo) err.push(`${t}: falta titulo o subtitulo`);
    if (!TIPOS.includes(d?.tipo)) err.push(`${t}: tipo debe ser Alta, Media o Baja`);
    if (!Array.isArray(d?.bloques) || !d.bloques.length || d.bloques.some((b) => !b?.titulo || !b?.texto))
      err.push(`${t}: bloques inválidos`);
    const m = d?.menu || {};
    if (!COM.includes(m.comida) || !CEN.includes(m.cena) || !POS.includes(m.postre))
      err.push(`${t}: menu inválido (comida piz|car|bol, cena bur|pla, postre mag|gal|cho)`);
  });
  if (!err.length) {
    const f0 = p.dias[0].fecha;
    p.dias.forEach((d, i) => { if (d.fecha !== addDays(f0, i)) err.push(`día ${i + 1}: las fechas deben ser consecutivas desde ${f0}`); });
  }
  return err;
}

export function mergePlan(old, nuevo) {
  const by = new Map((old?.dias || []).map((d) => [d.fecha, d]));
  for (const d of nuevo.dias) by.set(d.fecha, d);
  const start = nuevo.semana_inicio || nuevo.dias[0].fecha;
  const keepFrom = addDays(start, -7);
  const dias = [...by.values()].filter((d) => d.fecha >= keepFrom).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { semana_inicio: start, decision: nuevo.decision || "", actualizado: new Date().toISOString(), dias };
}

export async function loadPlan() {
  let plan = await getJSON("plan", null);
  if (!plan) {
    plan = SEED_PLAN;
    await setJSON("plan", plan);
  }
  return plan;
}

// ───────── Registros ─────────
export const getLogs = () => getJSON("logs", {});
export async function seedLogsIfEmpty() {
  const l = await getJSON("logs", null);
  if (!l) await setJSON("logs", SEED_LOGS);
}
export async function addLog(reg, fallbackDate) {
  if (!reg || typeof reg !== "object") return;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(reg.fecha || "") ? reg.fecha : fallbackDate;
  const logs = await getLogs();
  const prev = logs[fecha] || {};
  const next = { ...prev };
  for (const [k, v] of Object.entries(reg)) {
    if (k === "fecha" || v === null || v === undefined || v === "") continue;
    if (k === "metricas" && typeof v === "object") next.metricas = { ...(prev.metricas || {}), ...v };
    else if (k === "dolor" && Array.isArray(v) && !v.length) continue;
    else next[k] = v;
  }
  logs[fecha] = next;
  const keys = Object.keys(logs).sort();
  while (keys.length > 120) delete logs[keys.shift()];
  await setJSON("logs", logs);
}

export function weeklyWeights(logs) {
  const by = {};
  for (const [f, r] of Object.entries(logs)) {
    if (typeof r.peso_kg === "number") (by[mondayOf(f)] ||= []).push(r.peso_kg);
  }
  return Object.entries(by)
    .sort()
    .map(([semana, a]) => ({ semana, media: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), n: a.length }));
}

// ───────── Historial de conversación ─────────
export const getHistory = () => getJSON("history", []);
export async function pushHistory(user, assistant) {
  const h = await getHistory();
  h.push({ role: "user", content: user }, { role: "assistant", content: assistant });
  await setJSON("history", h.slice(-10));
}
