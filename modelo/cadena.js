// <cadena>  Modelo en cadena: atmósfera → lluvia en la cuenca → minutos intensos → cuenca quemada → aluvión.
// Se usa tal cual dentro de index.html y en modelo/calibrar.js.
// Cada cuenca trae: hyp (cota de cada 5 % del área), quemada (fracción con quema moderada o alta),
// empinada (fracción con pendiente ≥ 23°) y aluviones (instantes unix de sus aluviones anteriores).
const FUEGO = Date.parse('2025-12-29T03:00:00Z') / 1000;             // incendio de San Carlos de Apoquindo (00 h de Chile)
const PAR = {
  // 1. lluvia en la cuenca
  nieve: 300,                  // la cota de nieve queda ~300 m bajo la isoterma 0 °C
  kRef: 1, uRef: 20, kSig: 0.3, usarViento: false, // lluvia en el cerro / lluvia del modelo (calibrado entre 1 y 2,3: el dato no pide realce; uRef = viento cuesta arriba del 8-oct, km/h)
  // 2. ¿pasa una tormenta por encima?
  qMax: 1, li0: -4, liEsc: 1, cinEsc: 50,   // calibrado: la chance sube fuerte con índice de levantamiento bajo −4
  // 3. minutos más intensos
  mCelda: 8, mSig: 0.5,        // bajo una celda lenta (30 km/h) llueve ~8 veces lo que da el modelo en la hora (calibrado)
  rCelda: [0.57, 0.79],        // fracción de la hora pico en 15 y 30 min bajo tormenta (Bell 1969)
  rho: 0.95,                   // correlación entre horas de un mismo día (calibrado): un día largo de lluvia inestable débil no suma
                               // tantas oportunidades independientes como horas tiene (6-may y 2-oct, falsas alarmas)
  vRef: 30, betaV: 1, fMax: 2, // tiempo de la celda sobre la cuenca ∝ 1/velocidad: lluvia de la celda × (vRef/v)^betaV (8-oct: ~30 km/h)
  rFrente: [0.15, 0.40],       // lluvia frontal: factor calibrado, MENOR que el 25 % de una lluvia pareja (ver ESTUDIO.md)
  // 4. cuenca quemada (USGS, Staley et al. 2017, modelo M1: B, Ct, Cf, Cs por duración)
  usgs: [[15, -3.63, 0.41, 0.67, 0.70], [30, -3.61, 0.26, 0.39, 0.50], [60, -3.21, 0.17, 0.20, 0.22]],
  sev: [0.5, 0.85], F: [0.25, 0.45], S: [0.20, 0.30], // T = quemada · empinada · sev (severidad moderada o alta)
  tauVeg: 365,                 // días: la quema se "cierra" con la vegetación (e-folding de 1 año; el umbral de lluvia sube ~1,7× en un año,
                               // como en California; los 295 días no distinguen 180 a 730: ver ESTUDIO.md)
  // 5. material suelto disponible
  delta: 0.5, tauRec: 365,     // cada aluvión se lleva la mitad del material; se repone en ~1 año (antes 3 meses; ver ESTUDIO.md)
  escala: 1.2,                 // recalibración global (ajustada con los 295 días con tauVeg y tauRec de 365; grilla 0,3–2)
  sinQuema: 0.022,             // cuencas sin quemar: el registro da ~1 aluvión cada 30 años por quebrada (Macul 1993);
                               // sin este factor el modelo esperaba 0,5–0,9 por quebrada en 295 días, 20 a 30 veces más
};

const rad = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const logistic = x => 1 / (1 + Math.exp(-x));
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const unif = (r, [a, b]) => a + (b - a) * r();
function Phi(x) { const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z); const e = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return x >= 0 ? (1 + e) / 2 : (1 - e) / 2; }

// Fracción de la cuenca donde cae agua y no nieve (curva de altitudes).
function fLiquida(iso, h) {
  if (iso == null || !isFinite(iso)) return 1;
  const cota = iso - PAR.nieve;
  if (cota <= h[0]) return 0;
  if (cota >= h[20]) return 1;
  for (let i = 1; i < 21; i++) if (cota < h[i]) return (i - 1 + (cota - h[i - 1]) / (h[i] - h[i - 1])) / 20;
  return 1;
}
// Viento de 700 hPa que sube por la ladera oeste de los Andes (componente hacia el este, km/h).
const cuestaArriba = (v, dir) => v == null || dir == null ? 0 : Math.max(0, -v * Math.sin(dir * rad));
// Realce por el cerro: crece con el viento cuesta arriba y con la humedad que trae.
// La calibración mostró que hacerlo depender del viento infla los temporales de invierno (17-jul, 88 mm, sin aluvión):
// por defecto es constante; usarViento = true lo vuelve a activar para comparar.
const kCerro = (v, dir, hr) => PAR.usarViento ? 1 + (PAR.kRef - 1) * clamp(cuestaArriba(v, dir) / PAR.uRef, 0, 2) * clamp((hr ?? 100) / 100, 0, 1) : PAR.kRef;
// Probabilidad por hora de que una celda de tormenta pase sobre la cuenca.
// Sube con la inestabilidad (−índice de levantamiento) y baja con la inhibición convectiva (la «tapa»).
const pCelda = (li, cin) => li == null ? 0 : PAR.qMax * logistic((PAR.li0 - li) / PAR.liEsc) * Math.exp(-Math.max(0, cin || 0) / PAR.cinEsc);
// Recuperación de la quema y material disponible en el instante t (s unix).
const recuperacion = t => Math.exp(-Math.max(0, t - FUEGO) / 86400 / PAR.tauVeg);
function material(t, aluviones) {
  let s = 1, t0 = FUEGO;
  for (const e of aluviones) {
    if (e >= t) break;
    s = 1 - (1 - s) * Math.exp(-(e - t0) / 86400 / PAR.tauRec);
    s *= 1 - PAR.delta; t0 = e;
  }
  return 1 - (1 - s) * Math.exp(-(t - t0) / 86400 / PAR.tauRec);
}

// esc: { time (s unix), p (mm/h), li, cin, v700, d700, hr700, iso, forzar? (Set de índices con tormenta vista en el satélite) }
// dia[i] = índice de día de la hora i. Devuelve la prob. media por hora y, por día, la del peor momento.
function simular(esc, cu, dia, nDias, nDraws, seed) {
  const n = esc.p.length, r = rng(seed);
  // el material se mide al empezar el día: un aluvión de ese mismo día no puede rebajar su propia probabilidad
  const ini = new Map(); for (let i = 0; i < n; i++) if (!ini.has(dia[i])) ini.set(dia[i], esc.time[i]);
  const hora = new Float64Array(n), acum = new Float64Array(n), porDia = new Float64Array(nDias), maxDia = new Float64Array(nDias);
  const lluvia = new Float64Array(n), q = new Float64Array(n), rec = new Float64Array(n), mat = new Float64Array(n), avance = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lluvia[i] = (esc.p[i] || 0) * kCerro(esc.v700[i], esc.d700[i], esc.hr700[i]) * fLiquida(esc.iso[i], cu.hyp);
    let li = null; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) if (esc.li[k] != null) li = li == null ? esc.li[k] : Math.min(li, esc.li[k]);
    q[i] = esc.forzar?.has(i) ? 1 : pCelda(li, esc.cin[i]);
    rec[i] = recuperacion(esc.time[i]); mat[i] = material(ini.get(dia[i]), cu.aluviones);
    // una celda rápida pasa en pocos minutos y deja menos agua en la cuenca; una lenta se queda encima
    avance[i] = Math.min(PAR.fMax, (PAR.vRef / Math.max(5, esc.v700[i] ?? PAR.vRef)) ** PAR.betaV);
  }
  const p0 = PAR.usgs.map(([, B]) => logistic(B));
  const fQuema = PAR.sinQuema + (1 - PAR.sinQuema) * Math.min(1, cu.quemada / 0.95); // 1 en la Quebrada Honda, sinQuema sin quema
  for (let d = 0; d < nDraws; d++) {
    const kN = Math.exp(PAR.kSig * gauss(r)), mC = PAR.mCelda * Math.exp(PAR.mSig * gauss(r));
    const T = cu.quemada * cu.empinada * unif(r, PAR.sev), F = cu.quemada * unif(r, PAR.F), S = unif(r, PAR.S);
    maxDia.fill(0);
    // cópula gaussiana: las horas de un mismo día comparten parte de su suerte (rho)
    const zDia = new Float64Array(nDias); for (let j = 0; j < nDias; j++) zDia[j] = gauss(r);
    const a = Math.sqrt(PAR.rho), b = Math.sqrt(1 - PAR.rho);
    for (let i = 0; i < n; i++) {
      const hit = (PAR.rho ? Phi(a * zDia[dia[i]] + b * gauss(r)) : r()) < q[i], R60 = lluvia[i] * kN * (hit ? mC * avance[i] : 1);
      if (R60 <= 0) { acum[i] += maxDia[dia[i]]; continue; }
      const [r15, r30] = hit ? PAR.rCelda : PAR.rFrente, R = [R60 * r15, R60 * r30, R60];
      let pu = 0;
      // ponytail: se resta la probabilidad con lluvia cero (2–4 %), para que una hora seca dé 0
      PAR.usgs.forEach(([, B, ct, cf, cs], k) => { pu += Math.max(0, (logistic(B + (ct * T * rec[i] + cf * F * rec[i] + cs * S) * R[k]) - p0[k]) / (1 - p0[k])); });
      const h = PAR.escala * fQuema * mat[i] * pu / 3;
      hora[i] += h;
      if (h > maxDia[dia[i]]) maxDia[dia[i]] = h;
      acum[i] += maxDia[dia[i]]; // probabilidad de que el aluvión ya se haya gatillado a esta hora del día
    }
    for (let j = 0; j < nDias; j++) porDia[j] += maxDia[j];
  }
  for (let i = 0; i < n; i++) { hora[i] /= nDraws; acum[i] /= nDraws; }
  for (let j = 0; j < nDias; j++) porDia[j] /= nDraws;
  return { hora, acum, porDia, lluvia, q, rec, mat, avance };
}
// </cadena>
if (typeof module !== 'undefined') module.exports = { PAR, FUEGO, fLiquida, cuestaArriba, kCerro, pCelda, recuperacion, material, simular };
