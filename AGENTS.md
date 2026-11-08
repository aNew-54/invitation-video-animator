# AGENTS.md — Invitation & Card Progressive Video Animator

When asked to animate a static invitation, greeting card, certificate, or poster image layer by layer (`apareciendo poco a poco` with smooth camera zooms), or to swap a recipient/sponsor name on an existing card template, read and follow [`.agents/skills/invitation-video-animator/SKILL.md`](.agents/skills/invitation-video-animator/SKILL.md).

## Repository Layout

- [`.agents/skills/invitation-video-animator/SKILL.md`](.agents/skills/invitation-video-animator/SKILL.md) — Main agent runbook (also mirrored at [`skills/invitation-video-animator/SKILL.md`](skills/invitation-video-animator/SKILL.md) for `npx skills add`).
- [`.agents/skills/invitation-video-animator/references/decomposition-guide.md`](.agents/skills/invitation-video-animator/references/decomposition-guide.md) — Mathematical & technical reference for Harmonic Laplace Inpainting ($\nabla^2 u = 0$), unpremultiplied alpha unmixing, exterior flood-fill (`solidInterior`), and HyperFrames lint rules.
- [`resources/scripts/layer-engine.js`](resources/scripts/layer-engine.js) — Zero-dependency `ffmpeg` raw RGBA buffer I/O and multigrid SOR Laplace inpainting engine.
- [`resources/scripts/extract_layers.js`](resources/scripts/extract_layers.js) — Full 48-layer card decomposition + `manifest.json` generator.
- [`resources/scripts/extract_variant.js`](resources/scripts/extract_variant.js) — Fast name/role variant extractor (`Padrino` / `Madrina` / honoree swap in < 5 seconds).
- [`resources/scripts/build_scene.js`](resources/scripts/build_scene.js) — HyperFrames multi-layer composition & 7-shot GSAP camera rig generator.
- [`resources/assets/layers/`](resources/assets/layers/manifest.json) — Extracted transparent PNG layers, clean watercolor paper plate (`bg-paper.png`), clean plaque plate (`madrina-plaque-empty.png`), and sub-pixel layout manifest (`manifest.json`).
- [`resources/compositions/invitacion-scene.html`](resources/compositions/invitacion-scene.html) & [`resources/index.html`](resources/index.html) — Ready-to-render 30s (`1080x1920`, 30 fps) HyperFrames project files.
