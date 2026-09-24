# Hanabi Hansha

Nighttime fireworks and synchronized drone shows reflected on Clearwater's water, with the original daytime view preserved.

**[Open Hanabi Hansha](https://kai-denrei.github.io/hanabi-hansha/)** · installable mobile PWA

- Touch the moon or sun to switch between night and day.
- Touch the etched bloom beneath the foreground water to open the submerged radial. Choose a type, then tap the sky for a small shell or hold up to two seconds for a larger bloom. Drag to look around; holding/releasing Space charges and launches ahead.
- The underwater gear holds sound/volume, gentler effects, and credits: original water by Aurélien / Lumaris; fireworks by Kai Denrei.
- Touch the underwater **drone icon** for a synchronized show: hovering sphere, flapping bird, rotating cube, double helix, beating heart, Saturn rings, kaleidoscope flower, and UFO landing. The fleet morphs between animated formations with coordinated colors and subtle hovering. Choose Prism/Aurora/Ember colors, three paces, and whether to repeat; the default cycle lasts about two minutes. Japanese text, emojis, and line breaks lead the show and return every third formation, with two different preset shapes between appearances. Choose a starting shape, then use Start drone show; an empty message runs the eight presets alone. **Land drones** ends the show with a descent.
- Start an auto show from the dial center or gear. Choose Golden tide (60 s), Summer festival (90 s), or Quiet embers (45 s). Each moves through varied solos and combinations into a grand finale, followed by fading gold embers. Stop prevents new launches while existing shells finish. Hiding the tab stops the show and clears pending sound.
- Sound starts after interaction. Launch feedback is immediate; the boom arrives after a distance-based delay. Audio is synthesized with softened launch thumps, low burst pressure, filtered crackles/sizzle, restrained whistles, and rolling bass tails.

Serve locally with `python3 -m http.server 8001 --bind 127.0.0.1`, then open `http://localhost:8001/`.
Use `?day=1` for daytime or `?demo&t=4.2&noglare` for a deterministic night/firework still.
Run simulation checks with `node --test tests/*.test.cjs`.

The added `fireworks.js`, `drones.js`, `audio.js`, `experience.js`, and `experience.css` keep the project dependency-free. Reflections use a distant radiance atlas sampled through the water's wave normals; they approximate finite-distance parallax. Manual launches and deterministic automatic sequences share a bounded 16-shell pool. The underwater dial is a canvas texture sampled through the water shader’s refraction, with matching projected keyboard/touch hit areas. Smoke, beach surf, and recorded ambience are future work.

Original project and credits follow.

## Clearwater

Real-time, photoreal shallow water in a single HTML file. WebGL2, no libraries, no build step, no external assets.

**[Live demo](https://aureliengmz.github.io/clearwater/)** · drag to look around · tap the water

![Clearwater](media/landscape.png)

## Run

Open `index.html` in a browser, from disk or any static host. Nothing to install.

Needs WebGL2 with float render targets (`EXT_color_buffer_float`). Resolution adapts to keep the frame rate up.

| URL option | Effect |
| --- | --- |
| `?debug` | Frame rate, resolution, quality level |
| `?noglare` | Disable lens-diffraction glare |
| `?t=5` | Freeze time at 5 s (screenshots) |
| `?yaw=0.5&pitch=-0.4` | Initial camera direction, radians |
| `?view=caus` | Show the raw caustics texture |

## Code map

Everything lives in `index.html`, in sections marked `/* ---- Name ---- */`:

| Section | What to tweak |
| --- | --- |
| Ocean spectrum (FFT) | `L` patch size, `DEPTH`, `TARGET_SLOPE` wave steepness |
| Interactive ripples | `RN`, `RSIZE` simulation grid |
| Caustics | `G` ray grid, `C` caustics resolution, `IORS` per-channel refraction |
| Main water shader | Fresnel, absorption, seabed shading (GLSL) |
| Post / Lens diffraction glare | Bloom, glare, tone curve, grain |
| Camera & input | `SUN_EL`, `SUN_AZ` sun position, `VFOV` |
| Loop | Frame loop, adaptive quality |

The seabed texture is base64 in `<script id="pebbles-texture">` at the end of the file. To regenerate it: `python tools/make_pebbles.py` (numpy, scipy, pillow), then paste the base64 JPEG into that block.

## References

- Jerry Tessendorf, *Simulating Ocean Water*: FFT waves
- Evan Wallace, *WebGL Water*: refracted-grid caustics
- Inigo Quilez, *Texture repetition*: seabed tiling
- Marc Olano & Dan Baker, *LEAN Mapping*: distant highlights

## Credits

<a href="https://x.com/Aurelien_Gz"><img src="media/aurelien.jpg" width="20" height="20" alt=""></a> Made by [Aurélien](https://x.com/Aurelien_Gz) at
<a href="https://lumaris.works"><picture><source media="(prefers-color-scheme: dark)" srcset="media/lumaris-dark.svg"><img src="media/lumaris-light.svg" width="14" height="14" alt=""></picture></a> [Lumaris](https://lumaris.works).

MIT License, see [LICENSE](LICENSE).


## Mobile and installation

Hanabi includes a standalone web app manifest, home-screen icons, and a service worker that caches the full scene for offline use after the first successful online visit. On supporting Android browsers, open the underwater gear and choose **Install Hanabi**; on iPhone/iPad, use **Share → Add to Home Screen**. Production hosting must use HTTPS (localhost also works for development). Plain HTTP over a LAN is only suitable for previewing, not installation.

Phone rendering caps device pixel ratio at 1.75 and the main render target at 1.1 million pixels, with adaptive resolution. It uses smaller caustics and reflection targets and omits FFT lens diffraction while retaining water, reflections, bloom, and the full fireworks/drone effects. Rendering pauses in the background. Portrait and landscape are supported, with safe-area spacing and compact, single-page panels (side-by-side controls on short landscape screens). Physical device performance still depends on its GPU and WebGL2 float-render-target support.

Serve the repository as a static site; no build is needed. The service worker uses network-first requests so online development changes stay fresh. When changing the offline asset list, increment the cache version in `sw.js`. Mobile interaction and offline checks were performed in Chromium phone emulation; iOS installation and actual device frame rates require hardware verification.


## Publishing

GitHub Pages serves the root of the `main` branch. Push to `main` to publish changes; `.nojekyll` keeps the app as plain static files. All app paths are relative so the manifest, service worker, and assets work under `/hanabi-hansha/`.
