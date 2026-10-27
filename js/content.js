/**
 * content.js
 * The adventure map: three worlds, twelve missions, and the text of every lesson.
 * Missions unlock one after the other (lesson -> game -> game -> finale), like a Duolingo path.
 *
 * Mission kinds:
 *   lesson - short, hands-on steps. Each step has a small task that must be done to continue.
 *   cannon - Crystal Cannon rounds    bay - Lighthouse Bay rounds    boss - boss battle
 */

export const WORLDS = [
  {
    id: 'cannon',
    name: 'Cannon Cove',
    blurb: 'Fire the crystal cannon and discover how sine and cosine split a shot into across and up.',
    color: 'cyan',
  },
  {
    id: 'bay',
    name: 'Lighthouse Bay',
    blurb: 'Guide ships with right triangles. SOH CAH TOA turns angles into distances and heights.',
    color: 'violet',
  },
  {
    id: 'boss',
    name: 'Boss Realm',
    blurb: 'Cast sin, cos and tan spells on the unit circle to break the shields of three bosses.',
    color: 'pink',
  },
];

/** Kinds of rounds: see puzzles.js for the specs. */
export const NODES = [
  /* ---------------------------------------------------------- Cannon Cove */
  {
    id: 'cannon-1',
    world: 'cannon',
    kind: 'lesson',
    lesson: 'cannon',
    title: 'Meet the cannon',
    blurb: 'Learn how every shot hides a right triangle.',
    teaches: ['angle and power', 'across = power × cos θ', 'up = power × sin θ'],
    xp: 15,
  },
  {
    id: 'cannon-2',
    world: 'cannon',
    kind: 'cannon',
    title: 'First shots',
    blurb: 'Turn the cannon to hit the crystals. Power is fixed.',
    teaches: ['sin θ = up ÷ power', 'cos θ = across ÷ power'],
    xp: 25,
    plan: [
      { kind: 'aim', by: 'y', reveal: true },
      { kind: 'aim', by: 'x', reveal: true },
      { kind: 'aim', by: 'y', reveal: true },
      { kind: 'aim', by: 'x', reveal: true },
    ],
  },
  {
    id: 'cannon-3',
    world: 'cannon',
    kind: 'cannon',
    title: 'Power up',
    blurb: 'The angle is fixed now. Choose how hard to fire.',
    teaches: ['power = up ÷ sin θ', 'power = across ÷ cos θ'],
    xp: 30,
    plan: [
      { kind: 'power', by: 'y', reveal: true },
      { kind: 'power', by: 'x', reveal: true },
      { kind: 'power', by: 'y', reveal: false },
      { kind: 'power', by: 'x', reveal: false },
      { kind: 'aim', by: 'y', reveal: false },
    ],
  },
  {
    id: 'cannon-4',
    world: 'cannon',
    kind: 'cannon',
    title: 'Crystal storm',
    blurb: 'Finale! Hidden crystals, both controls, one chance each shot.',
    teaches: ['angle and power together'],
    xp: 45,
    plan: [
      { kind: 'aim', by: 'y', reveal: false },
      { kind: 'aim', by: 'x', reveal: false },
      { kind: 'power', by: 'y', reveal: false },
      { kind: 'power', by: 'x', reveal: false },
      { kind: 'both', reveal: false },
      { kind: 'both', reveal: false },
    ],
  },

  /* ------------------------------------------------------ Lighthouse Bay */
  {
    id: 'bay-1',
    world: 'bay',
    kind: 'lesson',
    lesson: 'bay',
    title: 'Lighthouse triangles',
    blurb: 'Name the sides and meet SOH CAH TOA.',
    teaches: ['opposite, adjacent, hypotenuse', 'sin, cos and tan as ratios'],
    xp: 20,
  },
  {
    id: 'bay-2',
    world: 'bay',
    kind: 'bay',
    title: 'Spot the ship',
    blurb: 'Use tangent to find heights and distances.',
    teaches: ['tan θ = opposite ÷ adjacent'],
    xp: 30,
    plan: [
      { kind: 'd', known: 'opp' },
      { kind: 'h', known: 'adj' },
      { kind: 'd', known: 'opp' },
      { kind: 'h', known: 'adj' },
    ],
  },
  {
    id: 'bay-3',
    world: 'bay',
    kind: 'bay',
    title: 'Ropes and beams',
    blurb: 'Bring in the hypotenuse with sine and cosine.',
    teaches: ['sin θ = opposite ÷ hypotenuse', 'cos θ = adjacent ÷ hypotenuse'],
    xp: 35,
    plan: [
      { kind: 'h', known: 'hyp' },
      { kind: 'd', known: 'hyp' },
      { kind: 'l', known: 'opp' },
      { kind: 'l', known: 'adj' },
      { kind: 'h', known: 'hyp' },
    ],
  },
  {
    id: 'bay-4',
    world: 'bay',
    kind: 'bay',
    title: 'Storm watch',
    blurb: 'Finale! Find any side or the angle itself.',
    teaches: ['choosing sin, cos or tan', 'finding an angle from two sides'],
    xp: 50,
    plan: [{ kind: 'a' }, { kind: 'any' }, { kind: 'a' }, { kind: 'any' }, { kind: 'any' }, { kind: 'a' }],
  },

  /* ----------------------------------------------------------- Boss Realm */
  {
    id: 'boss-1',
    world: 'boss',
    kind: 'lesson',
    lesson: 'circle',
    title: 'The magic circle',
    blurb: 'Meet the unit circle, your spell book.',
    teaches: ['cos = across, sin = up', 'tan = sin ÷ cos', 'angles beyond 90°'],
    xp: 20,
  },
  {
    id: 'boss-2',
    world: 'boss',
    kind: 'boss',
    tier: 1,
    title: 'Gobbo the Goblin',
    blurb: 'Break the shield with sin and cos spells.',
    teaches: ['sin and cos of 0°, 30°, 45°, 60°, 90°'],
    xp: 40,
  },
  {
    id: 'boss-3',
    world: 'boss',
    kind: 'boss',
    tier: 2,
    title: 'Wisp the Wraith',
    blurb: 'The wraith hides behind tangent shields.',
    teaches: ['tan of special angles', 'tan 90° is undefined'],
    xp: 50,
  },
  {
    id: 'boss-4',
    world: 'boss',
    kind: 'boss',
    tier: 3,
    title: 'Zeroth the Dragon',
    blurb: 'Final boss! Negative shields and angles all the way round.',
    teaches: ['signs in the four quadrants', 'reference angles'],
    xp: 70,
  },
];

export const NODE_BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node]));
export const nodeIndex = (id) => NODES.findIndex((node) => node.id === id);
export const nextNode = (id) => NODES[nodeIndex(id) + 1] ?? null;
export const nodesOfWorld = (worldId) => NODES.filter((node) => node.world === worldId);
export const KIND_LABEL = { lesson: 'Lesson', cannon: 'Game', bay: 'Game', boss: 'Boss battle' };

/**
 * A mission is playable when every mission before it is completed (the path is linear).
 * `isDone(id)` tells which missions are completed.
 */
export function nodeStatus(id, isDone) {
  if (isDone(id)) return 'done';
  const index = nodeIndex(id);
  return NODES.slice(0, index).every((node) => isDone(node.id)) ? 'current' : 'locked';
}

/* ------------------------------------------------------------------ lessons */

/**
 * Lesson steps. `widget` picks the interactive board; `task.test(state)` must be true to continue.
 * Board states:  cannon {angle, power}   bay {distance}   circle {angle}
 */
export const LESSONS = {
  cannon: {
    widget: 'cannon',
    start: { angle: 45, power: 8 },
    controls: ['angle', 'power'],
    steps: [
      {
        title: 'Meet your crystal cannon',
        body: '<p>Welcome, captain! This cannon fires a glowing bolt. You choose two things: the <strong>angle</strong> it points and the <strong>power</strong> of the shot.</p><p>No maths needed yet. Just play with the sliders.</p>',
        task: { text: 'Turn the angle to 60°.', test: (s) => s.angle === 60 },
        done: 'Nice. A bigger angle points the cannon higher.',
      },
      {
        title: 'Every shot hides a triangle',
        body: '<p>Look at the two dotted lines. The <span class="text-cyan">cyan one</span> is how far the bolt goes <strong>across</strong>. The <span class="text-pink">pink one</span> is how high it goes <strong>up</strong>.</p><p>With the bolt itself they make a <strong>right triangle</strong>. Trigonometry is the maths of these triangles!</p>',
        task: { text: 'Set the power to 14.', test: (s) => s.power === 14 },
        done: 'More power makes the whole triangle bigger, but its shape stays the same.',
      },
      {
        title: 'Sine and cosine measure the legs',
        body: '<p>Two special numbers depend only on the angle θ (theta):</p><ul><li><strong>cos θ</strong> tells how much of the power goes <span class="text-cyan">across</span></li><li><strong>sin θ</strong> tells how much goes <span class="text-pink">up</span></li></ul><p>So: <strong>across = power × cos θ</strong> and <strong>up = power × sin θ</strong>.</p>',
        task: { text: 'Set the angle to 90° and watch "across".', test: (s) => s.angle === 90 },
        done: 'Straight up! cos 90° = 0, so nothing goes across, and sin 90° = 1, so all the power goes up.',
      },
      {
        title: 'A friendly angle: 30°',
        body: '<p>At <strong>30°</strong> the sine is exactly <strong>1/2</strong>. So the shot goes up exactly half of its power.</p><p>Check it: power 10 should give up = 5.</p>',
        task: { text: 'Set the angle to 30° and the power to 10.', test: (s) => s.angle === 30 && s.power === 10 },
        done: 'Up = 10 × sin 30° = 10 × 1/2 = 5. You just used trigonometry!',
      },
      {
        title: 'The flat shot',
        body: '<p>What if you shoot along the ground? At <strong>0°</strong> nothing goes up, so <strong>sin 0° = 0</strong>, and everything goes across, so <strong>cos 0° = 1</strong>.</p>',
        task: { text: 'Set the angle to 0°.', test: (s) => s.angle === 0 },
        done: 'Flat shot: up = power × 0 = 0, across = power × 1 = power.',
      },
      {
        title: 'Ready to fire!',
        body: '<p>You now know the secret of the cannon:</p><p class="formula-line">across = power × cos θ<br />up = power × sin θ</p><p>In the next missions you will aim at crystals. The cheat sheet button always shows sin and cos for the famous angles.</p>',
        task: null,
      },
    ],
  },

  bay: {
    widget: 'bay',
    start: { distance: 30 },
    controls: ['distance'],
    steps: [
      {
        title: 'A lighthouse and a ship',
        body: '<p>The lighthouse is <strong>20 m</strong> tall. A ship sails on the sea. The tower, the sea and the line of sight to the lamp form a <strong>right triangle</strong> (the right angle is at the foot of the tower).</p><p>The angle at the ship is called <strong>θ</strong>.</p>',
        task: { text: 'Sail the ship to 20 m from the tower.', test: (s) => s.distance === 20 },
        done: 'At 20 m the tower is as tall as the distance, so θ = 45°. The closer the ship, the steeper the angle.',
      },
      {
        title: 'Name the three sides',
        body: '<p>Sides get names <em>relative to θ</em>:</p><ul class="legend"><li><span class="swatch swatch-opposite"></span><strong>Opposite</strong>: across from θ (the tower)</li><li><span class="swatch swatch-adjacent"></span><strong>Adjacent</strong>: next to θ (the sea distance)</li><li><span class="swatch swatch-hypotenuse"></span><strong>Hypotenuse</strong>: the longest side (line of sight)</li></ul>',
        task: { text: 'Sail the ship to 40 m.', test: (s) => s.distance === 40 },
        done: 'Far away the angle is small. The hypotenuse is always the longest side.',
      },
      {
        title: 'SOH: sine',
        body: '<p><strong>S</strong>ine = <strong>O</strong>pposite ÷ <strong>H</strong>ypotenuse.</p><p>It compares the tower with the line of sight. Watch <strong>sin θ</strong> below as you sail.</p>',
        highlight: 'sin',
        task: { text: 'Sail the ship to 10 m.', test: (s) => s.distance === 10 },
        done: 'Close to the tower, θ is big, so sin θ is big (close to 1).',
      },
      {
        title: 'CAH: cosine',
        body: '<p><strong>C</strong>osine = <strong>A</strong>djacent ÷ <strong>H</strong>ypotenuse.</p><p>It compares the sea distance with the line of sight.</p>',
        highlight: 'cos',
        task: { text: 'Sail the ship to 40 m.', test: (s) => s.distance === 40 },
        done: 'Far away the line of sight is almost the same as the distance, so cos θ is close to 1.',
      },
      {
        title: 'TOA: tangent',
        body: '<p><strong>T</strong>angent = <strong>O</strong>pposite ÷ <strong>A</strong>djacent.</p><p>It compares the tower with the sea distance, and it never needs the hypotenuse.</p>',
        highlight: 'tan',
        task: { text: 'Sail the ship to 20 m.', test: (s) => s.distance === 20 },
        done: 'Tower 20 ÷ distance 20 = 1, so tan 45° = 1.',
      },
      {
        title: 'Picking the right tool',
        body: '<p>In a puzzle, look at the <strong>two sides</strong> that matter, the one you know and the one you want:</p><ul><li>opposite &amp; hypotenuse: <strong>sin</strong></li><li>adjacent &amp; hypotenuse: <strong>cos</strong></li><li>opposite &amp; adjacent: <strong>tan</strong></li></ul><p>Then use the ratio to find the missing side, or the angle.</p>',
        task: null,
      },
    ],
  },

  circle: {
    widget: 'circle',
    start: { angle: 30 },
    controls: ['angle'],
    steps: [
      {
        title: 'The magic circle',
        body: '<p>Welcome to the <strong>unit circle</strong>: a circle with radius <strong>1</strong>. Turn the radius by an angle θ and it lands on a point.</p><p>This point holds the secrets of sine and cosine.</p>',
        task: { text: 'Turn the angle to 90°.', test: (s) => s.angle === 90 },
        done: 'Straight up. The point is at the top of the circle.',
      },
      {
        title: 'Across is cos, up is sin',
        body: '<p>The point\'s position is <strong>(cos θ, sin θ)</strong>.</p><ul><li><span class="text-cyan">cos θ</span>: how far <strong>across</strong> (left or right)</li><li><span class="text-pink">sin θ</span>: how far <strong>up</strong> (or down)</li></ul><p>It is the same triangle as the cannon, with power 1!</p>',
        task: { text: 'Turn the angle to 60°.', test: (s) => s.angle === 60 },
        done: 'At 60° the point is (1/2, √3/2): cos 60° = 1/2 and sin 60° = √3/2.',
      },
      {
        title: 'The famous angles',
        body: '<p>You will meet these numbers again and again: <strong>1/2</strong>, <strong>√2/2</strong>, <strong>√3/2</strong>.</p><p>At <strong>45°</strong> across and up are equal, because the triangle is a perfect half-square.</p>',
        task: { text: 'Turn the angle to 45°.', test: (s) => s.angle === 45 },
        done: 'cos 45° = sin 45° = √2/2 ≈ 0.71.',
      },
      {
        title: 'Tangent',
        body: '<p><strong>tan θ = sin θ ÷ cos θ</strong>: how much "up" you get for each step "across". It is the slope of the radius.</p><p>The pink line on the circle shows tan θ.</p>',
        task: { text: 'Turn the angle to 90° and see what happens to tan.', test: (s) => s.angle === 90 },
        done: 'At 90° cos is 0, and you cannot divide by 0. So tan 90° is <strong>undefined</strong>.',
      },
      {
        title: 'Beyond 90°',
        body: '<p>The circle goes all the way round. Left of the centre, "across" (cos) is <strong>negative</strong>. Below the centre, "up" (sin) is <strong>negative</strong>.</p>',
        task: { text: 'Turn the angle to 150°.', test: (s) => s.angle === 150 },
        done: '150° is on the upper left: cos 150° = −√3/2 (negative), sin 150° = 1/2 (positive).',
      },
      {
        title: 'Both negative',
        body: '<p>In the lower left quarter, both cos and sin are negative. The values are the same as in the upper right quarter, just with minus signs.</p>',
        task: { text: 'Turn the angle to 210°.', test: (s) => s.angle === 210 },
        done: '210° is 30° past the half turn, so cos 210° = −√3/2 and sin 210° = −1/2.',
      },
      {
        title: 'Your spell book',
        body: '<p>Bosses hide behind a <strong>shield</strong> with a number on it. You break it by casting a <strong>spell</strong>: pick sin, cos or tan and an angle so that the value matches the shield.</p><p>Many spells can work, for example sin 30° and cos 60° are both 1/2. Ready?</p>',
        task: null,
      },
    ],
  },
};
