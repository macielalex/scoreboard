#!/usr/bin/env python3
"""Gera ícones PNG para o PWA sem dependências externas."""

import struct
import zlib
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")


def png_chunk(chunk_type, data):
    chunk = chunk_type + data
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", crc)


def write_png(path, size, pixels):
    """pixels: lista de (r,g,b,a) por linha, row-major."""
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


def draw_icon(size, maskable=False):
    pixels = []
    cx, cy = size / 2, size / 2
    pad = size * 0.12 if maskable else size * 0.05
    radius = size / 2 - pad

    for y in range(size):
        for x in range(size):
            dx, dy = x - cx + 0.5, y - cy + 0.5
            dist = math.sqrt(dx * dx + dy * dy)

            if dist > radius:
                if maskable:
                    pixels.append((13, 17, 23, 255))
                else:
                    pixels.append((0, 0, 0, 0))
                continue

            # Fundo laranja escuro
            r, g, b = 249, 115, 22

            # Padrão de linhas da bola de vôlei
            angle = math.atan2(dy, dx)
            norm = dist / radius
            wave = abs(math.sin(angle * 3 + norm * 4))
            wave2 = abs(math.cos(angle * 2 - norm * 5))
            line = min(wave, wave2)

            if line < 0.08:
                r, g, b = 255, 255, 255
            elif line < 0.14:
                t = (line - 0.08) / 0.06
                r = int(lerp(255, r, t))
                g = int(lerp(255, g, t))
                b = int(lerp(255, b, t))

            # Sombra suave na borda
            edge = 1 - (radius - dist) / (radius * 0.08)
            if edge > 0:
                r = int(r * (1 - edge * 0.25))
                g = int(g * (1 - edge * 0.25))
                b = int(b * (1 - edge * 0.25))

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
