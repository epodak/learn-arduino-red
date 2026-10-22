// shell-build.mjs — the strategy-A transform engine, shared by the builder and
// the gate so there is exactly one implementation of "what the table does".
//
// verification-gates.md §2.1.1: any logic two places must agree on gets ONE
// implementation. build-site.mjs applies the table to a document; verify-shell
// replays it on a diff hunk. Two copies would drift, and a gate that drifts
// from its builder reports differences that are its own.
//
// ⛔ NO SIDE EFFECTS IN THIS FILE OR IN A PROJECT'S shell-config.mjs. The gate
// imports both, and a gate must never import a module that produces what it
import { rewriteFlight, hasFlight } from "./flight.mjs";
// audits (§2.1.2).

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ⚠ URL LOCALISATION EXISTS TWICE IN THIS TOOLCHAIN, and that is a known debt
// (verification-gates.md §2.1.1 — two places that must agree on one answer
// should have one implementation): scripts/serve.mjs rewrites at RESPONSE time,
// this table rewrites at BUILD time. They have already drifted once — serve
// learned the \u002F escaped spelling from a Nuxt SSG payload while this side
// still knew two shapes — so the shapes are kept in one exported list here and
// serve.mjs's rewrite() is the one to fold into it next.
//
// Shape 6 (\u002F): serialised SSG payloads escape "/" so the blob can never
// contain "</script>". Measured: 11 media-host URLs survived every other shape
// inside window.__NUXT__, and the runtime zero-outbound probe caught exactly
// one of them — the only one that page happened to request.
const U = "\\u002F";
const U_RE = "\\\\u002F";

/**
 * The six spellings a host can wear. `to` is what replaces `<scheme><host>`.
 * Counting happens in the callbacks, so the floor means "this transform found N
 * targets" no matter which shapes fired — a difference-based count cannot work
 * here, because localising an EXTERNAL host leaves the host string in place
 * (`https://cdn.x` -> `/ext/cdn.x`).
 */
export function localizeShapes(text, host, to, onHit = () => {}) {
  const h = esc(host);
  const toEsc = to.replace(/\//g, "\\/");   // inside JS/JSON string literals
  const toU = to.replace(/\//g, U);         // inside \u002F-escaped payloads
  const hit = (shape, rep) => (m) => (onHit(shape), rep);
  // ⚠ `to || "/"` when NO path follows. Replacing `https://host` with "" for an
  // origin host leaves `href=""`, which is not "the home page" — it is "this
  // page", a silently broken link. Caught cross-side by the payload gate: the
  // mirror kept `href="http://www.chungiyoo.com"` (serve.mjs only rewrites the
  // trailing-slash form) while the build produced `href=""`, so the two
  // localisation implementations disagreed AND one of them was wrong.
  const bare = to || "/";

  // ⛔ A URL IN A TEXT POSITION IS CONTENT, NOT AN ADDRESS. Localisation is
  // about where the browser goes; it must not change what the page SAYS.
  //
  // Measured on eightdesign, on exactly one of 115 routes — an article about the
  // site's own relaunch, which prints the address it is talking about:
  //
  //     <a href="https://host/">https://host/</a>
  //
  // The href must be localised. The anchor TEXT must not: rewriting it made the
  // page read "こちら /" instead of naming the site. Both sides were stable and
  // differed by 25 characters, which is how a whole-site sweep earns its cost —
  // a blanket transform that is right 114 times changes meaning on the 115th.
  //
  // ⚠ Narrow on purpose. Only the two spellings where a text position is
  // UNAMBIGUOUS are protected: an HTML text node (`>URL<`) and a serialised
  // payload's children field (`"children":"URL"`). Anything less certain is
  // left to the transform, because a guard that guesses is worse than none.
  const GUARDS = [
    new RegExp(`>\\s*https?://${h}[^<]*<`, "g"),
    new RegExp(`"children":"https?://${h}[^"]*"`, "g"),
    new RegExp(`\\\\"children\\\\":\\\\"https?://${h}[^\\\\"]*\\\\"`, "g"),
  ];
  const held = [];
  for (const re of GUARDS) {
    text = text.replace(re, (m) => {
      held.push(m);
      return `\u0000TEXTURL${held.length - 1}\u0000`;
    });
  }
  const restore = (out) => out.replace(/\u0000TEXTURL(\d+)\u0000/g, (_, i) => held[Number(i)]);

  return restore(text
    .replace(new RegExp(`https?://${h}(?=/)`, "g"), hit("absolute", to))
    .replace(new RegExp(`https?://${h}(?!/)`, "g"), hit("absolute-bare", bare))
    // Escaped spelling split the same way as the plain one: a bare `https:\/\/host"`
    // is the home page (→ `\/`), not "" — the build layer wrote `"site_url":""`
    // while serve.mjs left the value alone, and the two sides disagreed on one
    // input for the second time (chungiyoo was the unescaped form) [lamalama].
    .replace(new RegExp(`https?:\\\\/\\\\/${h}(?=\\\\/)`, "g"), hit("escaped-absolute", toEsc))
    .replace(new RegExp(`https?:\\\\/\\\\/${h}(?!\\\\/)`, "g"), hit("escaped-absolute-bare", toEsc || "\\/"))
    .replace(new RegExp(`https?:${U_RE}${U_RE}${h}(?=${U_RE})`, "gi"), hit("unicode-absolute", toU))
    .replace(new RegExp(`https?:${U_RE}${U_RE}${h}(?!${U_RE})`, "gi"), hit("unicode-absolute-bare", toU || U))
    .replace(new RegExp(`(?<!:)\\\\/\\\\/${h}`, "g"), hit("escaped-protocol-relative", toEsc))
    .replace(new RegExp(`(?<!:)${U_RE}${U_RE}${h}`, "gi"), hit("unicode-protocol-relative", toU))
    .replace(new RegExp(`(?<!:)//${h}`, "g"), hit("protocol-relative", to)));
}

/** The bytes T-NOINDEX inserts. Exported because verify-shell sees that hunk as
 *  a PURE INSERTION — the mirror side of it is empty, and replaying a transform
 *  over an empty string can never reproduce it, so the gate matches these bytes
 *  exactly instead. */
export const noindexBlock = (cfg) =>
  // ⛔ `notice: true` is a NATURAL thing to write in a config, and string
  // concatenation happily renders it as the literal text "true" INSIDE <head> —
  // where a bare text node makes the HTML parser close the head early and move
  // every following <meta>/<link> into <body>. Measured: the nav lost its
  // auth-dependent buttons, a canvas never mounted, and the word "true" sat in
  // the page's corner — while every static gate stayed green, because the
  // transform table replays what the transform table produced. Only a string
  // is a notice; anything else means "no extra notice, just the meta".
  (typeof cfg.notice === "string" ? cfg.notice : "") + '<meta name="robots" content="noindex,nofollow">\n';

/**
 * Apply the configured table to one document (or one diff hunk).
 * Pure: every counter is returned, none is module state.
 *   returns { text, hits: Map<id, n>, sub: Map<ruleId, n> }
 *
 * `head` is false when the caller is classifying a fragment rather than
 * building a page, so a hunk is never "explained" by a transform it did not use.
 */
export function transformPage(html, cfg, { head = true } = {}) {
  const hits = new Map();
  const sub = new Map();
  const bump = (id, n = 1) => hits.set(id, (hits.get(id) || 0) + n);
  const bumpSub = (k, n = 1) => sub.set(k, (sub.get(k) || 0) + n);
  let out = html;

  // --- T-LOCALIZE ------------------------------------------------------------
  // Six spellings, all of them measured on real targets. The escaped and
  // \u002F forms live inside serialised payloads, which is where a missed
  // shape hurts most: nothing requests those URLs until the page happens to,
  // so a load-time probe reports zero outbound while ten latent ones sit in the
  // blob.
  const localizeAll = (text) => {
    let o = text;
    for (const host of cfg.originHosts || []) {
      o = localizeShapes(o, host, "", (shape) => {
        bump("T-LOCALIZE");
        bumpSub(`origin.${shape}:${host}`);
      });
    }
    for (const host of [...(cfg.stubExtHosts || []), ...(cfg.mirroredExtHosts || [])]) {
      o = localizeShapes(o, host, `/ext/${host}`, (shape) => {
        bump("T-LOCALIZE");
        bumpSub(`ext.${shape}:${host}`);
      });
    }
    return o;
  };
  // ⛔ Where the document carries a LENGTH-PREFIXED payload, the localisation
  // must go through lib/flight.mjs — it rewrites each row's content on its own
  // and re-declares the length. Applied blanket, the same six shapes shorten
  // rows whose `T<hex>` still claims the old count, and the page dies inside
  // React's parser with no 404 and no failed request to point at it. Measured
  // here: 17 of 115 built pages, invisible to every other gate.
  // ⛔ A DEVALUE DATA ISLAND IS PROGRAM INPUT, NOT ADDRESSES. Nuxt inlines
  // `<script type="application/json" id="__NUXT_DATA__">` whose entries the app
  // PARSES at runtime — measured on hubtown: the island carries the deploy's
  // site record ("hubtown-live", env, url), the WebGL boot derives its Theatre
  // environment from it, and localizing that url to "/" made `new URL(...)`
  // paths and sheet lookups fail three layers away (addSheetObject reading
  // 'object' of undefined) while every request stayed 200. §4.10's rule, one
  // ring further in: display text was content, and so is parsed data. The
  // island is carved out before localization and restored verbatim after.
  // T-DATA-KEEP: every DATA island is carved out, not just Nuxt's. JSON-LD
  // (`application/ld+json`: the page's own url/@id are STATEMENTS about where
  // it lives, not addresses the browser fetches) and speculation rules
  // (`type="speculationrules"`: href_matches patterns are program input) sit in
  // the same class as __NUXT_DATA__ — dom-shell-strategies.md §6 coin 0 says so
  // and the code kept only the Nuxt spelling (lamalama: 2–3 JSON-LD islands per
  // page would have had their url/@id localized to "/"). Sites add more via
  // cfg.keepIslands = [RegExp]; each kept island bumps T-DATA-KEEP so the
  // ledger shows the carve-out fired.
  const islands = [];
  const ISLAND_RES = [
    /(<script[^>]*id="__NUXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/g,
    /(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
    /(<script[^>]*type="speculationrules"[^>]*>)([\s\S]*?)(<\/script>)/g,
    ...(cfg.keepIslands || []),
  ];
  for (const re of ISLAND_RES) {
    out = out.replace(re, (m0, open, body, close) => {
      islands.push(body);
      bump("T-DATA-KEEP");
      return open + "\u0000ISLAND" + (islands.length - 1) + "\u0000" + close;
    });
  }
  out = (hasFlight(out) ? rewriteFlight(out, localizeAll) : null) ?? localizeAll(out);
  out = out.replace(/\u0000ISLAND(\d+)\u0000/g, (_, i) => islands[Number(i)]);

  // --- site-specific transforms ---------------------------------------------
  // ⛔ THESE GO THROUGH THE LENGTH-AWARE PATH TOO. It is not only localisation
  // that edits a length-prefixed payload: the thing that had to be deleted here
  // was a `<link rel="preload" href="https://www.googletagmanager.com/…">`
  // sitting INSIDE a flight row, and deleting it blanket-style shortens the row
  // exactly the way a URL rewrite does. Any edit is an edit.
  //
  // ⚠ Each transform therefore sees the document one REGION at a time (the gaps
  // between pushes, and each row's content). A transform that needs to count
  // across the whole document must do its own accounting; registering the count
  // floor per transform id already works that way.
  const applyTransforms = (text) => {
    let o = text;
    for (const t of cfg.transforms || []) {
      o = t.apply(o, {
        bump: (n = 1) => bump(t.id, n),
        sub: (k, n = 1) => bumpSub(`${t.id}:${k}`, n),
      });
    }
    return o;
  };
  out = (hasFlight(out) ? rewriteFlight(out, applyTransforms) : null) ?? applyTransforms(out);

  // --- T-NOINDEX -------------------------------------------------------------
  if (head && cfg.notice) {
    const before = out;
    // ⚠ `<head\b[^>]*>`, not the literal `<head>`. Generators emit the tag with
    // whitespace or attributes — Nuxt 2 / vue-meta writes `<head >`, others
    // write `<head prefix="og: …">` — and an anchor on the bare literal fires
    // ZERO times on those documents. The whole tag is preserved and the block
    // goes after it, so the tag's own attributes are never touched.
    // Measured: on a Nuxt SSG target this injected nothing at all, and what
    // caught it was the per-transform floor (0 < 10) — which is the floor
    // earning its keep on the one transform legal-and-deploy.md requires a gate
    // to watch (noindex + the unofficial-rebuild notice).
    out = out.replace(/<head\b[^>]*>/i, (tag) => tag + "\n" + noindexBlock(cfg));
    if (out !== before) bump("T-NOINDEX");
  }

  return { text: out, hits, sub };
}

/** Every transform id the table can produce, builder and gate agreeing. */
export const transformIds = (cfg) => [
  "T-LOCALIZE",
  "T-DATA-KEEP",
  ...(cfg.transforms || []).map((t) => t.id),
  ...(cfg.notice ? ["T-NOINDEX"] : []),
];
