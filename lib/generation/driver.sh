#!/bin/bash
# Corre esta máquina (ver scripts/run-local-generation.ts) o, en teoría,
# cualquier host con Node/Python/Remotion listos. Escribe todo a Neon y
# Blob directo — no hay nada que leer de vuelta salvo logs. Variables de
# entorno esperadas:
#   DATABASE_URL, KIE_API_KEY, BLOB_READ_WRITE_TOKEN, COURSE_ID, JOB_ID,
#   MODAL_NARRATION_URL, NARRATION_SHARED_SECRET.
#
# La narración no corre acá — vive en Modal (GPU, pesos cacheados). Este
# script sólo instala dependencias de Node, pide fotos/video a kie.ai y
# renderiza con Remotion (necesita Chromium local).
set -euo pipefail
# Asume que el caller ya está parado en la raíz del repo (donde
# render-engine/ es un subdirectorio) — no depende de dónde vive este
# script en disco.
cd render-engine

trap 'node scripts/mark-failed.js "$CURRENT_STEP"' ERR

CURRENT_STEP="instalar dependencias de Node"
echo "[driver] $CURRENT_STEP..."
npm install --no-audit --no-fund

mkdir -p out

for script in src/content/*.json; do
  lesson_id=$(basename "$script" .json)
  echo "[driver] === lección $lesson_id ==="

  CURRENT_STEP="narración vía Modal ($lesson_id)"
  echo "[driver] $CURRENT_STEP..."
  node scripts/generate-narration.js "$script"

  CURRENT_STEP="visuales kie.ai ($lesson_id)"
  echo "[driver] $CURRENT_STEP..."
  python3 scripts/generate-visuals.py "$script"

  CURRENT_STEP="render ($lesson_id)"
  echo "[driver] $CURRENT_STEP..."
  node -e "
    const fs = require('fs');
    const lesson = JSON.parse(fs.readFileSync('$script', 'utf8'));
    fs.writeFileSync('props.json', JSON.stringify({ lesson }));
  "
  npx remotion render LessonVideo "out/${lesson_id}.mp4" --props=props.json

  CURRENT_STEP="publicar ($lesson_id)"
  echo "[driver] $CURRENT_STEP..."
  node scripts/publish-lesson.js "$lesson_id" "$script"
done

CURRENT_STEP="cerrar el job"
node scripts/finish-job.js
echo "[driver] listo."
