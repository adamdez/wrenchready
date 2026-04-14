from PIL import Image
import sys

logo = Image.open(r"public\logo-assets\wr-logo-full@4096.png").convert("RGBA")
w, h = logo.size
print(f"Full logo: {w}x{h}")

icon_region = logo.crop((0, 0, w, int(h * 0.62)))
print(f"Cropped WR monogram: {icon_region.size}")

pad = 20
cw, ch = icon_region.size
square_size = max(cw, ch) + pad * 2
canvas = Image.new("RGBA", (square_size, square_size), (10, 22, 40, 255))
offset_x = (square_size - cw) // 2
offset_y = (square_size - ch) // 2
canvas.paste(icon_region, (offset_x, offset_y), icon_region)

favicon = canvas.resize((32, 32), Image.LANCZOS)
favicon.save(r"src\app\icon.png", format="PNG")
print("Saved src/app/icon.png (32x32)")

apple = canvas.resize((180, 180), Image.LANCZOS)
apple.save(r"src\app\apple-icon.png", format="PNG")
print("Saved src/app/apple-icon.png (180x180)")
