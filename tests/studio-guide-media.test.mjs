import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const folder = new URL("../public/media/studio-guide/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("../src/studio-guide-content.json", import.meta.url)),
);

function atoms(bytes, start = 0, end = bytes.length) {
  const result=[];
  for(let at=start; at+8<=end;) {
    const size=bytes.readUInt32BE(at);
    assert.ok(size>=8 && at+size<=end, 'Complete bounded MP4 atom');
    result.push({type:bytes.toString('ascii',at+4,at+8),body:at+8,end:at+size});
    at+=size;
  }
  return result;
}
test('animation and screen recordings retain one declared frame rate after joining', async()=>{
  const file=await readFile(new URL('pollframe-studio.mp4',folder));
  const children=a=>atoms(file,a.body,a.end);
  const movie=atoms(file).find(a=>a.type==='moov');
  const tracks=children(movie).filter(a=>a.type==='trak');
  const video=tracks.map(t=>children(t).find(a=>a.type==='mdia')).find(m=>{
    const handler=children(m).find(a=>a.type==='hdlr');
    return file.toString('ascii',handler.body+8,handler.body+12)==='vide';
  });
  const mdhd=children(video).find(a=>a.type==='mdhd');
  const scale=file.readUInt32BE(mdhd.body+(file[mdhd.body]===1?20:12));
  const minf=children(video).find(a=>a.type==='minf');
  const stbl=children(minf).find(a=>a.type==='stbl');
  const stts=children(stbl).find(a=>a.type==='stts');
  const entries=file.readUInt32BE(stts.body+4);let frames=0;
  for(let i=0;i<entries;i++) {
    const count=file.readUInt32BE(stts.body+8+i*8),delta=file.readUInt32BE(stts.body+12+i*8);
    assert.ok(Math.abs(delta/scale-1/(manifest.fps || 30))<.000001,'Mixed timescales would scramble chapter pictures');
    frames+=count;
  }
  assert.ok(Math.abs(frames/(manifest.fps || 30)-manifest.duration)<.04);
});
test("tutorial is a complete, bounded, fast-start MP4 with real chapters", async () => {
  const file = await readFile(new URL("pollframe-studio.mp4", folder));
  assert.ok(file.length > 1000000);
  assert.ok(
    file.length < 24 * 1024 * 1024,
    "Keep below Cloudflare per-file limit",
  );
  const boxes = [];
  for (let at = 0; at + 8 <= file.length; ) {
    const size = file.readUInt32BE(at);
    assert.ok(size >= 8 && at + size <= file.length, "Complete MP4 box");
    boxes.push(file.toString("ascii", at + 4, at + 8));
    at += size;
  }
  assert.equal(boxes[0], "ftyp");
  assert.ok(
    boxes.indexOf("moov") < boxes.indexOf("mdat"),
    "Metadata precedes video for fast start",
  );
  assert.ok(file.includes(Buffer.from("avc1")));
  assert.ok(file.includes(Buffer.from("mp4a")));
  assert.ok(
    manifest.duration >= 100 && manifest.duration <= 180,
    "Concise complete tutorial",
  );
  assert.equal(manifest.scenes.length, 8);
  for (const [i, scene] of manifest.scenes.entries()) {
    assert.ok(scene.duration > 0);
    assert.equal(
      i ? scene.start > manifest.scenes[i - 1].start : scene.start === 0,
      true,
    );
    for (const lang of ["de", "en", "es"])
      assert.ok(scene.transcript[lang].length > 40);
  }
});
test("all subtitle languages have ordered, bounded, readable cues", async () => {
  const seconds = (value) =>
    value
      .split(":")
      .map(Number)
      .reduce((n, x) => n * 60 + x, 0);
  for (const lang of ["de", "en", "es"]) {
    const content = await readFile(new URL(lang + ".vtt", folder), "utf8");
    assert.ok(content.startsWith("WEBVTT\n"));
    const blocks = content.trim().split("\n\n").slice(1);
    assert.ok(blocks.length >= manifest.scenes.length);
    const normalize = text => text.replace(/\s+/g, " ").trim();
    assert.equal(
      normalize(blocks.map(block => block.split("\n").slice(1).join(" ")).join(" ")),
      normalize(manifest.scenes.map(scene => scene.transcript[lang]).join(" ")),
      "Captions contain the complete transcript, with no missing or repeated passage",
    );
    let previous = 0;
    for (const block of blocks) {
      const [time, ...lines] = block.split("\n");
      const [from, to] = time.split(" --> ").map(seconds);
      assert.ok(from >= previous - 0.001 && to > from);
      assert.ok(to < manifest.duration + 0.2);
      assert.ok(lines.length <= 2, "No subtitle wall of text");
      assert.ok(lines.every((line) => line.length <= 56));
      previous = to;
    }
  }
});
