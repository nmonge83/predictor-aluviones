// Calibra el modelo en cadena con los 295 días desde el incendio y lo valida.  node calibrar.js
// Días con aluvión: 31-ene y 8-oct-2026. El resto, sin aluvión reportado (incluido el temporal de 88 mm del 17-jul).
const M = require('./cadena.js');
const s0 = require('./cuencas.json').find(s => s.id === 'honda');
const HONDA = { ...s0, aluviones: s0.aluviones.map(x => Date.parse(x + ':00-03:00') / 1000) };
const d = require('./entrenamiento.json'), h = d.hourly, off = d.utc_offset_seconds;
const diaDe = t => new Date((t + off) * 1000).toISOString().slice(0, 10);
const dias = [...new Set(h.time.map(diaDe))], idx = new Map(dias.map((x, i) => [x, i]));
const dia = h.time.map(t => idx.get(diaDe(t)));
const y = dias.map(x => x === '2026-01-31' || x === '2026-10-08' ? 1 : 0);
const esc = { time: h.time, p: h.precipitation, li: h.lifted_index, cin: h.convective_inhibition, v700: h.wind_speed_700hPa, d700: h.wind_direction_700hPa, hr700: h.relative_humidity_700hPa, iso: h.freezing_level_height };

function evaluar(n = 150, etiquetas = y) {
  const { porDia } = M.simular(esc, HONDA, dia, dias.length, n, 11);
  let ll = 0;
  porDia.forEach((p, j) => { if (etiquetas[j] == null) return; const q = Math.min(1 - 1e-6, Math.max(1e-6, p)); ll += etiquetas[j] ? Math.log(q) : Math.log(1 - q); });
  return { ll, porDia };
}
const puesto = (pd, j) => [...pd].filter(x => x > pd[j]).length + 1;

// Búsqueda en grilla de lo que el dato puede decidir: umbral de inestabilidad, chance de celda, fuerza de la celda y lluvia frontal.
const GRILLA = { kRef: [1, 1.5], // 2,3 nunca salió elegido
  li0: [-5, -4, -3], qMax: [0.6, 1], mCelda: [4, 6, 8], rf15: [0.15, 0.2], escala: [0.3, 0.4, 0.6, 0.8, 1, 1.2, 1.6, 2], betaV: (process.env.BETAV || '0,1').split(',').map(Number), rho: (process.env.RHO || '0,0.8,0.95').split(',').map(Number) };
GRILLA.tauVeg = [180, 365, 730]; GRILLA.tauRec = [90, 365, 730]; // recuperación del cerro y reposición del barro: inciertas (ESTUDIO.md)
const fijar = b => Object.assign(M.PAR, { tauVeg: b.tauVeg, tauRec: b.tauRec, kRef: b.kRef, li0: b.li0, qMax: b.qMax, mCelda: b.mCelda, rFrente: [b.rf15, b.rf15 + 0.25], escala: b.escala, betaV: b.betaV, rho: b.rho });
function ajustar(etiquetas) {
  const todos = [];
  for (const kRef of GRILLA.kRef) for (const li0 of GRILLA.li0) for (const qMax of GRILLA.qMax) for (const mCelda of GRILLA.mCelda)
    for (const rf15 of GRILLA.rf15) for (const escala of GRILLA.escala) for (const betaV of GRILLA.betaV) for (const rho of GRILLA.rho)
    for (const tauVeg of GRILLA.tauVeg) for (const tauRec of GRILLA.tauRec) {
      const b = { kRef, li0, qMax, mCelda, rf15, escala, betaV, rho, tauVeg, tauRec }; fijar(b);
      todos.push({ ll: evaluar(30, etiquetas).ll, ...b });
    }
  // con 30 sorteos la log-verosimilitud varía ±0,2: los 20 mejores se vuelven a medir con 400, para no quedarse con el que tuvo suerte
  const best = todos.sort((a, b) => b.ll - a.ll).slice(0, 20).map(b => { fijar(b); return { ...b, ll: evaluar(400, etiquetas).ll }; })
    .reduce((a, b) => b.ll > a.ll ? b : a);
  fijar(best);
  return best;
}

if (process.env.FIJO) { GRILLA.tauVeg = [M.PAR.tauVeg]; GRILLA.tauRec = [M.PAR.tauRec]; } // recuperación y barro anclados en la literatura
const best = process.env.FIJO ? { ...M.PAR } : ajustar(y);
console.log('mejor ajuste:', best);
const { ll, porDia } = evaluar(400);
const clim = y.reduce((a, b) => a + b) / y.length;
const brier = porDia.reduce((s, p, j) => s + (p - y[j]) ** 2, 0) / y.length, brierC = y.reduce((s, v) => s + (clim - v) ** 2, 0) / y.length;
console.log(`log-verosimilitud ${ll.toFixed(2)} · Brier ${brier.toFixed(5)} (climatología ${brierC.toFixed(5)})`);
const orden = [...porDia.keys()].sort((a, b) => porDia[b] - porDia[a]);
console.log('los 12 días más riesgosos:'); orden.slice(0, 12).forEach(j => console.log(`  ${dias[j]} ${(porDia[j] * 100).toFixed(1)}% ${y[j] ? 'ALUVIÓN' : ''}`));
for (const s of ['2026-05-06', '2026-10-02', '2026-10-19', '2026-01-31', '2026-07-17', '2026-07-20', '2026-08-15', '2026-08-27', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-12', '2026-10-13'])
  console.log(`  ${s}: ${(porDia[idx.get(s)] * 100).toFixed(1)}%  (puesto ${puesto(porDia, idx.get(s))} de ${dias.length})`);
const suma = porDia.reduce((a, b) => a + b);
console.log(`aluviones esperados en los ${dias.length} días: ${suma.toFixed(2)} (hubo 2)`);

// Sacar un factor a la vez: cuánto empeora el ajuste.
const base = { ...M.PAR };
const prueba = (nom, cambio) => { Object.assign(M.PAR, cambio); const r = evaluar(400); /* los mismos 400 sorteos que el completo */ console.log(`  sin ${nom.padEnd(26)} log-ver. ${r.ll.toFixed(2)} · puestos ${y.map((v, j) => v ? puesto(r.porDia, j) : null).filter(Boolean)}`); Object.assign(M.PAR, base); };
console.log('\nsacando un factor a la vez (completo: ' + ll.toFixed(2) + '):');
prueba('tormentas (inestabilidad)', { qMax: 0 });
prueba('realce por el cerro', { kRef: 1 });
prueba('(con) viento cuesta arriba', { usarViento: true });
prueba('recuperación de la quema', { tauVeg: 1e9 });
prueba('material ya arrastrado', { delta: 0 });
prueba('inhibición convectiva', { cinEsc: 1e9 });
prueba('velocidad de la tormenta', { betaV: 0 });
prueba('correlación entre horas', { rho: 0 });

// Validación cruzada: se calibra sin un aluvión y se mira dónde queda ese día.
// El aluvión sale de la verosimilitud Y de la lista de aluviones: si no, el ajuste igual sabe que se llevó el barro.
if (!process.env.SIN_LOO) {
console.log('\ndejando un aluvión fuera:');
const todosAluv = HONDA.aluviones;
for (const s of ['2026-01-31', '2026-10-08']) {
  const y2 = y.map((v, j) => dias[j] === s ? null : v); // null: el día no entra en la verosimilitud (con 0 contaría como «sin aluvión»)
  HONDA.aluviones = todosAluv.filter(e => diaDe(e) !== s);
  const b2 = ajustar(y2); const r = evaluar(400);
  console.log(`  ${s}: ${(r.porDia[idx.get(s)] * 100).toFixed(1)}%, puesto ${puesto(r.porDia, idx.get(s))} de ${dias.length}  (ajuste: ${JSON.stringify(b2)})`);
  Object.assign(M.PAR, base); HONDA.aluviones = todosAluv;
}
}
console.log('\nPAR final:', JSON.stringify({ kRef: base.kRef, li0: base.li0, qMax: base.qMax, mCelda: base.mCelda, rFrente: base.rFrente, escala: base.escala, betaV: base.betaV, rho: base.rho, tauVeg: base.tauVeg, tauRec: base.tauRec }));
