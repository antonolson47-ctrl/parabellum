# PARABELLUM
### Shayla vs. the Undead and the Steakburger Apocalypse

**Play:** https://antonolson47-ctrl.github.io/parabellum/
(single-file offline copy: [Parabellum.html](Parabellum.html))

> **18+:** graphic gore and nonstop swearing. Grown-ups only.

A zombie shooter starring Shayla, RN. It's a 12-hour shift and the undead have clocked in too. She has to fight across Fayetteville, survive until Kennedy shows up with a truck full of guns he swore he didn't buy, and haul **120 steakburgers and 120 Cokes** home for the family reunion.

## Shifts
1. Ozark Mercy Regional: Code Brown (boss: The Chief of Surgery)
2. Freddo's Frozen Custard & Steakburgers: Brain Freeze (boss: The Concrete Mixer)
3. Fayetteville Public Library: Late Fees (boss: The Overdue)
4. Farmers' Market on the Square: Artisanal Brains (boss: The Sourdough Mother)
5. Dickson Street: Last Call (boss: Road Captain)
6. Old Main & Senior Walk: Finals Week (boss: Professor Emeritus)
7. Wilson Park Castle: Night at the Castle (boss: The Kweepie)
8. Mount Sequoyah: Sunrise (boss: The Kweepie Mother)
9. Home: The Reunion. Survive 120 s. The reunion ending needs the full 120/120 steakburger and Coke haul.

## Controls
- **Touch (twin-stick):** left stick moves, drag on the right half aims, FIRE (or Auto-Fire), SWAP, RELOAD, BEDPAN melee. Aim assist can be tuned in Settings.
- **Keyboard and mouse:** WASD, mouse aim (click to lock), click to fire, R reloads, Q/1–4 swap weapons, F melee, E calls Kennedy, T toggles auto-fire, Esc/P pauses.
- Landscape is the main layout. Portrait has its own HUD layout.

## Features
- Detailed stylized 3D characters (skinned, animated) with close-up cutscenes: Shayla, Kennedy, Kelly, Kayleigh and Kambree.
- Full gore: headshots pop, limbs come off, blood decals.
- Shayla swears uncensored, with action-movie barks.
- Zombie fingers are the currency. Spend them at Vendy's Vending Emporium on upgrades.
- Kennedy calls in at the halfway point of each shift as an AI ally and loans you a rifle.
- Procedural rock soundtrack and procedural sound effects.
- Auto quality scaling for phones. Installable as a home-screen web app.

## Build
`npm i && ./build.sh` produces `dist/index.html` + `dist/assets/` and the single-file `dist/Parabellum.html`. `./make_pages.sh` assembles this site.

## Credits
- Character bodies and animations: Quaternius *Universal Base Characters* and *Universal Animation Library* (CC0).
- Fonts: Butcherman, Black Ops One, Barlow Condensed, Teko (SIL OFL); Permanent Marker (Apache 2.0).
- Engine: three.js (MIT).
- An original parody for Shayla. Not affiliated with any real business.


### Guns
`src/guns.js` builds the detailed first-person guns, hands, ejected brass, shop icons and Kennedy's rifle procedurally (PBR + edge-wear shader). Preview lab: `dev/guns.html?w=pistol|rifle|shotgun|defib|bedpan&view=fp|side|vm3|icons`.
