#!/usr/bin/env python3
"""
kie.py — helper mínimo para kie.ai (stdlib only).

Uso rápido desde la línea de comandos:

  python kie.py credit
  python kie.py upload /path/to/file.png --upload-path brand-assets
  python kie.py run --model MODEL --input-json '{"prompt":"..."}' --out /path/to/out.png
  python kie.py batch --tasks tasks.json --concurrency 3

Env var requerida: KIE_API_KEY
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import mimetypes
import os
import random
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

API_BASE = "https://api.kie.ai/api/v1"
UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload"
CREATE_ENDPOINT = f"{API_BASE}/jobs/createTask"
RECORD_ENDPOINT = f"{API_BASE}/jobs/recordInfo"
CREDIT_ENDPOINT = f"{API_BASE}/chat/credit"

DEFAULT_TIMEOUT = 900          # 15 min per task
DEFAULT_POLL_MIN = 3
DEFAULT_POLL_MAX = 8
LOG_FILE = Path(os.environ.get("KIE_LOG_FILE", str(Path(__file__).resolve().parent.parent / "_logs" / "kie.log")))


class KieError(Exception):
    pass


def _key() -> str:
    k = os.environ.get("KIE_API_KEY")
    if not k:
        raise KieError("KIE_API_KEY not set in environment")
    return k


def _log(event: str, **fields: Any) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    rec = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "event": event, **fields}
    with LOG_FILE.open("a") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def _http_json(method: str, url: str, body: dict | None = None, timeout: int = 60) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {_key()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8")
        except Exception:
            raw = str(e)
        raise KieError(f"HTTP {e.code} on {url}: {raw}") from e
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise KieError(f"Non-JSON response from {url}: {raw[:500]}") from e


# ---------- Public helpers ----------

def get_credit() -> int | float:
    resp = _http_json("GET", CREDIT_ENDPOINT)
    if resp.get("code") != 200:
        raise KieError(f"credit call failed: {resp}")
    return resp.get("data")


def create_task(model: str, input_dict: dict) -> str:
    payload = {"model": model, "input": input_dict}
    resp = _http_json("POST", CREATE_ENDPOINT, payload)
    if resp.get("code") != 200:
        raise KieError(f"createTask failed: {resp}")
    task_id = resp["data"]["taskId"]
    _log("task_created", task_id=task_id, model=model, input=input_dict)
    return task_id


def poll_task(task_id: str, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Poll until success/fail. Returns dict with keys: result_urls, credits_consumed, raw."""
    deadline = time.time() + timeout
    delay = DEFAULT_POLL_MIN
    last_state = None
    while time.time() < deadline:
        resp = _http_json("GET", f"{RECORD_ENDPOINT}?taskId={task_id}")
        if resp.get("code") != 200:
            raise KieError(f"recordInfo failed: {resp}")
        data = resp.get("data") or {}
        state = data.get("state")
        if state != last_state:
            _log("task_state", task_id=task_id, state=state)
            last_state = state
        if state == "success":
            credits = data.get("creditsConsumed") or 0
            result_json_str = data.get("resultJson") or "{}"
            try:
                result = json.loads(result_json_str) if isinstance(result_json_str, str) else result_json_str
            except json.JSONDecodeError:
                result = {}
            urls = result.get("resultUrls") or []
            _log("task_success", task_id=task_id, credits=credits, urls=urls)
            return {"result_urls": urls, "credits_consumed": credits, "raw": data}
        if state == "fail":
            _log("task_fail", task_id=task_id, raw=data)
            raise KieError(f"task {task_id} failed: {data.get('failMsg') or data}")
        # waiting/queuing/generating
        time.sleep(delay + random.uniform(0, 1.5))
        delay = min(delay * 1.4, DEFAULT_POLL_MAX)
    raise KieError(f"task {task_id} timed out after {timeout}s (last state={last_state})")


def download(url: str, dest: str | Path) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "kie-helper/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r, dest.open("wb") as f:
        while True:
            chunk = r.read(1024 * 64)
            if not chunk:
                break
            f.write(chunk)
    _log("downloaded", url=url, dest=str(dest), bytes=dest.stat().st_size)
    return dest


def upload_file(local_path: str | Path, upload_path: str = "brand-assets") -> str:
    """Multipart upload; returns downloadUrl."""
    local_path = Path(local_path)
    boundary = f"----kie{uuid.uuid4().hex}"
    mime = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    with local_path.open("rb") as f:
        file_bytes = f.read()
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="uploadPath"\r\n\r\n{upload_path}\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{local_path.name}"\r\nContent-Type: {mime}\r\n\r\n'.encode(),
        file_bytes,
        f'\r\n--{boundary}--\r\n'.encode(),
    ]
    body = b"".join(parts)
    req = urllib.request.Request(
        UPLOAD_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {_key()}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json,text/plain,*/*",
            "Origin": "https://kie.ai",
            "Referer": "https://kie.ai/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise KieError(f"upload HTTP {e.code}: {e.read().decode('utf-8', 'ignore')}") from e
    if resp.get("code") != 200:
        raise KieError(f"upload failed: {resp}")
    url = resp["data"]["downloadUrl"]
    _log("uploaded", local=str(local_path), url=url)
    return url


def run_generation(model: str, input_dict: dict, out_path: str | Path, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Full cycle: create → poll → download the FIRST result url to out_path."""
    out_path = Path(out_path)
    task_id = create_task(model, input_dict)
    result = poll_task(task_id, timeout=timeout)
    urls = result["result_urls"]
    if not urls:
        raise KieError(f"task {task_id} returned no result urls")
    download(urls[0], out_path)
    return {
        "task_id": task_id,
        "path": str(out_path),
        "credits_consumed": result["credits_consumed"],
        "extra_urls": urls[1:],
        "url": urls[0],
    }


def run_batch(tasks: list[dict], concurrency: int = 3) -> list[dict]:
    """
    tasks: list of dicts with keys {model, input, out} — same args as run_generation.
    Returns list of results in same order; failed entries include {"error": ...}.
    """
    results: list[dict | None] = [None] * len(tasks)

    def _one(i: int, t: dict) -> tuple[int, dict]:
        label = t.get("label") or Path(t["out"]).name
        _log("batch_start", label=label, model=t["model"])
        try:
            r = run_generation(t["model"], t["input"], t["out"], timeout=t.get("timeout", DEFAULT_TIMEOUT))
            r["label"] = label
            _log("batch_ok", label=label, credits=r["credits_consumed"], path=r["path"])
            return i, r
        except Exception as e:
            _log("batch_err", label=label, error=str(e))
            return i, {"label": label, "error": str(e), "out": t["out"], "model": t["model"], "input": t["input"]}

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(_one, i, t) for i, t in enumerate(tasks)]
        for f in concurrent.futures.as_completed(futs):
            i, r = f.result()
            results[i] = r
    return [r for r in results if r is not None]


# ---------- CLI ----------

def _cli() -> int:
    p = argparse.ArgumentParser(prog="kie", description="kie.ai helper")
    sp = p.add_subparsers(dest="cmd", required=True)

    sp.add_parser("credit", help="Get credit balance")

    sp_up = sp.add_parser("upload", help="Upload a local file")
    sp_up.add_argument("path")
    sp_up.add_argument("--upload-path", default="brand-assets")

    sp_run = sp.add_parser("run", help="Create+poll+download one generation")
    sp_run.add_argument("--model", required=True)
    sp_run.add_argument("--input-json", required=True, help="JSON string for input")
    sp_run.add_argument("--out", required=True)
    sp_run.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)

    sp_batch = sp.add_parser("batch", help="Run tasks defined in a JSON file (list of {model,input,out})")
    sp_batch.add_argument("--tasks", required=True)
    sp_batch.add_argument("--concurrency", type=int, default=3)

    args = p.parse_args()

    if args.cmd == "credit":
        print(json.dumps({"credit": get_credit()}))
        return 0
    if args.cmd == "upload":
        print(json.dumps({"url": upload_file(args.path, args.upload_path)}))
        return 0
    if args.cmd == "run":
        input_dict = json.loads(args.input_json)
        r = run_generation(args.model, input_dict, args.out, timeout=args.timeout)
        print(json.dumps(r))
        return 0
    if args.cmd == "batch":
        tasks = json.loads(Path(args.tasks).read_text())
        results = run_batch(tasks, concurrency=args.concurrency)
        print(json.dumps({
            "ok": [r for r in results if "error" not in r],
            "errors": [r for r in results if "error" in r],
            "total_credits": sum(r.get("credits_consumed", 0) for r in results if "error" not in r),
        }, indent=2))
        return 0
    return 1


if __name__ == "__main__":
    try:
        sys.exit(_cli())
    except KieError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(2)
