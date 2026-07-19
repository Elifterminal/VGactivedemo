// VGactivedemo — interaction layer (Active-Theory-flavoured).
// Custom explosive cursor, magnetic buttons, card tilt + shine, scroll-reveal,
// and smooth momentum scroll that broadcasts a 0..1 progress the WebGL reacts to.
//
// Everything degrades: coarse-pointer (touch) devices keep the native cursor and
// native scroll; prefers-reduced-motion skips the flourishes.

const FINE = window.matchMedia("(pointer: fine)").matches;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- smooth scroll + progress ---------------- */
export async function initSmoothScroll() {
  const emit = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    window.dispatchEvent(new CustomEvent("vg:scroll", { detail: { progress: p } }));
  };
  if (!REDUCED) {
    try {
      const { default: Lenis } = await import("lenis");
      const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
      lenis.on("scroll", emit);
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      emit();
      return;
    } catch (e) { /* CDN miss -> native scroll below */ }
  }
  window.addEventListener("scroll", emit, { passive: true });
  emit();
}

/* ---------------- custom explosive cursor ---------------- */
export function initCursor() {
  if (!FINE) return; // touch: leave the native cursor alone
  document.body.classList.add("has-cursor");

  const dot = document.createElement("div"); dot.className = "cursor-dot";
  const ring = document.createElement("div"); ring.className = "cursor-ring";
  document.body.append(dot, ring);

  const fx = document.createElement("canvas"); fx.className = "cursor-fx";
  const ctx = fx.getContext("2d");
  document.body.appendChild(fx);
  const sz = () => { fx.width = innerWidth * devicePixelRatio; fx.height = innerHeight * devicePixelRatio;
    fx.style.width = innerWidth + "px"; fx.style.height = innerHeight + "px"; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); };
  sz(); addEventListener("resize", sz);

  const m = { x: innerWidth / 2, y: innerHeight / 2 };
  const r = { x: m.x, y: m.y, s: 1, hover: 0 };
  let parts = [];

  addEventListener("pointermove", (e) => {
    m.x = e.clientX; m.y = e.clientY;
    if (!REDUCED && Math.random() < 0.5) spawn(m.x, m.y, 1, 0.6); // gentle trail
  }, { passive: true });

  addEventListener("pointerdown", () => { if (!REDUCED) spawn(m.x, m.y, 22, 3.2); r.s = 2.2; }); // explosion
  addEventListener("pointerup", () => { r.s = 1; });

  // grow over interactive targets
  const over = (on) => () => (r.hover = on ? 1 : 0);
  document.querySelectorAll("a,button,.tilt,[data-magnetic]").forEach((el) => {
    el.addEventListener("pointerenter", over(true));
    el.addEventListener("pointerleave", over(false));
  });

  function spawn(x, y, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * power + 0.4;
      const teal = Math.random() < 0.5;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3,
        life: 1, dr: 0.012 + Math.random() * 0.03,
        c: teal ? "51,224,200" : "217,177,106", r: 1 + Math.random() * 2.4 });
    }
    if (parts.length > 700) parts = parts.slice(-700);
  }

  (function loop() {
    requestAnimationFrame(loop);
    // dot exact, ring eased
    dot.style.transform = `translate(${m.x}px,${m.y}px)`;
    r.x = lerp(r.x, m.x, 0.18); r.y = lerp(r.y, m.y, 0.18);
    const scale = lerp(1, r.s, 0.5) * (1 + r.hover * 0.9);
    ring.style.transform = `translate(${r.x}px,${r.y}px) scale(${scale})`;
    ring.style.borderColor = r.hover ? "rgba(217,177,106,0.9)" : "rgba(51,224,200,0.7)";

    ctx.clearRect(0, 0, fx.width, fx.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vx *= 0.98; p.vy *= 0.98; p.life -= p.dr;
      if (p.life <= 0) continue;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${p.c},${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, 7); ctx.fill();
    }
    parts = parts.filter((p) => p.life > 0);
  })();
}

/* ---------------- magnetic buttons ---------------- */
export function initMagnetic() {
  if (!FINE || REDUCED) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.35;
    el.addEventListener("pointermove", (e) => {
      const b = el.getBoundingClientRect();
      const x = e.clientX - (b.left + b.width / 2);
      const y = e.clientY - (b.top + b.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------------- card tilt + pointer shine ---------------- */
export function initTilt() {
  if (!FINE || REDUCED) return;
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const b = el.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      el.style.transform = `perspective(800px) rotateY(${(px - 0.5) * 12}deg) rotateX(${(0.5 - py) * 12}deg) translateY(-4px)`;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------------- scroll reveal ---------------- */
export function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (REDUCED) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

export function initEffects() {
  initSmoothScroll(); initCursor(); initMagnetic(); initTilt(); initReveal();
}
