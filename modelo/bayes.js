// node modelo/bayes.js  (150 sorteos por ajuste; con 40 el ruido mueve la cifra)
// Bayes sobre la grilla de calibración: en vez del mejor ajuste, se promedian todos los ajustes
// según cuánto explican los días observados. Se compara lo aprendido hasta el 7-oct con lo aprendido hasta el 19-oct.
const DIR = __dirname + '/';
const M = require(DIR + 'cadena.js');
const s0 = require(DIR + 'cuencas.json').find(s => s.id === 'honda');
const ALUV = s0.aluviones.map(x => Date.parse(x + ':00-03:00') / 1000);
const d = require(DIR + 'entrenamiento.json'), h = d.hourly, off = d.utc_offset_seconds;
const diaDe = t => new Date((t + off) * 1000).toISOString().slice(0, 10);
const dias = [...new Set(h.time.map(diaDe))], idx = new Map(dias.map((x, i) => [x, i]));
const dia = h.time.map(t => idx.get(diaDe(t)));
const y = dias.map(x => x === '2026-01-31' || x === '2026-10-08' ? 1 : 0);
const esc = { time: h.time, p: h.precipitation, li: h.lifted_index, cin: h.convective_inhibition, v700: h.wind_speed_700hPa, d700: h.wind_direction_700hPa, hr700: h.relative_humidity_700hPa, iso: h.freezing_level_height };
const HONDA = { ...s0, aluviones: ALUV };

const MODELOS = ['gfs_global', 'ecmwf_ifs025', 'ecmwf_aifs025_single', 'icon_global', 'gem_global', 'ukmo_global_deterministic_10km', 'meteofrance_arpege_world'];
// CORRIDA (UTC) y DESDE (hora de Chile) para recalcular más tarde; TORMENTA=1 si el satélite la ve sobre la cuenca, como en la app
const B = 'latitude=-33.40&longitude=-70.47&timeformat=unixtime&forecast_days=2', run = process.env.CORRIDA || '2026-10-20T00:00';
const desde = Date.parse(`2026-10-20T${process.env.DESDE || '08:00'}:00-03:00`) / 1000, hasta = Date.parse('2026-10-21T00:00:00-03:00') / 1000;
const get = async u => { for (let k = 0; k < 4; k++) { const r = await fetch(u); if (r.ok) return r.json(); if (r.status === 400) break; await new Promise(o => setTimeout(o, 3000 * (k + 1))); } throw new Error(u); };

(async () => {
  // hoy: las mismas 7 corridas de las 00 UTC que usa modelo/manana.js
  const g = (await get(`https://single-runs-api.open-meteo.com/v1/forecast?${B}&models=gfs_global&run=${run}&hourly=lifted_index,convective_inhibition,freezing_level_height,wind_speed_700hPa,wind_direction_700hPa,relative_humidity_700hPa`)).hourly;
  const ii = g.time.map((t, i) => [t, i]).filter(([t]) => t > desde && t <= hasta).map(([, i]) => i), met = k => ii.map(i => g[k][i]);
  const hoy = [];
  for (const m of MODELOS) {
    const r = await get(`https://single-runs-api.open-meteo.com/v1/forecast?${B}&models=${m}&run=${run}&hourly=precipitation`).catch(() => null);
    if (!r) continue;
    const ix = new Map(r.hourly.time.map((t, i) => [t, i]));
    const e = { time: met('time'), li: met('lifted_index'), cin: met('convective_inhibition'), iso: met('freezing_level_height'), v700: met('wind_speed_700hPa'), d700: met('wind_direction_700hPa'), hr700: met('relative_humidity_700hPa') };
    e.p = e.time.map(t => r.hourly.precipitation[ix.get(t)]);
    if (e.p.some(x => x == null)) { console.log(m, 'con horas sin dato: queda fuera'); continue; } // sin dato no es lluvia cero
    if (process.env.TORMENTA) e.forzar = new Set([0]); // tormenta vista encima: la primera hora tiene celda segura
    hoy.push(e);
  }
  const pHoy = aluv => hoy.reduce((s, e) => s + M.simular(e, { ...s0, aluviones: aluv }, e.time.map(() => 0), 1, 400, 7).porDia[0], 0) / hoy.length;

  const app = pHoy(ALUV); // con el PAR de la app, antes de recorrer la grilla
  const G = { kRef: [1, 1.5, 2.3], li0: [-5, -4, -3], qMax: [0.6, 1], mCelda: [4, 6, 8], rf15: [0.15, 0.2], escala: [0.3, 0.4, 0.6, 0.8, 1, 1.2], betaV: [0, 1], rho: [0, 0.8, 0.95] };
  const corte = idx.get('2026-10-08'), filas = [];
  for (const kRef of G.kRef) for (const li0 of G.li0) for (const qMax of G.qMax) for (const mCelda of G.mCelda)
    for (const rf15 of G.rf15) for (const escala of G.escala) for (const betaV of G.betaV) for (const rho of G.rho) {
      Object.assign(M.PAR, { kRef, li0, qMax, mCelda, rFrente: [rf15, rf15 + 0.25], escala, betaV, rho });
      const { porDia } = M.simular(esc, HONDA, dia, dias.length, +(process.env.SORTEOS || 150), +(process.env.SEMILLA || 11));
      let llAntes = 0, llTodo = 0;
      porDia.forEach((p, j) => { const q = Math.min(1 - 1e-6, Math.max(1e-6, p)), l = y[j] ? Math.log(q) : Math.log(1 - q); llTodo += l; if (j < corte) llAntes += l; });
      filas.push({ escala, llAntes, llTodo, par: { kRef, li0, qMax, mCelda, rf15, betaV, rho } });
    }
  // pesos a posteriori (prior uniforme sobre la grilla); hoy se simula en TODA la grilla
  const pesos = k => { const mx = Math.max(...filas.map(f => f[k])); const w = filas.map(f => Math.exp(f[k] - mx)), s = w.reduce((a, b) => a + b); return w.map(x => x / s); };
  const wA = pesos('llAntes'), wT = pesos('llTodo');
  filas.forEach((f, i) => {
    Object.assign(M.PAR, { ...f.par, rFrente: [f.par.rf15, f.par.rf15 + 0.25], escala: f.escala });
    f.hoySinBarro = pHoy(ALUV.slice(0, 1)); f.hoy = pHoy(ALUV);
  });
  const media = (w, k) => filas.reduce((s, f, i) => s + f[k] * w[i], 0);
  const cuantil = (w, k, q) => { const o = filas.map((f, i) => [f[k], w[i]]).sort((a, b) => a[0] - b[0]); let s = 0; for (const [v, x] of o) { s += x; if (s >= q) return v; } };
  const pct = x => (x * 100).toFixed(1) + ' %';
  console.log('escala media a posteriori: hasta el 7-oct', media(wA, 'escala').toFixed(2), '· hasta el 19-oct', media(wT, 'escala').toFixed(2));
  console.log('hoy, mejor ajuste (como la app):', pct(app));
  console.log('hoy, lo sabido al 7-oct, sin el barro que se llevó el 8-oct:', pct(media(wA, 'hoySinBarro')));
  console.log('hoy, lo sabido al 7-oct, con el barro que se llevó:', pct(media(wA, 'hoy')));
  console.log('hoy, Bayes con todo hasta el 19-oct:', pct(media(wT, 'hoy')), `(90 %: ${pct(cuantil(wT, 'hoy', 0.05))} a ${pct(cuantil(wT, 'hoy', 0.95))})`);
})();
