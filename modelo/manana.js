// Probabilidad que el modelo habría dado A LAS 8 DE LA MAÑANA de cada día, con las corridas de las 00 UTC (disponibles al amanecer).
// Mismo modelo que la app; solo se cuentan los aluviones ocurridos ANTES de esa mañana.  node modelo/manana.js
const M = require('./cadena.js');
const s0 = require('./cuencas.json').find(s => s.id === 'honda');
const ALUV = s0.aluviones.map(x => Date.parse(x + ':00-03:00') / 1000);
const MODELOS = ['gfs_global', 'ecmwf_ifs025', 'ecmwf_aifs025_single', 'icon_global', 'gem_global', 'ukmo_global_deterministic_10km', 'meteofrance_arpege_world'];
const DIAS = [['2026-01-31', 'aluvión'], ['2026-10-06', '111 mm, sin aluvión'], ['2026-10-07', 'sin aluvión'], ['2026-10-08', 'ALUVIÓN 17 h'], ['2026-10-12', 'alerta roja, sin aluvión'], ['2026-10-13', 'alerta roja, sin aluvión'], ['2026-10-20', 'HOY']];
const B = 'latitude=-33.40&longitude=-70.47&timeformat=unixtime&forecast_days=2';
const get = async u => { for (let k = 0; k < 4; k++) { const r = await fetch(u); if (r.ok) return r.json(); if (r.status === 400) break; await new Promise(o => setTimeout(o, 3000 * (k + 1))); } throw new Error(u); };
(async () => {
  for (const [dia, que] of DIAS) {
    const run = `${dia}T00:00`, desde = Date.parse(`${dia}T08:00:00-03:00`) / 1000, hasta = desde + 16 * 3600;
    const gj = await get(`https://single-runs-api.open-meteo.com/v1/forecast?${B}&models=gfs_global&run=${run}&hourly=lifted_index,convective_inhibition,freezing_level_height,wind_speed_700hPa,wind_direction_700hPa,relative_humidity_700hPa`).catch(() => null);
    if (!gj) { console.log(`${dia}  sin corrida guardada  ← ${que}`); continue; }
    const g = gj.hourly;
    const idx = g.time.map((t, i) => [t, i]).filter(([t]) => t > desde && t <= hasta).map(([, i]) => i);
    const met = k => idx.map(i => g[k][i]);
    const cu = { ...s0, aluviones: ALUV.filter(e => e < desde) };
    const res = [];
    for (const m of MODELOS) {
      const d = await get(`https://single-runs-api.open-meteo.com/v1/forecast?${B}&models=${m}&run=${run}&hourly=precipitation`).catch(() => null);
      if (!d) continue;
      const ix = new Map(d.hourly.time.map((t, i) => [t, i]));
      const esc = { time: met('time').length ? idx.map(i => g.time[i]) : [], li: met('lifted_index'), cin: met('convective_inhibition'), iso: met('freezing_level_height'), v700: met('wind_speed_700hPa'), d700: met('wind_direction_700hPa'), hr700: met('relative_humidity_700hPa') };
      esc.p = esc.time.map(t => d.hourly.precipitation[ix.get(t)] || 0);
      const r = M.simular(esc, cu, esc.time.map(() => 0), 1, 400, 7);
      const hp = Array.from(r.hora), k = hp.indexOf(Math.max(...hp));
      res.push({ m, p: r.porDia[0], mm: esc.p.reduce((a, b) => a + b, 0), pico: new Date(esc.time[k] * 1000).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) });
    }
    const P = res.reduce((a, b) => a + b.p, 0) / res.length, liMin = Math.min(...met('lifted_index').filter(x => x != null));
    const picos = res.map(r => r.pico).sort(), pico = picos[Math.floor(picos.length / 2)];
    console.log(`${dia}  ${(P * 100).toFixed(1).padStart(5)} %  (${res.length} modelos, rango ${(Math.min(...res.map(r => r.p)) * 100).toFixed(0)}–${(Math.max(...res.map(r => r.p)) * 100).toFixed(0)} %, lluvia ${Math.min(...res.map(r => r.mm)).toFixed(0)}–${Math.max(...res.map(r => r.mm)).toFixed(0)} mm, índice de levantamiento mín ${liMin}, hora más crítica ${pico})  ← ${que}`);
  }
})();
