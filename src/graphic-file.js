// All conversions happen on-device. PDF is a single, tightly cropped page;
// image-based SVG is explicitly labelled by the UI, not sold as editable vector.
const bytes = (text) => new TextEncoder().encode(text);
const join = (chunks) => {
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    result.set(chunk, at);
    at += chunk.length;
  }
  return result;
};

export function jpegPdf(jpeg, width, height) {
  if (
    !(jpeg instanceof Uint8Array) ||
    jpeg[0] !== 0xff ||
    jpeg[1] !== 0xd8 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > 20000 ||
    height > 20000
  )
    throw Error("Invalid PDF image");
  const pageWidth = 720,
    pageHeight = +((720 * height) / width).toFixed(3);
  const content = bytes(`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Image Do Q`);
  const objects = [
    bytes("<< /Type /Catalog /Pages 2 0 R >>"),
    bytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    bytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Image 4 0 R >> >> /Contents 5 0 R >>`,
    ),
    join([
      bytes(
        `<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      bytes("\nendstream"),
    ]),
    join([
      bytes(`<< /Length ${content.length} >>\nstream\n`),
      content,
      bytes("\nendstream"),
    ]),
  ];
  const chunks = [bytes("%PDF-1.4\n%Pollframe\n")],
    offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = join([
      bytes(`${index + 1} 0 obj\n`),
      object,
      bytes("\nendobj\n"),
    ]);
    chunks.push(chunk);
    length += chunk.length;
  });
  chunks.push(
    bytes(
      `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
        .join(
          "",
        )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
    ),
  );
  return new Blob(chunks, { type: "application/pdf" });
}

const dataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
export async function graphicFile(rendered, type, vectorSvg) {
  if (type === "png") return rendered;
  if (!["svg", "pdf"].includes(type)) throw Error("Unsupported graphic file");
  const filename = rendered.filename.replace(/\.png$/i, `.${type}`);
  if (type === "svg" && vectorSvg)
    return {
      ...rendered,
      filename,
      blob: new Blob([vectorSvg], { type: "image/svg+xml" }),
    };
  const url = URL.createObjectURL(rendered.blob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (!width || !height) throw Error("Empty graphic");
    if (type === "svg") {
      const png = await dataUrl(rendered.blob);
      return {
        ...rendered,
        filename,
        blob: new Blob(
          [
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Pollframe — image-based SVG</title><image width="${width}" height="${height}" href="${png}"/></svg>`,
          ],
          { type: "image/svg+xml" },
        ),
      };
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);
    const jpeg = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(Error("PDF image failed"))),
        "image/jpeg",
        0.98,
      ),
    );
    return {
      ...rendered,
      filename,
      blob: jpegPdf(new Uint8Array(await jpeg.arrayBuffer()), width, height),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
