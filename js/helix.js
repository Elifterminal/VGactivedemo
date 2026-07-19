// VGactivedemo — "Helix tabs": VG tabs as real clickable cards on a scroll-driven
// SPIRAL (Active-Theory /work style). Cards sit on a true cylindrical helix around a
// vertical axis — each one is rotated around the axis AND raised AND pushed back in
// depth, so the ring climbs up-and-back into the distance. Scrolling travels you
// through the spiral: each card rises to the front focus (big, flat, readable), then
// spirals up and away. Real <a> links; center card stays clickable.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const HUES = [
  ["#33e0c8", "#0b6f6a"], ["#53b9ff", "#123a6b"], ["#b06cff", "#3a1a6b"],
  ["#d9b16a", "#5a3f14"], ["#ff6ca6", "#6b1a3a"], ["#7CE07A", "#1f5a2a"],
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
    a.style.setProperty("--c1", c1); a.style.setProperty("--c2", c2);
    a.innerHTML =
      `<span class="sheen"></span><span class="hmark">VG</span>` +
      `<div class="hbody"><span class="hcat">Tab ${String(i + 1).padStart(2, "0")}</span>` +
      `<b></b><p></p><span class="go">Open ↗</span></div>`;
    a.querySelector("b").textContent = s.label;
    a.querySelector("p").textContent = s.desc;
    ring.appendChild(a);
    return a;
  });

  // helix geometry — radius + pitch scale with the viewport so it fits every window
  const ANG = 50 * Math.PI / 180;      // angle between successive cards around the axis

  let cur = 0, target = 0;

  function place() {
    const cardW = Math.min(500, window.innerWidth * 0.44);
    const cardH = cardW / 1.58;                          // matches CSS aspect-ratio 60/38
    const R = Math.min(560, window.innerWidth * 0.42);   // radius from the central axis (px)
    const RISE = cardH * 1.15;                            // pitch > card height -> neighbours clear vertically
    for (let i = 0; i < N; i++) {
      const o = i - cur;                       // NO wrap: finite list, real first/last ends
      const ao = Math.abs(o);
      const th = o * ANG;

      const x = Math.sin(th) * R;              // swing around the axis
      const z = (Math.cos(th) - 1) * R - ao * 60;  // recede back (extra push so neighbours sit behind)
      const y = -o * RISE;                     // climb up-and-back along the spiral
      const scale = clamp(1 - ao * 0.22, 0.35, 1);
      const op = clamp(1 - ao * 0.5, 0, 1);

      const c = cards[i];
      c.style.transform =
        `translate(-50%, -50%) ` +             // center the card on the axis (size-independent)
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
        `rotateY(${th.toFixed(4)}rad) scale(${scale.toFixed(3)})`;
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(300 - Math.round((ao) * 20 + (o > 0 ? 5 : 0)));
      c.style.pointerEvents = ao < 0.55 ? "auto" : "none";
      c.classList.toggle("active", ao < 0.5);
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;                     // hidden (mobile) -> skip
    const p = clamp(-r.top / total, 0, 1);
    target = p * (N - 1);           // full scroll span covers first (0) to last (N-1) card
    // Lenis already smooths the scroll position we read above; track it tightly here
    // so the spiral feels connected to the input instead of rubber-banding behind it.
    cur += (target - cur) * (reduced ? 1 : 0.22);
    place();
  }
  frame();
}
