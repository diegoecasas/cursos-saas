#!/usr/bin/env python3
"""Genera las fotos/video fotorrealistas de UNA lección, vía kie.ai, a
partir de su plan visual (escrito por lib/generation/startJob.ts junto al
JSON de la lección como "<lesson-id>.visuals.json").

Cada lección puede ser de cualquier tema — el plan trae los prompts en
inglés ya decididos por Claude (planLessonVisuals), este script sólo
ejecuta las llamadas a kie.ai y guarda los archivos donde el motor de
Remotion los espera (public/generated/<lesson-id>/...).

Uso:
    python3 scripts/generate-visuals.py src/content/<lesson-id>.json

Requiere KIE_API_KEY en el entorno.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import kie

ROOT = Path(__file__).resolve().parent.parent

# Sufijo común aplicado a todo prompt de imagen — genérico, no atado a
# ningún tema específico.
NEG = (
    "photorealistic, natural lighting, shallow depth of field, complete "
    "anatomy with no cropped limbs. No visible text of any kind, no "
    "watermark, no signature, no logo, no brand names, no celebrities."
)

IMG_MODEL = "nano-banana-pro"
VIDEO_MODEL = "bytedance/seedance-2"


def img_input(prompt: str) -> dict:
    return {
        "prompt": f"{prompt}. {NEG}",
        "aspect_ratio": "16:9",
        "resolution": "2K",
        "output_format": "jpg",
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("uso: generate-visuals.py <lesson-script.json>", file=sys.stderr)
        sys.exit(1)

    script_path = Path(sys.argv[1])
    lesson = json.loads(script_path.read_text())
    lesson_id = lesson["id"]

    visuals_path = script_path.parent / f"{script_path.stem}.visuals.json"
    if not visuals_path.exists():
        print(f"[visuales] no hay {visuals_path.name} — esta lección no lleva fotos.")
        return
    plan = json.loads(visuals_path.read_text())

    out_dir = ROOT / "public" / "generated" / lesson_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Si una corrida anterior ya dejó fotos/video generados para esta
    # lección (Sandbox reiniciado, o kie.ai se quedó sin créditos a mitad de
    # camino), no los volvemos a pedir — cuestan créditos reales. Sólo
    # retomamos lo que falta o falló.
    manifest_path = out_dir / "manifest.json"
    manifest: dict = {"images": {}, "video": None, "total_credits": 0}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        done_labels = {
            label for label, r in manifest.get("images", {}).items() if "error" not in r
        }
        video_done = manifest.get("video") and "error" not in manifest["video"]
        if video_done:
            print(f"[visuales] ya existe {manifest_path} completo — salto este paso.")
            return
        print(
            f"[visuales] retomando {manifest_path.name} — ya generadas: {sorted(done_labels) or 'ninguna'}."
        )
    else:
        done_labels = set()

    tasks = []
    hook = plan.get("hook") or {}
    if hook.get("include") and "hook" not in done_labels:
        tasks.append(
            {
                "model": IMG_MODEL,
                "input": img_input(hook["prompt"]),
                "out": str(out_dir / "hook.jpg"),
                "label": "hook",
            }
        )
    cta = plan.get("cta") or {}
    if cta.get("include") and "cta" not in done_labels:
        tasks.append(
            {
                "model": IMG_MODEL,
                "input": img_input(cta["prompt"]),
                "out": str(out_dir / "cta.jpg"),
                "label": "cta",
            }
        )
    for i, step in enumerate(plan.get("steps") or []):
        label = f"step-{i + 1}"
        if step and step.get("include") and label not in done_labels:
            tasks.append(
                {
                    "model": IMG_MODEL,
                    "input": img_input(step["prompt"]),
                    "out": str(out_dir / f"{label}.jpg"),
                    "label": label,
                }
            )

    if tasks:
        print(f"[visuales] generando {len(tasks)} foto(s) (batch, concurrency=3)...")
        results = kie.run_batch(tasks, concurrency=3)
        for r in results:
            if "error" in r:
                print(f"    ERROR {r['label']}: {r['error']}")
                manifest["images"][r["label"]] = {"error": r["error"]}
                continue
            manifest["images"][r["label"]] = r
            manifest["total_credits"] += r["credits_consumed"]
            print(f"    -> {r['path']} ({r['credits_consumed']} créditos)")
    else:
        print("[visuales] no hay fotos pendientes (ya generadas o el plan no pidió ninguna).")

    hook_photo_url = manifest.get("images", {}).get("hook", {}).get("url")

    if hook.get("include") and hook_photo_url:
        motion = hook.get("motion") or "subtle natural motion, stable smooth camera"
        print("[visuales] video del hook (seedance)...")
        video_input = {
            "prompt": f"{hook['prompt']}. {motion}, photorealistic.",
            "first_frame_url": hook_photo_url,
            "aspect_ratio": "16:9",
            "resolution": "1080p",
            "duration": 5,
            "generate_audio": False,
        }
        try:
            rv = kie.run_generation(VIDEO_MODEL, video_input, out_dir / "hook.mp4")
            manifest["video"] = rv
            manifest["total_credits"] += rv["credits_consumed"]
            print(f"    -> {rv['path']} ({rv['credits_consumed']} créditos)")
        except kie.KieError as e:
            print(f"    ERROR video: {e}")
            manifest["video"] = {"error": str(e)}

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nTotal créditos consumidos: {manifest['total_credits']}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
