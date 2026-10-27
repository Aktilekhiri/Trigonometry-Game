# TRIGONOMETRY ADVENTURE

An interactive educational arcade game that teaches sine, cosine, tangent, right triangles, SOH CAH TOA and the unit circle.
Built for the course **Educational Technologies and Learning Systems**.

Tech: HTML5, CSS3, JavaScript (ES modules), GSAP, Three.js, KaTeX, SVG/Canvas, localStorage. No backend, no API keys.

## Run it in VS Code (Live Server)

1. Install **Visual Studio Code** and the extension **Live Server** (by Ritwick Dey).
2. Open the project folder: `File > Open Folder...` and choose `trigonometry-adventure`.
3. Right-click `index.html` and choose **Open with Live Server** (or click **Go Live** in the status bar).
4. The game opens at `http://127.0.0.1:5500`.

Notes:
- Use Live Server (or any local web server). Opening `index.html` by double-click does **not** work, because browsers block ES modules on `file://`.
- GSAP, KaTeX, Three.js and the Google Fonts load from CDNs, so connect to the internet once. If a library fails to load, the game still works: animations are skipped, math is shown as plain text and the CSS background replaces the 3D scene.
- Any other server works too, for example `python -m http.server` and then open `http://localhost:8000`.

## How to play

- 3 levels, 10 questions each, 4 answers, 20 seconds per question, 3 hearts.
- Correct: +10 points. Wrong or out of time: lose a heart and see the explanation.
- 0 hearts = Game Over. Finish with 70% or more to unlock the next level. Stars: 70% = 1, 80% = 2, 90% = 3.
- Keyboard: `1`-`4` answer, `Enter` next question, `Esc` closes dialogs. The Pause button stops the clock.

| Level | Difficulty | Topics |
|-------|------------|--------|
| 1 | Easy | sin, cos, tan of 0°, 30°, 45°, 60°, 90° (tan 90° is undefined) |
| 2 | Medium | identities, complementary angles, right-triangle calculations |
| 3 | Hard | quadrants, unit circle values, radians, reference angles, simple equations |

## Learning screen

Four interactive lessons: right triangle with angle slider, SOH CAH TOA highlighter, unit circle (rotating radius, angle slider, sine/cosine projections, wave graph, live values, auto-rotate) and a special-angles table.

## Project structure

```
index.html        page structure (all screens and dialogs)
style.css         design system, glassmorphism, responsive layout, reduced motion
script.js         entry point
js/
  trig.js         exact trig values and helpers
  questions.js    question banks (21 / 25 / 40 questions) + self-verification
  engine.js       quiz rules as a pure state machine (no DOM)
  game.js         quiz screen: timer, hearts, score, feedback, pause
  learn.js        interactive lessons (SVG)
  levels.js       level selection
  results.js      results screen
  ui.js           screen manager, dialogs, toasts
  motion.js       GSAP helpers (with graceful fallbacks)
  fx.js           particle bursts and confetti (canvas)
  background.js   Three.js scene + floating math symbols
  storage.js      localStorage (progress, best scores, settings)
  audio.js        Web Audio sound effects (no audio files)
  mathfmt.js      KaTeX rendering with plain-text fallback
test/validate.mjs automated checks
```

## Correctness and testing

Run `npm test` (or `node test/validate.mjs`; Node 18+). It checks:

- every question's correct answer against `Math.sin/cos/tan`, and that **no wrong option is also correct**,
- 300 generated quizzes per level: 10 unique questions, 4 unique options, exactly one correct, answers shuffled,
- the quiz engine: scoring only once per question, late clicks, early timeouts, pause/resume, game over, perfect run, 70% edge case.

All values are exact strings (1/2, √2/2, √3/2, √3/3, √3, Undefined); nothing is rounded in the quiz.

## Edge cases handled

- Double click, click plus timeout, keyboard plus click: only the first one counts (engine state machine).
- The timer uses `performance.now()` in one animation-frame loop (no drifting intervals). Switching tabs pauses it.
- If the third heart is lost on the **last** question, the level still counts as completed (7/10 = 70% passes).
- `localStorage` data is validated on load; if storage is blocked, the game still runs.
- Respects `prefers-reduced-motion`; the sparkle button in the top bar turns visual effects off. The 3D scene turns itself off on slow devices.
- Accessible: skip link, keyboard control, visible focus, ARIA live announcements, labelled SVG diagrams.
