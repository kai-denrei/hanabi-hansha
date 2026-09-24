# Night beach fireworks: implementation investigation

Investigated 2026-09-24 at upstream commit `4bc826134321043a25df3c2b6fed16fb7b9241e8`.
Repository: https://github.com/Aureliengmz/clearwater

## Recommendation

Keep Clearwater's WebGL2 water renderer. Add a night preset, procedural world-space fireworks, a dedicated reflection render target, and Web Audio scheduling. Preserve daytime as a selectable preset for comparison. No engine migration or build system is necessary for the first prototype.

This is a source investigation and implementation proposal, not an implemented or browser-benchmarked feature. The clone includes no automated test suite or package manifest. All source locations below refer to the original `index.html`.

## What exists and where to change it

| Area | Existing source | Implication |
| --- | --- | --- |
| WebGL setup | Lines 62–117 | Raw WebGL2; no scene graph; context requests no default depth buffer. |
| Waves | Lines 128–230 | FFT height/slope field; keep this for convincing moving reflections. |
| Local ripples | Lines 232–281 | Touch-driven ripples; separate their gesture handling from firework placement. |
| Sun caustics | Lines 284–340 | Three refracted-light passes; bypass at night once the night shader no longer samples solar caustics. |
| Sky and headland | `sky()`, line 372 | Procedural daytime gradient, solar glow, and distant land; replace lighting through a preset. |
| Surface intersection | Lines 433–461 | Shader reconstructs water position and normal, useful for reflection lookup. |
| Reflection | Lines 468–470 | Only `sky(reflect(...))`; adding particles to the screen will NOT make them appear in the water. |
| Day illumination | Lines 472–555 | Sun specular, seabed irradiance, scattering, suspended specks, haze, and disk all need night treatment. |
| Postprocessing | Lines 563–817 | HDR targets, bloom, diffraction glare, tone mapping; composite fireworks before `post(t)`. |
| Camera/input | Lines 820–869 | Camera starts at pitch −0.72 rad, looking down; maximum upward pitch is only 0.35 rad. |
| Frame loop | Lines 872–916 | Insert simulation, reflection pass, and direct particles; extend adaptive quality. |

The water is a shallow-water view with a submerged shelving seabed. It does not contain a visible dry beach, surf breaking on shore, or beach audio. The distant headland is a directional shader silhouette, not geometry with depth. Those distinctions matter for the final beach experience.

## Night and beach composition

- Add an environment preset containing sky/horizon colors, ambient irradiance, primary-light direction/intensity, haze, exposure, and postprocessing strengths. Avoid simply reducing final exposure: that also dims the fireworks while leaving daytime lighting relationships intact.
- Start near a level gaze, with the horizon around the lower third of the screen; tune by viewport. Keep approximately the existing 1.55 m eye height, allow looking substantially higher, and reduce camera sway.
- Use a very dark blue sky, sparse stable stars, subtle horizon haze, and a dim headland silhouette. A moon is optional; its illumination should not compete with the show.
- Replace solar irradiance/specular with a low moon/ambient contribution; remove daytime disk and bright haze. Keep refraction faint near the viewer, with reflections dominant toward the horizon.
- Fade haze toward night colors without washing out distant colored reflections. Tune bloom and exposure together; retain colored trails around near-white bright cores. Reduce existing grain if it dominates the dark sky.
- For the first beach composition, add a narrow wet/dry sand foreground with a sloping shoreline and a foam edge. This requires an explicit shore intersection/mask in the main renderer, not just recoloring the submerged pebbles. Later add gentle advancing/receding wash and wet-sand reflection.
- Preserve the MIT copyright/license notice when modifying or redistributing.

## Procedural fireworks

Represent a shell as `{ id, seed, type, launchPosition, burstPosition, launchTime, burstTime, palette, scale }`. Coordinates are meters in Clearwater's existing Y-up world. Resolve launch velocity/fuse so the shell actually reaches its previewed burst position. Use visual simulation parameters, not real pyrotechnic construction parameters.

Keep launch, ascent, burst, trails, embers, and optional secondary bursts on one timeline. Generate seeded initial conditions once per burst. Evaluate ballistic motion with gravity and drag from particle age; deterministic evaluation makes direct rendering, reflections, replay, and frozen screenshots agree. For trails, evaluate earlier positions or maintain a bounded history; do not create an unbounded list of particles each frame.

| Dial type | Visual signature |
| --- | --- |
| Peony | Even spherical expansion, bright tips, relatively short trails. |
| Chrysanthemum | Dense sphere with long sparkling trails. |
| Willow | Long-lived gold branches that droop under gravity. |
| Palm | A small number of thick, branching arms. |
| Ring | Particles in an oriented ring; seeded orientation adds variation. |
| Crackle | A main burst followed by small delayed clusters and crackling audio. |

Sample sphere directions uniformly, not uniformly in latitude. Give each shell coherent colors and small seeded differences in velocity, brightness, lifetime, and delay. Wind should move smoke and embers coherently. Render soft emissive cores and tapered trails with instanced quads into linear HDR, using additive blending for light; smoke needs separate alpha compositing and illumination.

Start with a bounded CPU pool and GPU instanced rendering. Initial profiling targets, not measured capacities: 4 simultaneous shells and 4,000–8,000 live sparks, with separate caps on trail segments and smoke. Reduce counts for mobile. Move simulation to transform feedback only if profiling shows CPU simulation/upload is the bottleneck.

## Water reflection: the critical integration

Recommended first implementation: planar HDR reflection of the SAME particle state, sampled and distorted inside the water shader.

1. Reflect the camera position and basis across mean sea level (`y = 0`), or equivalently reflect world particle positions and render with the real camera. Verify handedness and billboard orientation.
2. Draw firework light/trails into a cleared RGBA16F reflection target. Start at half resolution with overscan so wave distortion can sample beyond the visible viewport. Include sources outside the direct camera frustum when they can contribute reflections.
3. In the main water shader, project the reconstructed surface point `P` through the reflection view-projection matrix. Distort the projective lookup using the existing FFT/ripple slopes, with distance-aware, bounded offsets. Fade invalid/out-of-bounds samples rather than stretching edge pixels.
4. Add reflected firework radiance to the existing reflected environment before Fresnel weighting. Filter according to footprint/slope variance and tune breakup to produce moving, elongated fragments of colored light. A flat upside-down copy will look wrong.
5. Render direct fireworks into `hdrRT` after the water/sky pass and before `post(t)`. Keep direct and reflected sparks at the exact same simulation time.
6. Apply bloom/tone mapping once to the combined scene. Avoid baking screen bloom into the reflection target and then applying it again.

This is an approximation: a planar projection plus normal distortion does not solve reflection visibility on the actual displaced surface. Test near-horizon stability, grazing angles, offscreen bursts, camera movement, and large wave slopes early. If the approximation cannot meet the desired quality, evaluate depth-aware reflection reprojection or world-space reflection-ray sampling against layered firework radiance. That is a separate quality milestone.

A directional firework environment map is a simpler alternative for very distant displays, but treating sources as infinitely distant loses finite-distance parallax across the water. Avoid a full particle loop per water pixel: it scales with both screen area and particle count.

The current main pass writes no scene depth. Direct particle drawing therefore needs explicit visibility: initially clip below-water particles and apply the same horizon/headland mask with a documented distant-display assumption. Once shoreline/nearby geometry is added, provide shared scene depth or equivalent analytic occlusion. Reflections need matching visibility, not a screen-space copy of the direct mask.

A small bounded set of burst lights can additionally illuminate smoke, nearby water, and sand. These broad transient lights complement particle reflections; they cannot replace their visible structure.

## Radial dial and placement

Proposed interaction:

1. Tap a persistent firework button to open six radial type sectors. Pointer hover/drag previews a type; click/release selects it. Provide labeled focusable buttons and arrow/Enter/Escape navigation as well.
2. After selection, enter placement mode. Move a reticle through the sky to choose the burst center; show a faint preview of burst size and the launch path. A small distance control chooses near/mid/far positions over the water.
3. Tap/click to queue that shell at the chosen world location. Keep type selection active for repeated placement. Display discreet removable queue markers; an explicit Launch action starts the arranged set in a short stagger.
4. Collapse controls while watching. Allow reopening the dial for another group. Provide mute, volume, clear queue, and reduced-effects controls.

This supports selecting a set of types and positions without hiding an immediate launch behind a camera gesture. A later quick-fire mode can launch each placement immediately.

Use explicit input states (`looking`, `choosing`, `placing`, `queued`), a drag threshold, pointer capture/cancellation, and UI event isolation. Keep all placements in world coordinates so they remain fixed when the camera pans.

Screen coordinates alone do not determine 3D distance. Reuse the ray construction in `tapToDrop()`, but intersect the ray with a chosen offshore vertical placement surface/range instead of the water plane. Derive height from that intersection; reject positions behind the camera, below the allowed burst altitude, outside the offshore sector, or outside supported heights. Default range/height suggestions for visual tuning: 250–600 m offshore and 70–180 m high.

## Sound and timing

Use Web Audio, initialized/resumed on the user's first interaction. There is currently no audio system. Start with synthesized launch hiss/thump, layered noise plus a low-frequency boom, and delayed crackle. For the final ambience, compare synthesis against licensed recordings of distant fireworks and gentle surf; sound quality needs listening tests.

Schedule each sound against `AudioContext.currentTime` from the same logical event timeline as the visuals. Use scheduled source start times rather than `setTimeout` as the audio clock. Spatialize launch and burst at their distinct world positions, update the listener with camera pose, and apply distance-dependent attenuation/filtering. A panner does not provide sound-travel delay automatically.

```text
visual launch = launchTime
visual burst  = launchTime + ascentDuration
launch sound  = launchTime + distance(listener, launchPosition) / soundSpeed
burst sound   = burstTime  + distance(listener, burstPosition) / soundSpeed
```

Use approximately 343 m/s as an adjustable temperate-air default. At a 300 m horizontal distance and 120 m burst height, the boom arrives about 0.94 s after the flash; at 600 m horizontal distance it is about 1.78 s later. Light/reflection timing is effectively simultaneous at this scale.

For the requested immediate shooting feedback, offer a cinematic default where the launch sound starts with the visual ascent, while the explosion retains distance-based delay. That is an intentional artistic approximation; fully distance-correct mode delays the launch sound too. Do not delay the visible explosion itself.

Use a single transport mapping to the audio clock while running: the existing `tSim += min(dt, 0.05)` can drift from scheduled sound during stalls. Define pause/resume explicitly, suspend the context on pause, and cancel/rebuild pending voices when resetting the show. After a background-tab resume, do not emit a backlog of missed explosions. Frozen-time screenshot mode must remain silent and deterministic. Cap concurrent voices, disconnect finished nodes, and leave gain headroom for overlapping booms.

API reference: [W3C Web Audio specification](https://www.w3.org/TR/webaudio/), especially scheduled source nodes, AudioContext timing/state, listener/panner nodes, filters, and gain automation. Browser behavior and audio latency still need device testing.

## Implementation order and completion checks

1. **Night composition:** selectable day/night, corrected camera, dark lighting and shoreline framing. Compare fixed-time screenshots; daytime remains a useful regression reference.
2. **One gold shell with reflection:** ascent, deterministic burst/trails, shared reflection state, HDR composite. This is the first visual quality gate before building the full dial. Check camera pan, horizon, offscreen contributors, and reflection breakup.
3. **Interaction and variety:** six presets, radial control, world-space preview, queue and launch. Test touch cancellation, keyboard use, portrait/landscape resize, and repeated bursts.
4. **Audio:** gesture unlock, launch, delayed boom/crackle, spatialization, surf ambience. Verify computed delays, mute, pause/reset, and background-tab recovery; listen on headphones and speakers.
5. **Polish and budgets:** illuminated smoke, wet sand/wash, quality tiers. Profile desktop and mobile; target 60 fps on the development desktop and a stable 30 fps mobile tier, without promising either before measurement.

Keep useful focused automated checks for seeded reproducibility, burst target intersection, pool bounds, and sound arrival calculations. Visual/reflection quality and perceptual audio timing require browser/device checks, not just unit tests. Extend `?t=` with an explicit seed and scripted shell events so a fixed frame can include deterministic fireworks.

Suggested source organization when implementing: retain the existing entry point initially, move shell generation/timeline into `fireworks.js`, rendering/reflection into `fireworks-renderer.js`, sound into `audio.js`, and dial/input into `controls.js`. If using ES modules, serve through local HTTP rather than relying on the current file-open workflow. Avoid a broad water-renderer rewrite before the first reflection quality gate passes.

## Run the existing baseline

From the cloned repository:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/?debug`. For an initial horizon-oriented comparison, try `http://localhost:8000/?debug&pitch=0.08`. No dependency installation is required. This investigation did not execute a browser rendering or performance test.
