import fal_client, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import os
os.environ["FAL_KEY"] = "2def44b9-e57c-4600-8370-ebf9d948787a:1f3138a0e84bcff05ca5e8c56ab2571d"

with open("fal-rotor-task.json") as f:
    tasks = json.load(f)

rid = tasks["rotor-inspection"]
print(f"Polling request: {rid}")

result = fal_client.result("fal-ai/kling-video/v3/pro/image-to-video", rid)
print(f"Status: completed")
print(f"Result: {json.dumps(result, indent=2)[:2000]}")
