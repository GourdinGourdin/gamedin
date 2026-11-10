# GamedIn: plan

Unlimited logic puzzles in the five genres LinkedIn made popular, generated on the device, playable as many times a day as you like.

## 1. Two limits that shape the plan

**No pixel-close clone.** I won't build a recreation of LinkedIn's games: not their names (Zip, Queens, Tango, Patches, Wend), not their exact look, icons, colours or screens. What I will build is the same *genres*, which are older than LinkedIn and free to use, with rules a LinkedIn player knows on sight, and a visual identity of GamedIn's own. The reason copycats look bad is poor craft, not that they differ from LinkedIn. Recognition comes from the mechanics and the interaction feel, which we match exactly.

**"The same algorithms as LinkedIn" don't exist publicly.** LinkedIn's puzzles are authored or curated server-side; nobody outside knows how. We write our own generators and hold them to the same contract: every puzzle has exactly one solution, is solvable by logic alone without guessing, and sits in the same size and difficulty range as the daily ones.

Open question on the name: "GamedIn" leans on LinkedIn's mark. Fine for a side project; a risk if it goes on app stores. Your call.

## 2. The five games

| LinkedIn game | Genre (public domain) | Working name | Rule |
|---|---|---|---|
| Zip | Numbered Hamiltonian path | Trace | One line through every cell, hitting the numbers in order |
| Queens | Star Battle, 1 star, coloured regions | Crowns | One crown per row, column and region, none touching |
| Tango | Binairo / Takuzu with = and × clues | Pairs | Two symbols, balanced lines, no three in a row |
| Patches | Shikaku | Plots | Cut the grid into rectangles matching each clue |
| Wend | Word snake | Wind | Themed words snake through every tile once |

Names are placeholders to settle in the design phase.

## 3. Product

- **Home:** five games, each with "Play" (endless) and "Daily" (one seeded puzzle a day, same for everyone, for streaks and sharing).
- **Endless mode:** next puzzle is instant, no wait screen. Pick size and difficulty (Easy / Medium / Hard), or "Like the daily".
- **In game:** timer, undo, hint (explains the next logical step, not just the answer), restart, error highlighting toggle.
- **After a solve:** time, comparison to your own average, "Next puzzle" as the primary action.
- **Stats:** per game: played, best, average, streak, time-by-difficulty chart. Stored locally.
- **Share:** a puzzle is fully described by `game + size + difficulty + seed`, so a link like `/crowns/8/hard/k3f9x2` reproduces it. No server needed.
- **No account, no ads, no tracking, works offline.**

Out of scope for v1: leaderboards, accounts, multiplayer, native store apps.

## 4. Generators (the core work)

Shared pipeline for every game:

1. Seeded random number generator, so a seed always yields the same puzzle.
2. Build a random *solution*.
3. Derive clues from it.
4. Check uniqueness with a solver that counts solutions up to 2.
5. Grade difficulty with a *human-style* solver that only uses named deductions; reject puzzles that need guessing; label by the hardest technique needed.
6. Runs in a Web Worker; a small buffer of ready puzzles is kept so "Next" is instant.

The five solvers in `../LarpedIN/src/solvers/` are the starting point for step 4. We copy them in (this project stays independent) and add solution counting.

Per game:

- **Trace:** random Hamiltonian path on the grid (backbiting moves from a snake path), drop 6 to 12 numbered waypoints, add walls only where needed, keep adding waypoints until the path is unique.
- **Crowns:** place N non-touching crowns (one per row and column), grow N regions outward from them with random flood fill, then reshape region borders until the solution is unique. Reject boards with ugly regions (single-cell regions capped, no long hairlines).
- **Pairs:** random valid 6×6 fill by backtracking, sprinkle = / × edge clues, then remove givens one at a time while the logic solver still finishes.
- **Plots:** random rectangle partition of the grid, one clue per rectangle (size, plus tall / wide / square hint), move clue positions until unique.
- **Wind:** the hard one. Needs a word list with themes. Pick a theme, choose words whose lengths sum to the grid, find a snake partition of the grid, lay words on it, then verify no other word set from the dictionary fills the grid. Needs a curated list (a few thousand common words grouped into around 200 themes) so puzzles feel authored rather than random. Ships last.

Quality gates in tests: 10,000 puzzles per game and size, 100% unique, 100% logic-solvable, generation p95 under 200 ms (Wind: under 1 s).

## 5. Design direction

To be fixed in a short design phase before any game screen is coded. Starting position:

- **Idea:** a pocket puzzle book, not a social feed. Paper-calm surface, the board is the only loud thing on screen.
- **Board first:** the grid fills the width on a phone, controls sit under the thumb, nothing above the board except the timer and a back arrow.
- **One colour per game**, used for the board's active elements only. Crowns' region palette gets its own tested set of 10 colours that stay distinct for colour-blind players, with optional patterns.
- **Type:** one grotesque family for interface, tabular figures for the timer. No rounded "friendly" display face.
- **Motion:** short and physical. Line drawing follows the finger with no lag; pieces settle in 120 ms; the solve animation runs once along the solution and takes under a second.
- **Feel parity with LinkedIn, checked item by item:** drag to draw, tap to cycle cell states, tap-and-drag to mark many cells, instant conflict feedback, undo. This is where recognition comes from.
- **Rules against slop:** no gradients, no glow, no emoji, no coloured stripes, no card-in-card, no filler copy. Dark mode designed, not inverted.

Deliverables of the design phase: tokens (colour, type, spacing, radii, motion), the board component for each game in all states, home, result and stats screens, at phone and desktop width, reviewed with you on a design canvas before build.

## 6. Tech

- **Web app first, installable (PWA).** One codebase for phone and desktop, offline, no store review. Wrap for iOS/Android later if wanted.
- **Stack:** Vite, TypeScript, React. Boards drawn in SVG with pointer events (crisp at any size, easy to animate, accessible). Generators are plain TypeScript with no DOM, in a worker.
- **Storage:** IndexedDB for stats, in-progress games and the puzzle buffer.
- **Layout:**
  ```
  src/engine/<game>/{generate,solve,grade,rules}.ts
  src/engine/rng.ts
  src/ui/board/<game>/
  src/ui/screens/
  src/store/
  test/
  ```
- **Tests:** unit tests for rules and solvers, bulk generator tests (the quality gates above), Playwright runs that play each game end to end by touch and mouse.
- **Accessibility:** full keyboard play, screen-reader cell labels, 44 px touch targets, reduced-motion mode.

## 7. Phases

1. **Foundations:** repo, RNG, shared grid types, port the five solvers, add solution counting. Tests green.
2. **Design phase:** direction, tokens, all screens on a canvas. Stops for your review.
3. **First game end to end (Crowns):** generator, grading, board, hint, result. Proves the whole loop.
4. **Pairs, Plots, Trace:** same loop, three times.
5. **Shell:** home, daily, stats, share links, settings, PWA and offline.
6. **Wind:** word list curation, generator, board.
7. **Polish:** motion, sound (off by default), accessibility pass, performance on a mid-range phone.
8. **Launch prep:** landing page, hosting. Nothing is deployed without your go-ahead.

## 8. Risks

- **Wind quality:** random word puzzles feel flat. Mitigated by curated themes; could launch with four games.
- **Difficulty feel:** a grader's "hard" may not match a human's. Mitigated by playtesting and tuning thresholds per game.
- **Crowns region aesthetics:** unique-solution boards tend to have odd regions. Mitigated by shape scoring in the generator.
- **Brand:** see the name question in section 1.

## 9. Decisions needed from you

1. Accept the own-identity direction (same mechanics and feel, original look and game names)?
2. Keep "GamedIn" knowing the trademark risk?
3. Web app first, or do you need native iOS/Android from day one?
4. Game names: use the working ones or pick others?
