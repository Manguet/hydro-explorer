#!/usr/bin/env python3
"""Génère deux icônes PNG PWA sans dépendance externe."""
import struct, zlib, os

def make_png(size, r, g, b):
    """PNG RGBA solid color, format correct (filter byte 0 par scanline)."""
    raw = bytearray()
    for _ in range(size):
        raw.append(0)                          # filtre PNG type None
        for _ in range(size):
            raw.extend([r, g, b, 255])         # RGBA opaque
    # Chunks PNG
    def chunk(tag, data):
        payload = tag + data
        return (struct.pack('>I', len(data)) + payload +
                struct.pack('>I', zlib.crc32(payload) & 0xffffffff))
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', zlib.compress(bytes(raw))) +
            chunk(b'IEND', b''))

os.makedirs('src/assets', exist_ok=True)
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
    path = f'src/assets/{name}'
    with open(path, 'wb') as f:
        f.write(make_png(size, 13, 110, 253))   # #0d6efd bleu primaire
    print(f'✓ {path}')
