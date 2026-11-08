const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = 'C:\\Users\\balfa\\.gemini\\antigravity\\scratch\\invitacion-promocion-2026';
const imgPath = path.join(projectDir, 'assets', 'invitacion-madrina-ref.jpg');
const layersDir = path.join(projectDir, 'assets', 'layers');
fs.mkdirSync(layersDir, { recursive: true });

const W = 682;
const H = 1024;

const orig = execFileSync('ffmpeg', [
  '-v', 'error', '-i', imgPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'
], { maxBuffer: 30 * 1024 * 1024 });

function idx(x, y) { return (y * W + x) * 4; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function saveRgbaPng(buf, w, h, outPath) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`,
    '-i', '-',
    '-frames:v', '1',
    outPath
  ], { input: buf, maxBuffer: 30 * 1024 * 1024 });
}

function laplaceInpaint(srcBuf, maskU8, x1, y1, x2, y2, strides = [8, 4, 2, 1]) {
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const R = new Float32Array(bw * bh);
  const G = new Float32Array(bw * bh);
  const B = new Float32Array(bw * bh);
  const M = new Uint8Array(bw * bh);

  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const p = (y - y1) * bw + (x - x1);
      const gi = idx(x, y);
      const m = maskU8[y * W + x];
      M[p] = m;
      if (!m) {
        R[p] = srcBuf[gi];
        G[p] = srcBuf[gi + 1];
        B[p] = srcBuf[gi + 2];
        sumR += R[p]; sumG += G[p]; sumB += B[p]; count++;
      }
    }
  }
  const avgR = count ? sumR / count : 250;
  const avgG = count ? sumG / count : 245;
  const avgB = count ? sumB / count : 242;
  for (let p = 0; p < bw * bh; p++) {
    if (M[p]) { R[p] = avgR; G[p] = avgG; B[p] = avgB; }
  }

  for (const s of strides) {
    const iters = s === 1 ? 150 : 100;
    for (let it = 0; it < iters; it++) {
      for (let ly = 0; ly < bh; ly++) {
        const ym = Math.max(0, ly - s) * bw;
        const yp = Math.min(bh - 1, ly + s) * bw;
        const y0 = ly * bw;
        for (let lx = 0; lx < bw; lx++) {
          const p = y0 + lx;
          if (!M[p]) continue;
          const xm = Math.max(0, lx - s);
          const xp = Math.min(bw - 1, lx + s);
          R[p] = 0.25 * (R[ym + lx] + R[yp + lx] + R[y0 + xm] + R[y0 + xp]);
          G[p] = 0.25 * (G[ym + lx] + G[yp + lx] + G[y0 + xm] + G[y0 + xp]);
          B[p] = 0.25 * (B[ym + lx] + B[yp + lx] + B[y0 + xm] + B[y0 + xp]);
        }
      }
    }
  }

  const out = Buffer.from(srcBuf);
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const p = (y - y1) * bw + (x - x1);
      if (M[p]) {
        const gi = idx(x, y);
        out[gi] = clamp(Math.round(R[p]), 0, 255);
        out[gi + 1] = clamp(Math.round(G[p]), 0, 255);
        out[gi + 2] = clamp(Math.round(B[p]), 0, 255);
      }
    }
  }
  return out;
}

// ============================================================================
// STEP 1: Build Clean Watercolor Paper Plate (bg-paper.png)
// Preserve all genuine soft pastel paper washes (including corner pink washes)
// ============================================================================
const rawPaperMask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);

    let m = false;
    // Closed interiors that contain white/light tones which aren't background paper:
    // 1. White blossoms inside the 4 floral corners
    if ((x <= 195 && y <= 145) || (x >= 487 && y <= 145) || (x <= 225 && y >= 810 && y <= 985) || (x >= 457 && y >= 810 && y <= 985)) {
      if (!(r > 240 && g > 218 && b > 224 && r > g + 6)) m = true;
    }
    // 2. Boy & Girl characters
    if (x >= 205 && x <= 515 && y >= 8 && y <= 294) m = true;
    // 3. Upper Ribbon, Madrina Plaque, Calendar/Pin/Clock Icons, Lower Ribbon
    if (x >= 52 && x <= 630 && y >= 386 && y <= 468 && !(x >= 145 && x <= 540 && y >= 432)) m = true;
    if (x >= 102 && x <= 585 && y >= 473 && y <= 592) m = true;
    if (x >= 60 && x <= 114 && y >= 724 && y <= 786) m = true;
    if (x >= 290 && x <= 336 && y >= 724 && y <= 786) m = true;
    if (x >= 464 && x <= 525 && y >= 724 && y <= 788) m = true;
    if (x >= 132 && x <= 558 && y >= 847 && y <= 893) m = true;
    // 4. Outer gold frame bars
    if (x >= 4 && x <= 15) m = true;
    if (x >= 666 && x <= 678) m = true;
    if (y >= 8 && y <= 19) m = true;
    if (y >= 989 && y <= 1001) m = true;

    // 5. Any ink, gold, leaf, petal, shadow anywhere on the card
    if (minC < 222 || (maxC - minC) > 30) m = true;

    if (m) rawPaperMask[y * W + x] = 1;
  }
}

const paperMask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let m = 0;
    for (let dy = -3; dy <= 3 && !m; dy++) {
      for (let dx = -3; dx <= 3 && !m; dx++) {
        const nx = clamp(x + dx, 0, W - 1), ny = clamp(y + dy, 0, H - 1);
        if (rawPaperMask[ny * W + nx]) m = 1;
      }
    }
    paperMask[y * W + x] = m;
  }
}

const bgPaperBuf = laplaceInpaint(orig, paperMask, 0, 0, W - 1, H - 1, [16, 8, 4, 2, 1]);
saveRgbaPng(bgPaperBuf, W, H, path.join(layersDir, 'bg-paper.png'));
console.log('1. Saved clean bg-paper.png');

// ============================================================================
// STEP 2: Prepare Inpainted Sub-Plates for Madrina Plaque & Top/Bottom Ribbons
// ============================================================================
// 2a. Madrina Plaque Empty: ONLY mask dark navy ink (g < 172 && r < 165 && b >= r - 5), NEVER sky-blue shading (g > 190) or gold border (r > b + 20)!
const rawPlaqueTextMask = new Uint8Array(W * H);
for (let y = 500; y <= 582; y++) {
  for (let x = 126; x <= 562; x++) {
    const i = idx(x, y);
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    if (g < 185 && r < 175 && b >= r - 5) {
      rawPlaqueTextMask[y * W + x] = 1;
    }
  }
}
const plaqueTextMask = new Uint8Array(W * H);
for (let y = 498; y <= 584; y++) {
  for (let x = 124; x <= 564; x++) {
    const gi = idx(x, y);
    if (orig[gi] > orig[gi + 2] + 18) continue; // Gold pixel!
    let m = 0;
    for (let dy = -2; dy <= 2 && !m; dy++) {
      for (let dx = -2; dx <= 2 && !m; dx++) {
        if (rawPlaqueTextMask[(y + dy) * W + (x + dx)]) m = 1;
      }
    }
    plaqueTextMask[y * W + x] = m;
  }
}
const plaqueEmptyPlate = laplaceInpaint(orig, plaqueTextMask, 115, 494, 570, 586, [4, 2, 1]);

// 2b. Top Ribbon Empty: inpaint navy text inside arch
const rawRibbonTopTextMask = new Uint8Array(W * H);
for (let y = 393; y <= 428; y++) {
  for (let x = 158; x <= 525; x++) {
    const i = idx(x, y);
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    if (r < 210 && b >= r - 25) {
      rawRibbonTopTextMask[y * W + x] = 1;
    }
  }
}
const ribbonTopTextMask = new Uint8Array(W * H);
for (let y = 391; y <= 430; y++) {
  for (let x = 156; x <= 527; x++) {
    let m = 0;
    for (let dy = -2; dy <= 2 && !m; dy++) {
      for (let dx = -2; dx <= 2 && !m; dx++) {
        if (rawRibbonTopTextMask[(y + dy) * W + (x + dx)]) m = 1;
      }
    }
    ribbonTopTextMask[y * W + x] = m;
  }
}
const ribbonTopEmptyPlate = laplaceInpaint(orig, ribbonTopTextMask, 150, 388, 534, 434, [4, 2, 1]);

// 2c. Bottom Ribbon Empty: inpaint navy text inside lower ribbon
const rawRibbonBotTextMask = new Uint8Array(W * H);
for (let y = 852; y <= 884; y++) {
  for (let x = 174; x <= 514; x++) {
    const i = idx(x, y);
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    if (r < 210 && b >= r - 25) {
      rawRibbonBotTextMask[y * W + x] = 1;
    }
  }
}
const ribbonBotTextMask = new Uint8Array(W * H);
for (let y = 850; y <= 886; y++) {
  for (let x = 172; x <= 516; x++) {
    let m = 0;
    for (let dy = -2; dy <= 2 && !m; dy++) {
      for (let dx = -2; dx <= 2 && !m; dx++) {
        if (rawRibbonBotTextMask[(y + dy) * W + (x + dx)]) m = 1;
      }
    }
    ribbonBotTextMask[y * W + x] = m;
  }
}
const ribbonBotEmptyPlate = laplaceInpaint(orig, ribbonBotTextMask, 165, 848, 524, 889, [4, 2, 1]);

// 2d. Girl's Pink Skirt behind Boy's Right Leg (x=256..318, y=212..284)
const girlCompletePlate = Buffer.from(orig);
for (let y = 212; y <= 284; y++) {
  const skirtLeftX = Math.round(338 - (y - 155) * 0.68);
  for (let x = skirtLeftX; x <= 320; x++) {
    const gi = idx(x, y);
    const r = orig[gi], g = orig[gi + 1], b = orig[gi + 2];
    // If this pixel is Boy's navy trouser or dark shoe (not pink dress)
    if (!(r > 185 && r > g + 8 && b > 135)) {
      const sx = 324 + ((x - skirtLeftX) % 9);
      const sy = clamp(y - 6, 210, 270);
      const si = idx(sx, sy);
      girlCompletePlate[gi] = orig[si];
      girlCompletePlate[gi + 1] = orig[si + 1];
      girlCompletePlate[gi + 2] = orig[si + 2];
    }
  }
}

// ============================================================================
// STEP 3: Layer Extraction Engine
// ============================================================================
const manifest = [];
const CARD_W = 920;
const CARD_H = 1381;
const SCALE_X = CARD_W / W;
const SCALE_Y = CARD_H / H;

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function extractLayer(id, x1, y1, x2, y2, opts = {}) {
  const srcPlate = opts.srcPlate || orig;
  const bgPlate = opts.bgPlate || bgPaperBuf;
  const filterFn = opts.filterFn || (() => true);
  const dMin = opts.dMin !== undefined ? opts.dMin : 6;
  const dMax = opts.dMax !== undefined ? opts.dMax : 34;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;

  let isExterior = null;
  if (opts.solidInterior) {
    isExterior = new Uint8Array(bw * bh);
    const queue = [];
    const thresh = opts.floodThresh || 24;

    function tryPush(lx, ly) {
      if (lx < 0 || lx >= bw || ly < 0 || ly >= bh) return;
      const p = ly * bw + lx;
      if (isExterior[p]) return;
      const gx = x1 + lx, gy = y1 + ly;
      if (!filterFn(gx, gy)) {
        isExterior[p] = 1;
        queue.push(p);
        return;
      }
      const gi = idx(gx, gy);
      const d = colorDist(
        srcPlate[gi], srcPlate[gi + 1], srcPlate[gi + 2],
        bgPlate[gi], bgPlate[gi + 1], bgPlate[gi + 2]
      );
      if (d < thresh) {
        isExterior[p] = 1;
        queue.push(p);
      }
    }

    for (let lx = 0; lx < bw; lx++) { tryPush(lx, 0); tryPush(lx, bh - 1); }
    for (let ly = 0; ly < bh; ly++) { tryPush(0, ly); tryPush(bw - 1, ly); }
    if (opts.extraSeeds) {
      for (const [sx, sy] of opts.extraSeeds) {
        tryPush(sx - x1, sy - y1);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const p = queue[head++];
      const lx = p % bw, ly = (p - lx) / bw;
      tryPush(lx - 1, ly);
      tryPush(lx + 1, ly);
      tryPush(lx, ly - 1);
      tryPush(lx, ly + 1);
    }
  }

  const out = Buffer.alloc(bw * bh * 4);
  for (let ly = 0; ly < bh; ly++) {
    for (let lx = 0; lx < bw; lx++) {
      const gx = x1 + lx, gy = y1 + ly;
      const oi = (ly * bw + lx) * 4;
      if (!filterFn(gx, gy)) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
        continue;
      }
      const gi = idx(gx, gy);
      const sr = srcPlate[gi], sg = srcPlate[gi + 1], sb = srcPlate[gi + 2];
      const br = bgPlate[gi], bg = bgPlate[gi + 1], bb = bgPlate[gi + 2];
      const d = colorDist(sr, sg, sb, br, bg, bb);

      let alpha = 1.0;
      if (isExterior) {
        const p = ly * bw + lx;
        if (isExterior[p]) {
          let nearInterior = false;
          for (let dy = -1; dy <= 1 && !nearInterior; dy++) {
            for (let dx = -1; dx <= 1 && !nearInterior; dx++) {
              const nx = lx + dx, ny = ly + dy;
              if (nx >= 0 && nx < bw && ny >= 0 && ny < bh && !isExterior[ny * bw + nx]) {
                nearInterior = true;
              }
            }
          }
          if (nearInterior && d > dMin) {
            alpha = clamp((d - dMin) / (dMax - dMin), 0, 1);
          } else {
            alpha = 0;
          }
        } else {
          alpha = 1.0;
        }
      } else {
        if (d <= dMin) {
          alpha = 0;
        } else {
          alpha = clamp((d - dMin) / (dMax - dMin), 0, 1);
        }
      }

      if (alpha <= 0.004) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
      } else if (alpha >= 0.996) {
        out[oi] = sr;
        out[oi + 1] = sg;
        out[oi + 2] = sb;
        out[oi + 3] = 255;
      } else {
        out[oi] = clamp(Math.round((sr - (1 - alpha) * br) / alpha), 0, 255);
        out[oi + 1] = clamp(Math.round((sg - (1 - alpha) * bg) / alpha), 0, 255);
        out[oi + 2] = clamp(Math.round((sb - (1 - alpha) * bb) / alpha), 0, 255);
        out[oi + 3] = clamp(Math.round(alpha * 255), 1, 254);
      }
    }
  }

  const filename = `${id}.png`;
  saveRgbaPng(out, bw, bh, path.join(layersDir, filename));
  manifest.push({
    id,
    file: `assets/layers/${filename}`,
    srcRect: { x: x1, y: y1, w: bw, h: bh },
    cardRect: {
      left: Math.round(x1 * SCALE_X * 10) / 10,
      top: Math.round(y1 * SCALE_Y * 10) / 10,
      width: Math.round(bw * SCALE_X * 10) / 10,
      height: Math.round(bh * SCALE_Y * 10) / 10
    }
  });
}

// ============================================================================
// STEP 4: Exact Geometric Boundaries
// ============================================================================
// Parabolic arch separating "PROMOCIÓN 2026" and Upper Pink Ribbon
function archPromoRibbonY(x) {
  return 385 + 0.00043 * (x - 341) * (x - 341);
}

// Left & Right Cap-Ribbon regions (excluding outer gold bar x<=14 / x>=667, and text/wings)
function isCapLeftRegion(x, y) {
  if (x < 15 || x > 148 || y < 108 || y > 515) return false;
  // Upper boundary along mortarboard top edge
  const capTopY = x < 92 ? 152 - (x - 15) * 0.54 : 110 + (x - 92) * 0.25;
  if (y < capTopY) return false;
  if (y >= 230 && x > 105) return false;
  if (y >= 285 && x > 62) return false;
  if (y >= 395 && x > 49) return false;
  return true;
}

function isFlowerTLRegion(x, y) {
  if (x > 218 || y > 165) return false;
  if (isCapLeftRegion(x, y)) return false;
  // Exclude straight gold top bar for x > 188
  if (x > 188 && y <= 19) return false;
  // Exclude top-left stars at x > 165, y > 90
  if (x > 165 && y > 90) return false;
  return true;
}

function isCapRightRegion(x, y) {
  const rx = 681 - x;
  if (rx < 15 || rx > 148 || y < 108 || y > 515) return false;
  const capTopY = rx < 92 ? 152 - (rx - 15) * 0.54 : 110 + (rx - 92) * 0.25;
  if (y < capTopY) return false;
  if (y >= 230 && rx > 105) return false;
  if (y >= 285 && rx > 62) return false;
  if (y >= 395 && rx > 49) return false;
  return true;
}

function isFlowerTRRegion(x, y) {
  const rx = 681 - x;
  if (rx > 218 || y > 165) return false;
  if (isCapRightRegion(x, y)) return false;
  if (rx > 188 && y <= 19) return false;
  if (rx > 165 && y > 90) return false;
  return true;
}

function isCrownDividerTop(x, y) {
  if (x < 148 || x > 534 || y < 271 || y > 298) return false;
  const gi = idx(x, y);
  const r = orig[gi], g = orig[gi + 1], b = orig[gi + 2];
  if (x >= 208 && x <= 312 && (r < 135 && g < 135 && b < 150)) return false;
  if (x >= 340 && y <= 283 && (r > 200 && b > 165 && r > g + 10)) return false;
  return true;
}

function isBoyRegion(x, y) {
  if (x < 205 || x > 331 || y < 8 || y > 294) return false;
  if (isCrownDividerTop(x, y)) return false;
  const gi = idx(x, y);
  const r = orig[gi], g = orig[gi + 1], b = orig[gi + 2];
  // At y <= 18, exclude the horizontal gold frame bar (which is yellow/gold, whereas hair is dark brown r < 165)
  if (y <= 18 && (x < 268 || x > 296 || r > 165)) return false;
  // Exclude background stars on the left
  if (x < 222 && y >= 70 && y <= 240) return false;
  // For y >= 150, exclude Girl's pink skirt & hand (pink: r > 175 && r > g + 8 && b > 130)
  if (y >= 150 && x >= 262 && (r > 175 && r > g + 8 && b > 130)) return false;
  if (y >= 155 && x > 318) return false;
  return true;
}

function isGirlRegion(x, y) {
  if (x < 256 || x > 524 || y < 18 || y > 279) return false;
  if (isCrownDividerTop(x, y)) return false;
  if (x > 452 && y < 155) return false;
  if (x > 492 && y < 215) return false;
  if (y < 155 && x < 332) return false;
  const skirtLeftX = Math.round(338 - (y - 155) * 0.68);
  if (y >= 155 && x < skirtLeftX) return false;
  return true;
}

function isTopStarsRegion(x, y) {
  if (x < 128 || x > 555 || y < 25 || y > 268) return false;
  if (isFlowerTLRegion(x, y) || isFlowerTRRegion(x, y)) return false;
  if (isCapLeftRegion(x, y) || isCapRightRegion(x, y)) return false;
  if (isBoyRegion(x, y) || isGirlRegion(x, y)) return false;
  return true;
}

// ============================================================================
// STEP 5: Extract All Layers
// ============================================================================
// 0. Outer Golden Perimeter Frame (top, bottom, left, right straight gold bars)
extractLayer('gold-frame', 4, 8, 678, 1001, {
  filterFn: (x, y) => {
    const topBar = (y >= 8 && y <= 19 && x >= 180 && x <= 502 && !isBoyRegion(x, y));
    const botBar = (y >= 989 && y <= 1001 && x >= 220 && x <= 460);
    const leftBar = (x >= 4 && x <= 15 && y >= 145 && y <= 835);
    const rightBar = (x >= 666 && x <= 678 && y >= 145 && y <= 835);
    return topBar || botBar || leftBar || rightBar;
  },
  dMin: 5,
  dMax: 28
});

// 1. Top Floral Corners & Side Caps/Ribbons
extractLayer('flower-tl', 0, 0, 218, 165, { filterFn: isFlowerTLRegion, dMin: 6, dMax: 30 });
extractLayer('flower-tr', 463, 0, 681, 165, { filterFn: isFlowerTRRegion, dMin: 6, dMax: 30 });
extractLayer('cap-ribbon-left', 15, 108, 148, 515, { filterFn: isCapLeftRegion, dMin: 6, dMax: 30 });
extractLayer('cap-ribbon-right', 533, 108, 666, 515, { filterFn: isCapRightRegion, dMin: 6, dMax: 30 });

// 2. Graduating Boy, Girl, Background Stars & Top Crown Divider
extractLayer('child-girl', 256, 18, 524, 279, {
  srcPlate: girlCompletePlate,
  filterFn: isGirlRegion,
  solidInterior: true,
  floodThresh: 26,
  extraSeeds: [[358, 130], [432, 130], [340, 50], [435, 35], [448, 60]]
});

extractLayer('child-boy', 205, 8, 331, 294, {
  filterFn: isBoyRegion,
  solidInterior: true,
  floodThresh: 22,
  extraSeeds: [[215, 50], [315, 50], [264, 250], [320, 200]]
});

extractLayer('bg-stars-top', 128, 25, 555, 268, { filterFn: isTopStarsRegion, dMin: 8, dMax: 32 });
extractLayer('crown-divider-top', 148, 271, 534, 298, { filterFn: isCrownDividerTop, dMin: 6, dMax: 30 });

// 3. Header "INVITACIÓN ESPECIAL" + Mini Graduation Caps
extractLayer('mini-cap-left', 80, 290, 135, 332, { dMin: 6, dMax: 32 });
extractLayer('header-invitacion', 138, 298, 549, 332, { dMin: 6, dMax: 32 });
extractLayer('mini-cap-right', 551, 290, 605, 332, { dMin: 6, dMax: 32 });

// 4. Main 3D Gold Title "PROMOCIÓN 2026" (strictly above archPromoRibbonY)
extractLayer('title-promocion', 64, 333, 621, 412, {
  filterFn: (x, y) => y < archPromoRibbonY(x),
  dMin: 6,
  dMax: 30
});

// 5. Upper Pink Satin Ribbon (strictly on/below archPromoRibbonY, and excluding Intro Line 1 in the bottom notch)
extractLayer('ribbon-top-empty', 52, 386, 630, 468, {
  srcPlate: ribbonTopEmptyPlate,
  filterFn: (x, y) => {
    if (y < archPromoRibbonY(x)) return false;
    if ((x < 115 || x > 567) && y < 414) return false;
    // Exclude Intro Line 1 & 2 in the center below the ribbon arch (x=154..542)
    const bottomArchY = 423 + 0.00038 * (x - 341) * (x - 341);
    if (x >= 154 && x <= 542 && y > bottomArchY) return false;
    if (x >= 154 && x <= 558 && y >= 435) return false;
    return true;
  },
  solidInterior: true,
  floodThresh: 18
});
extractLayer('ribbon-top-text', 156, 391, 527, 429, {
  srcPlate: orig,
  bgPlate: ribbonTopEmptyPlate,
  dMin: 8,
  dMax: 38
});

// 6. Introductory Paragraph (Line 1 & Line 2)
extractLayer('intro-line-1', 154, 435, 558, 459, { dMin: 6, dMax: 32 });
extractLayer('intro-line-2', 175, 459, 512, 476, { dMin: 6, dMax: 32 });

// 7. Madrina de Promoción Plaque Group
extractLayer('madrina-crown', 288, 473, 397, 493, { dMin: 6, dMax: 30 });
extractLayer('madrina-plaque-empty', 103, 486, 584, 591, {
  srcPlate: plaqueEmptyPlate,
  solidInterior: true,
  floodThresh: 20
});
extractLayer('madrina-wing-left', 62, 502, 102, 575, { dMin: 6, dMax: 30 });
extractLayer('madrina-wing-right', 585, 502, 626, 575, { dMin: 6, dMax: 30 });
extractLayer('madrina-role-text', 142, 498, 542, 532, {
  srcPlate: orig,
  bgPlate: plaqueEmptyPlate,
  filterFn: (x, y) => plaqueTextMask[y * W + x] === 1,
  dMin: 8,
  dMax: 38
});
extractLayer('madrina-name-text', 126, 532, 558, 583, {
  srcPlate: orig,
  bgPlate: plaqueEmptyPlate,
  filterFn: (x, y) => plaqueTextMask[y * W + x] === 1,
  dMin: 8,
  dMax: 38
});

// 8. Fiesta de Promoción Group
extractLayer('fiesta-lead', 138, 596, 550, 622, { dMin: 6, dMax: 32 });
extractLayer('fiesta-wing-left', 48, 622, 89, 670, { dMin: 6, dMax: 30 });
extractLayer('fiesta-title', 90, 622, 603, 670, { dMin: 6, dMax: 30 });
extractLayer('fiesta-wing-right', 604, 622, 642, 670, { dMin: 6, dMax: 30 });
extractLayer('fiesta-sub-1', 136, 674, 580, 696, { dMin: 6, dMax: 32 });
extractLayer('fiesta-sub-2', 240, 697, 456, 716, { dMin: 6, dMax: 32 });

// 9. Event Details Row
extractLayer('detail-calendar-icon', 60, 725, 113, 786, { solidInterior: true, floodThresh: 20 });
extractLayer('detail-dia-text', 126, 725, 273, 790, { dMin: 6, dMax: 32 });
extractLayer('detail-pin-icon', 290, 725, 336, 786, { solidInterior: true, floodThresh: 20 });
extractLayer('detail-lugar-text', 340, 725, 446, 790, { dMin: 6, dMax: 32 });
extractLayer('detail-clock-icon', 464, 725, 524, 787, { solidInterior: true, floodThresh: 20 });
extractLayer('detail-hora-text', 526, 738, 642, 778, { dMin: 6, dMax: 32 });
extractLayer('divider-v1', 115, 725, 124, 790, { dMin: 6, dMax: 30 });
extractLayer('divider-v2', 276, 725, 286, 790, { dMin: 6, dMax: 30 });
extractLayer('divider-v3', 450, 725, 460, 790, { dMin: 6, dMax: 30 });
extractLayer('divider-dots', 270, 791, 415, 804, { dMin: 6, dMax: 30 });

// 10. Closing Section
extractLayer('emotional-line-1', 105, 805, 582, 826, { dMin: 6, dMax: 32 });
extractLayer('emotional-line-2', 148, 827, 536, 846, { dMin: 6, dMax: 32 });

extractLayer('ribbon-bottom-empty', 134, 848, 556, 892, {
  srcPlate: ribbonBotEmptyPlate,
  solidInterior: true,
  floodThresh: 18
});
extractLayer('ribbon-bottom-text', 172, 851, 516, 885, {
  srcPlate: orig,
  bgPlate: ribbonBotEmptyPlate,
  dMin: 8,
  dMax: 38
});

extractLayer('closing-line-1', 165, 895, 520, 916, { dMin: 6, dMax: 32 });
extractLayer('closing-line-2', 230, 917, 452, 935, { dMin: 6, dMax: 32 });
extractLayer('bottom-heart', 258, 937, 424, 969, { dMin: 6, dMax: 30 });

// Bottom floral corners (excluding straight gold frame bars outside the flowers)
function isFlowerBLRegion(x, y) {
  if (x > 250 || y < 785) return false;
  if (x <= 15 && y < 825) return false; // straight gold left bar above flower
  if (y >= 989 && x > 228) return false; // straight gold bottom bar to right of ribbon
  if (x >= 104 && y >= 804 && y <= 847) return false;
  if (x >= 133 && y >= 847 && y <= 893) return false;
  if (x >= 164 && y >= 894 && y <= 936) return false;
  if (x >= 256 && y >= 936 && y <= 970) return false;
  return true;
}
function isFlowerBRRegion(x, y) {
  const rx = 681 - x;
  if (rx > 250 || y < 785) return false;
  if (rx <= 15 && y < 825) return false;
  if (y >= 989 && rx > 228) return false;
  if (x <= 583 && y >= 804 && y <= 847) return false;
  if (x <= 557 && y >= 847 && y <= 893) return false;
  if (x <= 521 && y >= 894 && y <= 936) return false;
  if (x <= 425 && y >= 936 && y <= 970) return false;
  return true;
}

extractLayer('flower-bl', 0, 785, 250, 1023, { filterFn: isFlowerBLRegion, dMin: 6, dMax: 30 });
extractLayer('flower-br', 432, 785, 681, 1023, { filterFn: isFlowerBRRegion, dMin: 6, dMax: 30 });

fs.writeFileSync(path.join(layersDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Extracted ${manifest.length} refined layers successfully!`);

// Composite verification
const comp = Buffer.from(bgPaperBuf);
for (const item of manifest) {
  const layerPath = path.join(projectDir, item.file);
  const { x, y, w, h } = item.srcRect;
  const layerRaw = execFileSync('ffmpeg', [
    '-v', 'error', '-i', layerPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'
  ], { maxBuffer: 20 * 1024 * 1024 });
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      const li = (ly * w + lx) * 4;
      const a = layerRaw[li + 3] / 255;
      if (a <= 0) continue;
      const gi = idx(x + lx, y + ly);
      comp[gi] = clamp(Math.round(a * layerRaw[li] + (1 - a) * comp[gi]), 0, 255);
      comp[gi + 1] = clamp(Math.round(a * layerRaw[li + 1] + (1 - a) * comp[gi + 1]), 0, 255);
      comp[gi + 2] = clamp(Math.round(a * layerRaw[li + 2] + (1 - a) * comp[gi + 2]), 0, 255);
    }
  }
}
saveRgbaPng(comp, W, H, 'C:\\Users\\balfa\\.gemini\\antigravity\\brain\\a710f3f7-de7b-4e1a-96d8-ec6e3d892690\\scratch\\composite-check.png');
console.log('Saved composite-check.png');
