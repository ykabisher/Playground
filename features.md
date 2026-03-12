# Planned Features — Kid-Friendly Space Shooter

> Theme: Space & Stars | Controls: Gamepad (twin-stick) | Mode: Endless sandbox | Difficulty: Easy

---

## Star & Coin Pickups

Enemies explode into glittering stars and coins that drift outward. The ship automatically
hoovers them up when nearby (no need to aim). Big, satisfying number pop-ups (+10, +50)
in cartoon fonts.

**Why:** Core reward loop that keeps a 5-year-old engaged.

---

## Juicy Explosions & Screen Flash

When an enemy dies: a large burst of colorful particles in rainbow hues, a brief screen
shake, and the background flashes a complementary color. Geometry Wars signature feel —
every kill should feel _awesome_. Sounds synthesized via Web Audio (no external files).

---

## Full Gamepad Twin-Stick Support

Left stick = move the ship. Right stick = aim & fire continuously (auto-fire while held,
no button press needed). Classic Geometry Wars layout, far more accessible for small hands
than keyboard.

---

## Endless "Glow" Enemy Waves

Replace the current wave system with an endless spawn loop. Enemies start as slow, round,
neon-glowing blobs. Every ~60 seconds, a new color/shape variant appears that is slightly
faster. No game-over screen — ship respawns with a fun animation so the child never feels
punished.

---

## Celebratory "Level Up" Fanfare

Every score milestone (500, 1000, 2000…) triggers a full-screen rainbow burst, the ship
briefly grows huge, and all on-screen enemies pop at once. Paired with a synthesized
"Ta-daaaa!" chord. Replaces the wave concept with a continuous feeling of achievement.

---

## Suggested Implementation Order

- Gamepad twin-stick (controls first)
- Star & coin pickups (reward loop)
- Endless glow waves (game loop)
- Explosions & screen flash (juice)
- Level-up fanfare (celebration)
