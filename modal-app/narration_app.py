"""App de Modal para la narración del Director de Cursos (OmniVoice, GPU).

Reemplaza la parte de teach-animado/scripts/generate-narration.py que antes
iba a correr dentro del Vercel Sandbox en CPU. Acá corre en una GPU T4 y
cachea los pesos del modelo en un Volume — no se vuelven a descargar en
cada curso.

Deploy:
    .venv/bin/modal deploy narration_app.py

Uso (HTTP, desde el driver del Sandbox o cualquier cliente):
    POST <url del endpoint>
    Authorization: Bearer <NARRATION_SHARED_SECRET>
    { "beats": ["texto del beat 1", "texto del beat 2", ...] }

    -> { "beats": [{ "index": 0, "wav_base64": "...", "seconds": 9.04 }, ...] }
"""

import base64
import io
import os

import modal
from fastapi import HTTPException, Request

MODEL_ID = "k2-fsa/OmniVoice"
# Misma voz que se usó en el piloto generado a mano — un solo lugar para
# cambiarla y que todo el catálogo quede consistente.
VOICE = "female, moderate pitch"
SAMPLE_RATE = 24000

app = modal.App("director-narration")

weights_volume = modal.Volume.from_name("omnivoice-weights", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch",
        "torchaudio",
        "omnivoice",
        "soundfile",
        "fastapi[standard]",
    )
    .env({"HF_HOME": "/cache/huggingface"})
)

auth_secret = modal.Secret.from_name("director-narration-auth")


@app.cls(
    image=image,
    gpu="T4",
    volumes={"/cache": weights_volume},
    timeout=900,
    scaledown_window=180,
)
class Narrator:
    @modal.enter()
    def load_model(self):
        import torch
        from omnivoice import OmniVoice

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = OmniVoice.from_pretrained(MODEL_ID, device_map=device)
        # Persiste los pesos recién descargados en el Volume — sólo importa
        # la primera vez; en cold starts siguientes esto es un no-op rápido.
        weights_volume.commit()

    @modal.method()
    def generate_beat(self, text: str) -> dict:
        import soundfile as sf

        audio = self.model.generate(text=text, instruct=VOICE)
        clip = audio[0]
        buf = io.BytesIO()
        sf.write(buf, clip, SAMPLE_RATE, format="WAV")
        return {
            "wav_base64": base64.b64encode(buf.getvalue()).decode("ascii"),
            "seconds": round(len(clip) / SAMPLE_RATE, 2),
        }


@app.function(image=image, secrets=[auth_secret], timeout=900)
@modal.fastapi_endpoint(method="POST")
async def generate(request: Request):
    expected = f"Bearer {os.environ['NARRATION_SHARED_SECRET']}"
    if request.headers.get("authorization") != expected:
        raise HTTPException(status_code=401, detail="unauthorized")

    body = await request.json()
    beats = body.get("beats")
    if not isinstance(beats, list) or not beats:
        raise HTTPException(status_code=400, detail="falta 'beats' (lista de texto)")

    narrator = Narrator()
    results = [r async for r in narrator.generate_beat.map.aio(beats)]
    # El commit del Volume pasa dentro de Narrator (que sí lo tiene montado),
    # no acá — este endpoint web nunca tuvo el volumen adjunto.
    return {"beats": [{"index": i, **r} for i, r in enumerate(results)]}
