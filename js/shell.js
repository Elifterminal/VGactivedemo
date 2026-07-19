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
      uSurge: { value: 0 }, uFlow: { value: 0.28 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime, uPix, uSurge, uFlow;
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
        gl_Position = projectionMatrix * mv;
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

  // ---- vg-mark + a sweeping specular shine ----
  const markGroup = new THREE.Group(); scene.add(markGroup);
  let shine = null;
  new THREE.TextureLoader().load("assets/vg-mark-512.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = (tex.image?.width && tex.image?.height) ? tex.image.width/tex.image.height : 1;
    const h = 2.2, w = h*aspect;
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w*1.06, h*1.06),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    glow.position.z = -0.02;
    // shine: a bright band that sweeps across the mark, masked by the mark alpha
    shine = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform sampler2D uMap; uniform float uTime; varying vec2 vUv;
        void main(){ float a=texture2D(uMap,vUv).a; float sweep=smoothstep(0.06,0.0,abs(fract(vUv.x*0.5 - uTime*0.12)-0.5));
          gl_FragColor=vec4(vec3(0.55,1.0,0.95)*sweep, a*sweep*0.9); }`,
    }));
    shine.position.z = 0.01;
    markGroup.add(glow, mark, shine); finishReady();
  }, undefined, () => finishReady());

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
  }
  window.addEventListener("pointermove", onMove, { passive: true });
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

    ring1.rotation.z += dt*(0.25 + scroll*0.6);
    ring2.rotation.z -= dt*(0.18 + scroll*0.5); ring2.rotation.y += dt*0.12;

    markGroup.position.y = Math.sin(t*0.6)*0.06 - scroll*1.2;
    markGroup.rotation.y = lerp(markGroup.rotation.y, target.x*0.35 + scroll*Math.PI*1.1, Math.min(1, dt*2));
    markGroup.rotation.z = Math.sin(t*0.3)*0.03;
    markGroup.scale.setScalar(1 - scroll*0.35);
    if (shine) shine.material.uniforms.uTime.value = t;

    bloom.strength = 0.9 + scroll*0.5 + clickPulse*0.4;

    camera.position.x += (target.x*0.5 - camera.position.x)*Math.min(1, dt*2.2);
    camera.position.y += (-target.y*0.35 - camera.position.y)*Math.min(1, dt*2.2);
    camera.position.z = lerp(camera.position.z, baseZ + scroll*3.2, Math.min(1, dt*2));
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
      composer.dispose?.(); renderer.dispose();
    },
  };
}
