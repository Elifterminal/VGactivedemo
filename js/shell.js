// VGactivedemo — the "Aether" immersive shell (Active-Theory-inspired).
// Full-viewport WebGL behind the DOM UI: particle dust, a glowing vg-mark, portal
// rings, bloom — and it REACTS TO SCROLL (camera dolly, mark spin, dust surge).
// Framework-agnostic:  const s = createVGShell(canvas, {onReady}); s.setScroll(p); s.destroy();

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const GOLD = new THREE.Color(0xd9b16a);
const TEAL = new THREE.Color(0x33e0c8);
const CYAN = new THREE.Color(0x53b9ff);
const BG = 0x05070d;
const lerp = (a, b, t) => a + (b - a) * t;

function makeDotTexture() {
  const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeBackdropTexture() {
  const w = 1024, c = document.createElement("canvas"); c.width = c.height = w;
  const g = c.getContext("2d");
  g.fillStyle = "#05070d"; g.fillRect(0, 0, w, w);
  const grad = g.createRadialGradient(w / 2, w * 0.62, 0, w / 2, w * 0.62, w * 0.55);
  grad.addColorStop(0, "rgba(28,120,110,0.55)");
  grad.addColorStop(0.35, "rgba(14,60,70,0.30)");
  grad.addColorStop(1, "rgba(5,7,13,0)");
  g.fillStyle = grad; g.fillRect(0, 0, w, w);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createVGShell(canvas, opts = {}) {
  const reduced = opts.reducedMotion ??
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.085);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({ map: makeBackdropTexture(), depthWrite: false }));
  backdrop.position.z = -14; scene.add(backdrop);

  // particles — glitter shader (per-particle twinkle, varied size, bright sparkles)
  const WHITE = new THREE.Color(0xffffff);
  const COUNT = reduced ? 1100 : 3800;
  const posArr = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3);
  const spd = new Float32Array(COUNT), aSize = new Float32Array(COUNT), aPhase = new Float32Array(COUNT);
  const RX = 10, RY = 8, RZ = 6;
  for (let i = 0; i < COUNT; i++) {
    posArr[i*3] = (Math.random()-0.5)*RX; posArr[i*3+1] = (Math.random()-0.5)*RY; posArr[i*3+2] = (Math.random()-0.5)*RZ-1.5;
    const r = Math.random();
    // mostly gold dust, some teal/cyan, a few bright white sparkles
    const c = r < 0.6 ? GOLD : r < 0.8 ? TEAL : r < 0.92 ? CYAN : WHITE;
    const j = 0.65 + Math.random()*0.35;
    col[i*3] = c.r*j; col[i*3+1] = c.g*j; col[i*3+2] = c.b*j;
    spd[i] = 0.12 + Math.random()*0.55;
    aSize[i] = (r > 0.92 ? 2.2 : 1.0) * (0.5 + Math.random()*1.0); // sparkles a bit bigger
    aPhase[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  pGeo.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  const dot = makeDotTexture();
  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dot }, uTime: { value: 0 },
      uPix: { value: renderer.getPixelRatio() }, uSurge: { value: 0 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPix; uniform float uSurge;
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor = aColor;
        vTw = 0.45 + 0.55 * sin(uTime * 2.3 + aPhase);   // twinkle (alpha only)
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPix * (14.0 / -mv.z) * (1.0 + uSurge*0.4);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec3 vColor; varying float vTw;
      void main(){
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vColor, t.a * clamp(vTw, 0.0, 1.0));
      }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // rings
  const ringMat = new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringMat2 = ringMat.clone(); ringMat2.color = CYAN.clone(); ringMat2.opacity = 0.4;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.006, 8, 240), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.004, 8, 240), ringMat2); ring2.rotation.x = 0.5;
  scene.add(ring1, ring2);

  // emblem
  const markGroup = new THREE.Group(); scene.add(markGroup);
  new THREE.TextureLoader().load("assets/vg-mark-512.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = (tex.image?.width && tex.image?.height) ? tex.image.width/tex.image.height : 1;
    const h = 2.2, w = h*aspect;
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w*1.06, h*1.06),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    glow.position.z = -0.02; markGroup.add(glow, mark); finishReady();
  }, undefined, () => finishReady());

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.65, 0.2);
  composer.addPass(bloom);

  let baseZ = 6.2;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    camera.aspect = w / h;
    baseZ = w < h ? 8.2 : (w < 900 ? 7.0 : 6.2);
    camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener("resize", resize);

  const target = { x: 0, y: 0 };
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e; if (!t) return;
    target.x = (t.clientX / innerWidth - 0.5) * 2;
    target.y = (t.clientY / innerHeight - 0.5) * 2;
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  let scrollTarget = 0, scroll = 0;

  let readyFired = false;
  function finishReady() {
    if (readyFired) return; readyFired = true; render(0);
    if (typeof opts.onReady === "function") requestAnimationFrame(() => opts.onReady());
  }

  const clock = new THREE.Clock();
  let raf = 0;
  const P = pGeo.attributes.position.array;

  function render(dt) {
    const t = clock.elapsedTime;
    scroll = lerp(scroll, scrollTarget, Math.min(1, dt * 3));
    const surge = 1 + scroll * 1.8;

    for (let i = 0; i < COUNT; i++) {
      P[i*3+1] += spd[i] * dt * surge;
      P[i*3] += Math.sin(t*0.2 + i) * 0.0006;
      if (P[i*3+1] > RY/2) P[i*3+1] = -RY/2;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uSurge.value = scroll;

    ring1.rotation.z += dt * (0.25 + scroll * 0.6);
    ring2.rotation.z -= dt * (0.18 + scroll * 0.5);
    ring2.rotation.y += dt * 0.12;

    // mark: float + pointer turn + scroll spin/shrink
    markGroup.position.y = Math.sin(t*0.6)*0.06 - scroll * 1.2;
    markGroup.rotation.y = lerp(markGroup.rotation.y, target.x * 0.35 + scroll * Math.PI * 1.1, Math.min(1, dt*2));
    markGroup.rotation.z = Math.sin(t*0.3)*0.03;
    const ms = 1 - scroll * 0.35; markGroup.scale.setScalar(ms);

    bloom.strength = 0.9 + scroll * 0.5;

    camera.position.x += (target.x*0.5 - camera.position.x) * Math.min(1, dt*2.2);
    camera.position.y += (-target.y*0.35 - camera.position.y) * Math.min(1, dt*2.2);
    camera.position.z = lerp(camera.position.z, baseZ + scroll * 3.2, Math.min(1, dt*2));
    camera.lookAt(0, 0, 0);

    composer.render();
  }

  function loop() { raf = requestAnimationFrame(loop); render(Math.min(clock.getDelta(), 0.05)); }
  if (reduced) { clock.getDelta(); render(0); } else loop();

  return {
    setScroll(p) { scrollTarget = Math.min(1, Math.max(0, p || 0)); },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      pGeo.dispose(); pMat.dispose(); dot.dispose();
      ring1.geometry.dispose(); ring2.geometry.dispose(); ringMat.dispose(); ringMat2.dispose();
      backdrop.geometry.dispose(); backdrop.material.map.dispose(); backdrop.material.dispose();
      composer.dispose?.(); renderer.dispose();
    },
  };
}
