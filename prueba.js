// Prueba de la estimación de riesgo: node prueba.js
// 1) el modelo dentro de index.html es idéntico a modelo/cadena.js; 2) con los 295 días desde el incendio,
// los dos aluviones de la Quebrada Honda quedan entre los 5 días más riesgosos y el total esperado se parece a 2.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const cad = fs.readFileSync(path.join(__dirname, 'modelo/cadena.js'), 'utf8');
const bloque = s => s.slice(s.indexOf('// <cadena>'), s.indexOf('// </cadena>'));
console.assert(bloque(html) === bloque(cad), 'index.html está desactualizado: corre python3 modelo/armar.py');
const M = require('./modelo/cadena.js');
const s0 = require('./modelo/cuencas.json').find(s => s.id === 'honda');
const HONDA = { ...s0, aluviones: s0.aluviones.map(x => Date.parse(x + ':00-03:00') / 1000) };
const d = require('./modelo/entrenamiento.json'), h = d.hourly, off = d.utc_offset_seconds;
const diaDe = t => new Date((t + off) * 1000).toISOString().slice(0, 10);
const dias = [...new Set(h.time.map(diaDe))], ix = new Map(dias.map((x, i) => [x, i]));
const esc = { time: h.time, p: h.precipitation, li: h.lifted_index, cin: h.convective_inhibition, v700: h.wind_speed_700hPa, d700: h.wind_direction_700hPa, hr700: h.relative_humidity_700hPa, iso: h.freezing_level_height };
const { porDia } = M.simular(esc, HONDA, h.time.map(t => ix.get(diaDe(t))), dias.length, 200, 11);
const puesto = s => [...porDia].filter(x => x > porDia[ix.get(s)]).length + 1;
const esperados = porDia.reduce((a, b) => a + b);
console.log('31-ene', (porDia[ix.get('2026-01-31')] * 100).toFixed(1) + '%', 'puesto', puesto('2026-01-31'), '· 8-oct', (porDia[ix.get('2026-10-08')] * 100).toFixed(1) + '%', 'puesto', puesto('2026-10-08'), '· esperados', esperados.toFixed(2));
console.assert(puesto('2026-01-31') <= 5 && puesto('2026-10-08') <= 5, 'los aluviones deben quedar entre los 5 días más riesgosos');
console.assert(esperados > 1 && esperados < 4, 'el total esperado debe parecerse a los 2 aluviones');
console.assert(porDia[ix.get('2026-10-06')] < porDia[ix.get('2026-10-08')] / 3, 'el 6-oct (111 mm, estable) debe salir muy por debajo del 8-oct');
// funciones puras
console.assert(M.fLiquida(2500, HONDA.hyp) === 1 && M.fLiquida(1000, HONDA.hyp) === 0, 'fLiquida');
// cada aluvión se lleva la fracción delta del barro que hay (no depende de cuánto tarda en reponerse)
{ const t = HONDA.aluviones[1], antes = M.material(t - 1, HONDA.aluviones), despues = M.material(t + 1, HONDA.aluviones);
  console.assert(antes < 1 && Math.abs(despues / antes - (1 - M.PAR.delta)) < 0.01, 'material'); }
console.log('ok');
