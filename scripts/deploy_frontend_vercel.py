#!/usr/bin/env python3
"""Deploy the AMIL Next.js frontend to Vercel via the official REST API.

Usage:
    VERCEL_TOKEN=xxxx python3 scripts/deploy_frontend_vercel.py

Uploads every frontend source file (excluding tests, env files, node_modules),
creates a production deployment for project `amil-legal`, and polls until READY.
"""
import hashlib
import json
import os
import sys
import time
import urllib.request
import urllib.error

API = "https://api.vercel.com"
PROJECT_ID = "prj_eXRkflLT54vMBfTKHAydX1GWhPIa"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
EXCLUDE_DIRS = {"node_modules", ".next", "tests", ".vercel", ".git"}
EXCLUDE_FILES = {".env", ".env.local", ".DS_Store"}

TOKEN = os.environ.get("VERCEL_TOKEN", "").strip()
TEAM = os.environ.get("VERCEL_TEAM_ID", "").strip()
if not TOKEN:
    sys.exit("Set VERCEL_TOKEN (create one at https://vercel.com/account/tokens).")


def q(path):
    return f"{API}{path}{'&' if '?' in path else '?'}teamId={TEAM}" if TEAM else f"{API}{path}"


def call(method, path, body=None, headers=None, raw=False):
    h = {"Authorization": f"Bearer {TOKEN}"}
    h.update(headers or {})
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    if body is not None and not raw:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(q(path), data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()[:800]}")


files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn in EXCLUDE_FILES:
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
        with open(full, "rb") as fh:
            content = fh.read()
        sha = hashlib.sha1(content).hexdigest()
        print(f"upload {rel} ({len(content)} B)")
        call("POST", "/v2/files", content, {
            "Content-Type": "application/octet-stream",
            "x-vercel-digest": sha,
            "Content-Length": str(len(content)),
        }, raw=True)
        files.append({"file": rel, "sha": sha, "size": len(content)})

print(f"\nCreating production deployment with {len(files)} files...")
dep = call("POST", "/v13/deployments?skipAutoDetectionConfirmation=1&forceNew=1", {
    "name": "amil-legal",
    "project": PROJECT_ID,
    "target": "production",
    "files": files,
    "projectSettings": {"framework": "nextjs"},
})
dep_id = dep.get("id")
print("Deployment:", dep_id, "https://" + str(dep.get("url")))

for _ in range(120):
    time.sleep(5)
    d = call("GET", f"/v13/deployments/{dep_id}")
    state = d.get("readyState") or d.get("status")
    print("state:", state)
    if state == "READY":
        print("\nLIVE: https://" + d.get("url"))
        for a in d.get("alias", []) or []:
            print("ALIAS: https://" + a)
        sys.exit(0)
    if state in ("ERROR", "CANCELED"):
        sys.exit(f"Build failed: {d.get('errorMessage')} — check https://vercel.com dashboard logs")
sys.exit("Timed out waiting for READY")
