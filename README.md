# GamedIn

Five logic puzzles with no daily limit. Every board is generated on the device, has exactly one solution, and can be solved without guessing. Installable web app, works offline, no account.

| Game | Genre | Rule |
|---|---|---|
| Trace | Numbered path | One line through every cell, numbers in order |
| Crowns | Star Battle | One crown per row, column and colour region, none touching |
| Pairs | Binairo | Two shapes, balanced lines, never three in a row |
| Plots | Shikaku | Cut the grid into rectangles, one clue each |
| Wind | Word snake | Themed words that use every tile once |

An independent project, not affiliated with LinkedIn.

## Run

```bash
npm install
npm run dev        # development server
npm run build      # production build in dist/ (static files, host anywhere)
npm test           # engine tests: validity, one solution, no guessing, repeatable seeds
npm run e2e        # plays all five games in a real browser (needs the dev server on :5183)
npm run bench      # generation speed and difficulty mix, e.g. `npm run bench crowns 100`
```

## How it is built

- `src/engine/<game>/`: `solve.ts` (exact solver, counts solutions), `logic.ts` (human-style deductions, used to grade difficulty and to explain hints), `generate.ts` (seeded generator). No DOM; runs in a Web Worker.
- `src/ui/boards/`: one SVG board per game, with pointer and keyboard input.
- `src/ui/`: home, play screen, statistics, settings. `styles.css` holds the design tokens.
- `src/store.ts`: scores, saved games and settings in localStorage.
- A puzzle is fully described by `game / size / difficulty / seed`, which is also its link: `#/play/crowns/8/hard/k3f9x2`.

Word list for Wind: SCOWL (Kevin Atkinson, permissive SCOWL licence), common levels only. Typeface: Schibsted Grotesk (SIL Open Font Licence).

See `PLAN.md` for the product plan and design direction.
