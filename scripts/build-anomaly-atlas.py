from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "characters" / "anomaly-ghost-source.png"
ATLAS = ROOT / "assets" / "characters" / "anomaly-ghost-atlas.png"
PREVIEW = ROOT / "assets" / "characters" / "anomaly-ghost-atlas-preview.png"

COLS = 4
ROWS = 9
FRAME = 128
PADDING = 12


def is_checker_pixel(r, g, b):
    neutral = max(r, g, b) - min(r, g, b) <= 8
    return neutral and r >= 190 and g >= 190 and b >= 190


def is_subject_pixel(r, g, b):
    return max(r, g, b) - min(r, g, b) > 10 or max(r, g, b) < 190


def matte_cell(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if is_checker_pixel(r, g, b):
                pixels[x, y] = (r, g, b, 0)
                continue
            cyan_bias = max(0, g - r) + max(0, b - r)
            alpha = min(255, 135 + cyan_bias * 3)
            pixels[x, y] = (r, g, b, alpha)
    return rgba


def bounding_box(image):
    alpha = image.getchannel("A")
    return alpha.getbbox()


def keep_largest_component(image):
    pixels = image.load()
    width, height = image.size
    seen = set()
    components = []
    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y][3] == 0:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            component = []
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in seen:
                        continue
                    if pixels[nx, ny][3] == 0:
                        continue
                    seen.add((nx, ny))
                    stack.append((nx, ny))
            components.append(component)
    if not components:
        return image
    largest = set(max(components, key=len))
    cleaned = Image.new("RGBA", image.size, (0, 0, 0, 0))
    cleaned_pixels = cleaned.load()
    for x, y in largest:
        cleaned_pixels[x, y] = pixels[x, y]
    return cleaned


def normalize_frame(cell):
    matted = keep_largest_component(matte_cell(cell))
    box = bounding_box(matted)
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    if not box:
        return frame
    sprite = matted.crop(box)
    scale = min((FRAME - PADDING * 2) / sprite.width, (FRAME - PADDING * 2) / sprite.height)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    sprite = sprite.resize(size, Image.Resampling.LANCZOS)
    frame.alpha_composite(sprite, ((FRAME - size[0]) // 2, (FRAME - size[1]) // 2))
    return frame


def build_preview(atlas):
    preview = Image.new("RGBA", (COLS * FRAME, ROWS * FRAME), (7, 11, 16, 255))
    checker_a = (16, 24, 30, 255)
    checker_b = (11, 16, 21, 255)
    for y in range(ROWS * FRAME):
        for x in range(COLS * FRAME):
            preview.putpixel((x, y), checker_a if ((x // 16) + (y // 16)) % 2 else checker_b)
    preview.alpha_composite(atlas)
    return preview


def find_sheet_bounds(source):
    pixels = source.load()
    xs = []
    ys = []
    for y in range(source.height):
        for x in range(source.width):
            if is_subject_pixel(*pixels[x, y]):
                xs.append(x)
                ys.append(y)
    if not xs:
        return (0, 0, source.width, source.height)
    pad = 12
    return (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(source.width, max(xs) + pad + 1),
        min(source.height, max(ys) + pad + 1),
    )


def main():
    source = Image.open(SOURCE).convert("RGB")
    sheet_left, sheet_top, sheet_right, sheet_bottom = find_sheet_bounds(source)
    cell_w = (sheet_right - sheet_left) / COLS
    cell_h = (sheet_bottom - sheet_top) / ROWS
    atlas = Image.new("RGBA", (COLS * FRAME, ROWS * FRAME), (0, 0, 0, 0))

    for row in range(ROWS):
        for col in range(COLS):
            left = round(sheet_left + col * cell_w)
            top = round(sheet_top + row * cell_h)
            right = round(sheet_left + (col + 1) * cell_w)
            bottom = round(sheet_top + (row + 1) * cell_h)
            cell = source.crop((left, top, right, bottom))
            frame = normalize_frame(cell)
            atlas.alpha_composite(frame, (col * FRAME, row * FRAME))

    atlas.save(ATLAS)
    build_preview(atlas).save(PREVIEW)
    print(f"Wrote {ATLAS.relative_to(ROOT)}")
    print(f"Wrote {PREVIEW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
