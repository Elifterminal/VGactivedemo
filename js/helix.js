// VGactivedemo — "Helix tabs": VG's tabs as real clickable cards on a scroll-driven
// 3D spiral (Active-Theory /work-style). Pure CSS 3D transforms — the cards stay real
// HTML (crisp text, real links, clickable, accessible), just positioned in 3D and spun
// by scroll. Drops into VG as a nav component; only the item list changes.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // wrap to [-pi,pi]

export function initHelix(items) {
  const ring = document.getElementById("helixRing");
  const section = document.getElementById("helix");
  if (!ring || !section || !items?.length) return;

  const N = items.length;
  const R = 400;                    // ring radius (px)
  const TURNS = 1.15;               // how many turns across the section's scroll
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cards = items.map((s, i) => {
    const a = document.createElement("a");
    a.className = "hcard";
    a.href = s.href; a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = `<b></b><p></p><span class="go">Open ↗</span>`;
    a.querySelector("b").textContent = s.label;
    a.querySelector("p").textContent = s.desc;
    const ang = (i / N) * Math.PI * 2;
    a._ang = ang;
    // small vertical helix rise so it reads as a spiral, not a flat merry-go-round
    const y = (i - (N - 1) / 2) * 14;
    a._y = y;
    a.style.transform = `translateY(${y}px) rotateY(${ang}rad) translateZ(${R}px)`;
    ring.appendChild(a);
    return a;
  });

  let cur = 0, target = 0;
  function frame() {
    requestAnimationFrame(frame);
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;                       // section hidden (mobile) -> skip
    const p = clamp(-r.top / total, 0, 1);
    target = p * Math.PI * 2 * TURNS;
    cur += (target - cur) * (reduced ? 1 : 0.12);
    ring.style.transform = `rotateX(-6deg) rotateY(${-cur}rad)`;

    // mark the front-facing card active (biggest, clickable, lit)
    let best = 0, bd = 9;
    for (let i = 0; i < cards.length; i++) {
      const d = Math.abs(norm(cards[i]._ang - cur));
      if (d < bd) { bd = d; best = i; }
    }
    for (let i = 0; i < cards.length; i++) cards[i].classList.toggle("active", i === best);
  }
  frame();
}
