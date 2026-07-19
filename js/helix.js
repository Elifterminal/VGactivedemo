// VGactivedemo — "Helix tabs": VG's tabs as real clickable cards on a scroll-driven
// 3D carousel. Coverflow/depth model: the CENTER card is always flat, centered and
// fully readable; neighbours recede in depth (scaled + dimmed) but stay front-facing,
// so nothing turns edge-on and unreadable. Pure CSS 3D — cards are real <a> links.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initHelix(items) {
  const ring = document.getElementById("helixRing");
  const section = document.getElementById("helix");
  if (!ring || !section || !items?.length) return;

  const N = items.length;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cards = items.map((s) => {
    const a = document.createElement("a");
    a.className = "hcard";
    a.href = s.href; a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = `<b></b><p></p><span class="go">Open ↗</span>`;
    a.querySelector("b").textContent = s.label;
    a.querySelector("p").textContent = s.desc;
    ring.appendChild(a);
    return a;
  });

  // layout constants (coverflow)
  const GAP = 340;     // horizontal step for neighbours
  const DEPTH = 300;   // how far back each step pushes
  const TILT = 38;     // max degrees a side card leans (stays readable)
  const ARC = 26;      // slight vertical rise for a spiral feel

  let cur = 0, target = 0;

  function place() {
    for (let i = 0; i < N; i++) {
      // signed offset from the active index, wrapped to [-N/2, N/2)
      let o = i - cur;
      o = ((o % N) + N + N / 2) % N - N / 2;
      const ao = Math.abs(o);
      const s = Math.sign(o) || 1;

      const x = s * (GAP * (1 - 1 / (1 + ao)) + GAP * 0.15 * ao); // compressed coverflow spacing
      const z = -ao * DEPTH;
      const ry = clamp(-o, -1, 1) * TILT;        // neighbours lean; center is flat
      const y = -ARC * ao * ao * 0.5;            // gentle arc rise outward
      const scale = Math.max(0.5, 1 - ao * 0.13);
      const op = clamp(1 - ao * 0.42, 0, 1);

      const c = cards[i];
      c.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) scale(${scale})`;
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(200 - Math.round(ao * 10));
      c.style.pointerEvents = ao < 0.55 ? "auto" : "none"; // only the readable card is clickable
      c.classList.toggle("active", ao < 0.5);
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;                       // hidden (mobile) -> skip
    const p = clamp(-r.top / total, 0, 1);
    target = p * N;                               // one full pass of all tabs over the section
    cur += (target - cur) * (reduced ? 1 : 0.12);
    place();
  }
  frame();
}
