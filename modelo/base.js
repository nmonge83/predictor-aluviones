// Tasa base de cada quebrada: probabilidad diaria media que da el modelo en los 295 días desde el incendio.
// Se guarda en cuencas.json (campo base) para mostrar "N veces un día cualquiera" de esa misma quebrada.  node modelo/base.js
const fs = require('fs'), path = require('path');
const M = require('./cadena.js'), archivo = path.join(__dirname, 'cuencas.json'), C = JSON.parse(fs.readFileSync(archivo));
const d = require('./entrenamiento.json'), h = d.hourly, off = d.utc_offset_seconds;
const diaDe = t => new Date((t + off) * 1000).toISOString().slice(0, 10);
const dias = [...new Set(h.time.map(diaDe))], ix = new Map(dias.map((x, i) => [x, i])), dia = h.time.map(t => ix.get(diaDe(t)));
const esc = { time: h.time, p: h.precipitation, li: h.lifted_index, cin: h.convective_inhibition, v700: h.wind_speed_700hPa, d700: h.wind_direction_700hPa, hr700: h.relative_humidity_700hPa, iso: h.freezing_level_height };
for (const c of C) {
  const cu = { ...c, aluviones: c.aluviones.map(x => Date.parse(x + ':00-03:00') / 1000) };
  const { porDia } = M.simular(esc, cu, dia, dias.length, 150, 11), E = porDia.reduce((a, b) => a + b);
  c.base = +(E / dias.length).toPrecision(3);
  console.log(c.id.padEnd(10), 'esperados', E.toFixed(3), 'base diaria', (c.base * 100).toFixed(3) + '%', '· 8-oct', (porDia[ix.get('2026-10-08')] * 100).toFixed(2) + '%');
}
fs.writeFileSync(archivo, JSON.stringify(C));
