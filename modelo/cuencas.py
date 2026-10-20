"""Direcciones de flujo (D8) sobre relieve.json y cuencas que bajan de la precordillera.
Uso: python3 cuencas.py listar   → cauces que cruzan la cota del frente cordillerano
     python3 cuencas.py          → delimita las cuencas de SECTORES y escribe cuencas.json"""
import json, heapq, math, sys
d = json.load(open('relieve.json')); lats, lons, z = d['lats'], d['lons'], d['z']
R, C = len(lats), len(lons)
dx = (lons[1] - lons[0]) * 111.32 * math.cos(math.radians(-33.45)); dy = abs(lats[1] - lats[0]) * 110.57
CELDA = dx * dy  # km²
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
# rellenar depresiones (priority-flood) para que todo drene al borde
f = [[None] * C for _ in range(R)]; pq = []
for r in range(R):
    for c in range(C):
        if r in (0, R - 1) or c in (0, C - 1): f[r][c] = z[r][c]; heapq.heappush(pq, (z[r][c], r, c))
while pq:
    h, r, c = heapq.heappop(pq)
    for a, b in N8:
        i, j = r + a, c + b
        if 0 <= i < R and 0 <= j < C and f[i][j] is None:
            f[i][j] = max(z[i][j], h + 1e-3); heapq.heappush(pq, (f[i][j], i, j))
baja = [[None] * C for _ in range(R)]
for r in range(R):
    for c in range(C):
        best, bs = None, 0
        for a, b in N8:
            i, j = r + a, c + b
            if 0 <= i < R and 0 <= j < C:
                s = (f[r][c] - f[i][j]) / math.hypot(a * dy, b * dx)
                if s > bs: bs, best = s, (i, j)
        baja[r][c] = best
orden = sorted(((f[r][c], r, c) for r in range(R) for c in range(C)), reverse=True)
acc = [[1] * C for _ in range(R)]
for _, r, c in orden:
    t = baja[r][c]
    if t: acc[t[0]][t[1]] += acc[r][c]
celda = lambda la, lo: (min(range(R), key=lambda i: abs(lats[i] - la)), min(range(C), key=lambda j: abs(lons[j] - lo)))

if len(sys.argv) > 1 and sys.argv[1] == 'listar':
    COTA = float(sys.argv[2]) if len(sys.argv) > 2 else 850
    vistos = []
    for r in range(R):
        for c in range(C):
            t = baja[r][c]
            if not t or z[r][c] < COTA or z[t[0]][t[1]] >= COTA: continue
            A = acc[r][c] * CELDA
            if 1.5 <= A <= 400 and -70.62 <= lons[c] <= -70.40: vistos.append((round(lats[r], 4), round(lons[c], 4), round(A, 1), z[r][c]))
    for v in sorted(vistos): print(v)
    sys.exit()

SECTORES = json.load(open('sectores.json'))
rev = {}
for r in range(R):
    for c in range(C):
        t = baja[r][c]
        if t: rev.setdefault(t, []).append((r, c))

def contorno(celdas):
    """Borde de la región raster como polígono (lat, lon), simplificado."""
    S = set(celdas); aristas = {}
    for r, c in S:
        # vértices de esquina: (fila, col) en la malla de esquinas
        for (a, b), (p, q) in [((-1, 0), ((r, c), (r, c + 1))), ((0, 1), ((r, c + 1), (r + 1, c + 1))), ((1, 0), ((r + 1, c + 1), (r + 1, c))), ((0, -1), ((r + 1, c), (r, c)))]:
            if (r + a, c + b) not in S: aristas[p] = q
    anillos = []
    while aristas:
        ini, cur = next(iter(aristas.items())); anillo = [ini]; p = ini
        while p in aristas:
            q = aristas.pop(p); anillo.append(q); p = q
        anillos.append(anillo)
    anillo = max(anillos, key=len)
    dla, dlo = lats[1] - lats[0], lons[1] - lons[0]
    pts = [(lats[0] + (r - 0.5) * dla, lons[0] + (c - 0.5) * dlo) for r, c in anillo]
    def dp(P, eps):  # Douglas-Peucker
        if len(P) < 3: return P
        a, b = P[0], P[-1]; dmax, k = 0, 0
        for i in range(1, len(P) - 1):
            num = abs((b[0] - a[0]) * (a[1] - P[i][1]) - (a[0] - P[i][0]) * (b[1] - a[1])); den = math.hypot(b[0] - a[0], b[1] - a[1]) or 1e-12
            if num / den > dmax: dmax, k = num / den, i
        return dp(P[:k + 1], eps)[:-1] + dp(P[k:], eps) if dmax > eps else [a, b]
    # anillo cerrado: se parte en el punto más lejano del inicio y se simplifica cada mitad
    k = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    pts = dp(pts[:k + 1], 0.0006)[:-1] + dp(pts[k:], 0.0006)
    return [[round(a, 5), round(b, 5)] for a, b in pts]

out = []
for s in SECTORES:
    r0, c0 = celda(s['salida'][0], s['salida'][1])
    # se ajusta la salida al cauce: la celda con más área aportante a menos de 500 m
    rad = 5; cand = [(acc[i][j], i, j) for i in range(max(0, r0 - rad), min(R, r0 + rad + 1)) for j in range(max(0, c0 - rad), min(C, c0 + rad + 1)) if acc[i][j] * CELDA <= s.get('maxKm2', 200) and z[i][j] >= 840]
    _, r0, c0 = max(cand)
    up = {(r0, c0)}; st = [(r0, c0)]
    while st:
        x = st.pop()
        for y in rev.get(x, []):
            if y not in up: up.add(y); st.append(y)
    els = sorted(z[r][c] for r, c in up); n = len(els)
    steep = 0
    for r, c in up:
        m = 0
        for a, b in N8:
            i, j = r + a, c + b
            if 0 <= i < R and 0 <= j < C: m = max(m, abs(z[r][c] - z[i][j]) / (1000 * math.hypot(a * dy, b * dx)))
        steep += math.degrees(math.atan(m)) >= 23
    la = sum(lats[r] for r, _ in up) / n; lo = sum(lons[c] for _, c in up) / n
    s2 = dict(s, salida=[round(lats[r0], 5), round(lons[c0], 5)], centro=[round(la, 4), round(lo, 4)], km2=round(n * CELDA, 1),
              hyp=[els[min(n - 1, int(q * n))] for q in [i / 20 for i in range(21)]], empinada=round(steep / n, 2), borde=contorno(up))
    out.append(s2)
    print(f"{s['nombre']:40s} {s2['km2']:6.1f} km²  {els[0]}–{els[-1]} m  empinada {s2['empinada']}  salida {s2['salida']}  borde {len(s2['borde'])} pts")
json.dump(out, open('cuencas.json', 'w'), ensure_ascii=False)
