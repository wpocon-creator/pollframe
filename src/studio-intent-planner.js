import { foldIntent } from "./studio-intent-features.js";
import {
  commandText,
  numericText,
  commandDates,
} from "./studio-intent-language.js";
import { STUDIO_FONTS } from "./studio-fonts.js";
import { STUDIO_TEMPLATES } from "./studio-model.js";
import { EDIT_BAR_DESIGNS } from "./studio-edit-model.js";
import { validateAssistantPlan } from "./studio-assistant-contract.js";

const filler = new Set(
  "bitte ich mochte gerne gern mal ein eine einen einer der die das den dem des es diese dieses dieser mein meine meinen nur jetzt noch etwas bisschen ganz mehr weniger sehr so dazu genau fur zum zur im in an am auf als mit von vom seit bis zu nach ohne alle auch dann und oder aber nicht kein keine keinen sondern kannst du mir machen mach mache zeig zeige zeigen nehme nimm setze setzen andern andere and please i would like want a an the this that it my me to for of in on with from since until just now slightly more less bit very and or but do not dont change make set show give use please could you can add keep leave as into at selected quiero por favor una un el la los las de del al en con para por desde hasta solo ahora mas menos poco muy y o pero no sin cambiar cambia poner pon mostrar muestra haz hacer usa usar grafica grafico grafik graph chart diagramm design designen layout look stelle stellen soll sollte sollst schone schon nice cool coole cooler coolen help its their unsere unseren deiner deinem dein".split(
    " ",
  ),
);
const timeline = (t) =>
  ["history", "party"].includes(t?.topic) || t?.profile === "approval-history";
const barDesign = (t) =>
  !timeline(t) &&
  (EDIT_BAR_DESIGNS.includes(t?.design) ||
    ["bars", "columns", "material"].includes(t?.design));
for (const word of [
  "eher",
  "rather",
  "stil",
  "style",
  "estilo",
  "electoral",
  "sein",
  "hat",
  "sich",
  "was",
])
  filler.add(word);

export function planStudioCommand(message, state, context = {}) {
  const { events = [], lastPatch = {} } = context;
  const l = (de, en, es) =>
    state.lang === "de" ? de : state.lang === "es" ? es : en;
  const reply = (kind, message) => ({ kind, message, patch: {} });
  const clarify = (detail = "") =>
    reply(
      "clarify",
      detail ||
        l(
          "Was möchtest du konkret ändern: Grafiktyp, Schrift, Hintergrund oder Ereignisse? Ich habe nichts geändert.",
          "What specifically should change: chart type, font, background or events? I have not changed anything.",
          "¿Qué quieres cambiar: tipo de gráfica, fuente, fondo o acontecimientos? No he cambiado nada.",
        ),
    );
  const unsupported = () =>
    reply(
      "unsupported",
      l(
        "Dafür gibt es hier kein Werkzeug. Messwerte und Quellen sind geschützt; Bilder generieren, veröffentlichen und Nachrichten senden kann ich nicht. Ich habe nichts geändert.",
        "There is no tool for that here. Values and sources are protected; I cannot generate images, publish or send messages. I have not changed anything.",
        "No hay una herramienta para eso. Los datos y las fuentes están protegidos; no puedo generar imágenes, publicar ni enviar mensajes. No he cambiado nada.",
      ),
    );
  if (typeof message !== "string" || message.length > 2000) return clarify();
  const patch = {},
    quoted = [];
  let conflict = false,
    preserveFont = false;
  const put = (key, value) => {
    if (key in patch && patch[key] !== value) conflict = true;
    patch[key] = value;
  };
  // Quoted editorial copy is data, never instructions or classifier input.
  let input = message.replace(
    /(?:titel|uberschrift|überschrift|headline|title|título|titulo|untertitel|subtitle|subtitulo|subtítulo)\s*(?:soll|to|:|=|sea)?\s*["„“]([^"“”]*)["“”]/gi,
    (full, text) => {
      quoted.push([
        /^(untertitel|subtitle|subt[ií]tulo)/i.test(full)
          ? "subtitle"
          : "headline",
        text,
      ]);
      return " ";
    },
  );
  if (/["„“”]/.test(input))
    return clarify(
      l(
        "Bitte schreibe bearbeitbaren Text als Titel: „Dein Text“ oder Untertitel: „Dein Text“.",
        "Please write editable text as Title: “Your text” or Subtitle: “Your text”.",
        "Escribe Título: “Tu texto” o Subtítulo: “Tu texto”.",
      ),
    );
  for (const [k, v] of quoted) put(k, v);
  const whole = commandText(input);
  if (/\b(oder|or|o)\b/.test(whole))
    return clarify(
      l(
        "Du nennst Alternativen. Welche davon möchtest du verwenden? Ich habe nichts geändert.",
        "You named alternatives. Which one should I use? I have not changed anything.",
        "Has indicado alternativas. ¿Cuál quieres usar? No he cambiado nada.",
      ),
    );
  if (
    /^(wie|wo|how|where|como|donde)\b|\b(erklar|explain|explica)/.test(whole)
  ) {
    if (/handy|phone|movil/.test(whole))
      return reply(
        "help",
        l(
          "Auf Handys stehen Galerie, Vorschau und Export bereit. Den vollständigen Editor kannst du am Computer oder Tablet öffnen.",
          "Phones offer gallery, preview and export. Open the full editor on a computer or tablet.",
          "En móviles tienes galería, vista previa y exportación. Abre el editor completo en ordenador o tableta.",
        ),
      );
    if (/schrift|font|fuente|typograf|typeface/.test(whole))
      return reply(
        "help",
        l(
          "Öffne „Schriftart ändern“ oben in der Werkzeugleiste oder rechts unter „Texte & Schrift“. Dort findest du die Suche und den Import eigener Schriften. Eigene Schriften bleiben auf diesem Gerät und sind nur für PNG verfügbar.",
          "Open Change typeface in the toolbar or under Text & type on the right. Search or import fonts there. Imported fonts remain on this device and work only with PNG.",
          "Abre Cambiar tipografía en la barra superior o en Texto y tipografía. Allí puedes buscar e importar fuentes. Las importadas quedan en este dispositivo y solo funcionan con PNG.",
        ),
      );
    if (/ereign|event|acontec/.test(whole))
      return reply(
        "help",
        l(
          "Rechts unter „Ereignisse“ kannst du suchen, einzelne Ereignisse auswählen und bis zu vier Ebenen einstellen. „Kein Platz“ bedeutet: weniger benachbarte Ereignisse auswählen oder eine Ebene hinzufügen.",
          "Under Events on the right, search and select events and use up to four layers. No space means you need fewer neighbouring events or another layer.",
          "En Acontecimientos puedes buscar, seleccionar y usar hasta cuatro capas. Sin espacio significa que hacen falta menos acontecimientos próximos u otra capa.",
        ),
      );
    return reply(
      "help",
      l(
        "Wähle eine Grafik und öffne „Bearbeiten“. Oben findest du PNG und Embed mit Vorschau und den letzten Exportoptionen. Bearbeitbare Texte kannst du doppelklicken; Strg+Z macht den letzten Schritt rückgängig.",
        "Choose a graphic and open Edit. PNG and Embed at the top open the preview and final export options. Double-click editable text; Ctrl+Z undoes the last edit.",
        "Elige una gráfica y abre Editar. PNG e Insertar abren la vista previa y opciones finales. Haz doble clic en textos editables; Ctrl+Z deshace el último cambio.",
      ),
    );
  }
  const clauses = input
    .split(/[,;]|\b(?:und|and|y|aber|but|sondern|sino|dann)\b/iu)
    .filter((s) => s.trim());
  const cleaned = [];
  for (const raw of clauses) {
    let q = commandText(raw);
    // Preservation is not falsification. Negated alternatives never trigger an edit.
    if (
      /\b(nicht|not|dont|no)\b/.test(q) &&
      /ander|change|cambi|remove|entfern/.test(q) &&
      /quelle|source|fuente|daten|data|wert|font|schrift/.test(q)
    ) {
      if (/font|schrift/.test(q)) preserveFont = true;
      continue;
    }
    if (
      /\b(quelle|source|fuente|messwert|umfragewert|datos|daten|data|prozent|percent|porcentaje)\b/.test(
        q,
      ) &&
      /falsch|fake|erfind|invent|entfern|remove|ander|change|cambi|set |show |zeige|balken|party|spd|cdu|afd/.test(
        q,
      ) &&
      !(/fuente/.test(q) && !/datos|porcentaje|fuente de datos/.test(q))
    )
      return unsupported();
    if (
      /publiz|veroffentlich|publish|publicar|email|e mail|generier|generate|genera/.test(
        q,
      ) &&
      !(
        /grafik|graph|chart|encuesta|umfrag/.test(q) &&
        !/hintergrund|background|fondo|image|bild/.test(q)
      )
    )
      return unsupported();
    if (/\b(export|download|herunterlad|speicher|save|sende|send)\w*\b/.test(q))
      return reply(
        "help",
        l(
          "PNG und Embed findest du oben an der Grafik. Ich kann den jeweiligen Dialog nicht selbst bedienen; öffne ihn bitte dort.",
          "PNG and Embed are above the chart. I cannot operate those dialogs for you; please open one there.",
          "PNG e Insertar están encima de la gráfica. No puedo manejar esos diálogos por ti; ábrelos allí.",
        ),
      );
    if (/\b(nicht|not|no|keine|kein|sin)\b/.test(q)) {
      if (
        /kalenderjahr|calendar year/.test(q) &&
        /vergleich|compar/.test(whole)
      )
        continue;
      if (/rund|rounded|redonde/.test(q)) {
        put("cornerRadius", 0);
        continue;
      }
      if (/ereign|event|acontec/.test(q)) {
        put("historyLayers", 0);
        continue;
      }
      if (/dunkel|dark|oscuro/.test(q)) {
        if (clauses.length === 1) put("theme", "light");
        continue;
      }
      if (/geglatt|smooth|suaviz/.test(q)) {
        if (/einzel|punkte|polls|medicion/.test(q)) put("mode", "polls");
        else if (clauses.length === 1) return clarify();
        continue;
      }
      return clarify();
    }
    cleaned.push({ raw, q });
  }
  let requestedTopic = null,
    format = null,
    style = null,
    unknown = false;
  const setTopic = (value) => {
    if (requestedTopic && requestedTopic !== value) conflict = true;
    requestedTopic = value;
  };
  const topics = [
    [
      "history",
      /\b(histor\w*|zeitverlauf|zeitreihe|verlauf|timeline|polling trends over time|trends over time|evolution of polls|evolucion historica)\b/g,
    ],
    [
      "approval",
      /\b(zustimmung|zufriedenheit|regierungszufriedenheit|kanzler|chancellor|canciller|approval|satisfaction|aprobacion|valoracion|rating)\b/g,
    ],
    [
      "seats",
      /\b(sitzverteilung|sitzmodell|sitze|sitzen|sitz|mandate|mandaten|seats?|escanos|reparto)\b/g,
    ],
    [
      "majority",
      /\b(koalition\w*|coalition\w*|coalicion\w*|mehrheit\w*|majorit\w*|mayori\w*|bundnisse|alianzas)\b/g,
    ],
    ["map", /\b(deutschlandkarte|landkarte|karte|map|mapa)\b/g],
    [
      "change",
      /\b(gewinne|verluste|gains|losses|ganancias|perdidas|verandert|veranderung|cambios)\b/g,
    ],
  ];
  const requests = [];
  for (const item of cleaned) {
    let { raw, q } = item;
    const take = (regex, fn) => {
      q = q.replace(regex, (full, ...args) => {
        fn?.(full, ...args);
        return " ";
      });
    };
    const dates = commandDates(raw);
    if (dates.dates.length) {
      if (
        dates.dates.length !== 2 ||
        dates.dates.some((d) => !d) ||
        dates.dates[0] > dates.dates[1]
      )
        return clarify(
          l(
            "Bitte nenne einen gültigen Anfang und ein Ende danach, zum Beispiel 01.01.2020 bis 31.12.2024.",
            "Please give a valid start and an end after it, for example 2020-01-01 to 2024-12-31.",
            "Indica un inicio válido y un final posterior, por ejemplo 01.01.2020 a 31.12.2024.",
          ),
        );
      put("range", "custom");
      put("start", dates.dates[0]);
      put("end", dates.dates[1]);
      q = commandText(dates.rest);
    }
    take(
      /\b(modern\w*|schlicht\w*|sleek|simple|clean|minimalist\w*)\b/g,
      () => (style = "modern"),
    );
    take(
      /\b(zeitung\w*|newspaper|tradition\w*|prensa|redaktion\w*|editorial|print)\b/g,
      () => (style = "print"),
    );
    take(/\b(hochkant|portrait|story|vertical)\b/g, () => {
      if (format && format !== "portrait") conflict = true;
      format = "portrait";
    });
    take(/\b(quadrat\w*|square|cuadrad\w*)\b/g, () => {
      if (format && format !== "square") conflict = true;
      format = "square";
    });
    take(/\b(breitformat|querformat|landscape|horizontal)\b/g, () => {
      if (format && format !== "landscape") conflict = true;
      format = "landscape";
    });
    take(/\b(social media|social|twitter|instagram)\b/g, () => {
      if (!style) style = "modern";
    });
    take(/\b(dunk(?:el|l)\w*|dark|oscuro)\b/g, () => put("theme", "dark"));
    take(/\b(hell\w*|light|claro)\b/g, () => put("theme", "light"));
    const colour = raw.match(/#[\da-f]{6}\b/i);
    if (colour && /hintergrund|background|fondo/.test(q)) {
      put("background", colour[0]);
      q = q.replace(colour[0].slice(1).toLowerCase(), " ");
    }
    take(
      /\b(abrunden|abgerundet\w*|rund\w*|round|rounded|redondead\w*)\b/g,
      () => put("cornerRadius", 24),
    );
    take(/\b(scharf\w*|sharp|kantig\w*)\b/g, () => put("cornerRadius", 0));
    for (const font of STUDIO_FONTS.filter((f) => f[0] !== "auto").sort(
      (a, b) => b[1].length - a[1].length,
    ))
      take(new RegExp(`\\b${foldIntent(font[1])}\\b`, "g"), () =>
        put("font", font[0]),
      );
    take(/\b(zentrier\w*|center\w*|centr\w*)\b/g, () =>
      put(
        /untertitel|subtitle|subtitulo/.test(q)
          ? "subtitleAlign"
          : "titleAlign",
        "center",
      ),
    );
    take(/\b(linksbundig|align left|alinear izquierda)\b/g, () =>
      put("titleAlign", "left"),
    );
    take(/\b(rechtsbundig|align right|alinear derecha)\b/g, () =>
      put("titleAlign", "right"),
    );
    take(
      /\b(?:schriftgrosse|schriftgroesse|schrift|font size|font|title size|title|titulo|letra|uberschrift|titel)\s*(?:auf|to|a|of|von)?\s*(\d+)\b/g,
      (_, n) => put("titleSize", Number(n)),
    );
    const bigger = /\b(grosser|larger|bigger|grande)\b/.test(q),
      smaller = /\b(kleiner|smaller|pequena)\b/.test(q);
    if (bigger || smaller) {
      let key = /untertitel|subtitle|subtitulo/.test(q)
        ? "subtitleSize"
        : /schrift|titel|title|text|font|letra/.test(q)
          ? "titleSize"
          : null;
      if (!key) {
        const candidates = ["titleSize", "subtitleSize"].filter(
          (k) => k in lastPatch,
        );
        if (candidates.length === 1) key = candidates[0];
      }
      if (!key)
        return clarify(
          l(
            "Was soll größer oder kleiner werden: Überschrift, Untertitel oder Grafik?",
            "What should be larger or smaller: headline, subtitle or chart?",
            "¿Qué debe ser más grande o pequeño: título, subtítulo o gráfica?",
          ),
        );
      put(key, state[key] + (bigger ? 6 : -6));
      take(/\b(grosser|larger|bigger|grande|kleiner|smaller|pequena)\b/g);
    }
    if (/\b(dunn\w*|schmal\w*|thinner|finas|dicker|thicker)\b/.test(q)) {
      let key = /balken|bars|barras/.test(q)
        ? "barScale"
        : /linien|lines|lineas/.test(q)
          ? "historyLineWidth"
          : null;
      if (!key) {
        const keys = ["barScale", "historyLineWidth"].filter(
          (k) => k in lastPatch,
        );
        if (keys.length === 1) key = keys[0];
      }
      if (!key) return clarify();
      const thick = /dicker|thicker/.test(q);
      put(
        key,
        key === "barScale"
          ? Math.round((state[key] + (thick ? 0.3 : -0.3)) * 10) / 10
          : state[key] + (thick ? 1 : -1),
      );
      take(
        /\b(dunn\w*|schmal\w*|thinner|finas|dicker|thicker|balken|bars|barras|linien|lines|lineas)\b/g,
      );
    }
    let nq = numericText(q);
    const range = nq.match(
      /\b(?:letzte\w*|last|ultimos)\s+(\d+)\s+(?:jahr\w*|years?|anos)\b/,
    );
    if (range) {
      const choice = { 1: "year", 2: "two", 5: "five", 10: "ten" }[range[1]];
      if (!choice) return clarify();
      put("range", choice);
      nq = nq.replace(range[0], " ");
    }
    const layers = nq.match(
      /\b(\d+)\s*(?:ereignisebenen|ebenen|ebene|layers?|capas)\b/,
    );
    if (layers) {
      put("historyLayers", Number(layers[1]));
      nq = nq.replace(layers[0], " ");
    }
    q = nq;
    take(/\b(geglattet\w*|smooth\w*|suaviz\w*)\b/g, () => put("mode", "trend"));
    take(
      /\b(einzelne umfragen|einzelmessungen|einzelmessung|punkte|individual polls|poll points|mediciones)\b/g,
      () => put("mode", "polls"),
    );
    take(/\b(verbundene mittelwerte|connected averages|linear)\b/g, () =>
      put("mode", "linear"),
    );
    take(/\b(hide events|ocultar eventos|ereignisse ausblenden)\b/g, () =>
      put("historyLayers", 0),
    );
    take(/\b(netto|net rating|nettozustimmung|neta)\b/g, () =>
      put("answer", "net"),
    );
    take(/\b(unzufrieden\w*|disapproval|negative|insatisfaccion)\b/g, () =>
      put("answer", "negative"),
    );
    const isEvent =
      /ereign|event|acontec|olkrise|pandemi|corona|covid/.test(q) ||
      (/zeigen|show|muestra/.test(q) && events.length > 0);
    if (isEvent && !/umfrag|poll|regier|government|gobierno/.test(q)) {
      const meaningful = foldIntent(q)
        .split(" ")
        .filter(
          (w) =>
            w.length >= 4 &&
            !filler.has(w) &&
            !/ereign|event|acontec|anzeigen|remove|entfern|auswahl|select/.test(
              w,
            ),
        );
      const chosen = events.filter((e) => {
        const words = commandText(e.label).split(" ");
        return meaningful.length > 0 && meaningful.every((w) =>
          words.some(
            (v) =>
              v === w ||
              (v.startsWith(w) && w.length >= 5) ||
              (w.startsWith(v) && v.length >= 5),
          ),
        );
      });
      if (chosen.length) {
        requests.push({
          chosen,
          remove: /entfern|remove|quitar|ocultar/.test(q),
          only: /\b(nur|only|solo)\b/.test(q),
        });
        q = "";
      } else if (meaningful.length)
        return clarify(
          l(
            "Dieses Ereignis kann ich im verfügbaren Katalog nicht eindeutig finden. Öffne „Ereignisse“ und suche dort; ich erfinde keine Markierung.",
            "I cannot identify that event in the available catalogue. Search under Events; I will not invent a marker.",
            "No identifico ese acontecimiento en el catálogo disponible. Búscalo en Acontecimientos; no inventaré un marcador.",
          ),
        );
    }
    for (const [topic, re] of topics) take(re, () => setTopic(topic));
    if (
      /\b((?:bundestags)?umfrag\w*|sonntagsfrage|wahlabsicht|polls?|polling|encuest\w*|voting intention|intencion de voto)\b/.test(
        q,
      )
    ) {
      if (!requestedTopic) setTopic("current");
      take(
        /\b((?:bundestags)?umfrag\w*|sonntagsfrage|wahlabsicht|polls?|polling|encuest\w*|voting intention|intencion de voto)\b/g,
      );
    }
    if (
      /regierung|government|gobierno/.test(item.q) &&
      requestedTopic === "approval"
    )
      put("metric", "government");
    take(
      /\b(vergleich|compare|comparison|comparar|amtszeit\w*|mandatos?|merkel|scholz|merz)\b/g,
      () => {
        if (requestedTopic === "approval") put("template", "approval-aligned");
        else unknown = true;
      },
    );
    // Unknown content blocks the whole transaction, never a silent partial edit.
    take(
      /\b(hintergrund|background|fondo|ecken|corners?|esquinas|schrift|schriftart|font|typeface|fuente|tipografia|letra|uberschrift|headline|title|titel|text|titulo|untertitel|subtitle|subtitulo|ereignisse|events|acontecimientos|zeitraum|range|period|regier\w*|government|gobierno|bundestag|parlament|parliament|allocation|distribution|modelled|modelliert\w*|nationale?|national|aktuell\w*|latest|current|actual|ultima\w*|heutige|today|deutschland|german|germany|alemania|bundeslander|federal states)\b/g,
    );
    if (q.split(/\s+/).some((w) => w && !filler.has(w))) unknown = true;
  }
  if (style) {
    if (!preserveFont)
      put("font", patch.font || (style === "print" ? "newsreader" : "manrope"));
    put("monochrome", style === "print");
  }
  if (preserveFont && "font" in patch && patch.font !== state.font)
    conflict = true;
  const original = STUDIO_TEMPLATES.find((t) => t.id === state.template);
  if (format && !requestedTopic) requestedTopic = original?.topic;
  if (requestedTopic && !patch.template) {
    const ids = {
      current:
        format === "portrait"
          ? "poll-poster"
          : format === "square"
            ? "poll-square"
            : style === "print"
              ? "poll-paper"
              : style === "modern" || format === "landscape"
                ? "poll-wide"
                : "poll-classic",
      history:
        style === "print"
          ? "history-paper"
          : format === "portrait" || format === "square"
            ? "history-square"
            : "history-original",
      approval: "approval-original",
      seats:
        format === "portrait"
          ? "seats-portrait"
          : format === "square"
            ? "seats-square"
            : "seats-original",
      majority: "majority-cards",
      map: "map-original",
      change: "tendencies-original",
    };
    if (!ids[requestedTopic]) return clarify();
    put("template", ids[requestedTopic]);
  }
  const target = STUDIO_TEMPLATES.find(
    (t) => t.id === (patch.template || state.template),
  );
  if (requests.length) {
    let ids =
      state.historyEventIds === null
        ? events.map((e) => e.id)
        : state.historyEventIds.split(",").filter(Boolean);
    for (const r of requests) {
      if (r.only) ids = r.chosen.map((e) => e.id);
      else if (r.remove)
        ids = ids.filter((id) => !r.chosen.some((e) => e.id === id));
      else ids = [...new Set([...ids, ...r.chosen.map((e) => e.id)])];
    }
    put("historyEventIds", ids.join(","));
    if (requests.some((r) => r.only || !r.remove) && !(patch.historyLayers > 0))
      put("historyLayers", state.historyLayers || 2);
  }
  if (conflict)
    return clarify(
      l(
        "Deine Angaben enthalten mehrere Alternativen. Welche soll ich verwenden? Ich habe nichts geändert.",
        "Your request contains conflicting alternatives. Which should I use? I have not changed anything.",
        "Tu petición contiene alternativas contradictorias. ¿Cuál quieres? No he cambiado nada.",
      ),
    );
  if (unknown || !Object.keys(patch).length) return clarify();
  if (
    ("barScale" in patch && !barDesign(target)) ||
    (["historyLineWidth", "mode", "range", "start", "end"].some(
      (k) => k in patch,
    ) &&
      !timeline(target)) ||
    (["historyLayers", "historyEventIds"].some((k) => k in patch) &&
      (!timeline(target) || ["aligned", "panels"].includes(target?.design)))
  )
    return reply(
      "unsupported",
      l(
        "Diese Einstellung passt nicht zu diesem Grafiktyp. Für Ereignisse brauchst du einen Zeitverlauf mit Kalenderachse, für Balkendicke ein Balkendiagramm. Ich habe nichts geändert.",
        "That setting does not apply to this chart. Events need a calendar timeline and bar thickness needs a bar chart. I have not changed anything.",
        "Ese ajuste no corresponde a esta gráfica. Los acontecimientos necesitan un eje de fechas; el grosor de barras, una gráfica de barras. No he cambiado nada.",
      ),
    );
  try {
    const plan = {
      kind: "edit",
      message: l(
        "Ich passe die erkannten Einstellungen an.",
        "I will adjust the recognised settings.",
        "Ajustaré las opciones reconocidas.",
      ),
      patch,
    };
    validateAssistantPlan(plan, state, {
      eventIds: events.map((e) => e.id),
      termIds: (context.terms || []).map((t) => t.id),
    });
    return plan;
  } catch {
    return clarify(
      l(
        "Mindestens ein Wert liegt außerhalb der unterstützten Einstellungen. Schriftgrößen: 24–64, Ereignisebenen: 0–4. Bitte prüfe deine Angaben. Es wurde nichts geändert.",
        "A value is outside the supported settings. Title sizes: 24–64; event layers: 0–4. Please check your request. Nothing changed.",
        "Un valor queda fuera de los ajustes admitidos. Títulos: 24–64; capas: 0–4. Revisa la petición. No cambió nada.",
      ),
    );
  }
}
