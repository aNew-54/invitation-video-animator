const { execFileSync } = require('child_process');

function loadRgbaBuffer(srcImg) {
  return execFileSync('ffmpeg', [
    '-v', 'error',
    '-i', srcImg,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-'
  ], { maxBuffer: 50 * 1024 * 1024 });
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

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function laplaceInpaint(baseBuf, W, H, mask, x1, y1, x2, y2, steps = [4, 2, 1]) {
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
      const gi = (gy * W + gx) * 4;
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
    let lastR = 250, lastG = 244, lastB = 238;
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
        const gi = (gy * W + gx) * 4;
        out[gi] = Math.round(rArr[p]);
        out[gi + 1] = Math.round(gArr[p]);
        out[gi + 2] = Math.round(bArr[p]);
        out[gi + 3] = 255;
      }
    }
  }
  return out;
}

module.exports = {
  loadRgbaBuffer,
  saveRgbaPng,
  clamp,
  colorDist,
  laplaceInpaint
};
