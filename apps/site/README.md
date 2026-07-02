# @plinth/site — Plinth marketing landing page

The public marketing/landing site for **Plinth** (recurring-payments infrastructure for Nigeria, built on Nomba rails). This is a standalone Next.js app inside the `plinth` pnpm monorepo (`apps/site`). It has **no backend dependencies** — it's a static-ish marketing site and can be hosted on its own.

> Status: **work in progress.** The hero, brand banner, problem section, and the immersive "billing engine" section are built; the lower sections (Accounts, How it works, Developers, Pricing, etc.) are still templated placeholders.

---

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS 3** (design tokens in [`tailwind.config.ts`](./tailwind.config.ts))
- **three.js** + **@react-three/fiber** + **@react-three/drei** — the 3D hero bridge and the floating-bronze "billing engine" scene
- **GSAP** — hero intro + section scroll-snapping
- **@rive-app/react-canvas** — the custom animated cursor and one card animation
- **@lottiefiles/dotlottie-react** — the doodle card animations

Fonts are loaded via `next/font` (Anton, Fraunces, Space Grotesk, Inter, JetBrains Mono) — no external font requests at runtime.

---

## Prerequisites

- **Node 20+**
- **pnpm 10+** (the monorepo uses pnpm workspaces; the lockfile lives at the repo root)

---

## Run locally

From the **monorepo root** (`plinth/`):

```bash
pnpm install                      # installs the whole workspace
pnpm --filter @plinth/site dev    # dev server → http://localhost:3100
```

Or from this directory (`apps/site/`):

```bash
pnpm dev      # next dev -p 3100
pnpm build    # next build
pnpm start    # next start -p 3100  (after build)
pnpm lint
```

The dev/start port is **3100** (see [`package.json`](./package.json)).

Useful query params:
- `?still=1` — freezes the hero intro animation (for screenshots).

---

## Hosting / deployment

The site is self-contained — **no environment variables are required** to build or run.

### Vercel (recommended)
- Import the repo and set the **Root Directory** to `apps/site`.
- Framework preset: **Next.js**. Build command and output are auto-detected.
- Vercel handles the pnpm workspace automatically.

### Any Node host (Docker, Render, Railway, a VM, etc.)
```bash
pnpm install --frozen-lockfile
pnpm --filter @plinth/site build
pnpm --filter @plinth/site start   # serves on :3100 (set PORT or pass -p)
```
Serve behind a reverse proxy / set the platform's port as needed. Node 20+ runtime.

> Note: the 3D scenes and animations run client-side (WebGL + WASM). They render in modern browsers; on touch devices and for `prefers-reduced-motion` users they gracefully fall back to static, non-animated layouts.

---

## Assets

All runtime assets are bundled in [`public/`](./public) (~32 MB total) and ship with the app — **no external asset host is configured yet**:

- `public/models/` — `.glb` cultural-artifact models (Benin/Ife bronzes, Nok terracottas) for the billing-engine scene
- `public/bridge.glb`, `public/danfo-3d.glb` — hero scene
- `public/animations/` — `.lottie` + `.riv` card animations
- `public/logos/` — customer brand logos for the banner
- `public/cursor.riv` — the custom cursor

If/when the asset set grows, these can be moved to a CDN/object store and referenced by URL — but that isn't needed to host today.

---

## Project structure

```
app/
  layout.tsx        Root layout, fonts, global mounts (cursor + scroll-snap)
  page.tsx          Section composition (the page order)
  globals.css       Base styles, cursor + marquee CSS
components/
  Hero.tsx          Hero copy/CTAs over the 3D bridge
  BridgeScene.tsx   3D Lekki-style bridge (R3F)
  Danfo.tsx         The danfo driving the bridge
  RiveCursor.tsx    Custom Rive cursor (replaces the OS pointer on desktop)
  ScrollSnap.tsx    GSAP proximity scroll-snapping between sections
  sections/
    LogoStrip.tsx     Animated "Built on Nomba rails" brand banner
    Problem.tsx       Sticky-note problem cards (Lottie/Rive backgrounds)
    Subscriptions.tsx Immersive scroll-driven "billing engine" 3D scene
    BronzeCanvas.tsx  The floating-bronze R3F canvas for Subscriptions
    CardMedia.tsx     Lottie/Rive wrappers
    Footer.tsx        Footer + contact + regulatory bar
    ...               Accounts, HowItWorks, Pricing, etc. (placeholders)
    ui.tsx            Shared layout primitives (Container, Section, etc.)
public/             Bundled assets (see above)
```

`brand.md` documents the design system (colors, type, voice) and is the source of truth when continuing the build.

### Continuation note (for the frontend)
The billing-engine scene places its 3D models from a config array in `Subscriptions.tsx`. Press **Shift+E** on that section (desktop) to enter an edit/placement mode, drag pieces with the gizmo, then use the on-screen **Log all** button to print copy-paste-ready placement values to the console.
