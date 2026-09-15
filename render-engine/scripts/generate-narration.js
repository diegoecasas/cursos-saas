#!/usr/bin/env node
/**
 * Genera un clip de narración por beat de un LessonScript, llamando a la
 * función de Modal (OmniVoice en GPU T4) en vez de correr PyTorch local.
 * Reemplaza, dentro del Sandbox, lo que generate-narration.py hace a mano
 * en teach-animado — mismo manifest.json de salida, mismo contrato con
 * LessonVideo.tsx.
 *
 * Uso:
 *   node scripts/generate-narration.js src/content/0001-....json
 *
 * Requiere MODAL_NARRATION_URL y NARRATION_SHARED_SECRET en el entorno.
 */
const fs = require("fs");
const path = require("path");

const VOICE = "female, moderate pitch";

async function main() {
  const scriptPath = process.argv[2];
  if (!scriptPath) {
    console.error("uso: generate-narration.js <lesson-script.json>");
    process.exit(1);
  }

  const url = process.env.MODAL_NARRATION_URL;
  const secret = process.env.NARRATION_SHARED_SECRET;
  if (!url || !secret) {
    throw new Error("MODAL_NARRATION_URL / NARRATION_SHARED_SECRET no están seteados");
  }

  const lesson = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
  const lessonId = lesson.id;
  const beats = lesson.beats.map((b) => b.narration);

  const outDir = path.join(__dirname, "..", "public", "narration", lessonId);
  fs.mkdirSync(outDir, { recursive: true });

  // Si el Sandbox se reinició a mitad de camino (idle timeout) y ya
  // tenemos el manifest de una corrida anterior, no volvemos a pedirle
  // audio a Modal — es barato, pero no hay razón para repetirlo.
  const manifestPath = path.join(outDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    console.log(`[narracion] ya existe ${manifestPath} — salto este paso.`);
    return;
  }

  console.log(`[narracion] pidiendo ${beats.length} beats a Modal...`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ beats }),
    // La primera llamada tras un cold start puede tardar ~1-2 min (carga
    // del modelo); llamadas siguientes son mucho más rápidas.
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  if (!res.ok) {
    throw new Error(`Modal respondió ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();

  const manifest = { lessonId, voice: VOICE, beats: [] };
  for (const b of data.beats) {
    const filename = `beat-${b.index}.wav`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(b.wav_base64, "base64"));
    manifest.beats.push({ index: b.index, file: filename, seconds: b.seconds });
    console.log(`    -> ${filename} (${b.seconds}s)`);
  }

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`[narracion] manifest escrito en ${outDir}/manifest.json`);
}

main().catch((err) => {
  console.error("[narracion] error:", err);
  process.exit(1);
});
