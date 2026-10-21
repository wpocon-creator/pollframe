import { MATCH_PARTIES } from "./party-match-data.js";
import { MATCH_COPY } from "./party-match-copy.js";
import { MATCH_TOPICS } from "./party-match-model.js";
import { MATCH_AXES } from "./party-match-spectrum.js";
import { MATCH_GRAPHICS } from "./party-match-templates.js";
import {
  TOPIC_DIMENSIONS,
  roundScope,
} from "./party-match-topic-definitions.js";
import { localText, text as t } from "./party-match-text.js";
const SHORT_TOPICS = {
  economy: t("Wirtschaft", "Economy", "Economía"),
  society: t("Gesellschaft", "Society", "Sociedad"),
  climate: t("Klima", "Climate", "Clima"),
  security: t("Sicherheit", "Security", "Seguridad"),
  education: t("Bildung", "Education", "Educación"),
};

// Actual data layouts, shared by thumbnails, live previews and PNGs. No external
// resources, HTML, executable markup, or editable numeric inputs are accepted.
export function renderPersonalGraphic(doc, d, { wrapText, escape }) {
  const [width, height] =
    d.format === "portrait"
      ? [1080, 1350]
      : d.format === "wide"
        ? [1600, 1000]
        : [1200, 1200];
  const l = (v) => localText(v, doc.locale),
    c = (k) => l(MATCH_COPY[k]);
  const questionsLabel = (n) =>
    `${n} ${n === 1 ? (doc.locale === "de" ? c("question") : c("question").toLowerCase()) : c("questions")}`;
  const fg = d.background
      ? d.dark
        ? "#ffffff"
        : "#000000"
      : d.dark
        ? "#f3f5f7"
        : "#171b20",
    muted = d.background ? fg : d.dark ? "#bcc7d5" : "#536273",
    bg = d.background || (d.dark ? "#15191f" : "#ffffff"),
    track = d.dark ? "#343d49" : "#e6ebf1",
    panel = d.dark ? "#202733" : "#f0f3f7",
    accent = d.accent;
  const pad = 64,
    inside = width - 2 * pad,
    parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${d.rounding}" fill="${bg}"/>`,
    ];
  const text = (
    s,
    x,
    y,
    size = 24,
    color = fg,
    weight = 400,
    anchor = "start",
  ) =>
    parts.push(
      `<text x="${x}" y="${y}" font-family="${escape(d.font)},sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escape(s)}</text>`,
    );
  const rect = (x, y, w, h, color, rx = 0, extra = "") =>
    parts.push(
      `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${rx}" fill="${color}" ${extra}/>`,
    );
  const line = (x, y, x2, y2, color = track, stroke = 2) =>
    parts.push(
      `<path d="M${x} ${y}L${x2} ${y2}" stroke="${color}" stroke-width="${stroke}" fill="none"/>`,
    );
  const circle = (x, y, r, color, extra = "") =>
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${extra}/>`,
    );
  const label = (
    s,
    x,
    y,
    space,
    size = 24,
    weight = 400,
    color = fg,
    anchor = "start",
    maxLines = 2,
  ) => {
    let actual = size;
    while (
      wrapText(s, space, actual, d.font, weight).length > maxLines &&
      actual > 12
    )
      actual--;
    const rows = wrapText(s, space, actual, d.font, weight);
    rows.forEach((r, i) =>
      text(r, x, y + i * actual * 1.6, actual, color, weight, anchor),
    );
    return rows.length * actual * 1.6;
  };
  const pct = (v) => (v === null ? "—" : `${Math.round(v)}%`);
  const party = (s) => MATCH_PARTIES.find((p) => p.slug === s);
  const color = (s) =>
    s === "union"
      ? d.dark
        ? "#e8edf4"
        : "#20242a"
      : party(s)?.color || accent;
  const name = (s) =>
    s === "greens"
      ? doc.locale === "de"
        ? "Grüne"
        : doc.locale === "es"
          ? "Verdes"
          : "Greens"
      : party(s)?.name || "";
  const fullName = (s) =>
    d.labels === "short" ? name(s) : party(s)?.name || "";
  const graphic = MATCH_GRAPHICS.find((g) => g.id === d.graphic),
    footer = [
      roundScope(doc.round, doc.locale) || c("scope"),
      c("exportSource"),
      d.graphic === "spectrum"
        ? l(
            t(
              "Redaktionelle Antwortskalen · kein validierter Ideologietest",
              "Editorial answer scales · not a validated ideology test",
              "Escalas editoriales · no es un test ideológico validado",
            ),
          )
        : c("exportRange"),
      c("notAdvice"),
      `pollframe.com · ${c("checkDate")}: ${doc.edition.reviewed} · v${doc.edition.version}`,
    ].flatMap((s) => wrapText(s, inside, 19, d.font));
  const footerY = height - pad - footer.length * 32;
  text("POLLFRAME", pad, 66, 24, d.dark ? "#9bbaff" : accent, 700);
  text(`${c("name")} · 2025`, width - pad, 66, 22, muted, 400, "end");
  let titleSize = 44 * d.textScale,
    subSize = 22 * d.textScale;
  const title = d.title || l(graphic.name),
    subtitle = d.subtitle || roundScope(doc.round, doc.locale) || c("scope");
  const noteLines = d.note ? wrapText(d.note, inside, 19, d.font) : [];
  const bottom = footerY - 35 - noteLines.length * 31;
  let titleOrigin = 140,
    compactHeader = false;
  const headerEnd = () => {
    titleOrigin = Math.max(compactHeader ? 110 : 140, 85 + titleSize * 1.1);
    return (
      titleOrigin +
      wrapText(title, inside, titleSize, d.font, 700).length * titleSize * 1.6 +
      wrapText(subtitle, inside, subSize, d.font).length * subSize * 1.6 +
      56
    );
  };
  if (headerEnd() > bottom - 400) compactHeader = true;
  while (headerEnd() > bottom - 400 && (titleSize > 15 || subSize > 13)) {
    titleSize = Math.max(15, titleSize - 1);
    subSize = Math.max(13, subSize - 0.5);
  }
  const titleX =
    d.titleAlign === "middle"
      ? width / 2
      : d.titleAlign === "end"
        ? width - pad
        : pad;
  let y = titleOrigin;
  y += label(title, titleX, y, inside, titleSize, 700, fg, d.titleAlign, 10);
  y +=
    label(subtitle, pad, y + 8, inside, subSize, 400, muted, "start", 10) + 12;
  text(
    `${doc.answered} ${c("countLabel")}${doc.priorities ? ` · ${c("weightedExport")}` : ""}`,
    pad,
    y + 10,
    19,
    muted,
  );
  y += 44;
  const bodyH = bottom - y;
  const chosen = doc.rows.find((r) => r.slug === d.party) || doc.rows[0];
  const noData = () =>
    label(
      l(
        t(
          "Für diese Darstellung fehlen genügend belegte Antworten.",
          "Not enough documented answers for this view.",
          "Faltan respuestas documentadas para esta vista.",
        ),
      ),
      pad,
      y + 60,
      inside,
      26,
      400,
      muted,
    );

  if (d.graphic === "ranking") {
    const rows = doc.rows.slice(0, d.topN),
      n = rows.length;
    if (d.style === "ranking-columns") {
      const cw = inside / n,
        top = y + 60,
        base = bottom - 115,
        h = base - top;
      if (d.grid)
        for (const v of [0, 50, 100]) {
          line(pad, base - (h * v) / 100, width - pad, base - (h * v) / 100);
          text(`${v}%`, pad, base - (h * v) / 100 - 10, 15, muted);
        }
      rows.forEach((r, i) => {
        const cx = pad + cw * (i + 0.5),
          bh = (h * (r.score || 0)) / 100;
        rect(
          cx -
            (cw *
              Math.min(0.75, Math.max(0.22, (0.54 * d.barThickness) / 12))) /
              2,
          base - bh,
          cw * Math.min(0.75, Math.max(0.22, (0.54 * d.barThickness) / 12)),
          bh,
          color(r.slug),
          Math.min(d.rounding, 8),
        );
        text(
          pct(r.score),
          cx,
          base - bh - 18,
          Math.min(28 * d.valueScale, cw * 0.19),
          fg,
          700,
          "middle",
        );
        label(
          name(r.slug),
          cx,
          base + 35,
          cw - 12,
          Math.min(22 * d.labelScale, cw * 0.15),
          700,
          fg,
          "middle",
        );
        text(
          `${r.known}/${doc.answered}`,
          cx,
          bottom - 14,
          17,
          muted,
          400,
          "middle",
        );
      });
    } else if (["ranking-cards", "ranking-rings"].includes(d.style)) {
      const cols = d.format === "wide" ? 3 : 2,
        lines = Math.ceil(n / cols),
        cw = (inside - 20 * (cols - 1)) / cols,
        rh = bodyH / lines;
      rows.forEach((r, i) => {
        const x = pad + (i % cols) * (cw + 20),
          top = y + Math.floor(i / cols) * rh;
        rect(x, top, cw, rh - 14, panel, Math.min(d.rounding, 16));
        if (d.style === "ranking-rings") {
          const radius = Math.min(rh * 0.24, 52),
            cx = x + cw * 0.21,
            cy = top + rh * 0.4;
          circle(
            cx,
            cy,
            radius,
            "none",
            `stroke="${track}" stroke-width="${d.barThickness}"`,
          );
          if (r.score !== null)
            circle(
              cx,
              cy,
              radius,
              "none",
              `stroke="${color(r.slug)}" stroke-width="${d.barThickness}" stroke-dasharray="${(2 * Math.PI * radius * r.score) / 100} ${2 * Math.PI * radius}" transform="rotate(-90 ${cx} ${cy})"`,
            );
          text(
            pct(r.score),
            cx,
            cy + 8,
            Math.min(27 * d.valueScale, radius * 0.58),
            fg,
            700,
            "middle",
          );
          label(
            fullName(r.slug),
            x + cw * 0.43,
            cy - 12,
            cw * 0.52,
            Math.min(25 * d.labelScale, rh * 0.12),
            700,
          );
        } else {
          label(
            `${r.rank ?? "—"}  ${fullName(r.slug)}`,
            x + 22,
            top + rh * 0.2,
            cw - 44,
            Math.min(26 * d.labelScale, rh * 0.12),
            700,
          );
          text(
            pct(r.score),
            x + 22,
            top + rh * 0.6,
            Math.min(44 * d.valueScale, rh * 0.22),
            color(r.slug),
            700,
          );
          rect(
            x + cw * 0.47,
            top + rh * 0.51,
            cw * 0.45,
            Math.min(20, d.barThickness),
            track,
            4,
          );
          rect(
            x + cw * 0.47,
            top + rh * 0.51,
            (cw * 0.45 * (r.score || 0)) / 100,
            Math.min(20, d.barThickness),
            color(r.slug),
            4,
          );
        }
        text(
          `${r.known}/${doc.answered} ${c("coverage")}`,
          x + 22,
          top + rh * 0.88,
          Math.min(16, rh * 0.09),
          muted,
        );
      });
    } else if (d.style === "ranking-podium") {
      const topRows = rows.slice(0, 3),
        ph = bodyH * 0.52,
        cardW = (inside - 40) / 3;
      topRows.forEach((r, i) => {
        const x = pad + i * (cardW + 20);
        rect(x, y, cardW, ph - 18, panel, Math.min(18, d.rounding));
        text(
          String(r.rank ?? "—"),
          x + 24,
          y + ph * 0.12,
          Math.min(26, ph * 0.075),
          muted,
        );
        label(
          fullName(r.slug),
          x + 24,
          y + ph * 0.27,
          cardW - 48,
          Math.min(27 * d.labelScale, cardW * 0.08, ph * 0.1),
          700,
        );
        text(
          pct(r.score),
          x + 24,
          y + ph * 0.62,
          Math.min(58 * d.valueScale, cardW * 0.17, ph * 0.2),
          color(r.slug),
          700,
        );
        text(
          `${r.known}/${doc.answered} ${c("coverage")}`,
          x + 24,
          y + ph * 0.88,
          Math.min(17, ph * 0.08),
          muted,
        );
      });
      const rest = rows.slice(3),
        rh = (bodyH - ph) / Math.max(rest.length, 1);
      rest.forEach((r, i) => {
        const rowY = y + ph + rh * (i + 0.5);
        label(
          `${r.rank ?? "—"}   ${fullName(r.slug)}`,
          pad,
          rowY,
          inside * 0.7,
          Math.min(24 * d.labelScale, rh * 0.35),
          700,
        );
        text(
          `${pct(r.score)} · ${r.known}/${doc.answered}`,
          width - pad,
          rowY,
          22,
          muted,
          400,
          "end",
        );
      });
    } else {
      const rh = bodyH / n;
      rows.forEach((r, i) => {
        const top = y + rh * i,
          trackY = top + rh * 0.65;
        label(
          `${r.rank ?? "—"}  ${fullName(r.slug)}`,
          pad,
          top + rh * 0.29,
          inside * 0.7,
          Math.min(27 * d.labelScale, rh * 0.26),
          700,
        );
        text(
          pct(r.score),
          width - pad,
          top + rh * 0.29,
          Math.min(31 * d.valueScale, rh * 0.34),
          fg,
          700,
          "end",
        );
        line(pad, trackY, width - pad, trackY, track, d.barThickness / 3);
        if (r.score !== null)
          circle(
            pad + (inside * r.score) / 100,
            trackY,
            Math.min(d.pointSize, rh * 0.12),
            color(r.slug),
          );
        text(
          `${r.known}/${doc.answered} ${c("coverage")}`,
          pad,
          top + rh * 0.88,
          Math.min(18, rh * 0.2),
          muted,
        );
      });
    }
  } else if (d.graphic === "topics") {
    const topics = (doc.insights?.topics || [])
      .map((row) => ({
        ...row,
        rows: row.rows.filter((r) => r.known >= 3),
        meta: [...MATCH_TOPICS, ...TOPIC_DIMENSIONS].find(
          (t) => t.id === row.id,
        ),
        value: row.rows.find((r) => r.slug === chosen.slug && r.known >= 3),
      }))
      .filter((t) =>
        d.style === "topics-matrix" ? t.rows.length > 0 : t.value,
      );
    if (
      !(d.style === "topics-matrix"
        ? topics.length
        : topics.some((t) => t.value))
    )
      noData();
    else if (d.style === "topics-matrix") {
      const labelW = inside * 0.25,
        cw = (inside - labelW) / 7,
        rh = (bodyH - 75) / topics.length;
      doc.rows.forEach((r, i) =>
        label(
          name(r.slug),
          pad + labelW + cw * (i + 0.5),
          y + 23,
          cw - 8,
          Math.min(18 * d.labelScale, cw * 0.2),
          700,
          fg,
          "middle",
        ),
      );
      topics.forEach((t, j) => {
        const top = y + 75 + rh * j;
        label(
          l(t.meta.label),
          pad,
          top + rh * 0.4,
          labelW - 20,
          Math.min(21 * d.labelScale, rh * 0.2),
          600,
        );
        doc.rows.forEach((r, i) => {
          const x = pad + labelW + cw * i,
            v = t.rows.find((p) => p.slug === r.slug);
          rect(x + 4, top + 5, cw - 8, rh - 12, panel, Math.min(d.rounding, 8));
          if (v)
            rect(
              x + 4,
              top + 5,
              cw - 8,
              rh - 12,
              accent,
              Math.min(d.rounding, 8),
              `opacity="${0.07 + (0.3 * v.score) / 100}"`,
            );
          text(
            pct(v?.score ?? null),
            x + cw / 2,
            top + rh * 0.42,
            Math.min(23 * d.valueScale, cw * 0.2, rh * 0.2),
            fg,
            700,
            "middle",
          );
          text(
            v ? questionsLabel(v.known) : "—",
            x + cw / 2,
            top + rh * 0.82,
            Math.min(16, cw * 0.15, rh * 0.12),
            muted,
            400,
            "middle",
          );
        });
      });
    } else if (d.style === "topics-radar") {
      const shown = topics.filter((t) => t.value),
        cx = width / 2,
        cy = y + bodyH * 0.48,
        r = Math.min(inside * 0.3, bodyH * 0.3),
        n = shown.length;
      if (n < 3) noData();
      else {
        for (const fraction of [0.5, 1]) {
          const points = shown
            .map(
              (_, i) =>
                `${cx + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * fraction},${cy + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * fraction}`,
            )
            .join(" ");
          parts.push(
            `<polygon points="${points}" fill="none" stroke="${track}" stroke-width="2"/>`,
          );
        }
        const points = shown
          .map((t, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n,
              ex = cx + Math.cos(angle) * r,
              ey = cy + Math.sin(angle) * r;
            line(cx, cy, ex, ey);
            label(
              `${l(SHORT_TOPICS[t.id] || t.meta.label)} · ${Math.round(t.value.score)}%`,
              cx + Math.cos(angle) * (r + 45),
              cy + Math.sin(angle) * (r + 40),
              Math.min(230, inside * 0.24),
              Math.min(18 * d.labelScale, 18),
              600,
              fg,
              "middle",
              1,
            );
            return `${cx + (Math.cos(angle) * r * t.value.score) / 100},${cy + (Math.sin(angle) * r * t.value.score) / 100}`;
          })
          .join(" ");
        parts.push(
          `<polygon points="${points}" fill="${color(chosen.slug)}" fill-opacity=".18" stroke="${color(chosen.slug)}" stroke-width="4"/>`,
        );
        label(
          fullName(chosen.slug),
          width / 2,
          bottom - 15,
          inside,
          23,
          700,
          fg,
          "middle",
        );
      }
    } else if (d.style === "topics-cards") {
      const cols = 2,
        cw = (inside - 20) / cols,
        rh = bodyH / Math.ceil(topics.length / cols);
      topics.forEach((t, i) => {
        const x = pad + (i % cols) * (cw + 20),
          top = y + Math.floor(i / cols) * rh;
        rect(x, top, cw, rh - 16, panel, Math.min(d.rounding, 16));
        label(
          l(t.meta.label),
          x + 24,
          top + rh * 0.23,
          cw - 48,
          Math.min(24 * d.labelScale, rh * 0.13),
          700,
        );
        text(
          pct(t.value?.score ?? null),
          x + 24,
          top + rh * 0.59,
          Math.min(46 * d.valueScale, rh * 0.22),
          accent,
          700,
        );
        text(
          `${name(chosen.slug)} · ${questionsLabel(t.value?.known || 0)}`,
          x + 24,
          top + rh * 0.87,
          Math.min(18, rh * 0.1),
          muted,
        );
      });
    } else {
      text(fullName(chosen.slug), pad, y + 20, 24, fg, 700);
      const rh = (bodyH - 55) / topics.length;
      topics.forEach((t, i) => {
        const top = y + 55 + i * rh;
        label(
          l(t.meta.label),
          pad,
          top + rh * 0.25,
          inside * 0.7,
          Math.min(26 * d.labelScale, rh * 0.24),
          600,
        );
        text(
          pct(t.value?.score ?? null),
          width - pad,
          top + rh * 0.25,
          Math.min(30 * d.valueScale, rh * 0.3),
          fg,
          700,
          "end",
        );
        rect(
          pad,
          top + rh * 0.5,
          inside,
          Math.min(d.barThickness, rh * 0.12),
          track,
          4,
        );
        if (t.value)
          rect(
            pad,
            top + rh * 0.5,
            (inside * t.value.score) / 100,
            Math.min(d.barThickness, rh * 0.12),
            accent,
            4,
          );
        text(
          questionsLabel(t.value?.known || 0),
          pad,
          top + rh * 0.84,
          Math.min(18, rh * 0.16),
          muted,
        );
      });
    }
  } else if (d.graphic === "spectrum") {
    const profile = doc.insights?.profiles.find(
        (p) => p.party === (d.party === "none" ? null : d.party),
      ),
      axes = profile?.axes.map((a) =>
        a.count >= 3 ? a : { ...a, user: null, partyScore: null },
      );
    const you = l(t("Du", "You", "Tú"));
    if (!axes) noData();
    else if (d.style === "spectrum-plane") {
      const plot = Math.min(inside * 0.57, bodyH - 120),
        x = pad + 30,
        top = y + 35,
        ax = axes.find((a) => a.id === d.spectrumX),
        ay = axes.find((a) => a.id === d.spectrumY),
        horizontal = MATCH_AXES.find((a) => a.id === d.spectrumX),
        vertical = MATCH_AXES.find((a) => a.id === d.spectrumY);
      const enough = ax.user !== null && ay.user !== null;
      if (enough) rect(x, top, plot, plot, panel, Math.min(d.rounding, 12));
      if (enough && d.grid) {
        line(x + plot / 2, top, x + plot / 2, top + plot);
        line(x, top + plot / 2, x + plot, top + plot / 2);
      }
      text(l(vertical.high), x, top - 14, 17, muted);
      text(l(vertical.low), x, top + plot + 27, 17, muted);
      text(l(horizontal.low), x, top + plot + 65, 17, muted);
      text(
        l(horizontal.high),
        x + plot,
        top + plot + 65,
        17,
        muted,
        400,
        "end",
      );
      if (ax.user !== null && ay.user !== null) {
        if (profile.party)
          circle(
            x + plot * (0.08 + (0.84 * ax.partyScore) / 100),
            top + plot * (0.92 - (0.84 * ay.partyScore) / 100),
            d.pointSize + 6,
            color(profile.party),
            `stroke="${bg}" stroke-width="3"`,
          );
        const ux = x + plot * (0.08 + (0.84 * ax.user) / 100),
          uy = top + plot * (0.92 - (0.84 * ay.user) / 100);
        rect(
          ux - d.pointSize,
          uy - d.pointSize,
          d.pointSize * 2,
          d.pointSize * 2,
          accent,
          2,
          `stroke="${bg}" stroke-width="3"`,
        );
      } else
        label(
          l(
            t(
              "Mindestens drei Antworten je Dimension nötig",
              "At least three answers per dimension needed",
              "Se requieren tres respuestas por dimensión",
            ),
          ),
          x + 20,
          top + plot / 2,
          plot - 40,
          20,
          400,
          muted,
        );
      const side = x + plot + 50,
        available = width - pad - side;
      label(you, side, top + 30, available, 27, 700, accent);
      if (profile.party)
        label(
          fullName(profile.party),
          side,
          top + 85,
          available,
          21,
          700,
          color(profile.party),
        );
      axes.forEach((a, i) => {
        const sy = top + 150 + (i * (bodyH - 200)) / 3;
        label(
          `${l(MATCH_AXES[i].name)} · ${questionsLabel(a.count)}`,
          side,
          sy,
          available,
          17,
          700,
        );
        text(
          a.user === null ? "—" : `${Math.round(a.user)} / 100`,
          side,
          sy + 34,
          20,
          muted,
        );
      });
    } else {
      const selected =
        d.style === "spectrum-profile"
          ? [
              axes.find((a) => a.id === d.spectrumX),
              axes.find((a) => a.id === d.spectrumY),
            ]
          : axes;
      const rh = bodyH / selected.length;
      selected.forEach((a, i) => {
        const top = y + i * rh,
          meta = MATCH_AXES.find((m) => m.id === a.id),
          inset = d.style === "spectrum-profile" ? 24 : 0;
        if (inset)
          rect(pad, top, inside, rh - 14, panel, Math.min(d.rounding, 16));
        label(
          l(meta.name),
          pad + inset,
          top + rh * 0.19,
          inside * 0.65,
          Math.min(28 * d.labelScale, rh * 0.15),
          700,
        );
        text(
          questionsLabel(a.count),
          width - pad - inset,
          top + rh * 0.19,
          17,
          muted,
          400,
          "end",
        );
        const x = pad + inset,
          w = inside - inset * 2,
          ty = top + rh * 0.47;
        if (a.user === null) {
          label(
            l(
              t(
                "Mindestens drei Antworten nötig",
                "At least three answers needed",
                "Se requieren al menos tres respuestas",
              ),
            ),
            x,
            ty,
            w,
            21,
            400,
            muted,
          );
          return;
        }
        if (d.style === "spectrum-profile") {
          label(
            l(meta.low),
            x,
            top + rh * 0.33,
            w * 0.45,
            Math.min(18, rh * 0.1),
            400,
            muted,
          );
          label(
            l(meta.high),
            x + w,
            top + rh * 0.33,
            w * 0.45,
            Math.min(18, rh * 0.1),
            400,
            muted,
            "end",
          );
          const rows = [
            { label: you, value: a.user, color: accent, user: true },
            ...(profile.party
              ? [
                  {
                    label: name(profile.party),
                    value: a.partyScore,
                    color: color(profile.party),
                    user: false,
                  },
                ]
              : []),
          ];
          rows.forEach((row, index) => {
            const ry = top + rh * (index === 0 ? 0.55 : 0.83);
            text(row.label, x, ry - 18, 17, fg, 600);
            line(x, ry, x + w, ry, track, Math.min(8, d.barThickness / 2));
            line(x + w / 2, ry - 6, x + w / 2, ry + 6, muted, 1);
            const px = x + (w * row.value) / 100;
            if (row.user)
              circle(
                px,
                ry,
                d.pointSize,
                row.color,
                `stroke="${bg}" stroke-width="2"`,
              );
            else
              parts.push(
                `<path d="M${px} ${ry - d.pointSize}L${px + d.pointSize} ${ry}L${px} ${ry + d.pointSize}L${px - d.pointSize} ${ry}Z" fill="${row.color}" stroke="${bg}" stroke-width="2"/>`,
              );
          });
          return;
        }
        line(x, ty, x + w, ty, track, d.barThickness / 2);
        if (a.user !== null) {
          if (profile.party)
            circle(
              x + (w * a.partyScore) / 100,
              ty,
              d.pointSize + 6,
              color(profile.party),
            );
          rect(
            x + (w * a.user) / 100 - d.pointSize,
            ty - d.pointSize,
            d.pointSize * 2,
            d.pointSize * 2,
            accent,
            2,
            `stroke="${bg}" stroke-width="2"`,
          );
        }
        label(
          l(meta.low),
          x,
          top + rh * 0.69,
          w * 0.44,
          Math.min(17, rh * 0.11),
          400,
          muted,
        );
        label(
          l(meta.high),
          x + w,
          top + rh * 0.69,
          w * 0.44,
          Math.min(17, rh * 0.11),
          400,
          muted,
          "end",
        );
        text(
          `${you}: ${a.user === null ? "—" : Math.round(a.user)}${profile.party ? ` · ${name(profile.party)}: ${a.partyScore === null ? "—" : Math.round(a.partyScore)}` : ""}`,
          x,
          top + rh * 0.95,
          19,
          fg,
          600,
        );
      });
    }
  } else if (d.graphic === "duel") {
    const first = chosen.slug,
      second =
        d.other !== first
          ? d.other
          : doc.rows.find((r) => r.slug !== first).slug;
    const pair = doc.insights?.pairs.find(
      (p) =>
        [p.first, p.second].includes(first) &&
        [p.first, p.second].includes(second),
    );
    if (!pair || pair.firstScore === null) noData();
    else {
      const values = [
        {
          slug: first,
          score: pair.first === first ? pair.firstScore : pair.secondScore,
        },
        {
          slug: second,
          score: pair.first === second ? pair.firstScore : pair.secondScore,
        },
      ];
      text(
        `${pair.count} ${c("questions")} · ${l(t("gleiche Berechnungsgrundlage", "same evidence base", "misma base de cálculo"))}`,
        pad,
        y + 20,
        22,
        muted,
      );
      const top = y + 65,
        h = bodyH - 65;
      if (d.style === "duel-cards")
        values.forEach((v, i) => {
          const cw = (inside - 24) / 2,
            x = pad + i * (cw + 24);
          rect(x, top, cw, h - 10, panel, Math.min(d.rounding, 20));
          label(
            fullName(v.slug),
            x + 30,
            top + h * 0.18,
            cw - 60,
            Math.min(36 * d.labelScale, cw * 0.08, h * 0.065),
            700,
          );
          text(
            pct(v.score),
            x + 30,
            top + h * 0.65,
            Math.min(100 * d.valueScale, cw * 0.24, h * 0.22),
            color(v.slug),
            700,
          );
          rect(x + 30, top + h * 0.76, cw - 60, d.barThickness, track, 6);
          rect(
            x + 30,
            top + h * 0.76,
            ((cw - 60) * v.score) / 100,
            d.barThickness,
            color(v.slug),
            6,
          );
        });
      else if (d.style === "duel-bridge") {
        const ly = top + h * 0.5;
        line(pad, ly, width - pad, ly, track, 5);
        if (d.grid)
          for (const n of [0, 50, 100])
            text(
              `${n}%`,
              pad + (inside * n) / 100,
              ly + 40,
              18,
              muted,
              400,
              n === 0 ? "start" : n === 100 ? "end" : "middle",
            );
        values.forEach((v, i) => {
          const x = pad + (inside * v.score) / 100;
          circle(x, ly, d.pointSize + 3, color(v.slug));
          const labelY = i ? ly + h * 0.34 : ly - h * 0.28;
          line(x, ly, x, labelY + (i ? -30 : 20), color(v.slug), 3);
          label(
            `${fullName(v.slug)} · ${pct(v.score)}`,
            i ? width - pad : pad,
            labelY,
            inside * 0.8,
            Math.min(32 * d.labelScale, 34),
            700,
            color(v.slug),
            i ? "end" : "start",
          );
        });
      } else
        values.forEach((v, i) => {
          const rh = h / 2,
            ty = top + i * rh;
          label(
            fullName(v.slug),
            pad,
            ty + rh * 0.27,
            inside * 0.7,
            Math.min(34 * d.labelScale, rh * 0.17),
            700,
          );
          text(
            pct(v.score),
            width - pad,
            ty + rh * 0.27,
            Math.min(56 * d.valueScale, rh * 0.23),
            color(v.slug),
            700,
            "end",
          );
          rect(pad, ty + rh * 0.55, inside, d.barThickness, track, 6);
          rect(
            pad,
            ty + rh * 0.55,
            (inside * v.score) / 100,
            d.barThickness,
            color(v.slug),
            6,
          );
        });
    }
  }
  noteLines.forEach((s, i) => text(s, pad, bottom + 30 + i * 31, 19, muted));
  line(pad, footerY - 22, width - pad, footerY - 22);
  footer.forEach((s, i) => text(s, pad, footerY + i * 32, 19, muted));
  parts.push("</svg>");
  return { svg: parts.join(""), width, height };
}
