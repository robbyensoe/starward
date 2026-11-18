# Starward

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/robbyensoe/starward/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/robbyensoe/starward/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original arena-survival game for the make.fun bounty
[Make the best game](https://make.fun/bounty/best-game-01).

You are the last ward-orb holding an arena against drifting shards. Your
ward fires on its own at the nearest shard — flying is your job. Break
shards, gather the amber cores they drop to raise your power and fire
rate, chain kills into combos, and survive the quickening swarm across
12 levels. Three hits and the ward falls.

## Play

Open the game locally:

```
node serve.ts
```

then visit http://localhost:8080.

- **Move:** WASD / arrow keys, or hold the pointer and steer
- **Fire:** automatic, at the nearest shard
- **Pause:** P or Esc (the game also pauses when the tab hides)
- **Start / restart:** Enter or click

Static files only — the game plays fully offline in a desktop browser,
with synthesized WebAudio sound and no network requests. Runs are seeded
and deterministic: the same seed and inputs replay exactly.

## Hand-in

`main.ts` is the entry point the grader runs: it copies `game/` and
`screenshots/` to the output directory, pre-flight-checks the hand-in
against the scorer's caps, and writes `dossier.json` with the vendored
make.fun library.

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```
