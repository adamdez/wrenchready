import fal_client, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import os
if not os.environ.get("FAL_KEY"):
    raise SystemExit("FAL_KEY is required. Set it in your shell or secret manager before polling fal.ai.")

with open("fal-rotor-task.json") as f:
    tasks = json.load(f)

rid = tasks["rotor-inspection"]
print(f"Polling request: {rid}")

result = fal_client.result("fal-ai/kling-video/v3/pro/image-to-video", rid)
print(f"Status: completed")
print(f"Result: {json.dumps(result, indent=2)[:2000]}")
