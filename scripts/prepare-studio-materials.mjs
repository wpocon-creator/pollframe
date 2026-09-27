// Explicit maintenance command, never part of builds or visitor requests.
// CC0 Poly Haven maps; browser-ready derivatives are self-hosted.
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const assets = { marble: "marble_01", rock: "rock_01", metal: "metal_plate" };
const root = new URL("../public/materials/", import.meta.url);
await mkdir(root, { recursive: true });
const provenance = [];
for (const [kind, id] of Object.entries(assets)) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Metadata ${id}: ${response.status}`);
  const files = await response.json();
  for (const [map, key] of Object.entries({
    color: "Diffuse",
    normal: "nor_gl",
    arm: "arm",
  })) {
    const file = files[key]?.["1k"]?.jpg;
    if (!file || new URL(file.url).hostname !== "dl.polyhaven.org")
      throw new Error(`Missing approved map ${id}/${key}`);
    const response = await fetch(file.url, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Map ${id}/${key}: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (
      buffer.length !== file.size ||
      createHash("md5").update(buffer).digest("hex") !== file.md5
    )
      throw new Error("Asset checksum mismatch");
    // Neutralise albedo hue so the requested party colour stays recognisable.
    // Normal and packed AO/Roughness/Metalness channels remain unmodified.
    let pipeline = sharp(buffer).resize(1024, 1024, { fit: "inside" });
    if (map === "color")
      pipeline = pipeline
        .grayscale()
        .normalise({ lower: 1, upper: 99 })
        .linear(0.55, 110)
        .toColourspace("srgb");
    const output = await pipeline
      .webp({ quality: map === "normal" ? 95 : 90 })
      .toBuffer();
    await writeFile(new URL(`${kind}-${map}.webp`, root), output);
    provenance.push({
      kind,
      map,
      asset: id,
      source: `https://polyhaven.com/a/${id}`,
      download: file.url,
      license: "CC0-1.0",
      originalMd5: file.md5,
      sha256: createHash("sha256").update(output).digest("hex"),
      bytes: output.length,
      changes:
        map === "color"
          ? "1024px WebP; neutral luminance for party-colour tint"
          : "1024px WebP; original channels preserved",
    });
    console.log(`${kind}-${map}: ${Math.round(output.length / 1024)} KiB`);
  }
}
await writeFile(
  new URL("provenance.json", root),
  JSON.stringify(provenance, null, 2) + "\n",
);
