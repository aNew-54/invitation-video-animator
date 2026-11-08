# Invitation & Card Progressive Video Animator (`invitation-video-animator`)

Skill, motor de descomposición multicapa y recursos listos para que **cualquier agente de IA** (Antigravity, Claude Code, Cursor, Codex, Windsurf) convierta una invitación, tarjeta, certificado o afiche estático en un **video animado con efectos de cámara y zoom progresivo** (`apareciendo poco a poco`) usando **HyperFrames** y **GSAP**.

---

## 🚀 Qué incluye este repositorio

1. **Skill Universal para Agentes de IA**
   - [`.agents/skills/invitation-video-animator/SKILL.md`](.agents/skills/invitation-video-animator/SKILL.md) (descubrimiento automático en Antigravity / workspaces).
   - [`skills/invitation-video-animator/SKILL.md`](skills/invitation-video-animator/SKILL.md) (compatible con `npx skills add`).
   - [`AGENTS.md`](AGENTS.md) y [`CLAUDE.md`](CLAUDE.md) en la raíz para cualquier agente que abra el repositorio.
   - [`decomposition-guide.md`](.agents/skills/invitation-video-animator/references/decomposition-guide.md) con todas las reglas técnicas descubiertas (Inpainting Armónico de Laplace $\nabla^2 u = 0$, desmezcla de canal alfa sin halos, *flood-fill* exterior `solidInterior: true` para figuras con partes blancas internas, fronteras parabólicas para cintas curvas y reglas de validación de HyperFrames).

2. **Scripts Reutilizables (`resources/scripts/`)**
   - [`layer-engine.js`](resources/scripts/layer-engine.js): Pipeline RGBA sin dependencias externas (usa `ffmpeg` directo a `Buffer` de Node.js) + solver multigrid SOR para Inpainting Armónico ($\nabla^2 u = 0$).
   - [`extract_layers.js`](resources/scripts/extract_layers.js): Descompone una invitación completa en el lienzo de papel acuarela limpio (`bg-paper.png`), placas/cintas vacías y 48+ capas PNG transparentes con sus coordenadas exactas en `manifest.json`.
   - [`extract_variant.js`](resources/scripts/extract_variant.js): Cambia únicamente el nombre o cargo (por ejemplo, de **Madrina** a **Padrino**) en menos de 5 segundos reutilizando todas las demás capas.
   - [`build_scene.js`](resources/scripts/build_scene.js): Genera la composición HyperFrames (`compositions/invitacion-scene.html`) con cámara virtual (`#camera-stage`), barridos de luz especular, destellos de 4 puntas, caligrafía guiada por chispa dorada (`#sparkle-pen`) y partículas de polvo de oro.

3. **Recursos y Plantilla Lista (`resources/`)**
   - [`resources/index.html`](resources/index.html) y [`resources/compositions/invitacion-scene.html`](resources/compositions/invitacion-scene.html).
   - [`resources/assets/layers/`](resources/assets/layers/manifest.json): Las 48 capas PNG extraídas (incluyendo variantes de Madrina y Padrino) y el archivo `manifest.json`.

---

## 🛠️ Uso Rápido para Cualquier Agente de IA

### Opción A: Cambiar solo el nombre o cargo sobre la misma plantilla
```bash
node resources/scripts/extract_variant.js
node resources/scripts/build_scene.js
npx hyperframes check --json
npx hyperframes render --output renders/invitacion-nueva.mp4 --fps 30
```

### Opción B: Animar una invitación o tarjeta nueva desde cero
Pídele a tu agente de IA:
> *"Usa la skill `invitation-video-animator` para descomponer esta imagen en capas PNG sobre su fondo limpio y crear un video de 30s con zoom progresivo donde cada detalle aparezca poco a poco hasta la vista global."*
