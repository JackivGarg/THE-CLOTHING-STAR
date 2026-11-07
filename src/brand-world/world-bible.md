# The rail / brand world

Travel along one continuous brushed-metal clothing rail, approaching each independent brand's garment before turning toward the next label; the same ivory showroom stays present throughout.

Native page scroll owns the journey. Brand navigation jumps to an authored position in that scroll range; pointer, focus and tap inspect the active garment, and Explore opens the separate catalogue flow.

## Visual and geometry ledger

One world unit is a metre. The garment outline in each source photo forms a textured mesh up to 1.78m wide and 1.97m tall. A collar anchor seats the cloth on its wooden hanger. Brand bays are 1.95m apart, with tighter spacing on phones. The continuous rail sits at 2.94m. Ivory `#f1f0e9` is the shared room. The metal has metalness .55 and roughness .32. Warm wood has roughness .72. A hemisphere fill and one directional key light the fixtures. The cloth texture preserves the print and baked source lighting.

## Chapters / camera ledger

Seven connected bays in source order: Bonkers, JNORSS, Genrage, WTFlex, Everdion, Hauntrex, Sagacity. They remain in one scene and share one continuous horizontal rail. Camera positions vary in X/Y/Z and look angle: frontal collection introduction, left shoulder view, close straight-on, pulled-back rail depth, right shoulder view, low inspection, frontal departure. Exact positions and mobile counterparts are in `scene.ts`. Transitions are continuous rather than teleporting props. Labels and interaction ownership use exact scroll; camera and focal scale use damped progress. A jump/reverse/reload recreates the same state.

## Interaction and layer map

Canvas: showroom -> rail + floor -> seven brand groups -> garment photograph planes + wooden hangers. DOM: sticky stage -> brand navigation -> active brand label/product name -> Explore / search exit -> fallback poster. Essential actions all have native DOM buttons. Only the current chapter can capture a canvas click; hover/focus applies a restrained scale emphasis without moving the scroll path. Touch has the same Explore button without hover dependence.

## Assets / loading

`/brand-world/manifest.json` records the seven visually reviewed source photos. `garment-fits.ts` stores each hand-traced outline and collar anchor. Three.js maps the original pixels onto the outline, and the SVG poster uses the same mask. Sagacity uses a close view with cropped sleeve edges. The active bay and up to two neighbours on either side load together. A failed texture leaves the brand caption and controls available. Photos are served locally with sRGB textures. The catalogue and brand radar are available from each chapter.

## Performance / access

One renderer, one scene, DPR cap 1.5 desktop / 1.25 phone, no shadow map or postprocessing; floor contact is geometry/lighting. Target <90 draw calls and <50k visible triangles; actual renderer counters are available as stage data attributes. Render only when visible and damping/interaction is changing. Lower DPR once after sustained frame times >30ms. Visibility changes reset frame time. Cleanup cancels RAF, disconnects observers/listeners, and disposes all geometry/material/texture/environment/renderer resources. Context loss shows fallback without reloading.

Each scroll transition occupies 36% of the viewport height, bounded to 190–350px. The camera damps toward the native scroll position while the cloth pivots slightly at its collar, then settles. Reduced motion chooses the nearest authored chapter and removes that pivot animation. Native scrolling and the jump to the search form remain available. Browser control was disabled when checking the revised composition. The build, scroll math tests, geometry triangulation and HTTP asset checks passed.
