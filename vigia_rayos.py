# Vigila los rayos del GOES-19 (GLM) y avisa cuando caen a menos de 25 km de la Quebrada Honda.
# Imprime una línea por aviso (y cuando se van); los errores repetidos también salen, para que el silencio signifique «sin rayos».
# Uso: uv run -q --with h5py --with numpy python -I vigia_rayos.py            → en vivo, desde ahora
#      uv run -q --with h5py --with numpy python -I vigia_rayos.py 281 19 20  → prueba con un día y horas UTC ya pasados (8-oct = día 281)
# Vive aquí y no en el scratchpad de la sesión, que se borra al reiniciar (26-oct se perdió así).
import io, math, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone
import h5py, numpy as np

LA0, LO0, RADIO, AVISO_CADA = -33.4052, -70.4733, 25, 300
COSL = math.cos(math.radians(LA0))
RUMBO = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']
B = 'https://noaa-goes19.s3.amazonaws.com/'

def listar(dia, hora, despues=''):
    u = f'{B}?list-type=2&prefix=GLM-L2-LCFA/{datetime.now(timezone.utc).year}/{dia:03d}/{hora:02d}/' + (f'&start-after={despues}' if despues else '')
    return re.findall(r'<Key>([^<]+)</Key>', urllib.request.urlopen(u, timeout=30).read().decode())

def rayos(clave):
    with h5py.File(io.BytesIO(urllib.request.urlopen(B + clave, timeout=60).read()), 'r') as f:
        if 'flash_lat' not in f or f['flash_lat'].shape[0] == 0: return np.empty(0), np.empty(0)
        la, lo = f['flash_lat'][()].astype(float), f['flash_lon'][()].astype(float)
    return (lo - LO0) * 111.32 * COSL, (la - LA0) * 110.57

def hora_chile(clave):
    s = clave.split('_s')[1]
    t = datetime(int(s[:4]), 1, 1, tzinfo=timezone.utc) + timedelta(days=int(s[4:7]) - 1, hours=int(s[7:9]), minutes=int(s[9:11]))
    return (t - timedelta(hours=3)).strftime('%H:%M')

def revisar(claves, estado):
    for c in claves:
        dx, dy = rayos(c)
        d = np.hypot(dx, dy)
        cerca = d < RADIO
        if cerca.any():
            k = int(np.argmin(d))
            rumbo = RUMBO[round(((math.degrees(math.atan2(dx[k], dy[k])) + 360) % 360) / 45) % 8]
            estado['n'] += int(cerca.sum()); estado['ultimo'] = time.time(); estado['hora'] = hora_chile(c)
            if time.time() - estado['avisado'] > AVISO_CADA or estado['prueba']:
                print(f'RAYOS {estado["hora"]}: {estado["n"]} a menos de {RADIO} km de la Quebrada Honda; el más cercano a {d[k]:.0f} km al {rumbo} '
                      f'(a menos de 50 km: {int((d < 50).sum())} en este archivo de 20 s)', flush=True)
                estado['avisado'], estado['n'] = time.time(), 0
        elif estado['ultimo'] and time.time() - estado['ultimo'] > 900 and not estado['prueba']:
            print(f'SIN RAYOS: 15 min sin rayos a menos de {RADIO} km (último a las {estado["hora"]})', flush=True)
            estado['ultimo'] = 0

estado = {'n': 0, 'ultimo': 0, 'avisado': 0, 'hora': '', 'prueba': len(sys.argv) > 1}
if estado['prueba']:
    dia = int(sys.argv[1])
    for h in map(int, sys.argv[2:]): revisar(listar(dia, h), estado)
    sys.exit()

ultima, fallas = '', 0
while True:
    try:
        ahora = datetime.now(timezone.utc)
        claves = []
        for t in (ahora - timedelta(minutes=3), ahora):  # cubre el cambio de hora
            claves += [c for c in listar(t.timetuple().tm_yday, t.hour, ultima) if c > ultima]
        claves = sorted(set(claves))
        if not ultima: claves = claves[-15:]  # al partir, solo los últimos ~5 min
        if claves: revisar(claves, estado); ultima = claves[-1]
        fallas = 0
    except Exception as e:
        fallas += 1
        if fallas in (3, 10) or fallas % 30 == 0: print(f'ERROR vigía de rayos ({fallas} seguidas): {e}', flush=True)
    time.sleep(60)
