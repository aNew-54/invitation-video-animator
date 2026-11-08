# Multi-Layer Card Decomposition & HyperFrames Reference Guide

## 1. Zero-Dependency RGBA Buffer Pipeline via `ffmpeg`
Python `PIL` / `Pillow` or `sharp` may not be installed in the environment. Always decode and encode images using `ffmpeg` raw RGBA buffers piped into Node.js `Buffer`:

```js
const orig = execFileSync('ffmpeg', [
  '-v', 'error', '-i', srcImg, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'
], { maxBuffer: 50 * 1024 * 1024 });

function saveRgbaPng(buf, w, h, outPath) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${w}x${h}`, '-i', '-', outPath
  ], { input: buf, maxBuffer: 50 * 1024 * 1024 });
}
```

---

## 2. Harmonic Laplace Inpainting ($\nabla^2 u = 0$)
To reconstruct a clean background paper plate (`bg-paper.png`) or an empty plaque/ribbon (`plaqueEmptyPlate`, `ribbonTopEmptyPlate`) without leaving visible seams over watercolor gradients:

1. **Dirichlet Boundary Preservation**:
   - For `bg-paper.png`, keep outer margin strips (`x < 4`, `x > W - 4`, `y < 8`, `y > H - 15`) and known clean watercolor sample rectangles (`keepSampleRect`) unmasked (`mask = 0`).
   - For ornate plaques (`plaqueEmptyPlate`), mask **only dark ink pixels** (`g < 185 && r < 175 && b >= r - 5`) and explicitly protect gold border pixels (`if (orig[gi] > orig[gi + 2] + 18) continue`) so the 2-pixel dilation never erodes the gold frame or sky-blue corner shading.
2. **Multigrid SOR Solver**:
   - Initialize unknown pixels by horizontal linear interpolation across each row.
   - Run Successive Over-Relaxation (`omega = 1.75`) across coarse-to-fine step sizes `steps = [4, 2, 1]` (`220` iterations at `step = 4`, `220` at `step = 2`, `320` at `step = 1`).

---

## 3. Choosing Between the Two Layer Extraction Modes

### Mode A: Translucent / Ink / Gold Unmixing (`solidInterior: false`)
Use for text lines, gold frames, stars, and thin dividers where every pixel's opacity is proportional to its color distance $d = \|\mathbf{C}_{\text{src}} - \mathbf{C}_{\text{bg}}\|_2$ from the clean background plate:
- Smoothstep alpha ramp between `dMin = 6` and `dMax = 32`:
  $$t = \text{clamp}\left(\frac{d - d_{\min}}{d_{\max} - d_{\min}}, 0, 1\right), \quad \alpha = t^2(3 - 2t)$$
- **Unpremultiplied Color Recovery**: For edge pixels ($0.01 < \alpha < 0.96$), unmix the true foreground color so dark navy text or gold strokes never carry a pale halo:
  $$\mathbf{C}_{\text{fg}} = \text{clamp}\left(\frac{\mathbf{C}_{\text{src}} - (1 - \alpha)\mathbf{C}_{\text{bg}}}{\max(\alpha, 0.18)}, 0, 255\right)$$

### Mode B: Exterior Flood-Fill (`solidInterior: true`)
Use for illustrations, characters (`child-boy`, `child-girl`), icons (`detail-calendar-icon`, `detail-clock-icon`), ribbons (`ribbon-top-empty`), and plaques (`madrina-plaque-empty`) that contain white or pastel colors inside their silhouette:
- Run a 4-connected BFS flood-fill starting from the bounding-box perimeter (plus optional `extraSeeds` for enclosed background pockets like between an arm and torso).
- Any pixel not reached by the exterior flood-fill is inside the object silhouette and receives **$\alpha = 1.0$ (255)**, preserving white eyes, white shirt collars, white calendar pages, and white clock faces at 100% opacity.
- Pixels on the 2-pixel boundary adjacent to `isExterior` use smooth unpremultiplied alpha unmixing for anti-aliased edges.

---

## 4. Curved & Arched Boundaries Between Adjacent Layers
When a 3D title (`PROMOCIÓN 2026`) sits directly above an arched ribbon (`ribbon-top-empty`) so their rectangular bounding boxes overlap:
- Define a shared parabolic boundary function $y_{\text{arch}}(x) = y_0 + k(x - x_c)^2$ (e.g., `385 + 0.00043 * (x - 341)^2`).
- Filter the upper layer with `y < archPromoRibbonY(x)` and the lower ribbon with `y >= archPromoRibbonY(x)` so neither layer steals pixels from the other.

---

## 5. HyperFrames Contract & Lint Rules to Remember
1. **Never use bare `<img>` tags for static layers**: In HyperFrames (`format.md`), an `<img>` without `data-duration` defaults to a 3-second clip. Always use `<div class="inv-layer" data-layout-ignore="true" style="background-image:url('...')">` inside `#card-wrapper`.
2. **Avoid `first_frame_empty` in `craft` checks**: Keep `#card-wrapper` (`opacity: 1`), `#layer-gold-frame` (`opacity: 0.35`), and the top corner florals (`opacity: 0.85, scale: 0.78`) visible at `t = 0`.
3. **Avoid `overlapping_gsap_tweens`**: Never animate the same property (e.g., `rotation`) on the same target in two overlapping tweens. Separate `scale`/`opacity` pop-in from `x`/`rotation` travel.
4. **Keep composition files under 300 lines**: Format single-line HTML layer declarations and GSAP tweens concisely so `compositions/invitacion-scene.html` stays well under the 300-line `composition_file_too_large` lint limit.
