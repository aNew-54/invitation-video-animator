const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectDir = 'C:\\Users\\balfa\\.gemini\\antigravity\\scratch\\invitacion-promocion-2026';
const srcImg = path.join(projectDir, 'assets', 'invitacion-padrino-ref.jpg');
const layersDir = path.join(projectDir, 'assets', 'layers');
const scratchDir = 'C:\\Users\\balfa\\.gemini\\antigravity\\brain\\a710f3f7-de7b-4e1a-96d8-ec6e3d892690\\scratch';

const W = 682;
const H = 1024;

const orig = execFileSync('ffmpeg', [
  '-v', 'error',
  '-i', srcImg,
  '-f', 'rawvideo',
  '-pix_fmt', 'rgba',
  '-'
], { maxBuffer: 50 * 1024 * 1024 });

function idx(x, y) {
  return (y * W + x) * 4;
}

function saveRgbaPng(buf, w, h, outPath) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${w}x${h}`,
    '-i', '-',
    outPath
  ], { input: buf, maxBuffer: 50 * 1024 * 1024 });
}

function laplaceInpaint(baseBuf, mask, x1, y1, x2, y2, steps = [4, 2, 1]) {
  const out = Buffer.from(baseBuf);
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const rArr = new Float32Array(bw * bh);
  const gArr = new Float32Array(bw * bh);
  const bArr = new Float32Array(bw * bh);
  const isUnk = new Uint8Array(bw * bh);

  for (let ly = 0; ly < bh; ly++) {
    const gy = y1 + ly;
    for (let lx = 0; lx < bw; lx++) {
      const gx = x1 + lx;
      const p = ly * bw + lx;
      const gi = idx(gx, gy);
      const m = mask[gy * W + gx];
      isUnk[p] = m;
      if (!m) {
        rArr[p] = out[gi];
        gArr[p] = out[gi + 1];
        bArr[p] = out[gi + 2];
      }
    }
  }

  for (let ly = 0; ly < bh; ly++) {
    let lastR = 235, lastG = 246, lastB = 255;
    for (let lx = 0; lx < bw; lx++) {
      const p = ly * bw + lx;
      if (!isUnk[p]) {
        lastR = rArr[p]; lastG = gArr[p]; lastB = bArr[p];
      } else {
        rArr[p] = lastR; gArr[p] = lastG; bArr[p] = lastB;
      }
    }
    for (let lx = bw - 1; lx >= 0; lx--) {
      const p = ly * bw + lx;
      if (!isUnk[p]) {
        lastR = rArr[p]; lastG = gArr[p]; lastB = bArr[p];
      } else {
        rArr[p] = 0.5 * (rArr[p] + lastR);
        gArr[p] = 0.5 * (gArr[p] + lastG);
        bArr[p] = 0.5 * (bArr[p] + lastB);
      }
    }
  }

  const omega = 1.75;
  for (const step of steps) {
    const iters = step === 4 ? 220 : step === 2 ? 220 : 320;
    for (let it = 0; it < iters; it++) {
      for (let ly = step; ly < bh - step; ly += step) {
        const rowOff = ly * bw;
        for (let lx = step; lx < bw - step; lx += step) {
          const p = rowOff + lx;
          if (!isUnk[p]) continue;
          const pL = p - step;
          const pR = p + step;
          const pU = p - step * bw;
          const pD = p + step * bw;
          const nr = 0.25 * (rArr[pL] + rArr[pR] + rArr[pU] + rArr[pD]);
          const ng = 0.25 * (gArr[pL] + gArr[pR] + gArr[pU] + gArr[pD]);
          const nb = 0.25 * (bArr[pL] + bArr[pR] + bArr[pU] + bArr[pD]);
          rArr[p] += omega * (nr - rArr[p]);
          gArr[p] += omega * (ng - gArr[p]);
          bArr[p] += omega * (nb - bArr[p]);
        }
      }
    }
  }

  for (let ly = 0; ly < bh; ly++) {
    const gy = y1 + ly;
    for (let lx = 0; lx < bw; lx++) {
      const gx = x1 + lx;
      const p = ly * bw + lx;
      if (isUnk[p]) {
        const gi = idx(gx, gy);
        out[gi] = Math.round(rArr[p]);
        out[gi + 1] = Math.round(gArr[p]);
        out[gi + 2] = Math.round(bArr[p]);
        out[gi + 3] = 255;
      }
    }
  }
  return out;
}

const rawPlaqueTextMask = new Uint8Array(W * H);
for (let y = 500; y <= 581; y++) {
  for (let x = 132; x <= 552; x++) {
    const i = idx(x, y);
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    if (b >= r - 5 && g < 172 && r < 165) {
      rawPlaqueTextMask[y * W + x] = 1;
    }
  }
}
const plaqueTextMask = new Uint8Array(W * H);
for (let y = 498; y <= 583; y++) {
  for (let x = 130; x <= 554; x++) {
    const gi = idx(x, y);
    if (orig[gi] > orig[gi + 2] + 18) continue;
    let m = 0;
    for (let dy = -2; dy <= 2 && !m; dy++) {
      for (let dx = -2; dx <= 2 && !m; dx++) {
        if (rawPlaqueTextMask[(y + dy) * W + (x + dx)]) m = 1;
      }
    }
    plaqueTextMask[y * W + x] = m;
  }
}
const plaqueEmptyPlate = laplaceInpaint(orig, plaqueTextMask, 118, 494, 566, 586, [4, 2, 1]);

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function extractTextLayer(id, x1, y1, x2, y2, innerX1, innerX2) {
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const dMin = 8, dMax = 38;
  const out = Buffer.alloc(bw * bh * 4);
  for (let ly = 0; ly < bh; ly++) {
    const gy = y1 + ly;
    for (let lx = 0; lx < bw; lx++) {
      const gx = x1 + lx;
      if (gx < innerX1 || gx > innerX2) continue;
      const p = ly * bw + lx;
      const oi = p * 4;
      if (plaqueTextMask[gy * W + gx] !== 1) continue;
      const gi = idx(gx, gy);
      const sr = orig[gi], sg = orig[gi + 1], sb = orig[gi + 2];
      const br = plaqueEmptyPlate[gi], bg = plaqueEmptyPlate[gi + 1], bb = plaqueEmptyPlate[gi + 2];
      const d = colorDist(sr, sg, sb, br, bg, bb);
      let alpha = 0;
      if (d > dMin) {
        const t = clamp((d - dMin) / (dMax - dMin), 0, 1);
        alpha = t * t * (3 - 2 * t);
      }
      if (alpha > 0.01) {
        if (alpha < 0.96) {
          const invA = 1 / Math.max(alpha, 0.18);
          out[oi] = clamp(Math.round((sr - (1 - alpha) * br) * invA), 0, 255);
          out[oi + 1] = clamp(Math.round((sg - (1 - alpha) * bg) * invA), 0, 255);
          out[oi + 2] = clamp(Math.round((sb - (1 - alpha) * bb) * invA), 0, 255);
        } else {
          out[oi] = sr;
          out[oi + 1] = sg;
          out[oi + 2] = sb;
        }
        out[oi + 3] = Math.round(alpha * 255);
      }
    }
  }
  saveRgbaPng(out, bw, bh, path.join(layersDir, `${id}.png`));
}

extractTextLayer('padrino-role-text', 142, 498, 542, 532, 150, 536);
extractTextLayer('padrino-name-text', 126, 532, 558, 583, 170, 518);
console.log('Extracted padrino-role-text.png and padrino-name-text.png!');
