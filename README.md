# VGactivedemo — the "Aether" shell

An [Active Theory](https://activetheory.net/)-inspired immersive WebGL shell for
**VektorGeist**, built as a demo of a candidate **layout preset** for VG's settings
(alongside standard / rail / immersive / radial-HUD).

**This is a demo. It is NOT deployed to vektorgeist.com.** It's a standalone page so
we can feel the effect and tune it before deciding whether to wire it in.

## What it does

- Full-viewport WebGL behind the real DOM UI: drifting particle dust, the glowing
  `vg-mark` inside portal rings, a teal backdrop glow, and **UnrealBloom** post-processing.
- Pointer/touch **parallax**, a cinematic **loader** handshake, and graceful fallbacks:
  `prefers-reduced-motion` renders a calm single frame, and no-WebGL devices get a static
  gradient + mark.
- **Responsive** — desktop, tablet, and phone (scrolling nav pill, stacking hero,
  swipeable marketplace cards).

## Real data, no placeholders

Everything on screen is real VektorGeist data (prod, 2026-07-18):

- **Nav + footer** link to live VG pages (`/market`, `/projects`, `/board`, `/jobs`,
  `/chat`, `/how-it-works`, `/blog`, `/support`, `/owners`, `/privacy`, `/terms`).
- **Marketplace cards** are the 7 approved listings with real prices and destinations
  (magpie-search, PandaClip, Fledge, PR Triage, Aviary Starter/Pro/Complete).

See [`js/data.js`](js/data.js).

## How it maps onto VG when we wire it in

Built to lift straight into VG's React 19 + Vite stack:

- **`js/shell.js`** exports `createVGShell(canvas, opts)` → `{ destroy() }`. In VG that's:
  ```js
  useEffect(() => {
    const s = createVGShell(canvasRef.current, { onReady });
    return () => s?.destroy();
  }, []);
  ```
- **`js/data.js`** is the only thing that changes: `LISTINGS` becomes a fetch of the live
  `/api/listings`; `NAV` becomes the real route table.
- **CSS variables** in `css/style.css` (`--vg-bg`, `--vg-teal`, `--vg-gold`, …) mirror VG's
  theme-token system, so it re-skins with the active theme.

**Why the UI stays in the DOM (not drawn in WebGL like Active Theory does):** VG is a
content app — marketplace, chat, forms, a blog. Keeping the UI as real HTML preserves the
SEO / AI-crawlability we just fixed, plus keyboard nav and screen readers. The WebGL is a
background layer, not the whole page.

## Run locally

```bash
python3 -m http.server 8099    # then open http://localhost:8099
```

Three.js loads via an import map from a pinned CDN (`three@0.160.0`).

## Tuning knobs (in `js/shell.js`)

`COUNT` (particles), `UnrealBloomPass(strength, radius, threshold)`, ring sizes/colours,
`GOLD`/`TEAL`/`CYAN`, camera distance per breakpoint.
