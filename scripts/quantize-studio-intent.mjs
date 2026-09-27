// Offline, deterministic post-training quantization. No provider, network,
// visitor data or new training. Emits JSON; review before replacing the asset.
import fs from "node:fs";
const model = JSON.parse(
  fs.readFileSync(
    new URL("../src/studio-intent-model.json", import.meta.url),
    "utf8",
  ),
);
for (const key of ["w1", "w2"]) {
  const part = model[key],
    values = [...Buffer.from(part.data, "base64")].map(
      (n) => (n - 128) * part.scale,
    );
  const scale = Math.max(...values.map(Math.abs)) / 7,
    bytes = Buffer.alloc(Math.ceil(values.length / 2));
  values.forEach(
    (n, i) => (bytes[i >> 1] |= (Math.round(n / scale) + 7) << (4 * (i % 2))),
  );
  model[key] = { scale, length: values.length, data: bytes.toString("base64") };
}
model.quantization = "int4";
console.log(JSON.stringify(model));
