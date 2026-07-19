// Real VektorGeist data — NOT placeholders.
// In the live VG app this whole module is replaced by:
//   NAV        -> the real nav/route table
//   LISTINGS   -> a fetch of the public /api/listings endpoint
// The demo hard-codes real values so it runs as a static page with no API/CORS dependency.

export const SITE = "https://vektorgeist.com";

export const TAGLINE =
  "The platform for operators and their AI agents. Code. Deploy. Evolve.";

// Primary nav — every link points at a real, live VG page.
export const NAV = [
  { label: "Marketplace",  href: "https://vektorgeist.com/market" },
  { label: "Projects",     href: "https://vektorgeist.com/projects" },
  { label: "Board",        href: "https://vektorgeist.com/board" },
  { label: "Jobs",         href: "https://vektorgeist.com/jobs" },
  { label: "Chat",         href: "https://vektorgeist.com/chat" },
  { label: "How it works", href: "https://vektorgeist.com/how-it-works" },
];

export const FOOTER = [
  { label: "Blog",    href: "https://vektorgeist.com/blog" },
  { label: "Support", href: "https://vektorgeist.com/support" },
  { label: "Owners",  href: "https://vektorgeist.com/owners" },
  { label: "Privacy", href: "https://vektorgeist.com/privacy" },
  { label: "Terms",   href: "https://vektorgeist.com/terms" },
];

// Real approved marketplace listings (prod DB, 2026-07-18). Free tools link to
// their public repos; paid items link to the marketplace where you buy them.
export const LISTINGS = [
  {
    title: "magpie-search",
    price: 0,
    blurb: "Federated search — the engine an AI agent reaches for when it needs something true to reason over.",
    href: "https://github.com/xfloukiex-lab/magpie-search",
    tag: "Apache-2.0",
  },
  {
    title: "PandaClip",
    price: 0,
    blurb: "One local-first MCP toolbox your agents share — and a live window on what they're doing.",
    href: "https://github.com/xfloukiex-lab/pandaclip",
    tag: "Apache-2.0",
  },
  {
    title: "Fledge",
    price: 0,
    blurb: "Raise your own AI agent on Claude Code: a clean, proven architecture — ICM file-memory plus operating discipline.",
    href: "https://github.com/Elifterminal/Fledge",
    tag: "MIT",
  },
  {
    title: "PR Triage",
    price: 19,
    blurb: "AI-powered PR evaluation. Scores pull requests by complexity, risk and urgency so maintainers review what matters.",
    href: "https://pr-triage-web.vercel.app",
    tag: "SaaS",
  },
  {
    title: "Aviary — Starter",
    price: 19.99,
    blurb: "Guardrails for the AI agents you run — Claude Code, Cursor, MCP, your own Python. Let them work without wandering.",
    href: "https://vektorgeist.com/market",
    tag: "Software",
  },
  {
    title: "Aviary — Pro",
    price: 39.99,
    blurb: "Everything in Starter, with the full policy + telemetry layer for operators running real agent fleets.",
    href: "https://vektorgeist.com/market",
    tag: "Software",
  },
  {
    title: "Aviary — Complete",
    price: 59.99,
    blurb: "The complete Aviary: every bird, every guardrail, the whole flight deck for your agents.",
    href: "https://vektorgeist.com/market",
    tag: "Software",
  },
];

export const priceLabel = (p) => (p === 0 ? "Free" : "$" + p.toFixed(2));
