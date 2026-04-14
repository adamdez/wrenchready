"""
Build mobile hero loop with per-clip crop offsets so Simon stays centered.
Landscape source is 1920x1080, portrait target is 1080x1920.
Crop width from landscape = 1080 * 9/16 = 607px.
Default center offset = (1920 - 607) / 2 = 656.
"""
import subprocess, os, sys, shutil

sys.stdout.reconfigure(line_buffering=True)

BASE = r"c:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\public"
TEMP = r"c:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\temp-mobile"
OUTPUT = os.path.join(BASE, "wrenchready-hero-loop-mobile.mp4")

CROP_W = 607
FRAME_W = 1920

clips = [
    {"file": "wrenchready-v3-oil-pour.mp4",           "x_offset": 656},   # center - Simon centered
    {"file": "wrenchready-v3-hood-close.mp4",          "x_offset": 1000},  # shift right - Simon on right
    {"file": "wrenchready-v3-clipboard-notes.mp4",     "x_offset": 656},   # center - Simon centered
    {"file": "wrenchready-v3-rotor-inspection.mp4",    "x_offset": 450},   # shift left - Simon on left
]

os.makedirs(TEMP, exist_ok=True)

normalized = []
for i, clip in enumerate(clips):
    src = os.path.join(BASE, clip["file"])
    out = os.path.join(TEMP, f"mobile_{i}.mp4")
    xo = clip["x_offset"]
    vf = (
        f"scale=1920:1080:force_original_aspect_ratio=decrease,"
        f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,"
        f"eq=saturation=0.85:brightness=0.02,"
        f"crop={CROP_W}:1080:{xo}:0,"
        f"scale=1080:1920"
    )
    cmd = [
        "ffmpeg", "-y", "-i", src,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-an", "-t", "5",
        out,
    ]
    print(f"Clip {i+1}/4: {clip['file']} (x_offset={xo})")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr[-300:]}")
    normalized.append(out)

FADE_DUR = 0.75
clip_dur = 5.0

def xfade_two(input1, input2, offset, output_path):
    cmd = [
        "ffmpeg", "-y", "-i", input1, "-i", input2,
        "-filter_complex",
        f"[0:v][1:v]xfade=transition=fade:duration={FADE_DUR}:offset={offset}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-an", output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  xfade error: {result.stderr[-300:]}")

print("\nCross-dissolving 1+2...")
m01 = os.path.join(TEMP, "m01.mp4")
xfade_two(normalized[0], normalized[1], clip_dur - FADE_DUR, m01)

print("Cross-dissolving (1+2)+3...")
m012 = os.path.join(TEMP, "m012.mp4")
xfade_two(m01, normalized[2], 2 * clip_dur - 2 * FADE_DUR, m012)

print("Cross-dissolving (1+2+3)+4...")
m0123 = os.path.join(TEMP, "m0123.mp4")
xfade_two(m012, normalized[3], 3 * clip_dur - 3 * FADE_DUR, m0123)

print("\nFinal compression + grain...")
cmd = [
    "ffmpeg", "-y", "-i", m0123,
    "-vf", "noise=alls=2:allf=t",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
    OUTPUT,
]
subprocess.run(cmd, capture_output=True)

if os.path.exists(OUTPUT):
    size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", OUTPUT],
        capture_output=True, text=True,
    )
    dur = probe.stdout.strip()
    print(f"\nDone! {OUTPUT}")
    print(f"Size: {size_mb:.1f} MB | Duration: {dur}s")
else:
    print("ERROR: Output not created")

if os.path.exists(TEMP):
    shutil.rmtree(TEMP)
    print("Cleaned up temp directory")
