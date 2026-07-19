// VGactivedemo — "Helix tabs": VG's tabs as real clickable cards on a scroll-driven
// 3D carousel, Active-Theory /work style. Coverflow/depth: the CENTER card grows
// LARGE, flat, image-rich and readable; neighbours recede in depth (small + dim) but
// stay front-facing. Real <a> links. Each card carries a per-tab holographic panel.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// per-tab colour identity (rim-light + gradient + sheen tint)
const HUES = [
  ["#33e0c8", "#0b6f6a"], // teal
  ["#53b9ff", "#123a6b"], // cyan
  ["#b06cff", "#3a1a6b"], // violet
  ["#d9b16a", "#5a3f14"], // gold
  ["#ff6ca6", "#6b1a3a"], // magenta
  ["#7CE07A", "#1f5a2a"], // green
];

export function initHelix(items) {
  const ring = document.getElementById("helixRing");
  const section = document.getElementById("helix");
  if (!ring || !section || !items?.length) return;

  const N = items.length;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cards = items.map((s, i) => {
    const a = document.createElement("a");
    a.className = "hcard";
    a.href = s.href; a.target = "_blank"; a.rel = "noopener";
    const [c1, c2] = HUES[i % HUES.length];
    a.style.setProperty("--c1", c1);
    a.style.setProperty("--c2", c2);
    a.innerHTML =
      `<span class="sheen"></span>` +
      `<span class="hmark">VG</span>` +
      `<div class="hbody"><span class="hcat">Tab ${String(i + 1).padStart(2, "0")}</span>` +
      `<b></b><p></p><span class="go">Open ↗</span></div>`;
    a.querySelector("b").textContent = s.label;
    a.querySelector("p").textContent = s.desc;
    ring.appendChild(a);
    return a;
  });

  const GAP = 560, DEPTH = 470;   // spacing so the big centre card dominates
  const TILT = 34, ARC = 30;

  let cur = 0, target = 0;

  function place() {
    for (let i = 0; i < N; i++) {
      let o = i - cur;
      o = ((o % N) + N + N / 2) % N - N / 2;   // wrap to [-N/2, N/2)
      const ao = Math.abs(o), s = Math.sign(o) || 1;

      const x = s * GAP * (Math.min(ao, 1) + Math.max(0, ao - 1) * 0.6);
      const z = -ao * DEPTH;
      const ry = clamp(-o, -1, 1) * TILT;
      const y = -ARC * ao;
      const scale = Math.max(0.32, 1 - ao * 0.5);   // centre big, neighbours small
      const op = clamp(1 - ao * 0.5, 0, 1);

      const c = cards[i];
      c.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) scale(${scale})`;
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(200 - Math.round(ao * 10));
      c.style.pointerEvents = ao < 0.55 ? "auto" : "none";
      c.classList.toggle("active", ao < 0.5);
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;                    // hidden (mobile) -> skip
    const p = clamp(-r.top / total, 0, 1);
    target = p * N;
    cur += (target - cur) * (reduced ? 1 : 0.1);
    place();
  }
  frame();
}
