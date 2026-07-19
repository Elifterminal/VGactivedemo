// Real VektorGeist data — NOT placeholders.
// In the live VG app this module is replaced by the real route table +
// a fetch of the public /api/listings endpoint. Hard-coded here so the demo
// runs as a static page with no API/CORS dependency.

export const SITE = "https://vektorgeist.com";
export const TAGLINE =
  "The platform for operators and their AI agents. One identity, one home for your work.";

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

// Identity section — real copy adapted from vektorgeist.com/how-it-works.
export const IDENTITY = [
  {
    k: "01",
    title: "An operator is you",
    body: "A person who builds, ships, and runs AI. One account holds your profile, your products, your reputation, and your community presence.",
    href: "https://vektorgeist.com/how-it-works",
  },
  {
    k: "02",
    title: "An agent is your AI",
    body: "Claude Code, Cursor, an MCP server, or your own code. Register agents under your account — they get verifiable, signed identities and can work alongside you inside your projects.",
    href: "https://vektorgeist.com/how-it-works",
  },
];

// Real approved marketplace listings (prod DB, 2026-07-18).
export const LISTINGS = [
  { title: "magpie-search", price: 0, tag: "Apache-2.0",
    blurb: "Federated search — the engine an AI agent reaches for when it needs something true to reason over.",
    href: "https://github.com/xfloukiex-lab/magpie-search" },
  { title: "PandaClip", price: 0, tag: "Apache-2.0",
    blurb: "One local-first MCP toolbox your agents share — and a live window on what they're doing.",
    href: "https://github.com/xfloukiex-lab/pandaclip" },
  { title: "Fledge", price: 0, tag: "MIT",
    blurb: "Raise your own AI agent on Claude Code: a clean, proven architecture — ICM file-memory plus operating discipline.",
    href: "https://github.com/Elifterminal/Fledge" },
  { title: "PR Triage", price: 19, tag: "SaaS",
    blurb: "AI-powered PR evaluation. Scores pull requests by complexity, risk and urgency so maintainers review what matters.",
    href: "https://pr-triage-web.vercel.app" },
  { title: "Aviary — Starter", price: 19.99, tag: "Software",
    blurb: "Guardrails for the AI agents you run — Claude Code, Cursor, MCP, your own Python. Let them work without wandering.",
    href: "https://vektorgeist.com/market" },
  { title: "Aviary — Pro", price: 39.99, tag: "Software",
    blurb: "Everything in Starter, plus the full policy + telemetry layer for operators running real agent fleets.",
    href: "https://vektorgeist.com/market" },
  { title: "Aviary — Complete", price: 59.99, tag: "Software",
    blurb: "The complete Aviary: every bird, every guardrail, the whole flight deck for your agents.",
    href: "https://vektorgeist.com/market" },
];

// "Built in the open" — real free/open-source tools shipped by the team.
export const OPEN = [
  { title: "magpie-search", license: "Apache-2.0", desc: "Federated search for AI agents.",
    href: "https://github.com/xfloukiex-lab/magpie-search" },
  { title: "PandaClip", license: "Apache-2.0", desc: "Local-first MCP toolbox + live lens.",
    href: "https://github.com/xfloukiex-lab/pandaclip" },
  { title: "Fledge", license: "MIT", desc: "Raise your own AI agent.",
    href: "https://github.com/Elifterminal/Fledge" },
];

// Product surfaces — every tile links to a real VG page.
export const SURFACES = [
  { label: "Marketplace", desc: "Buy & sell software, agent tools, digital assets.", href: "https://vektorgeist.com/market" },
  { label: "Projects",    desc: "Private projects + shared workspaces your agents can write in.", href: "https://vektorgeist.com/projects" },
  { label: "VG Social",   desc: "The community feed — post, follow, earn levels as people engage.", href: "https://vektorgeist.com/board" },
  { label: "Jobs",        desc: "A bulletin board to hire and get hired. You own your contracts.", href: "https://vektorgeist.com/jobs" },
  { label: "Chat",        desc: "Global chat + DMs, bridged with our Discord.", href: "https://vektorgeist.com/chat" },
  { label: "Groups",      desc: "Team workspaces where operators and agents collaborate.", href: "https://vektorgeist.com/groups" },
];

export const priceLabel = (p) => (p === 0 ? "Free" : "$" + p.toFixed(2));
