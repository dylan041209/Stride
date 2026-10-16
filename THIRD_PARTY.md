# Animation resources used by Stride

These resources are included as part of the Stride website, rather than installed as Codex agent skills. The site continues to use plain HTML/CSS/JavaScript. No React runtime or build migration is introduced.

- **GSAP 3.15.0**: short page entrances and progress-bar feedback. The unmodified distribution and original copyright/license header are preserved in `vendor/gsap.min.js`; see `vendor/GSAP-NOTICE.txt` and [the official licence](https://gsap.com/community/standard-license/).
- **Lenis 1.3.26**: short mouse-wheel smoothing on devices with a fine pointer. Touch scrolling, form controls and nested dialog/sidebar scrolling remain native. See `vendor/LENIS-LICENSE.txt`.
- **React Bits SpotlightCard**, revision `496968c4117e21278f13917201b7d615bc5e7450`: its pointer-position radial light and decorative, non-interactive overlay have been adapted to existing subject/reward cards in `motion.js`/`motion.css`. The application adaptation uses one delegated listener and does not include the source component's ambient animation, grain, proximity loop or React dependency. Copyright (c) 2026 David Haz; the MIT + Commons Clause notice is preserved in `vendor/REACT-BITS-LICENSE.txt`. This is distributed within Stride, not as a standalone component library or port.

Official sources: [GSAP](https://github.com/greensock/GSAP), [Lenis](https://github.com/darkroomengineering/lenis), and [React Bits SpotlightCard](https://github.com/DavidHDev/react-bits/tree/496968c4117e21278f13917201b7d615bc5e7450/src/content/Components/SpotlightCard).

`vendor/manifest.json` pins the versions/source revision and records downloaded-file SHA-256 hashes. The new motion assets are served locally with the website and make no requests to their providers at runtime. They add no browser-storage keys, tracking, account permissions or data recipients. The separate existing Supabase CDN request remains documented in the draft Privacy Policy.

Reduced-motion preferences disable the entrances, animated progress feedback, spotlight and smooth-wheel controller. All content starts readable without animation, and missing motion libraries leave native scrolling and the core application available. View updates clean up previous animation contexts without replaying entrances on a same-page edit.

While Lenis is active, history rows use normal layout rather than `content-visibility` skipping. This keeps scroll heights stable for keyboard Home/End navigation; native touch/reduced-motion views retain the earlier paint optimisation.

## Account dropdown design guidance

The [animate](https://github.com/emilkowalski/skills/tree/main/skills/animate) and [emil-design-eng](https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng) agent skills informed the Account dropdown's spacing, top-right transform origin, short easing curve, interruptible transitions and keyboard/reduced-motion behaviour. They are installed in the developer's Codex environment, not bundled as website dependencies. The dropdown implementation is local CSS/JavaScript and adds no external requests, storage keys or account permissions.

Account → Settings now lets users request reduced motion or disable mouse-wheel smoothing. These controls update the existing GSAP/Lenis/spotlight integration immediately; device reduced-motion requests take priority. The separate preferences.js/preferences.css files also implement browser-local appearance and accessibility controls. Their stride.preferences storage key and remembering opt-out are described in Privacy draft v0.4; no new runtime providers are introduced.
