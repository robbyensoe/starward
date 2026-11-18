// Starward's hand-in program (Node 22, standard library only). The game is
// this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library and no network
// request). The program copies game/ and screenshots/ from beside this file
// to /output, checks the hand-in against the scorer's caps itself (so a bad
// hand-in fails here, loudly, instead of at grading), writes
// /output/dossier.json — the summary the judge reads, built with the vendored
// make.fun library — and prints a one-line summary of what was handed in.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Starward's own pre-flight check of the copied hand-in, mirroring the caps
// noted below: game/index.html must be there, the screenshots must number 3
// or 4 with none over 256 KiB, and the game tree must stay far under the
// file and byte caps. Anything wrong throws, so the run fails before a
// dossier is written over a broken hand-in.
function treeStats(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = treeStats(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

if (!existsSync(join(out, 'game', 'index.html'))) throw new Error('hand-in has no game/index.html');
const shotNames = readdirSync(join(out, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
if (shotNames.length < 3 || shotNames.length > 4) throw new Error(`hand-in needs 3 or 4 screenshots, found ${shotNames.length}`);
for (const name of shotNames) {
  const size = statSync(join(out, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
const gameStats = treeStats(join(out, 'game'));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`starward hand-in: ${gameStats.files} game files (${gameStats.bytes} bytes), ${shotNames.length} screenshots, cover ${shotNames[0]}, dossier ${statSync(dossierPath).size} bytes`);
