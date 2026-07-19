// VGactivedemo — the "Aether" immersive shell (Active-Theory-inspired).
// Full-viewport WebGL behind the DOM UI. Adapts the AT stack: curl-flow glitter,
// glowing vg-mark + portal rings, bloom, and a cinematic post pass (cursor-radiating
// chromatic aberration + glitch + vignette + grain), all scroll-reactive.
// Framework-agnostic:  const s = createVGShell(canvas,{onReady}); s.setScroll(p); s.destroy();

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const GOLD = new THREE.Color(0xd9b16a), TEAL = new THREE.Color(0x33e0c8);
const CYAN = new THREE.Color(0x53b9ff), WHITE = new THREE.Color(0xffffff);
const BG = 0x05070d;
const lerp = (a, b, t) => a + (b - a) * t;

function makeDotTexture() {
  const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.25, "rgba(255,255,255,0.85)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeBackdropTexture() {
  const w = 1024, c = document.createElement("canvas"); c.width = c.height = w;
  const g = c.getContext("2d"); g.fillStyle = "#05070d"; g.fillRect(0, 0, w, w);
  const grad = g.createRadialGradient(w/2, w*0.62, 0, w/2, w*0.62, w*0.55);
  grad.addColorStop(0, "rgba(28,120,110,0.55)"); grad.addColorStop(0.35, "rgba(14,60,70,0.30)"); grad.addColorStop(1, "rgba(5,7,13,0)");
  g.fillStyle = grad; g.fillRect(0, 0, w, w);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createVGShell(canvas, opts = {}) {
  const reduced = opts.reducedMotion ??
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.085);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({ map: makeBackdropTexture(), depthWrite: false }));
  backdrop.position.z = -14; scene.add(backdrop);

  // ---- particles: curl-flow glitter (all motion on GPU) ----
  const COUNT = reduced ? 900 : 2400;
  const posArr = new Float32Array(COUNT*3), col = new Float32Array(COUNT*3);
  const aSize = new Float32Array(COUNT), aPhase = new Float32Array(COUNT);
  const RX = 11, RY = 9, RZ = 6;
  for (let i = 0; i < COUNT; i++) {
    posArr[i*3] = (Math.random()-0.5)*RX; posArr[i*3+1] = (Math.random()-0.5)*RY; posArr[i*3+2] = (Math.random()-0.5)*RZ-1.5;
    const r = Math.random();
    const c = r < 0.6 ? GOLD : r < 0.8 ? TEAL : r < 0.92 ? CYAN : WHITE;
    const j = 0.65 + Math.random()*0.35;
    col[i*3] = c.r*j; col[i*3+1] = c.g*j; col[i*3+2] = c.b*j;
    aSize[i] = (r > 0.92 ? 2.2 : 1.0) * (0.5 + Math.random()*1.0);
    aPhase[i] = Math.random()*Math.PI*2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  pGeo.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  const dot = makeDotTexture();
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: dot }, uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() },
      uSurge: { value: 0 }, uFlow: { value: 0.28 }, uAspect: { value: 1 },
      uRip: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime, uPix, uSurge, uFlow, uAspect;
      uniform vec4 uRip[4];   // xy = ripple centre (screen uv), z = radius, w = strength
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor = aColor;
        vTw = 0.45 + 0.55 * sin(uTime*2.3 + aPhase);
        // curl-ish organic flow field (cheap, GPU)
        vec3 p = position; float t = uTime*0.35;
        vec3 flow = vec3(
          sin(p.y*0.6 + t) + cos(p.z*0.4 - t*0.8),
          cos(p.x*0.5 - t*0.9) + sin(p.z*0.6 + t*0.6),
          sin(p.x*0.7 + t*0.7)) * uFlow;
        p += flow;
        p.y += sin(uTime*0.2 + p.x) * 0.15;   // gentle rise/sway
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uPix * (14.0 / -mv.z) * (1.0 + uSurge*0.4);
        vec4 clip = projectionMatrix * mv;
        // ripple the starfield (screen space) near each wavefront — the logo mesh is separate + unaffected
        vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
        for (int i = 0; i < 4; i++) {
          if (uRip[i].w <= 0.0) continue;
          vec2 rd = suv - uRip[i].xy; rd.x *= uAspect;
          float wv = length(rd) - uRip[i].z;
          float disp = sin(wv * 40.0) * exp(-wv * wv * 70.0) * uRip[i].w;
          vec2 dir = normalize(rd + 1e-5); dir.x /= uAspect;
          clip.xy += dir * disp * 0.07 * clip.w;
        }
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec3 vColor; varying float vTw;
      void main(){ vec4 tx = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vColor, tx.a*clamp(vTw,0.0,1.0)); }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---- comet streaks (replaces the glitch lines: diagonal shooting sparks) ----
  const NC = reduced ? 5 : 16;
  const cPos = new Float32Array(NC * 6), cCol = new Float32Array(NC * 6);
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
  const cMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const cometMesh = new THREE.LineSegments(cGeo, cMat);
  scene.add(cometMesh);
  const CO = [];
  function newComet() {
    const spd = 3.2 + Math.random() * 4.5;
    const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2; // mostly rising, varied
    return {
      x: (Math.random() - 0.5) * 13, y: -5 - Math.random() * 3, z: (Math.random() - 0.5) * 4 - 1,
      vx: Math.sin(ang) * spd, vy: Math.abs(Math.cos(ang)) * spd, life: 0, max: 1.6 + Math.random() * 1.8,
      col: [GOLD, TEAL, CYAN, WHITE][Math.floor(Math.random() * 4)],
    };
  }
  for (let i = 0; i < NC; i++) { const c = newComet(); c.life = Math.random() * c.max; CO[i] = c; }

  // ---- rings ----
  const ringMat = new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringMat2 = ringMat.clone(); ringMat2.color = CYAN.clone(); ringMat2.opacity = 0.4;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.006, 8, 240), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.004, 8, 240), ringMat2); ring2.rotation.x = 0.5;
  scene.add(ring1, ring2);

  // ---- pond ripples: distort the starfield near each wavefront (state only, no meshes) ----
  const RPOOL = 4;
  const ripStates = [];
  for (let i = 0; i < RPOOL; i++) ripStates.push({ life: 0, max: 0, cx: 0.5, cy: 0.5 });
  let rippleTimer = 2 + Math.random() * 3;

  // ---- vg-mark as an interactive PARTICLE FORGE (ported from Argus' initForge) ----
  //   the mark is built from points sampled off the image; the cursor blows them apart
  //   (repel + energize), they swirl through a curl-flow field + rise, then a spring pulls
  //   each back to its home pixel and they recombine. Keeps VG colour (not amber), the
  //   shine sweep, and the coin-sink.
  const markGroup = new THREE.Group(); scene.add(markGroup);
  let markPts = null, markGeo = null, markMat = null;
  let mN = 0, mHome = null, mPos = null, mVel = null, mEne = null;   // CPU physics state
  const markUn = { uTime: { value: 0 }, uLit: { value: 1 }, uDpr: { value: renderer.getPixelRatio() }, uSize: { value: 0.06 } };
  const rc = new THREE.Raycaster(), markPlane = new THREE.Plane();
  const _n = new THREE.Vector3(), _wp = new THREE.Vector3(), _q = new THREE.Quaternion(), _hit = new THREE.Vector3();
  const cursorOn = { v: false };

  const markImg = new Image(); markImg.src = "assets/vg-mark-512.png";
  markImg.onload = () => {
    const aspect = markImg.naturalWidth / markImg.naturalHeight;
    const Hd = 2.2, Wd = Hd * aspect;
    const SX = 230, SY = Math.max(1, Math.round(SX / aspect));
    const oc = document.createElement("canvas"); oc.width = SX; oc.height = SY;
    const octx = oc.getContext("2d"); octx.drawImage(markImg, 0, 0, SX, SY);
    const data = octx.getImageData(0, 0, SX, SY).data;
    const hx = [], cx = [], ux = [], sd = [];
    for (let y = 0; y < SY; y++) for (let x = 0; x < SX; x++) {
      const i = (y * SX + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (0.299 * r + 0.587 * g + 0.114 * b < 30) continue;
      hx.push((x / SX - 0.5) * Wd, (0.5 - y / SY) * Hd);       // local coords (+y up)
      cx.push(Math.min(1, r / 255 * 1.3), Math.min(1, g / 255 * 1.3), Math.min(1, b / 255 * 1.3));
      ux.push(x / SX); sd.push(Math.random());
    }
    mN = hx.length / 2;
    mHome = new Float32Array(hx); mPos = new Float32Array(hx);
    mVel = new Float32Array(mN * 2); mEne = new Float32Array(mN);
    const pos3 = new Float32Array(mN * 3);
    for (let i = 0; i < mN; i++) { pos3[i*3] = hx[i*2]; pos3[i*3+1] = hx[i*2+1]; }
    markGeo = new THREE.BufferGeometry();
    markGeo.setAttribute("position", new THREE.BufferAttribute(pos3, 3));
    markGeo.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(cx), 3));
    markGeo.setAttribute("aEne", new THREE.BufferAttribute(new Float32Array(mN), 1));
    markGeo.setAttribute("aU", new THREE.BufferAttribute(new Float32Array(ux), 1));
    markGeo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(sd), 1));
    markMat = new THREE.ShaderMaterial({
      uniforms: markUn, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aColor; attribute float aEne; attribute float aU; attribute float aSeed;
        uniform float uTime, uDpr, uSize;
        varying vec3 vCol; varying float vEne; varying float vShine; varying float vFlk;
        void main(){
          vCol = aColor; vEne = aEne;
          vShine = smoothstep(0.06, 0.0, abs(fract(aU*0.5 - uTime*0.12) - 0.5));   // reflective light sweep
          vFlk = 1.0 + (0.08 + 0.28*aEne) * sin(uTime*9.0 + aSeed*6.2831);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * uDpr * (300.0 / -mv.z) * (1.0 + aEne*1.6);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision mediump float;
        uniform float uLit;
        varying vec3 vCol; varying float vEne; varying float vShine; varying float vFlk;
        void main(){
          float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 core = vec3(0.72, 1.0, 0.96);                          // VG white-cyan hot core (NOT amber)
          vec3 c = mix(vCol, core, pow(a, 3.0) * (0.4 + 0.45*vEne));
          c += vCol * vEne * 0.5;                                     // brighter (in VG colour) when stirred
          c += core * vShine * 0.55;                                  // reflective light passing over
          float alpha = a * vFlk * (1.0 + 0.35*vEne) * (0.82 + 0.5*vShine) * uLit;
          gl_FragColor = vec4(c, alpha);
        }`,
    });
    markPts = new THREE.Points(markGeo, markMat);
    markGroup.add(markPts);
    finishReady();
  };
  markImg.onerror = () => finishReady();

  // forge physics (per-frame, ~60fps like Argus). Local units: logo ~3.2 wide.
  const F_R = 0.5, F_R2 = F_R * F_R, F_REP = 0.13, F_FLOW = 0.004, F_RISE = 0.0016;
  function forgeStep(cx, cy, on, t) {
    const P = markGeo.attributes.position.array, E = markGeo.attributes.aEne.array;
    for (let i = 0; i < mN; i++) {
      const i2 = i*2, i3 = i*3;
      let x = mPos[i2], y = mPos[i2+1], vx = mVel[i2], vy = mVel[i2+1], e = mEne[i];
      if (on) {
        const dx = x - cx, dy = y - cy, d2 = dx*dx + dy*dy;
        if (d2 < F_R2) { const d = Math.sqrt(d2) || 1e-4, f = 1 - d/F_R, inv = (f/d)*F_REP;
          vx += dx*inv; vy += dy*inv; e = Math.min(1, e + f*0.8); }
      }
      if (e > 0.01) {                                    // curl-ish flow -> gas swirl
        const s = (Math.sin(x*2.0 + t) + Math.cos(y*2.0 - t*0.8)) * Math.PI;
        vx += Math.cos(s)*e*F_FLOW; vy += Math.sin(s)*e*F_FLOW;
        vy += e*F_RISE;                                  // rise while hot (+y up)
        e *= 0.975;                                      // energy bleeds off (~3s)
      }
      const sx = mHome[i2] - x, sy = mHome[i2+1] - y, k = 0.006 + 0.05*(1 - e);  // spring home
      vx += sx*k; vy += sy*k; vx *= 0.9; vy *= 0.9;
      x += vx; y += vy;
      if (e < 0.02 && sx*sx + sy*sy < 2e-4) { x = mHome[i2]; y = mHome[i2+1]; vx = vy = 0; e = 0; }
      mPos[i2] = x; mPos[i2+1] = y; mVel[i2] = vx; mVel[i2+1] = vy; mEne[i] = e;
      P[i3] = x; P[i3+1] = y; E[i] = e;
    }
  }

  // ---- composer: render -> bloom -> cinematic grade ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.65, 0.2);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCursor: { value: new THREE.Vector2(0.5, 0.5) }, uAber: { value: 0.12 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uAber; uniform vec2 uCursor; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec2 dir = uv - uCursor; float d = length(dir);
        float amt = uAber * (0.35 + d);                        // chromatic aberration radiates from cursor
        vec2 off = normalize(dir + 1e-5) * amt * 0.016;
        float r = texture2D(tDiffuse, uv + off).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - off).b;
        vec3 c = vec3(r, g, b);
        float dc = length(uv - 0.5);
        c *= 1.0 - 0.55*pow(dc, 2.3);                          // vignette
        c = pow(c, vec3(0.94));                                // gentle contrast/grade
        c += (hash(uv + fract(uTime))-0.5) * 0.022;            // film grain
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(grade);

  let baseZ = 6.2;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.setSize(Math.round(w * 0.6), Math.round(h * 0.6)); // half-res bloom = big GPU saving, ~same look
    pMat.uniforms.uAspect.value = w / h;                     // ripple math needs aspect
    camera.aspect = w / h; baseZ = w < h ? 8.2 : (w < 900 ? 7.0 : 6.2); camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener("resize", resize);

  const target = { x: 0, y: 0 };          // parallax (-1..1)
  const cursorUV = { x: 0.5, y: 0.5 };    // for post pass (0..1)
  const cursorEased = new THREE.Vector2(0.5, 0.5);
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e; if (!t) return;
    target.x = (t.clientX/innerWidth - 0.5)*2; target.y = (t.clientY/innerHeight - 0.5)*2;
    cursorUV.x = t.clientX/innerWidth; cursorUV.y = 1 - t.clientY/innerHeight;
    cursorOn.v = true;
  }
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("blur", () => { cursorOn.v = false; });
  document.addEventListener("mouseleave", () => { cursorOn.v = false; });
  // click ripples the aberration
  let clickPulse = 0;
  window.addEventListener("pointerdown", () => { clickPulse = 1; });

  let scrollTarget = 0, scroll = 0, prevScroll = 0, scrollVel = 0;

  let readyFired = false;
  function finishReady() { if (readyFired) return; readyFired = true; render(0);
    if (typeof opts.onReady === "function") requestAnimationFrame(() => opts.onReady()); }

  const clock = new THREE.Clock(); let raf = 0;

  function render(dt) {
    const t = clock.elapsedTime;
    scroll = lerp(scroll, scrollTarget, Math.min(1, dt*3));
    scrollVel = lerp(scrollVel, Math.abs(scroll - prevScroll) / Math.max(dt, 0.001), 0.2);
    prevScroll = scroll;
    clickPulse = Math.max(0, clickPulse - dt*2.2);
    const surge = 1 + scroll*1.8;

    pMat.uniforms.uTime.value = t; pMat.uniforms.uSurge.value = scroll;

    // comet streaks: advance, fade in/out, respawn; head bright, tail transparent
    for (let i = 0; i < NC; i++) {
      let c = CO[i];
      c.x += c.vx * dt; c.y += c.vy * dt; c.life += dt;
      if (c.life > c.max || c.y > 6) { c = CO[i] = newComet(); }
      const fade = Math.sin(Math.min(1, c.life / c.max) * Math.PI);
      const tl = 0.14;
      cPos[i*6] = c.x; cPos[i*6+1] = c.y; cPos[i*6+2] = c.z;
      cPos[i*6+3] = c.x - c.vx * tl; cPos[i*6+4] = c.y - c.vy * tl; cPos[i*6+5] = c.z;
      cCol[i*6] = c.col.r * fade; cCol[i*6+1] = c.col.g * fade; cCol[i*6+2] = c.col.b * fade;
      cCol[i*6+3] = 0; cCol[i*6+4] = 0; cCol[i*6+5] = 0;
    }
    cGeo.attributes.position.needsUpdate = true;
    cGeo.attributes.color.needsUpdate = true;

    // pond ripples: spawn rarely; feed each expanding wavefront to the star shader
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      const s = ripStates.find((rr) => rr.life <= 0);
      if (s) { s.max = s.life = 2.4 + Math.random() * 1.6; s.cx = Math.random(); s.cy = Math.random(); }
      rippleTimer = 3.5 + Math.random() * 5;   // rare
    }
    for (let i = 0; i < RPOOL; i++) {
      const s = ripStates[i]; const u = pMat.uniforms.uRip.value[i];
      if (s.life <= 0) { u.w = 0; continue; }
      s.life -= dt;
      const pr = 1 - s.life / s.max;
      u.set(s.cx, s.cy, pr * 0.85, Math.sin(pr * Math.PI));   // centre, expanding radius, fade in/out
    }

    ring1.rotation.z += dt*(0.25 + scroll*0.6);
    ring2.rotation.z -= dt*(0.18 + scroll*0.5); ring2.rotation.y += dt*0.12;

    // coin-sink (slow, deep, dimming) — applied to the particle mark group
    const sink = scroll;
    const lit = Math.max(0, 1 - sink * 1.06);
    markGroup.position.y = Math.sin(t*0.6)*0.06 - sink * 2.8;
    markGroup.rotation.y = lerp(markGroup.rotation.y, target.x*0.3 + sink*0.5, Math.min(1, dt*2));
    markGroup.rotation.z = Math.sin(t*0.3)*0.03;
    markGroup.scale.setScalar(1 - sink * 0.4);
    ringMat.opacity = 0.55 * lit; ringMat2.opacity = 0.4 * lit;

    if (markPts) {
      markUn.uTime.value = t; markUn.uLit.value = lit;
      // project the cursor onto the mark's plane -> local coords, then run the forge
      markGroup.getWorldQuaternion(_q); markGroup.getWorldPosition(_wp);
      _n.set(0, 0, 1).applyQuaternion(_q);
      markPlane.setFromNormalAndCoplanarPoint(_n, _wp);
      rc.setFromCamera({ x: cursorUV.x*2 - 1, y: cursorUV.y*2 - 1 }, camera);
      let cx = 1e4, cy = 1e4, on = false;
      if (cursorOn.v && rc.ray.intersectPlane(markPlane, _hit)) {
        markGroup.worldToLocal(_hit); cx = _hit.x; cy = _hit.y; on = true;
      }
      forgeStep(cx, cy, on, t);
      markGeo.attributes.position.needsUpdate = true;
      markGeo.attributes.aEne.needsUpdate = true;
    }

    bloom.strength = 0.9 + clickPulse*0.4;   // keep glow for stars/comets; mark dims via its own opacity

    camera.position.x += (target.x*0.5 - camera.position.x)*Math.min(1, dt*2.2);
    camera.position.y += (-target.y*0.35 - camera.position.y)*Math.min(1, dt*2.2);
    camera.position.z = lerp(camera.position.z, baseZ + sink*0.9, Math.min(1, dt*2)); // mild recede; the sink does the work
    camera.lookAt(0, 0, 0);

    // post grade uniforms
    cursorEased.x = lerp(cursorEased.x, cursorUV.x, Math.min(1, dt*4));
    cursorEased.y = lerp(cursorEased.y, cursorUV.y, Math.min(1, dt*4));
    grade.uniforms.uTime.value = t;
    grade.uniforms.uCursor.value.copy(cursorEased);
    grade.uniforms.uAber.value = 0.1 + Math.min(0.7, scrollVel*7.0) + clickPulse*0.5;

    composer.render();
  }

  function loop() { raf = requestAnimationFrame(loop); render(Math.min(clock.getDelta(), 0.05)); }
  if (reduced) { clock.getDelta(); render(0); } else loop();

  return {
    setScroll(p) { scrollTarget = Math.min(1, Math.max(0, p || 0)); },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove);
      pGeo.dispose(); pMat.dispose(); dot.dispose(); cGeo.dispose(); cMat.dispose();
      ring1.geometry.dispose(); ring2.geometry.dispose(); ringMat.dispose(); ringMat2.dispose();
      backdrop.geometry.dispose(); backdrop.material.map.dispose(); backdrop.material.dispose();
      markGeo?.dispose(); markMat?.dispose();
      composer.dispose?.(); renderer.dispose();
    },
  };
}
