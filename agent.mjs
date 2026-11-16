// Lógica del agente: chat, revisión semanal, menú, check-in, predicción y estado.
import SYSTEM from "./system-prompt.mjs";
import {
  DIAS, nowMadrid, addDays, mondayOf, daysBetween,
  claude, splitOutput, sendMessage, typing,
  loadPlan, setJSON, getJSON, validatePlan, mergePlan,
  getLogs, addLog, weeklyWeights, getHistory, pushHistory,
} from "./common.mjs";

export const FECHAS = { torrelavega: "2027-04-10", malaga: "2027-04-17" };
const SIN_PLAN = "No hay sesión planificada para esa fecha.";
const NOMBRES = {
  piz: "pizza de fajita", car: "pasta carbonara", bol: "pasta boloñesa",
  bur: "hamburguesa en pan brioche", pla: "plancha",
  mag: "Magnum de chocolate negro", gal: "galletas", cho: "chocolate negro",
};
const TOTALES = {
  Alta: "3.050 kcal · 180 P · 414 C · 75 G",
  Media: "2.805 kcal · 180 P · 351 C · 75 G",
  Baja: "2.550 kcal · 180 P · 277 C · 80 G",
};

const fechaLarga = (iso) => {
  const d = new Date(iso + "T12:00:00Z");
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};
const dayOf = (plan, fecha) => (plan.dias || []).find((d) => d.fecha === fecha);

// ───────── Texto de sesión (código, sin LLM) ─────────
export function sesionTexto(d, fecha) {
  if (!d) return `${fechaLarga(fecha)}: ${SIN_PLAN}`;
  const bl = d.bloques.map((b) => `${b.titulo}\n${b.texto}`).join("\n\n");
  return `${d.titulo} · día ${d.tipo}\n${d.subtitulo || ""}\n\n${bl}${d.nota ? `\n\nNota: ${d.nota}` : ""}`.trim();
}

// ───────── Contexto dinámico ─────────
export async function buildContext(tipo, { fullPlan = false } = {}) {
  const now = nowMadrid();
  const [plan, logs] = await Promise.all([loadPlan(), getLogs()]);
  const desde = addDays(now.date, -28);
  const recientes = Object.fromEntries(Object.entries(logs).filter(([f]) => f >= desde).sort());
  const dias = fullPlan
    ? plan.dias
    : plan.dias.filter((d) => d.fecha >= addDays(now.date, -1) && d.fecha <= addDays(now.date, 2));
  const compacto = dias.map((d) => ({
    fecha: d.fecha, titulo: d.titulo, subtitulo: d.subtitulo, tipo: d.tipo, menu: d.menu,
    bloques: d.bloques, nota: d.nota, clave: d.clave,
  }));
  return [
    "=== CONTEXTO DINÁMICO ===",
    `TIPO: ${tipo}`,
    `AHORA (Europa/Madrid): ${DIAS[now.dow]} ${now.date} ${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`,
    `Días hasta Torrelavega (10-abr-2027): ${daysBetween(now.date, FECHAS.torrelavega)} · hasta Málaga (17-abr-2027): ${daysBetween(now.date, FECHAS.malaga)}`,
    `PLAN VIGENTE (${fullPlan ? "completo" : "ayer, hoy y próximos 2 días"}; decisión última: ${plan.decision || "-"}):`,
    JSON.stringify(compacto),
    "REGISTROS DIARIOS (últimas 4 semanas):",
    JSON.stringify(recientes),
    "PESO MEDIO SEMANAL (semana que empieza el lunes):",
    JSON.stringify(weeklyWeights(logs).slice(-8)),
    "=== FIN DEL CONTEXTO ===",
  ].join("\n");
}

// ───────── Chat libre ─────────
export async function chat(texto) {
  await typing();
  const now = nowMadrid();
  const ctx = await buildContext("respuesta_atleta");
  const history = await getHistory();
  const raw = await claude({
    system: SYSTEM,
    messages: [...history, { role: "user", content: `${ctx}\n\nMENSAJE DE IGOR:\n${texto}` }],
    maxTokens: 1200,
  });
  const out = splitOutput(raw);
  if (out.registro) await addLog(out.registro, now.date);
  const visible = out.visible || "Recibido.";
  await pushHistory(texto, visible);
  await sendMessage(visible);
}

// ───────── Revisión semanal (proceso largo, se ejecuta en segundo plano) ─────────
const LOCK_MS = 20 * 60 * 1000;

// Devuelve true si el plan nuevo se ha guardado.
export async function revisionSemanal(extra = "") {
  const lock = await getJSON("lock", {});
  if (lock.revision && Date.now() - lock.revision < LOCK_MS) {
    await sendMessage("Ya estoy generando la semana. Te aviso en cuanto esté (unos 2-4 minutos).");
    return false;
  }
  await setJSON("lock", { revision: Date.now() });
  try {
    await sendMessage("Generando la semana nueva con tus registros. Tardo unos 2-4 minutos.");
    const now = nowMadrid();
    const lunes = addDays(mondayOf(now.date), 7);
    const plan = await loadPlan();
    const logs = await getLogs();
    if (extra.trim()) {
      await addLog({ fecha: now.date, notas: `Feedback del domingo: ${extra.trim().slice(0, 900)}` }, now.date);
    }
    const ctx = await buildContext("revision_domingo", { fullPlan: true });
    const base =
      `${ctx}\n\nFEEDBACK DE IGOR:\n${extra.trim() || "(Sin feedback escrito: usa solo los registros y dilo en el resumen.)"}\n\n` +
      `Genera la revisión semanal y el plan nuevo. La semana empieza el lunes ${lunes} (7 días: ${lunes} a ${addDays(lunes, 6)}). ` +
      `Termina con el bloque <plan> en JSON válido. Los registros disponibles de las últimas semanas son ${Object.keys(logs).length} días.`;

    const messages = [{ role: "user", content: base }];
    let nuevo = null;
    let visible = "";
    let errores = [];
    for (let intento = 0; intento < 2 && !nuevo; intento++) {
      const raw = await claude({
        system: SYSTEM,
        messages,
        maxTokens: 16000,
        model: process.env.MODEL_PLAN || process.env.MODEL_CHAT,
      });
      const out = splitOutput(raw);
      visible = out.visible || visible;
      errores = out.plan ? validatePlan(out.plan) : [out.planError ? `JSON inválido: ${out.planError}` : "falta el bloque <plan>"];
      if (!errores.length) nuevo = out.plan;
      else {
        messages.push({ role: "assistant", content: raw });
        messages.push({
          role: "user",
          content: `El bloque <plan> no es válido: ${errores.slice(0, 6).join("; ")}. Devuelve SOLO el bloque <plan> corregido, completo, con JSON válido, sin texto adicional.`,
        });
      }
    }
    if (!nuevo) {
      if (visible) await sendMessage(visible);
      await sendMessage(`No he podido validar el plan nuevo (${errores.slice(0, 3).join("; ")}). Sigues con el plan anterior. Escribe /semana para reintentar.`);
      return false;
    }
    const merged = mergePlan(plan, nuevo);
    await setJSON("plan", merged);
    await pushHistory("/semana", visible || "Semana generada.");
    if (visible) await sendMessage(visible);
    const url = process.env.SITE_URL || process.env.URL || "";
    await sendMessage(`Plan guardado: semana del ${lunes}. ${url ? `Ábrelo en la app: ${url}` : "Ábrelo en la app."}`);
    return true;
  } finally {
    await setJSON("lock", {});
  }
}

// ───────── Menú ─────────
function menuCodigo(d, fecha) {
  if (!d) return `${fechaLarga(fecha)}: ${SIN_PLAN}`;
  const m = d.menu || {};
  return (
    `Menú de ${fechaLarga(fecha)} (día ${d.tipo})\n` +
    `Totales: ${TOTALES[d.tipo] || "-"}\n` +
    `Comida: ${NOMBRES[m.comida] || m.comida}\nCena: ${NOMBRES[m.cena] || m.cena}\nPostre: ${NOMBRES[m.postre] || m.postre}\n` +
    `Las cantidades exactas están en la app, pestaña del día.`
  );
}

export async function menuSoloCodigo(offset = 1) {
  const fecha = addDays(nowMadrid().date, offset);
  const plan = await loadPlan();
  await sendMessage(menuCodigo(dayOf(plan, fecha), fecha));
}

export async function menuMessage(offset = 1) {
  const now = nowMadrid();
  const fecha = addDays(now.date, offset);
  const plan = await loadPlan();
  const d = dayOf(plan, fecha);
  if (!d) {
    await sendMessage(menuCodigo(d, fecha));
    return;
  }
  try {
    await typing();
    const ctx = await buildContext("menu_noche");
    const raw = await claude({
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `${ctx}\n\nGenera el menú de ${offset === 0 ? "hoy" : "mañana"} (${fecha}) con cantidades exactas del ANEXO, tipo de día ${d.tipo} y las claves ${JSON.stringify(d.menu)}.`,
      }],
      maxTokens: 900,
    });
    const out = splitOutput(raw);
    await sendMessage(out.visible || menuCodigo(d, fecha));
  } catch (e) {
    console.error("menuMessage:", e.message);
    await sendMessage(menuCodigo(d, fecha));
  }
}

// ───────── Check-in de las 8:00 ─────────
function claveDefault(d) {
  const t = `${d.titulo} ${d.subtitulo} ${(d.bloques || []).map((b) => b.titulo).join(" ")}`.toLowerCase();
  if (/simulaci|hyrox completa|sim /.test(t)) return "tiempo total de la sim y ritmo medio de los km de carrera";
  if (/serie|umbral|vo2|fartlek/.test(t)) return "ritmo medio de las series y FC máxima";
  if (/long|largo|rodaje largo/.test(t)) return "km totales, ritmo medio y cómo fue el final";
  if (/compromised|run-to-station/.test(t)) return "tiempo total del compromised y cómo respondieron las piernas";
  if (/fuerza|strength|upper|lower|bisagra/.test(t)) return "cargas reales y RIR de las series principales";
  return "cómo has sentido las piernas y la FC en reposo";
}

export async function checkinText() {
  const now = nowMadrid();
  const plan = await loadPlan();
  const d = dayOf(plan, now.date);
  const cab = `Buenos días, Igor. ${DIAS[now.dow][0].toUpperCase() + DIAS[now.dow].slice(1)} ${now.date}.`;
  const hoy = d ? `Hoy te tocaba: ${d.titulo} (${d.tipo}).` : "Hoy no tengo sesión planificada.";
  const clave = d ? d.clave || claveDefault(d) : "";
  const preguntas = [
    "1) ¿Qué tal ha ido el entrenamiento? ¿Cumplido? RPE de 1 a 10.",
    clave ? `2) Dato clave: ${clave}.` : "2) Cualquier dato relevante de la sesión.",
    "3) HRV y horas de sueño de esta noche.",
    "4) Peso en ayunas (si lo mides), hambre de 1 a 5 y adherencia a la dieta de ayer en %.",
    "5) Molestias o dolor (zona e intensidad de 0 a 10).",
  ];
  const domingo =
    now.dow === 0
      ? "\n\nHoy es domingo: cuando tengas un rato, envíame /semana seguido de tu feedback (peso medio, fatiga, sensaciones, adherencia, eventos sociales próximos) y te preparo la semana."
      : "";
  return `${cab}\n${hoy}\n\n${preguntas.join("\n")}\n\nResponde en un solo mensaje, aunque sea telegráfico.${domingo}`;
}

// ───────── Predicción Hyrox (heurística calculada en código) ─────────
export const MODELO = {
  rp: 267, // ritmo de referencia en s/km (4:27)
  fatiga: 1.05, // factor de fatiga de la carrera por defecto
  estaciones: { ski: 257, sledPush: 120, sledPull: 160, bbj: 270, remo: 245, farmers: 95, lunges: 270, wallBalls: 300 },
  roxzone: 240,
  factorSim: 0.94, // de tiempo de sim de entreno a tiempo de competición
};

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const fmt = (s) => {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
export const fmtPace = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function predecir(logs) {
  const sims = Object.entries(logs)
    .filter(([, r]) => r.metricas && r.metricas.sim_tipo === "completa" && typeof r.metricas.sim_total_min === "number")
    .sort(([a], [b]) => a.localeCompare(b));
  const paces = Object.entries(logs)
    .filter(([, r]) => r.metricas && typeof r.metricas.sim_run_pace_s_km === "number")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-3)
    .map(([, r]) => r.metricas.sim_run_pace_s_km);

  let fatiga = MODELO.fatiga;
  let fuenteFatiga = "valor por defecto (aún sin simulaciones con ritmo registrado)";
  if (paces.length) {
    const avg = paces.reduce((x, y) => x + y, 0) / paces.length;
    fatiga = clamp(avg / MODELO.rp + 0.02, 1.02, 1.1);
    fuenteFatiga = `${paces.length} sim(s) con ritmo medio de ${fmtPace(avg)}/km`;
  }
  const carrera = 8 * MODELO.rp * fatiga;
  const estaciones = Object.values(MODELO.estaciones).reduce((x, y) => x + y, 0);
  const modelo = carrera + estaciones + MODELO.roxzone;

  let central = modelo;
  let rango = 0.05;
  let base = "modelo teórico (sin simulación completa registrada)";
  let simInfo = null;
  if (sims.length) {
    const [f, r] = sims[sims.length - 1];
    const simS = r.metricas.sim_total_min * 60 * MODELO.factorSim;
    central = 0.5 * modelo + 0.5 * simS;
    rango = 0.03;
    base = `mezcla 50 % modelo + 50 % tu última sim completa (${f}: ${fmt(r.metricas.sim_total_min * 60)} ajustada ×${MODELO.factorSim})`;
    simInfo = { fecha: f, total: r.metricas.sim_total_min * 60 };
  }
  return {
    central,
    min: central * (1 - rango),
    max: central * (1 + rango),
    carrera, estaciones, roxzone: MODELO.roxzone, fatiga, fuenteFatiga, base, simInfo, nSims: sims.length,
  };
}

export async function prediccion() {
  const logs = await getLogs();
  const p = predecir(logs);
  const now = nowMadrid();
  const lineas = [
    `Predicción HYROX Open (heurística calculada por código, no es una promesa)`,
    ``,
    `Tiempo central: ${fmt(p.central)}`,
    `Rango: ${fmt(p.min)} a ${fmt(p.max)}`,
    ``,
    `Desglose del modelo:`,
    `- Carrera 8 km a ${fmtPace(MODELO.rp * p.fatiga)}/km (RP ${fmtPace(MODELO.rp)} × ${p.fatiga.toFixed(2)}): ${fmt(p.carrera)}`,
    `- 8 estaciones: ${fmt(p.estaciones)}`,
    `- Roxzone: ${fmt(p.roxzone)}`,
    ``,
    `Base: ${p.base}.`,
    `Fatiga: ${p.fuenteFatiga}.`,
    ``,
    `Cada 1 % de ritmo en carrera = ${Math.round(8 * MODELO.rp * 0.01)} s. Mejorar los BBJ 30 s = 30 s directos.`,
    `Faltan ${daysBetween(now.date, FECHAS.malaga)} días para Málaga. Se recalibra con cada sim completa y con Torrelavega.`,
  ];
  if (!p.nSims) lineas.push(`Para afinarla: tras tu próxima simulación completa dime tiempo total y ritmo medio de los km de carrera.`);
  await sendMessage(lineas.join("\n"));
}

// ───────── Estado ─────────
export async function estado() {
  const now = nowMadrid();
  const [plan, logs] = await Promise.all([loadPlan(), getLogs()]);
  const pesos = weeklyWeights(logs).slice(-4);
  const ult7 = Object.keys(logs).filter((f) => f >= addDays(now.date, -6)).length;
  const hoy = dayOf(plan, now.date);
  const L = [
    `Estado · ${DIAS[now.dow]} ${now.date}`,
    `Málaga en ${daysBetween(now.date, FECHAS.malaga)} días · Torrelavega en ${daysBetween(now.date, FECHAS.torrelavega)} días`,
    `Plan: desde la semana del ${plan.semana_inicio}, actualizado ${String(plan.actualizado || "").slice(0, 10) || "-"}`,
    `Último día con plan: ${plan.dias.length ? plan.dias[plan.dias.length - 1].fecha : "-"}`,
    hoy ? `Hoy: ${hoy.titulo} (${hoy.tipo})` : "Hoy: sin sesión en el plan",
    `Registros de los últimos 7 días: ${ult7}/7`,
    pesos.length ? `Peso medio semanal: ${pesos.map((w) => `${w.semana.slice(5)}: ${w.media} kg (${w.n})`).join(" · ")}` : "Peso medio semanal: sin datos",
  ];
  await sendMessage(L.join("\n"));
}

export const AYUDA = [
  "Comandos:",
  "/hoy · sesión de hoy",
  "/manana · sesión de mañana",
  "/menu · menú de mañana (/menu hoy para el de hoy)",
  "/peso 83.4 · anota tu peso de hoy",
  "/prediccion · tiempo estimado de tu Hyrox",
  "/semana + feedback · genero la semana siguiente",
  "/estado · resumen de plan y registros",
  "",
  "Cada mañana a las 8:00 te pregunto qué tal ha ido el entreno. Respóndeme con texto libre (RPE, HRV, sueño, peso, hambre, molestias) y lo registro solo.",
  "A las 20:00 recibes el menú de mañana.",
].join("\n");
