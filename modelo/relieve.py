"""Baja el relieve (teselas Terrarium de AWS, zoom 12, ~32 m) de la precordillera de Santiago y lo deja a ~100 m.
Uso: python3 relieve.py  → relieve.json"""
import urllib.request, json, math, os
from pngdec import leer
Z = 12; X0, X1, Y0, Y1 = 1244, 1250, 2449, 2455
os.makedirs('teselas', exist_ok=True)
def bajar(x, y):
    f = f'teselas/{Z}_{x}_{y}.png'
    if not os.path.exists(f):
        for k in range(5):
            try: open(f, 'wb').write(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', timeout=30).read()); break
            except Exception as e: print('reintento', x, y, e)
    return f
W = (X1 - X0 + 1) * 256; H = (Y1 - Y0 + 1) * 256
el = [[0.0] * W for _ in range(H)]
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        w, h, ct, px = leer(bajar(x, y))
        for j in range(256):
            for i in range(256):
                r, g, b, _ = px(i, j)
                el[(y - Y0) * 256 + j][(x - X0) * 256 + i] = r * 256 + g + b / 256 - 32768
# promedio 3x3 → ~100 m
F = 3; h2, w2 = H // F, W // F
z = [[sum(el[r * F + a][c * F + b] for a in range(F) for b in range(F)) / F / F for c in range(w2)] for r in range(h2)]
n = 2 ** Z
lon = lambda c: (X0 * 256 + (c + 0.5) * F) / 256 / n * 360 - 180
lat = lambda r: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (Y0 * 256 + (r + 0.5) * F) / 256 / n))))
json.dump({'lats': [round(lat(r), 6) for r in range(h2)], 'lons': [round(lon(c), 6) for c in range(w2)], 'z': [[round(v) for v in fila] for fila in z]}, open('relieve.json', 'w'))
print('grilla', h2, 'x', w2, 'lat', round(lat(0), 3), round(lat(h2 - 1), 3), 'lon', round(lon(0), 3), round(lon(w2 - 1), 3))
