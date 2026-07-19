// VGactivedemo — the "Aether" immersive shell (Active-Theory-inspired).
// Full-viewport WebGL living behind the real DOM UI: particle dust, a glass-lit
// vg-mark, portal rings, and bloom. Framework-agnostic on purpose — in VG this
// becomes:  useEffect(() => { const s = createVGShell(ref.current); return () => s.destroy(); }, [])
//
// Returns { destroy } on success, or null if WebGL isn't usable (caller shows the
// static fallback). Respects prefers-reduced-motion by rendering a calm single frame.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const GOLD = new THREE.Color(0xd9b16a);
const TEAL = new THREE.Color(0x33e0c8);
const CYAN = new THREE.Color(0x53b9ff);
const BG = 0x05070d;

// round soft sprite for particles (so they read as glows, not squares)
function makeDotTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// radial backdrop glow (teal, lower-centre — the "underwater" light)
function makeBackdropTexture() {
  const w = 1024, h = 1024;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#05070d";
  g.fillRect(0, 0, w, h);
  const grad = g.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.55);
  grad.addColorStop(0.0, "rgba(28,120,110,0.55)");
  grad.addColorStop(0.35, "rgba(14,60,70,0.30)");
  grad.addColorStop(1.0, "rgba(5,7,13,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createVGShell(canvas, opts = {}) {
  const reduced =
    opts.reducedMotion ??
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (e) {
    return null; // no WebGL — caller falls back
  }
  if (!renderer.getContext()) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.085);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // ---- backdrop glow plane (far behind) ----
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({ map: makeBackdropTexture(), depthWrite: false })
  );
  backdrop.position.z = -14;
  scene.add(backdrop);

  // ---- particle dust field ----
  const COUNT = reduced ? 900 : 2400;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const spd = new Float32Array(COUNT);
  const RX = 9, RY = 7, RZ = 6;
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * RX;
    pos[i * 3 + 1] = (Math.random() - 0.5) * RY;
    pos[i * 3 + 2] = (Math.random() - 0.5) * RZ - 1.5;
    // mostly gold dust with teal/cyan sparks
    const r = Math.random();
    const c = r < 0.7 ? GOLD : r < 0.9 ? TEAL : CYAN;
    const j = 0.6 + Math.random() * 0.4;
    col[i * 3] = c.r * j;
    col[i * 3 + 1] = c.g * j;
    col[i * 3 + 2] = c.b * j;
    spd[i] = 0.12 + Math.random() * 0.5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = makeDotTexture();
  const pMat = new THREE.PointsMaterial({
    size: 0.055,
    map: dot,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---- portal rings around the mark ----
  const ringMat = new THREE.MeshBasicMaterial({
    color: TEAL, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ringMat2 = ringMat.clone(); ringMat2.color = CYAN.clone(); ringMat2.opacity = 0.4;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.006, 8, 240), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.004, 8, 240), ringMat2);
  ring2.rotation.x = 0.5;
  scene.add(ring1, ring2);

  // ---- the vg-mark emblem ----
  const markGroup = new THREE.Group();
  scene.add(markGroup);
  const loader = new THREE.TextureLoader();
  let ready = false;
  loader.load(
    "assets/vg-mark-512.png",
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const aspect = (tex.image && tex.image.width && tex.image.height)
        ? tex.image.width / tex.image.height : 1;
      const h = 2.2, w = h * aspect;
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      // additive glow twin behind, feeds the bloom
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.06, h * 1.06),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, opacity: 0.5,
        })
      );
      glow.position.z = -0.02;
      markGroup.add(glow, mark);
      ready = true;
      finishReady();
    },
    undefined,
    () => { ready = true; finishReady(); } // texture failed: still boot the scene
  );

  // ---- bloom composer ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.65, 0.2);
  composer.addPass(bloom);

  // ---- sizing ----
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    // pull the camera back a touch on portrait/narrow so the mark always fits
    camera.position.z = w < h ? 8.2 : (w < 900 ? 7.0 : 6.2);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- pointer parallax ----
  const target = { x: 0, y: 0 };
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    target.x = (t.clientX / window.innerWidth - 0.5) * 2;
    target.y = (t.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  // ---- readiness handshake with the loader overlay ----
  let readyFired = false;
  function finishReady() {
    if (readyFired) return;
    readyFired = true;
    // render one frame, then tell the caller to fade the loader out
    render(0);
    if (typeof opts.onReady === "function") requestAnimationFrame(() => opts.onReady());
  }

  // ---- render loop ----
  const clock = new THREE.Clock();
  let raf = 0;
  const P = pGeo.attributes.position.array;

  function render(dt) {
    const t = clock.elapsedTime;
    // drifting dust
    for (let i = 0; i < COUNT; i++) {
      P[i * 3 + 1] += spd[i] * dt;
      P[i * 3] += Math.sin(t * 0.2 + i) * 0.0006;
      if (P[i * 3 + 1] > RY / 2) P[i * 3 + 1] = -RY / 2;
    }
    pGeo.attributes.position.needsUpdate = true;

    ring1.rotation.z += dt * 0.25;
    ring2.rotation.z -= dt * 0.18;
    ring2.rotation.y += dt * 0.12;
    markGroup.position.y = Math.sin(t * 0.6) * 0.06;
    markGroup.rotation.z = Math.sin(t * 0.3) * 0.03;

    // ease camera toward pointer
    camera.position.x += (target.x * 0.5 - camera.position.x) * Math.min(1, dt * 2.2);
    camera.position.y += (-target.y * 0.35 - camera.position.y) * Math.min(1, dt * 2.2);
    camera.lookAt(0, 0, 0);

    composer.render();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    render(Math.min(clock.getDelta(), 0.05));
  }

  if (reduced) {
    // calm: one composed frame, no animation loop
    clock.getDelta();
    render(0);
  } else {
    loop();
  }

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      pGeo.dispose(); pMat.dispose(); dot.dispose();
      ring1.geometry.dispose(); ring2.geometry.dispose();
      ringMat.dispose(); ringMat2.dispose();
      backdrop.geometry.dispose(); backdrop.material.map.dispose(); backdrop.material.dispose();
      composer.dispose?.();
      renderer.dispose();
    },
  };
}
