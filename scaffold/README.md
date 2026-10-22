# Arduino Field Lab — growth scaffold

Independently authored source built from **observed behavior contracts**, not from copied website code. The reference site's byte-exact mirror and JS slices are stored locally in ignored directories one level above (`../mirror`, `../port`, `../src`, `../probe`). Their license is not assumed.

## Run

```bash
cd scaffold
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm test:e2e
```

To resample the public reference in a separate **ignored** evidence directory, run `pnpm capture:reference` from here. It saves 12 pages, runtime-loaded assets and a SHA-256 manifest to `../probe/playwright-recapture/`, and never overwrites the immutable `../mirror/` baseline.

## Growth interfaces

`src/content/lessons.js` declares lesson data, `src/content/registry.js` checks IDs and references, `src/simulation/scenarios.js` registers simulator plugins, `src/simulation/session.js` records deterministic input/step events, `src/scene/board.js` projects the same state onto a procedural 3D board, and `src/main.js` projects it into the UI.

Adding a regular lesson requires one new content record and translations, with no edits to the UI, runtime or router. A genuinely new simulated physical behavior needs one simulator plugin. The displayed Arduino snippets are **examples**, not a compiler input; clicking Run plays a predefined, deterministic classroom scenario.

The first release uses original UI copy/geometry, stable EN/ZH translations and explicitly labelled English fallback for the other ten locale routes. It is a functional growth prototype, **not** a pixel-identical port of the reference site. Cross-side pixel fidelity and full translation coverage remain separate milestones.
