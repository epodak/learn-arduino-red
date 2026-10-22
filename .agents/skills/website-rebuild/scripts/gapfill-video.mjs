#!/usr/bin/env node
/**
 * gapfill-video.mjs — backfill the HLS ladder (variant playlists + media
 * segments) that a static crawl structurally cannot see: only the master
 * .m3u8 is referenced in the HTML/JS, and everything below it — the rendition
 * playlists and every .ts/.m4s segment — is fetched by the player at runtime.
 * Give it a master playlist URL; it descends master -> variants -> segments,
 * writes each file to its mirror path, and appends the new URLs to the mirror
 * manifest so the ledger stays the single source of truth.
 *
 * Usage:
 *   node gapfill-video.mjs --master https://cdn.example.com/vp/<id>/<id>.m3u8
 *     [--out mirror]        mirror root (must match mirror-site.mjs)
 *     [--origin https://example.com]  same-origin path rule + Referer header;
 *                                     defaults to the first master's origin
 *     [--master a.m3u8 --master b.m3u8]  repeatable (or comma-separated)
 *     [--workers 4] [--delay 60]   politeness: pool size, ms between requests
 *     [--force]                    re-download files already on disk
 *     [--dry-run]                  enumerate the ladder, write nothing
 *     [--manifest <path>]          default <out>/mirror-manifest.json
 *     [--referer <url>]            Referer header sent with every request; default <origin>/
 *
 * Find the master URL the way it surfaced in racingshop: probe.mjs / the
 * browser console reports 404s for the variant playlists, or netcapture.mjs
 * lists the runtime requests the mirror is missing.
 *
 * NOTE serve.mjs's MIME map has no .m3u8 / .ts entries — a mirror that must
 * actually play HLS needs "application/vnd.apple.mpegurl" and "video/mp2t"
 * added there (a bare `.ts` is MPEG-TS in a mirror, not TypeScript).
 *
 * NOTE query strings are dropped when mapping URL -> disk path (same rule as
 * mirror-site.mjs). Token-signed segment URLs therefore collapse onto one
 * path, which is what a static replay wants, but it means two segments that
 * differ only by query would collide.
 *
 * Adapted from racingshop-rebuild/scripts/gapfill-video.mjs, where the Daytona
 * hero's 3 renditions + 12 .ts segments were invisible to the BFS crawl until
 * the probe reported 404s. Generalized here: any master URL instead of a
 * hardcoded one, recursive descent with cycle/depth guards, URI-bearing tags
 * (EXT-X-MEDIA alternate renditions, I-FRAME playlists, EXT-X-MAP fMP4 init
 * segments, EXT-X-KEY), relative-URI resolution against each playlist's own
 * URL (subdirectory ladders, not just flat siblings), and manifest append.
 *
 * 中文规格（自 scripts/README.md 迁入，v0.3.21；本表另一拼写：`gapfill-video.mjs`）
 * HLS/DASH 流媒体阶梯补录（master → rendition → 分片），静态爬虫的结构性盲区
 * HLS 流媒体阶梯补录：master m3u8 → 递归取 variant/备用音轨/I-frame 播放列表 → 逐段下载 `.ts`/`.m4s`（含 EXT-X-MAP 初始化段、EXT-X-KEY）→ 追加进 manifest 账本。补的是静态爬虫的结构性盲区：HTML 里只有 master，其余全由播放器运行时 fetch，只有探针 404 才暴露（`serve.mjs` 的 MIME 表已含 `.m3u8`/`.ts`/`.m4s`/`.mpd`，补录后即可本地回放）
 * `node gapfill-video.mjs --master https://cdn.x.com/vp/<id>/<id>.m3u8 --origin https://example.com`（`--dry-run` 先看阶梯全貌）
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative, extname, resolve } from 'node:path';
import { BROWSER_UA } from './lib/negotiate.mjs';
import { sha256 } from './lib/hash.mjs';
import { writeInventory } from './lib/ledger.mjs';
import { cli } from './lib/cli.mjs';

cli({
  known: ['master', 'out', 'origin', 'referer', 'manifest', 'workers', 'delay'],
  bools: ['force', 'dry-run'],
  file: import.meta.url,
});

// ---------------------------------------------------------------------------
// CONFIG — per-project constants; site specifics come from the CLI instead.
// ---------------------------------------------------------------------------

// Desktop UA for all requests (some media CDNs vary or block on UA): the one
// string in lib/negotiate.mjs, same as the crawler's.

// How deep to follow playlist -> playlist references. A normal ladder is 2
// levels (master -> variants); the guard only exists to stop pathological or
// self-referential manifests.
const MAX_PLAYLIST_DEPTH = 4;

// A referenced URI is treated as a nested playlist (recurse) rather than a
// media segment (download) when its path matches this.
const PLAYLIST_EXT = /\.(m3u8|m3u)$/i;

// Tags whose URI="..." attribute points at another playlist vs. at a plain
// file to download alongside the segments.
const PLAYLIST_URI_TAGS = new Set(['EXT-X-MEDIA', 'EXT-X-I-FRAME-STREAM-INF']);
const ASSET_URI_TAGS = new Set(['EXT-X-MAP', 'EXT-X-KEY', 'EXT-X-SESSION-KEY']);

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const flagAll = (name) =>
  args.flatMap((a, i) => (a === '--' + name && args[i + 1] ? [args[i + 1]] : []));
const has = (name) => args.includes('--' + name);

const MASTERS = flagAll('master').flatMap((v) => v.split(',')).filter(Boolean);
if (!MASTERS.length) {
  console.error(
    'usage: gapfill-video.mjs --master https://cdn.example.com/vp/id/id.m3u8 [--out mirror]\n' +
      '       [--origin https://example.com] [--workers 4] [--delay 60] [--force] [--dry-run] [--manifest path]'
  );
  process.exit(2);
}

// resolve, not join: an ABSOLUTE --out used to be glued under cwd (the same bug
// mirror-site fixed in v0.3.16), so the ledger landed in <cwd>/<abs-path> [lamalama].
const OUT = resolve(flag('out', 'mirror'));
const ORIGIN = (flag('origin', null) || new URL(MASTERS[0]).origin).replace(/\/+$/, '');
const ORIGIN_HOST = new URL(ORIGIN).hostname;
const REFERER = flag('referer', ORIGIN + '/');
const MANIFEST_PATH = flag('manifest', join(OUT, 'mirror-manifest.json'));
const WORKERS = Math.max(1, Number(flag('workers', 4)));
const DELAY_MS = Math.max(0, Number(flag('delay', 60)));
const FORCE = has('force');
const DRY_RUN = has('dry-run');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same URL -> disk mapping as mirror-site.mjs: same-origin assets keep their
// path, cross-host assets live under assets/<host>/.
function localPathFor(url) {
  const u = new URL(url);
  const path = decodeURIComponent(u.pathname);
  if (u.hostname === ORIGIN_HOST) return join(OUT, path);
  return join(OUT, 'assets', u.hostname, path);
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function get(url) {
  const res = await fetch(url, {
    // Media CDNs commonly 403 without a same-origin Referer.
    headers: { 'user-agent': BROWSER_UA, accept: '*/*', referer: REFERER },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '' };
}

// --- manifest ledger --------------------------------------------------------

function detectIndent(raw) {
  const m = raw.match(/^\{\r?\n(\s*)"/);
  return m ? m[1].length : 2;
}

let manifestIndent = 2;
let manifestData = { origin: ORIGIN, mirroredAt: new Date().toISOString(), files: {} };
let manifestExisted = false;
try {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  manifestData = JSON.parse(raw);
  manifestIndent = detectIndent(raw);
  manifestExisted = true;
  if (!manifestData.files) manifestData.files = {};
} catch {
  console.warn(`[warn] no manifest at ${relative(process.cwd(), MANIFEST_PATH)} — one will be created`);
}

let ledgerAdds = 0, repaired = 0;
// A ledger row is URL -> path, bytes, sha256, type (mirroring.md §0 principle 3).
// This script used to write rows WITHOUT sha256 and never touched inventory.tsv,
// so a mirror it backfilled failed verify-mirror's ledger gate on every segment
// (lamalama: 4,741 rows) — the one ledger writer that skipped lib/ledger.mjs.
function record(url, p, bytes, type, sha) {
  manifestData.files[url] = {
    path: relative(OUT, p),
    bytes,
    sha256: sha,
    type: type || '',
    // Provenance: these URLs are runtime-only, never linked in crawled markup.
    source: 'gapfill-video',
  };
  ledgerAdds++;
}

async function save(url, buf, type) {
  const p = localPathFor(url);
  if (!DRY_RUN) {
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, buf);
  }
  record(url, p, buf.length, type, sha256(buf));
  return p;
}

// --- playlist parsing -------------------------------------------------------

// Split an m3u8 into the two things worth chasing: nested playlists (recurse)
// and byte payloads (download). Every URI is resolved against the playlist's
// own URL, so subdirectory ladders and ../ references work, not just the flat
// sibling layout racingshop happened to have.
function parsePlaylist(text, baseUrl) {
  const playlists = new Set();
  const assets = new Set();
  let expectVariantUri = false;

  const resolve = (ref) => {
    try {
      return new URL(ref.trim(), baseUrl).href;
    } catch {
      return null;
    }
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      const tag = line.slice(1).split(':', 1)[0];
      if (tag === 'EXT-X-STREAM-INF') {
        // The next non-comment line is a variant playlist.
        expectVariantUri = true;
        continue;
      }
      const m = line.match(/URI="([^"]*)"/);
      if (!m || !m[1]) continue;
      const abs = resolve(m[1]);
      if (!abs) continue;
      if (PLAYLIST_URI_TAGS.has(tag)) playlists.add(abs);
      else if (ASSET_URI_TAGS.has(tag)) assets.add(abs);
      continue;
    }

    const abs = resolve(line);
    if (!abs) continue;
    // A bare URI is a variant when EXT-X-STREAM-INF announced it, or whenever
    // it simply looks like a playlist (defensive: some masters omit the tag).
    if (expectVariantUri || PLAYLIST_EXT.test(new URL(abs).pathname)) playlists.add(abs);
    else assets.add(abs);
    expectVariantUri = false;
  }
  return { playlists, assets };
}

// --- descend the ladder -----------------------------------------------------

const seenPlaylists = new Set();
const pending = new Set(); // asset URLs to download
let playlistsFetched = 0;
let playlistsFromDisk = 0;
const failures = [];

async function walkPlaylist(url, depth) {
  if (seenPlaylists.has(url)) return;
  seenPlaylists.add(url);
  if (depth > MAX_PLAYLIST_DEPTH) {
    console.warn(`[skip] depth ${depth} > ${MAX_PLAYLIST_DEPTH}: ${url}`);
    return;
  }

  const p = localPathFor(url);
  let text;
  // The master is normally already mirrored — read it rather than refetch it.
  if (!FORCE && (await exists(p))) {
    const buf = await readFile(p);
    text = buf.toString('utf8');
    playlistsFromDisk++;
    console.log(`[playlist] ${'  '.repeat(depth)}${url.slice(0, 110)} (on disk, ${text.length}b)`);
    // Same repair as the segment loop: a playlist row written without sha256
    // (or a playlist on disk with no row at all) gets its hash from the bytes.
    const row = manifestData.files[url];
    if (!row || !row.sha256) { record(url, p, buf.length, row?.type || '', sha256(buf)); repaired++; }
  } else {
    try {
      const { buf, type } = await get(url);
      text = buf.toString('utf8');
      await save(url, buf, type);
      playlistsFetched++;
      console.log(`[playlist] ${'  '.repeat(depth)}${url.slice(0, 110)} (${buf.length}b)`);
    } catch (e) {
      failures.push([url, e.message]);
      console.error(`[playlist FAIL] ${url}: ${e.message}`);
      return;
    }
  }

  const { playlists, assets } = parsePlaylist(text, url);
  for (const a of assets) pending.add(a);
  console.log(
    `             ${'  '.repeat(depth)}-> ${playlists.size} nested playlist(s), ${assets.size} segment(s)`
  );
  for (const child of playlists) await walkPlaylist(child, depth + 1);
}

for (const master of MASTERS) await walkPlaylist(master, 0);

// --- download the segments --------------------------------------------------

const queue = [...pending];
let downloaded = 0;
let skipped = 0;

let cursor = 0;
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (cursor < queue.length) {
      const url = queue[cursor++];
      const p = localPathFor(url);
      if (!FORCE && (await exists(p))) {
        // On disk already. If its row is missing or has no sha256 (rows written
        // before this script recorded hashes), repair the row from the bytes on
        // disk instead of downloading again.
        const row = manifestData.files[url];
        if (!row || !row.sha256) {
          const buf = await readFile(p);
          record(url, p, buf.length, row?.type || '', sha256(buf));
          repaired++;
        } else skipped++;
        continue;
      }
      if (DRY_RUN) {
        downloaded++;
        console.log(`[would fetch] ${url.slice(0, 120)}`);
        continue;
      }
      try {
        const { buf, type } = await get(url);
        await save(url, buf, type);
        downloaded++;
        if (downloaded % 10 === 0) console.log(`  ... ${downloaded}/${queue.length} segments`);
      } catch (e) {
        failures.push([url, e.message]);
        console.error(`[segment FAIL] ${url.slice(0, 100)}: ${e.message}`);
      }
      if (DELAY_MS) await sleep(DELAY_MS);
    }
  })
);

// --- write the ledger back --------------------------------------------------

if (!DRY_RUN && ledgerAdds) {
  if (!manifestExisted) await mkdir(dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifestData, null, manifestIndent) + '\n');
  // inventory.tsv is derived from the manifest by the one implementation in lib/ledger.mjs
  await writeInventory(OUT, manifestData.files);
}

console.log(
  `\nvideo gapfill${DRY_RUN ? ' (dry run)' : ''}: ` +
    `${playlistsFetched} playlist(s) fetched, ${playlistsFromDisk} already mirrored, ` +
    `${downloaded} segment(s) ${DRY_RUN ? 'pending' : 'downloaded'}, ${skipped} already present, ` +
    `${failures.length} failed${repaired ? `, ${repaired} row(s) repaired from disk (sha256)` : ''}. ` +
    (DRY_RUN ? 'Manifest untouched.' : `${ledgerAdds} manifest entries written; inventory.tsv regenerated.`)
);
if (failures.length) {
  for (const [u, m] of failures) console.error(`  FAIL ${m} ${u}`);
  process.exit(1);
}
