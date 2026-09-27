import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const probe =
  process.env.FFPROBE || "/tmp/pollframe-video-tools/usr/bin/ffprobe";
const ff = process.env.FFMPEG || "/tmp/pollframe-video-tools/usr/bin/ffmpeg";
for (const [name, language] of [
  ["pollframe-studio.mp4", "eng"],
]) {
  test(
    `${language} narration has one centred audio track, matched duration and no clipped or delayed stereo voice`,
    { skip: !existsSync(probe) || !existsSync(ff) },
    () => {
      const file = new URL(
        "../public/media/studio-guide/" + name,
        import.meta.url,
      ).pathname;
      const result = spawnSync(
        probe,
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stderr);
      const data = JSON.parse(result.stdout),
        audio = data.streams.filter((s) => s.codec_type === "audio"),
        video = data.streams.filter((s) => s.codec_type === "video");
      assert.equal(audio.length, 1);
      assert.equal(video.length, 1);
      assert.equal(
        audio[0].channels,
        1,
        "One encoded mono track, played centred; not two displaced voices",
      );
      assert.equal(audio[0].tags.language, language);
      assert.equal(audio[0].sample_rate, "48000");
      assert.ok(
        Math.abs(Number(audio[0].duration) - Number(video[0].duration)) < 0.06,
      );
      assert.equal(video[0].width, 1920);
      assert.equal(video[0].height, 1080);
      for (const start of [0, 28, Number(data.format.duration) - 10]) {
        const decoded = spawnSync(
          ff,
          [
            "-v",
            "error",
            "-ss",
            String(start),
            "-i",
            file,
            "-t",
            "10",
            "-vn",
            "-ac",
            "2",
            "-ar",
            "24000",
            "-f",
            "f32le",
            "pipe:1",
          ],
          { maxBuffer: 3e6 },
        );
        assert.equal(decoded.status, 0, decoded.stderr.toString());
        let energy = 0,
          peak = 0;
        for (let i = 0; i + 8 <= decoded.stdout.length; i += 8) {
          const a = decoded.stdout.readFloatLE(i),
            b = decoded.stdout.readFloatLE(i + 4);
          assert.ok(
            Math.abs(a - b) < 1e-7,
            "L/R identical, including intro/outro",
          );
          energy += a * a;
          peak = Math.max(peak, Math.abs(a));
        }
        assert.ok(energy > 1, "Not silent");
        assert.ok(peak < 0.9, "No clipped peaks");
      }
    },
  );
}
test("the single English master has captions in all three languages", () => {
  for (const audio of ["en"])
    for (const language of ["en", "de", "es"]) {
      const file = readFileSync(
        new URL(
          `../public/media/studio-guide/${language}-on-${audio}.vtt`,
          import.meta.url,
        ),
        "utf8",
      );
      assert.ok(file.startsWith("WEBVTT"));
      const cues=[...file.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/g)];
      assert.ok(cues.length >= 25, 'Complete narration captions, not a fixed number of old cuts');
      for(const cue of cues)assert.ok(cue[2]>cue[1], 'Every caption has a positive duration');
    }
  const player=readFileSync(new URL('../src/studio-guide-player.jsx',import.meta.url),'utf8');
  assert.ok(player.includes('const audioLanguage = "en"'));
  assert.ok(!player.includes('audio2'), 'Do not load an obsolete audio cut');
});
