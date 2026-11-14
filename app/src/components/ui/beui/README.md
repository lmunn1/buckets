# beUI Native controls in Hoop

Source: [beUI Native](https://github.com/starc007/beui-native/tree/ab3e58aa751bffccb725208db2c3740eb2bf643b/src/components/button), revision `ab3e58aa751bffccb725208db2c3740eb2bf643b`.

- [`button.tsx`](button.tsx) adapts the public native `ButtonRoot` and spring-press behavior. Styling is expressed with Hoop's existing StyleSheet tokens instead of Uniwind. Optional ripple and cascading text are omitted. Press scale is restrained to 0.97 and hover to 1.01.
- [`use-reduced-motion.ts`](use-reduced-motion.ts) is copied from that public revision.
- [`LICENSE`](LICENSE) preserves the full MIT notice, copyright 2026 beUI and Saurabh.

The shared Hoop `Action` composes this button on every screen. No Pro components, purchase, Uniwind migration, or new animation package is required. Reanimated was already installed in Hoop.

- [`segmented-control.tsx`](segmented-control.tsx) adapts the same revision's public TabsList/TabsTrigger measured indicator and selection architecture, with Hoop styling, radio semantics, a reduced-motion-aware 180ms glide, and compiler-safe shared-value access. It is used for practice duration and the technique view. No Uniwind or web component dependency.
