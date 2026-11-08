---
name: invitation-video-animator
description: >-
  Decompose static invitations, greeting cards, certificates, or posters into transparent PNG layers via Harmonic Laplace Inpainting and animate every detail progressively with smooth camera zooms in HyperFrames. Use when the user asks to recreate or animate an invitation, card, flyer, or poster image layer by layer ("apareciendo poco a poco", progressive zoom reveal), or to swap a recipient/sponsor name on an existing animated invitation template.
---

# Invitation & Card Progressive Video Animator

Turn any static invitation, greeting card, certificate, or poster image into a multi-layer HyperFrames vertical (`1080x1920`) or horizontal video where every visual detail appears progressively (`apareciendo poco a poco`) synchronized with smooth virtual camera zooms and pans, ending on a crystal-clear global view of the constructed card.

Read [`references/decomposition-guide.md`](references/decomposition-guide.md) when decomposing a new card layout, tuning inpainting masks, or troubleshooting layer edges and HyperFrames lint checks.

---

## Branch 1: Fast Variant Swap (Same Template, New Name or Role)

Use this branch when the card template is already decomposed into `assets/layers/` and only the honoree, sponsor (`Padrino` / `Madrina`), or event text changes.

1. **Preserve previous render**: Copy the existing `renders/*.mp4` to a descriptive filename (e.g., `renders/invitacion-madrina-promocion-2026.mp4`) before modifying layers.
2. **Extract variant text layers**: Run [`scripts/extract_variant.js`](scripts/extract_variant.js) against the new reference image to inpaint the plaque/ribbon background and extract only the changed text layers (e.g., `padrino-role-text.png`, `padrino-name-text.png`) using unpremultiplied alpha unmixing.
   - *Completion criterion*: Inspect the extracted PNGs and the empty plaque PNG via `read_file` to confirm zero residual ink from the previous name and zero background specks at the bounding-box edges.
3. **Update scene & sparkle path**: Point the changed layer IDs in [`scripts/build_scene.js`](scripts/build_scene.js) to the new PNG files and adjust `#sparkle-pen` start `left` and travel `x` to match the horizontal span of the new calligraphy. Regenerate `compositions/invitacion-scene.html`.
4. **Verify & render**: Run `npx hyperframes lint`, inspect `npx hyperframes snapshot --at 15,16,29 -o snapshots/variant-check`, and render the final MP4 with `npx hyperframes render --output renders/<variant-name>.mp4 --fps 30`.
   - *Completion criterion*: `npx hyperframes lint` reports `0 errors, 0 warnings`, the contact sheet shows clean calligraphy reveal with no ghosting on the plaque, and `ffprobe` confirms the rendered MP4 duration and resolution.

---

## Branch 2: Full Multi-Layer Decomposition & Progressive Animation (New Card/Invitation)

Use this branch when given a new static invitation, card, or poster image to recreate and animate from scratch.

### Step 1: Measure & Map Every Visual Detail
1. Inspect the source image dimensions with `ffprobe` and read the image to catalog every distinct visual element from top to bottom (outer frame, corner florals, characters/illustrations, badges/crowns, headers, ribbons, dedication lines, centerpiece plaque, event details columns, closing quote, bottom flourishes).
2. Classify each element into one of two extraction modes (see [`references/decomposition-guide.md`](references/decomposition-guide.md)):
   - **Translucent / Ink / Gold mode** (`solidInterior: false`): Text lines, thin gold borders, stars, dividers.
   - **Solid-Interior Flood-Fill mode** (`solidInterior: true`): Illustrations, characters, florals, ribbons, plaques, and icons that contain white or light-colored interior regions (eyes, shirts, calendar pages, clock faces).
   - *Completion criterion*: Every visible graphic and text line in the source image is assigned a bounding box `(x1, y1, x2, y2)` and an extraction mode.

### Step 2: Reconstruct Clean Plates via Harmonic Laplace Inpainting ($\nabla^2 u = 0$)
1. Configure and run [`scripts/extract_layers.js`](scripts/extract_layers.js) (powered by `laplaceInpaint` in [`scripts/layer-engine.js`](scripts/layer-engine.js)) to solve $\nabla^2 u = 0$ with multigrid Successive Over-Relaxation (`steps = [4, 2, 1]`, $\omega = 1.75$):
   - **Base Paper Plate (`assets/layers/bg-paper.png`)**: Mask all foreground elements while keeping border margin strips and clear watercolor background samples as Dirichlet boundary conditions.
   - **Empty Container Plates (`plaqueEmptyPlate`, `ribbonTopEmptyPlate`, `ribbonBotEmptyPlate`)**: Mask only the dark text ink inside plaques or ribbons (protecting gold borders with `r > b + 18` and pastel shading) so the empty plaque/ribbon can animate in first before its text is written onto it.
   - **Overlap Completion (`girlCompletePlate`)**: When two characters overlap slightly (e.g., a boy's leg in front of a girl's dress), reconstruct the occluded dress edge on the rear layer and place the front character higher in `z-index`.
2. Verify reconstruction accuracy via `composite-check.png`:
   - *Completion criterion*: Read `assets/layers/bg-paper.png`, the empty container plates, and `composite-check.png`. `bg-paper.png` must have zero text ghosting, and `composite-check.png` (all extracted layers composited over `bg-paper.png`) must be visually indistinguishable from the original reference image.

### Step 3: Build the HyperFrames Scene & Camera Rig
1. **Render layers as `<div class="inv-layer">`**: Always render extracted PNG layers as `<div class="inv-layer" data-layout-ignore="true" style="background-image:url('assets/layers/...')">` inside `#card-wrapper` (never bare `<img>` tags without `data-duration`, which HyperFrames treats as 3-second clips).
2. **Ensure Frame 0 (`t = 0`) is non-empty**: Set `#card-wrapper` (`opacity: 1`), `#layer-gold-frame` (`opacity: 0.35`), and the top corner florals (`opacity: 0.85, scale: 0.78`) visible at `t = 0` so thumbnails and `craft` checks (`first_frame_empty`) pass cleanly.
3. **Choreograph the 7-Shot Progressive Camera Timeline**:
   - Wrap `#card-wrapper` inside `#camera-stage` (`transform-origin: 540px 960px`).
   - Animate `#camera-stage` (`scale`, `x`, `y`) smoothly with `power2.inOut` across each vertical zone as elements appear one by one:
     - **Shot 1 (`0.0s–3.6s`)**: Gold SVG stroke draw-on, top florals (`back.out(1.4)`), cascading side caps/ribbons (`clipPath: inset(...)`).
     - **Shot 2 (`3.6s–7.8s`)**: Zoom into upper stage (`scale: 1.38, y: 470`); characters pop in sequentially with soft unblur + idle breathing (`scaleY: 1.015`), stars twinkle, crown divider expands.
     - **Shot 3 (`7.8s–12.2s`)**: Pan to main headers (`scale: 1.22, y: 170`); mini caps, `INVITACIÓN ESPECIAL`, 3D gold `PROMOCIÓN 2026` + specular light sweep, upper ribbon unroll (`scaleX`), and dedication lines.
     - **Shot 4 (`12.2s–17.0s`)**: Zoom to centerpiece plaque (`scale: 1.28, y: -38`); crown, empty plaque, golden side wings, role title, and left-to-right calligraphic reveal traced by `#sparkle-pen`.
     - **Shot 5 (`17.0s–20.8s`)**: Pan to celebration banner (`scale: 1.22, y: -225`); lead line, 3D title + side wings + light sweep, and subtitle lines.
     - **Shot 6 (`20.8s–25.4s`)**: Gentle horizontal camera pan (`scale: 1.25, x: +60 -> 0 -> -60, y: -320`) across the 3 event columns (`Día`, `Lugar`, `Hora`) as each icon, vertical divider, and text block appears.
     - **Shot 7 (`25.4s–30.0s`)**: Closing lines, lower ribbon, bottom heart, and bottom corner florals bloom as `#camera-stage` pulls back (`scale: 1.0, x: 0, y: 0`) to the full global view with a final diagonal sheen sweep.
   - *Completion criterion*: File stays under 300 lines (`composition_file_too_large` threshold) and has zero overlapping tweens on the same property (`overlapping_gsap_tweens`).

### Step 4: Gate Checks, Visual Verification & Render
1. Run `npx hyperframes check --json` and `npx hyperframes snapshot --at 2,7,11.5,16,20,22,24.5,29 -o snapshots`.
2. Read `snapshots/contact-sheet.jpg` to verify framing, legibility, and progressive build across all shots.
3. Render the final video with `npx hyperframes render --output renders/invitacion-promocion-2026.mp4 --fps 30`.
   - *Completion criterion*: `npx hyperframes check --json` reports `0 errors` and `0 lint warnings`, `contact-sheet.jpg` is visually verified, and the MP4 file is rendered and verified with `ffprobe`.
