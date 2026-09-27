# Ronnie's Manor

*Mind the match, guv'nor.* A London match-3 game made for Uncle Ronnie: swap Routemasters,
roundels, crowns and cups of Rosie Lee, ride the Tube line from Angel onwards, and bowl a wood
down the green. Plays in the phone's browser, installs to the home screen, works offline.

**Play:** https://valisium.github.io/ronnies-manor/ (on Android: Chrome menu → *Install app*).

## What's in it

- Endless levels. A level maker builds each one from its number on a sawtooth difficulty curve
  (Proper Hard every 10th, a Guv'nor level at the end of each 30-level zone, a breather after),
  and a robot playtester has tuned the moves for the first 300 so first-go win rates fall from
  about 95% at the start to about 35% later on.
- Power-ups: Black Cab (4 in a line), Big Ben (L or T), Pearly Button (5 in a line), The Wood
  (2×2 square), with combos when you swap two together.
- Blockers: puddles, pea-souper fog, wheel clamps, roadworks cones. Goals: collect, mop up,
  clear, bring the jellied eels home, and Club Nights rolling the jack on the bowling green.
- Wins with a Toucher finish, stamp, stars, pearly confetti and a Routemaster. Combo shouts,
  win streaks, and pop-ups: ice cream van, golden pigeon, Big Ben on the hour, Happy Hour, bag of swag.
- The Daily Ronnie (same board for the family each day) with a Rhyme Time slang question,
  Night Bus endless mode, and a family leaderboard in a Google Sheet (`backend/SETUP.md`).
- A Cockney cab driver voice for 58 lines, made locally with Qwen3-TTS (a designed voice; no real
  person's voice is copied).

## Working on it

No build step: plain HTML, CSS and JavaScript modules.

```bash
python3 -m http.server 8765          # then open http://localhost:8765
node tools/smoke.mjs                 # quick engine + level check
node tools/calibrate.mjs 1 300 40    # robot playtester -> data/levels.json
node tools/make_sw.mjs               # refresh the offline file list after changing files
bash tools/make_voice.sh             # speak any new lines in tools/voice-lines.json
```

| File | What it does |
|---|---|
| `js/engine.js` | Board rules: matches, power-ups, blockers, gravity, combos (no DOM, runs in Node too) |
| `js/levels.js` | Level maker, stations and zones, difficulty curve, Daily and Night Bus boards |
| `js/render.js` | Canvas board, animations, touch controls |
| `js/app.js` | Screens, game flow, celebrations, pop-ups, modes |
| `js/audio.js` | Synthesised sound effects and voice playback |
| `js/art.js` | All artwork as SVG |
| `backend/Code.gs` | Google Apps Script for the family leaderboard |
