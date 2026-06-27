#!/usr/bin/env python3
"""Gera ícones PNG de bola de vôlei para o PWA sem dependências externas."""

import struct
import zlib
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")

# Cores clássicas de bola de vôlei
COLOR_WHITE = (248, 248, 248)
COLOR_BLUE = (22, 115, 224)
COLOR_YELLOW = (255, 193, 7)
COLOR_SEAM = (55, 55, 55)
COLOR_BG_MASK = (13, 17, 23, 255)


def png_chunk(chunk_type, data):
    chunk = chunk_type + data
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", crc)


def write_png(path, size, pixels):
    raw = b""
    for y in range(size):
        raw += b"\x00"
        for x in range(size):
            r, g, b, a = pixels[y * size + x]
            raw += bytes([r, g, b, a])

    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    data = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", compressed)
        + png_chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(data)


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def seam_distance(angle, dist, phase):
    """Curva em forma de costura de painel de vôlei."""
    curve = math.sin(angle * 2.0 + phase) * (0.35 + dist * 0.55)
    return abs(dist - (0.25 + curve))


def draw_icon(size, maskable=False):
    pixels = []
    cx, cy = size / 2, size / 2
    pad = size * 0.10 if maskable else size * 0.04
    radius = size / 2 - pad

    for y in range(size):
        for x in range(size):
            dx, dy = x - cx + 0.5, y - cy + 0.5
            dist = math.sqrt(dx * dx + dy * dy)

            if dist > radius:
                if maskable:
                    pixels.append(COLOR_BG_MASK)
                else:
                    pixels.append((0, 0, 0, 0))
                continue

            angle = math.atan2(dy, dx)
            norm = dist / radius

            # Três painéis clássicos (azul / amarelo / branco)
            sector = (angle + math.pi) / (2 * math.pi) * 3.0
            panel = int(sector) % 3

            if panel == 0:
                base = COLOR_BLUE
            elif panel == 1:
                base = COLOR_YELLOW
            else:
                base = COLOR_WHITE

            # Costuras escuras entre painéis
            s1 = seam_distance(angle, norm, 0.0)
            s2 = seam_distance(angle + 2.094, norm, 1.2)
            s3 = seam_distance(angle - 2.094, norm, 2.1)
            seam = min(s1, s2, s3)

            if seam < 0.045:
                r, g, b = COLOR_SEAM
            elif seam < 0.08:
                t = (seam - 0.045) / 0.035
                r, g, b = mix(COLOR_SEAM, base, t)
            else:
                r, g, b = base

            # Brilho suave (luz vinda do canto superior esquerdo)
            light = max(0, (1 - norm) * 0.12 + (-dx - dy) / (radius * 6))
            r = min(255, int(r + light * 255))
            g = min(255, int(g + light * 255))
            b = min(255, int(b + light * 255))

            # Sombra na borda
            edge = max(0, 1 - (radius - dist) / (radius * 0.1))
            if edge > 0:
                r = int(r * (1 - edge * 0.2))
                g = int(g * (1 - edge * 0.2))
                b = int(b * (1 - edge * 0.2))

            pixels.append((max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), 255))

    return pixels


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    specs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
    ]
    for name, size, maskable in specs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, draw_icon(size, maskable))
        print("Created", path)


if __name__ == "__main__":
    main()
