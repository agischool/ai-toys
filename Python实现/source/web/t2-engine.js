/** T2 browser teaching model. Data generator is deliberately not NumPy's RNG. */
export function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z); return e / (1 + e);
}
export function bceFromLogit(z, y) {
  return Math.max(z, 0) - y * z + Math.log1p(Math.exp(-Math.abs(z)));
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function normalFactory(seed) {
  const random = mulberry32(seed);
  return () => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
}
export function makeDataset(seed = 42, n = 48, overlap = .8) {
  const normal = normalFactory(seed);
  return Array.from({length:n}, (_, i) => {
    const y = i % 2, sign = 2 * y - 1;
    return {x:[normal() * overlap + sign * .9, normal() * overlap + sign * .55], y};
  });
}
export function initParams() { return {w:[0, 0], b:0}; }
export function logit(x, p) { return x[0] * p.w[0] + x[1] * p.w[1] + p.b; }
export function predict(x, p) { return sigmoid(logit(x, p)); }
export function lossAndGrads(data, p) {
  let loss = 0, db = 0; const dw = [0, 0];
  for (const {x,y} of data) { const z = logit(x,p), dz = (sigmoid(z)-y)/data.length; loss += bceFromLogit(z,y)/data.length; dw[0] += dz*x[0]; dw[1] += dz*x[1]; db += dz; }
  return {loss, grads:{w:dw,b:db}};
}
export function trainStep(data, p, lr = .15) {
  const {grads} = lossAndGrads(data,p);
  p.w = p.w.map((w,i) => w-lr*grads.w[i]); p.b -= lr*grads.b;
  return p;
}
export function confusion(data, p, threshold = .5) {
  const counts = [[0,0],[0,0]];
  for (const point of data) counts[point.y][Number(predict(point.x,p) >= threshold)]++;
  return counts;
}
