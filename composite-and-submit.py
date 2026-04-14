import sys, io, json, base64, requests
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ASSETS = r"C:\Users\adamd\.cursor\projects\c-Users-adamd-Desktop-Simon-wrenchreadymobile-com\assets"

img = Image.open(ASSETS + r"\rotor-video-source-v4.png").convert("RGBA")
logo = Image.open(r"c:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\public\wr-logo-full.png").convert("RGBA")

# Logo placement on left chest — from the zoomed inspection, 
# the flat chest area is around x:460-540, y:340-400
logo_w = 70
logo_ratio = logo.size[1] / logo.size[0]
logo_h = int(logo_w * logo_ratio)
logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)

# Dim to look like embroidery on dark navy fabric
logo_arr = np.array(logo_resized).astype(float)
logo_arr[:,:,:3] *= 0.60
logo_arr[:,:,3] *= 0.78
logo_final = Image.fromarray(logo_arr.clip(0, 255).astype(np.uint8))
logo_final = logo_final.filter(ImageFilter.GaussianBlur(0.4))

# Place on the upper-left chest
logo_x = 465
logo_y = 345
img.paste(logo_final, (logo_x, logo_y), logo_final)

composited = img.convert("RGB")
out_path = ASSETS + r"\rotor-video-composited.png"
composited.save(out_path, quality=98)
print(f"Logo composited at ({logo_x},{logo_y}), size {logo_w}x{logo_h}")
print(f"Saved to {out_path}")

# Also save a zoomed check
check = composited.crop((420, 290, 580, 420))
zoomed = check.resize((480, 390), Image.NEAREST)
zoomed.save(ASSETS + r"\rv4_logo_check.png")
print("Saved zoomed logo check")

# Now submit to fal.ai
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

buf = io.BytesIO()
composited.save(buf, format="JPEG", quality=92)
img_b64 = base64.b64encode(buf.getvalue()).decode()

prompt = (
    "Extremely subtle cinematic motion. The mechanic kneels beside the Ford F-150, "
    "his hands resting on the brake rotor and caliper. Very gentle breathing motion "
    "in his torso — barely perceptible rise and fall. His head stays completely still. "
    "His face does not move or change expression. His fingers make a very slight "
    "adjustment on the caliper. Camera is completely static and locked off. Warm "
    "golden afternoon sunlight with soft pine tree shadows shifting very gently in "
    "the background. Photorealistic professional automotive service scene. Extremely "
    "minimal movement. Face remains perfectly stable throughout."
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

print("\nSubmitting rotor-inspection clip to fal.ai...")
resp = requests.post(ENDPOINT, headers=headers, json=payload, timeout=60)
result = resp.json()
rid = result.get("request_id", "FAILED: " + json.dumps(result)[:200])
print(f"Status {resp.status_code} -> request_id: {rid}")

with open(r"c:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\fal-rotor-task.json", "w") as f:
    json.dump({"rotor-inspection": rid}, f, indent=2)

print("Task ID saved to fal-rotor-task.json")
print("Video will take 3-5 minutes to generate. Poll with poll script.")
