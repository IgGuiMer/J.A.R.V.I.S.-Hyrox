// Netlify ejecuta este script antes de publicar (ver netlify.toml).
// Si las carpetas ya están bien (public/, netlify/functions/, netlify/lib/) no hace nada.
// Si GitHub solo recibió archivos sueltos en la raíz, los coloca en su carpeta.
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LAYOUT = {
  public: ["index.html", "sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
  "netlify/functions": ["telegram-background.mjs", "job-background.mjs", "tick.mjs", "plan.mjs", "setup.mjs"],
  "netlify/lib": ["common.mjs", "agent.mjs", "seed.mjs", "system-prompt.mjs"],
};

const faltan = [];
for (const [dir, files] of Object.entries(LAYOUT)) {
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const dest = join(dir, f);
    if (existsSync(dest)) continue;
    if (existsSync(f)) {
      copyFileSync(f, dest);
      console.log(`colocado ${f} -> ${dest}`);
    } else {
      faltan.push(dest);
    }
  }
}
if (faltan.length) {
  console.error("FALTAN ARCHIVOS EN EL REPOSITORIO:\n  " + faltan.join("\n  "));
  process.exit(1);
}
console.log("Estructura correcta.");
