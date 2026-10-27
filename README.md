# TRIGONOMETRY ADVENTURE

A game that teaches sine, cosine and tangent by **playing**, not by testing. Fire a crystal cannon, guide ships to a lighthouse and battle bosses with the unit circle. A Duolingo-style path leads from a short lesson to games to a finale in each world, with hearts, stars, XP and day streaks.
Built for the course **Educational Technologies and Learning Systems**. Written for complete beginners: every world starts with a hands-on lesson.

Tech: HTML5, CSS3, JavaScript (ES modules), GSAP, Three.js, KaTeX, SVG, localStorage. No backend, no API keys.

## Run it in VS Code (Live Server)

1. Install **Visual Studio Code** and the extension **Live Server** (by Ritwick Dey).
2. Open the project folder: `File > Open Folder...`.
3. Right-click `index.html` and choose **Open with Live Server** (or click **Go Live**).
4. The game opens at `http://127.0.0.1:5500`.

Notes:
- Use Live Server or any local web server (`python -m http.server`, then open `http://localhost:8000`). Double-clicking `index.html` does **not** work because browsers block ES modules on `file://`.
- GSAP, KaTeX, Three.js and the fonts load from CDNs. If one fails, the game still works: animations are skipped, math appears as plain text and a CSS background replaces the 3D scene.

## The adventure

12 missions on a linear path. Each mission unlocks after the previous one.

| World | Mission | What you do | Maths |
|-------|---------|-------------|-------|
| **Cannon Cove** | Lesson | Move angle and power sliders and watch the bolt's triangle | across = power·cos θ, up = power·sin θ |
| | First shots | Turn the cannon to hit crystals | sin θ = up ÷ power, cos θ = across ÷ power |
| | Power up | The angle is fixed: choose the power | power = up ÷ sin θ |
| | Crystal storm | Finale: hidden crystals, angle and power | all of the above |
| **Lighthouse Bay** | Lesson | Move a ship, name the sides, meet SOH CAH TOA | opposite, adjacent, hypotenuse |
| | Spot the ship | Pick the right ratio, then slide the ship or tower | tan |
| | Ropes and beams | Same, with the hypotenuse | sin, cos |
| | Storm watch | Finale: any side, or find the angle | choosing sin / cos / tan |
| **Boss Realm** | Lesson | Explore the unit circle (drag the point) | cos = x, sin = y, tan = sin ÷ cos |
| | Gobbo the Goblin | Break shields with sin / cos spells | special angles 0°–90° |
| | Wisp the Wraith | Shields need tan too | tan, undefined at 90° |
| | Zeroth the Dragon | Negative shields, angles to 360° | quadrants, signs |

Rules: 3 hearts per game, a mistake costs one, out of hearts means try again (no penalty). Stars = hearts left at the end. XP for every mission; playing on consecutive days builds the day streak. The **Hint** and **Cheat sheet** buttons are always free. The old quiz is gone; the **Playground** keeps the free-play diagrams (triangle, SOH CAH TOA, unit circle with waves, special-angles table).

Keyboard: sliders use the arrow keys (or the − / + buttons), `Enter` presses the main button, `Esc` closes dialogs.

## Project structure

```
index.html        page structure (screens and dialogs)
style.css         design system, glass UI, playground
play.css          adventure map, mission screen, SVG boards
script.js         entry point
js/
  trig.js         exact trig values and helpers
  puzzles.js      game rules and maths for cannon, bay and boss rounds (no DOM)
  content.js      worlds, missions, lesson texts and tasks
  boards.js       SVG boards: cannon, lighthouse, unit circle, boss scene
  play.js         mission screen: lessons, rounds, hearts, feedback
  map.js          the adventure path
  results.js      results: stars, XP, streak, unlocks
  learn.js        Playground diagrams
  ui.js           screens, dialogs, toasts   motion.js  GSAP helpers
  fx.js           particles and confetti     background.js  Three.js + symbols
  storage.js      localStorage (missions, stars, XP, streak, settings)
  audio.js        Web Audio sounds (no files)  mathfmt.js  KaTeX with text fallback
test/validate.mjs automated checks
```

## Correctness and testing

Run `npm test` (Node 18+). 21 checks, including thousands of generated rounds:

- exact values against `Math.sin/cos/tan` for every multiple of 30° and 45°,
- cannon: the crystal is always on the board, the answer hits, neighbouring answers miss,
- bay: sides form a real right triangle, exactly one slider value is accepted, the ratio matches the sides, the picture meets the lamp at the answer,
- boss: every shield has a valid spell, a wrong spell never breaks it,
- the mission path unlocks one by one, every lesson task is reachable and starts unfinished,
- storage: streak (same day, next day, gap), stars never go down, damaged saved data is ignored.

## Notes

- Progress is saved in `localStorage` (key `trigAdventure.v2`) and validated on load; the game also runs when storage is blocked.
- Respects `prefers-reduced-motion`; the sparkle button turns decorative effects off. The 3D scene disables itself on slow devices.
- Accessible: skip link, labelled sliders with +/− buttons, ARIA live feedback, focus handling in dialogs, no drag-only interactions.
