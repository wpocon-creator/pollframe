# Studio material maps

Real PBR textures from Poly Haven, CC0: https://docs.polyhaven.com/en/faq

- Marble: https://polyhaven.com/a/marble_01
- Rock: https://polyhaven.com/a/rock_01
- Metal: https://polyhaven.com/a/metal_plate

Each source offers Blender-compatible original texture sets. Our local 1024px WebP derivatives use:

- `color`: diffuse/albedo converted to neutral luminance and tinted by party colour in the renderer.
- `normal`: OpenGL normal map (linear, not sRGB).
- `arm`: packed ambient occlusion (R), roughness (G), metalness (B), linear.

No displacement: bar silhouettes/heights must continue to encode the numerical values precisely. No procedural imitation is substituted if downloads/rendering fail. See provenance.json for original downloads, checksums and transformations. Recreate explicitly with `node scripts/prepare-studio-materials.mjs`; normal builds need no network. No visitor request goes to Poly Haven. Approximately 2.4 MiB total; only the selected material's three maps are loaded.
