import sys, io, json, base64, requests
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

FAL_KEY = "2def44b9-e57c-4600-8370-ebf9d948787a:1f3138a0e84bcff05ca5e8c56ab2571d"

headers = {
    "Authorization": "Key " + FAL_KEY,
    "Content-Type": "application/json",
}

NEGATIVE = (
    "blur, distort, low quality, morphing face, distorted hands, extra fingers, "
    "warped limbs, uncanny valley, fast motion, dramatic camera movement, zoom, "
    "pan, text overlay, watermark, logo appearing, glitch, unnatural movement, "
    "cartoon, anime, blurry, deformed hands, extra limbs, face changing, "
    "shifting facial features, warping skin"
)

source_path = r"C:\Users\adamd\.cursor\projects\c-Users-adamd-Desktop-Simon-wrenchreadymobile-com\assets\rotor-video-source-v9.png"

img = Image.open(source_path).convert("RGB")
buf = io.BytesIO()
img.save(buf, format="JPEG", quality=92)
img_b64 = base64.b64encode(buf.getvalue()).decode()

prompt = (
    "Extremely subtle cinematic motion. The mechanic kneels beside the truck, "
    "slowly rotating the brake rotor with his left hand while his right hand "
    "rests on the caliper. Very gentle, barely perceptible breathing motion. "
    "His head stays angled down, focused on the rotor. His face remains "
    "completely still and stable — no expression changes, no head movement. "
    "Only his left hand slowly turns the rotor. Camera is completely static. "
    "Soft warm afternoon light with gentle pine tree shadows swaying slightly. "
    "Photorealistic professional automotive service scene. Extremely minimal "
    "movement. Face does not move or change at all."
)

payload = {
    "prompt": prompt,
    "start_image_url": "data:image/jpeg;base64," + img_b64,
    "duration": "5",
    "generate_audio": False,
    "negative_prompt": NEGATIVE,
    "cfg_scale": 0.5,
}

ENDPOINT = "https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video"

print("Submitting rotor-inspection clip...")
resp = requests.post(ENDPOINT, headers=headers, json=payload, timeout=60)
result = resp.json()
rid = result.get("request_id", "FAILED: " + json.dumps(result)[:200])
print("Status " + str(resp.status_code) + " -> request_id: " + rid)

with open("fal-rotor-task.json", "w") as f:
    json.dump({"rotor-inspection": rid}, f, indent=2)

print("Task ID saved to fal-rotor-task.json")
