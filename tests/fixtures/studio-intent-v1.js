import encoded from "../../src/studio-intent-model.json" with {type:"json"};
import { inferIntent, foldIntent } from "../../src/studio-intent-features.js";
import { STUDIO_FONTS } from "../../src/studio-fonts.js";
import { STUDIO_TEMPLATES } from "../../src/studio-model.js";
const unpack = (part) =>
  Float32Array.from(
    atob(part.data),
    (c) => (c.charCodeAt(0) - 128) * part.scale,
  );
const model = { ...encoded, w1: unpack(encoded.w1), w2: unpack(encoded.w2) };
export const classifyStudioIntent = (text) => inferIntent(model, text);
const read = (state, de, en, es) =>
  state.lang === "de" ? de : state.lang === "es" ? es : en;
export function browserAssistantPlan(
  message,
  state,
  { events = [], gallery = false, device = "" } = {},
) {
  const q = foldIntent(message),
    l = (...s) => read(state, ...s),
    help = (text) => ({ kind: "help", message: text, patch: {} }),
    unsupported = (text) => ({ kind: "unsupported", message: text, patch: {} });
  const generic = () => ({
    kind: "clarify",
    message: l(
      "Das kann ich noch nicht sicher zuordnen. Soll ich den Grafiktyp, die Schrift, Farben oder Ereignisse ändern? Bitte formuliere einen konkreten Gestaltungswunsch.",
      "I cannot confidently match that request yet. Should I change the chart type, font, colours or events? Please give me a specific design request.",
      "No puedo interpretar esa petición con seguridad. ¿Quieres cambiar el tipo de gráfica, la fuente, los colores o los acontecimientos? Indica un cambio concreto.",
    ),
    patch: {},
  });
  if (
    /(quelle|source|fuente|messwert|umfragewert|poll values|data values|datos|prozent|percent).*(falsch|fak|erfind|invent|entfern|remove|ander|change|cambi|80|100)|(?:falsch|fake|invent|erfind|remove|entfern).*(quelle|source|fuente|wert|data|datos)/.test(
      q,
    )
  )
    return unsupported(
      l(
        "Messwerte und Quellenvermerke sind geschützt. Ich ändere oder entferne sie nicht. Du kannst die Darstellung und eine eigene Überschrift anpassen.",
        "Poll values and source credits are protected. I will not change or remove them. You can adjust the design and your headline.",
        "Los valores y las fuentes están protegidos. No los cambiaré ni eliminaré. Puedes ajustar el diseño y el título.",
      ),
    );
  if (
    /(generier|generate|genera|erstelle|create).*(bild|image|imagen|foto)|publiz|veroffentlich|publish|publicar|email|e mail|weather|wetter|rezept/.test(
      q,
    )
  )
    return unsupported(
      l(
        "Dafür gibt es hier kein Werkzeug. Ich kann Grafiken gestalten, aber keine Bilder generieren, Nachrichten senden oder etwas veröffentlichen. Ein eigenes Hintergrundbild kannst du unter Hintergrund importieren.",
        "There is no tool for that here. I can style charts, but cannot generate images, send messages or publish anything. Import your own image under Background.",
        "No hay una herramienta para eso. Puedo diseñar gráficas, pero no generar imágenes, enviar mensajes ni publicar. Puedes importar una imagen en Fondo.",
      ),
    );
  if (
    /^(wie|wo|how|where|como|donde)\b/.test(q) ||
    /erklar|explain|explica/.test(q)
  ) {
    if (/phone|handy|movil/.test(q))
      return help(
        l(
          "Auf Handys gibt es Galerie, Vorschau und Export. Den vollständigen Editor öffnest du auf einem Computer oder Tablet.",
          "Phones offer gallery, preview and export. Open the full editor on a computer or tablet.",
          "En móviles están disponibles la galería, vista previa y exportación. El editor completo funciona en ordenador o tableta.",
        ),
      );
    if (/schrift|font|typeface|fuente|tipograf/.test(q))
      return help(
        l(
          "Klicke oben in der Werkzeugleiste oder rechts unter Texte & Schrift auf Schriftart ändern. Du kannst dort suchen, Schriften vergleichen und eigene Dateien importieren. Eigene Schriften sind nur auf diesem Gerät und für PNG verfügbar.",
          "Click Change typeface in the toolbar or under Text & type on the right. Search, compare fonts or import your own. Imported fonts are available only on this device and for PNG.",
          "Pulsa Cambiar tipografía en la barra superior o en Texto y tipografía a la derecha. Busca, compara o importa fuentes. Las importadas solo están disponibles en este dispositivo y para PNG.",
        ),
      );
    if (/ereign|event|acontec/.test(q))
      return help(
        l(
          "Öffne rechts Ereignisse. Dort kannst du Ereignisse suchen, einzeln auswählen und auf bis zu vier Ebenen verteilen. Bei fehlendem Platz wird das Ereignis als Kein Platz markiert; wähle weniger Nachbarn oder mehr Ebenen.",
          "Open Events on the right. Search, select individual events and distribute them across up to four layers. If an event is marked No space, remove nearby events or add a layer.",
          "Abre Acontecimientos a la derecha. Busca, selecciona y distribuye en hasta cuatro capas. Si aparece Sin espacio, elimina acontecimientos cercanos o añade una capa.",
        ),
      );
    return help(
      l(
        "Wähle zunächst eine Grafik. Oben findest du PNG und Embed; Bearbeiten öffnet die Werkzeuge rechts. Texte lassen sich per Doppelklick bearbeiten. Mit Strg+Z machst du eine Änderung rückgängig. Messwerte und Quellen sind nicht bearbeitbar.",
        "Choose a graphic first. PNG and Embed are at the top; Edit opens the tools on the right. Double-click editable text. Ctrl+Z undoes a change. Values and sources cannot be edited.",
        "Elige una gráfica. PNG e Insertar están arriba; Editar abre las herramientas a la derecha. Haz doble clic en el texto editable. Ctrl+Z deshace un cambio. Los datos y las fuentes no se pueden editar.",
      ),
    );
  }
  // Softmax can be confident on nonsense outside training. Require a meaningful
  // domain/style cue before considering its scores; otherwise ask, never edit.
  if (!/(umfrag|sonntags|wahl|poll|encuest|vote|voto|zustimm|kanzler|chancellor|canciller|approval|rating|satisf|regier|government|gobierno|merkel|scholz|merz|parlament|parliament|bundestag|sitz|seat|escan|mandat|koalit|coalition|mehrheit|majorit|mayor|karte|map|bundesland|bundesland|verlauf|zeitreihe|histor|timeline|tenden|change|verander|gewinn|verl[ui]er|cambio|gains|losses|schrift|font|typeface|tipograf|fuente|titulo|titel|headline|uberschrift|letra|text|dunkel|dark|oscuro|hell|light|claro|farbe|colou?r|hintergrund|background|fondo|ecken|corner|esquina|rund|rounded|redonde|linie|line|balken|bar[rs]|ereign|event|acontec|olkrise|pandemi|covid|modern|sleek|schlicht|simple|print|zeitung|newspaper|social|twitter|story|hochkant|portrait|quadrat|square|querformat|landscape|zentrier|centr|center|newsreader|manrope|lora|arial|georgia|inter)/.test(q)) return generic();
  const ranked = classifyStudioIntent(message);
  // Curated, high-precision domain aliases complement the small neural model.
  // Keep neural-only accuracy separate from this combined workflow in reports.
  const alias = /merkel|scholz|merz|kanzler|chancellor|canciller|regierungszufriedenheit/.test(q)?"approval":/zeitreihe|zeitverlauf|historisch|timeline|historical/.test(q)?"history":/parteienkombination|zusammen regieren|coalition|koalition/.test(q)?"majority":/opinion poll|sonntagsfrage|aktuellen umfragen/.test(q)?"current":null;
  const best = ranked[0].score < .8 && alias ? {intent:alias,score:1} : ranked[0];
  if (best.score < 0.6 || (best === ranked[0] && best.score - ranked[1].score < 0.18)) return generic();
  if (best.intent === "unsupported")
    return unsupported(
      l(
        "Das liegt außerhalb meines begrenzten Gestaltungswerkzeugs. Ich kann vorhandene Pollframe-Grafiken anpassen, aber keine allgemeinen Fragen beantworten oder externe Aktionen ausführen.",
        "That is outside this limited design assistant. I can adjust existing Pollframe charts, but cannot answer general questions or perform external actions.",
        "Eso está fuera de este asistente de diseño limitado. Puedo ajustar gráficas de Pollframe, pero no responder preguntas generales ni realizar acciones externas.",
      ),
    );
  const patch = {},
    topic = STUDIO_TEMPLATES.find((t) => t.id === state.template)?.topic;
  const print =
      /zeitung|newspaper|traditional|traditionell|prensa|redaktion|editorial|print/.test(
        q,
      ),
    poster = /hochkant|portrait|story|vertical/.test(q),
    square = /quadrat|square|cuadrad/.test(q),
    modern = /modern|sleek|clean|schlicht|simple|twitter|social/.test(q);
  if (
    [
      "current",
      "history",
      "approval",
      "seats",
      "majority",
      "map",
      "change",
    ].includes(best.intent)
  ) {
    const ids = {
      current: print
        ? "poll-paper"
        : poster
          ? "poll-poster"
          : square
            ? "poll-square"
            : modern
              ? "poll-wide"
              : "poll-classic",
      history: print
        ? "history-paper"
        : poster
          ? "history-square"
          : "history-original",
      approval: /vergleich|compar|amtszeit|mandato/.test(q)
        ? "approval-aligned"
        : print
          ? "approval-print"
          : "approval-original",
      seats: poster
        ? "seats-portrait"
        : square
          ? "seats-square"
          : "seats-original",
      majority: "majority-cards",
      map: "map-original",
      change: "tendencies-original",
    };
    patch.template = ids[best.intent];
    if (best.intent === "approval") {
      if (/regierung|government|gobierno/.test(q)) patch.metric = "government";
      else if (/kanzler|chancellor|canciller/.test(q)) patch.metric = "leader";
      if (/netto|net rating|neta/.test(q)) patch.answer = "net";
    }
    if (print) {
      patch.font = "newsreader";
      patch.monochrome = true;
    } else if (modern) {
      patch.font = "manrope";
      patch.monochrome = false;
    }
  }
  if (/dunkel|dark|oscuro/.test(q))
    patch.theme = /nicht dunkel|not dark|no oscuro/.test(q) ? "light" : "dark";
  else if (/hell|light mode|claro/.test(q)) patch.theme = "light";
  if (/abrund|abgerund|rounded|redondead/.test(q)) patch.cornerRadius = 24;
  if (/scharfe|sharp|kantig|sin redonde/.test(q)) patch.cornerRadius = 0;
  if (/dunnere.*linien|thinner.*lines|lineas.*finas/.test(q))
    patch.historyLineWidth = 2;
  if (/dunnere.*balken|schmalere.*balken|thinner.*bars|barras.*finas/.test(q))
    patch.barScale = 0.7;
  const colour = message.match(/#[a-fA-F0-9]{6}\b/);
  if (colour && /hintergrund|background|fondo/.test(q))
    patch.background = colour[0];
  const font = STUDIO_FONTS.find(
    (f) => f[0] !== "auto" && new RegExp(`\\b${foldIntent(f[1])}\\b`).test(q),
  );
  if (font) patch.font = font[0];
  if (/(schrift|uberschrift|titel).*grosser|(larger|bigger).*(font|text|title|typeface)|letra.*grande/.test(q))
    patch.titleSize = Math.min(64, state.titleSize + 6);
  if (/schrift.*kleiner|smaller.*(font|text|title)|letra.*pequena/.test(q))
    patch.titleSize = Math.max(24, state.titleSize - 6);
  if (/zentrier|centr|center/.test(q)) patch.titleAlign = "center";
  if (/linksbundig|align left|alinear.*izquierda/.test(q))
    patch.titleAlign = "left";
  if (/rechtsbundig|align right|alinear.*derecha/.test(q))
    patch.titleAlign = "right";
  const quoted = message.match(
    /(?:Titel|Überschrift|headline|title|título)\s*(?:soll|to|:|=|sea)?\s*["„“]([^"“”]{1,100})["“”]/i,
  );
  if (quoted) patch.headline = quoted[1];
  if (best.intent === "events") {
    if (
      !["history", "party", "approval"].includes(topic) ||
      state.template === "approval-aligned" ||
      state.template === "history-panels"
    )
      return unsupported(
        l(
          "Dieses Design hat keine gemeinsame Kalenderachse für Ereignisse. Wähle dafür einen normalen historischen Linienverlauf.",
          "This design has no shared calendar axis for events. Choose a standard historical line chart.",
          "Este diseño no tiene un eje común de fechas para acontecimientos. Elige una gráfica histórica de líneas.",
        ),
      );
    const layers = q.match(
      /(?:in |auf |con )?(ein|zwei|drei|vier|one|two|three|four|una|dos|tres|cuatro|[1-4]) (?:ebenen|ebene|layer|layers|capas)/,
    );
    if (layers)
      patch.historyLayers =
        {
          ein: 1,
          zwei: 2,
          drei: 3,
          vier: 4,
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          una: 1,
          dos: 2,
          tres: 3,
          cuatro: 4,
        }[layers[1]] || Number(layers[1]);
    if (
      /ereignisse ausblenden|keine ereignisse|hide events|ocultar eventos/.test(
        q,
      )
    )
      patch.historyLayers = 0;
    const chosen = events.filter((e) =>
      foldIntent(e.label)
        .split(" ")
        .filter((w) => w.length > 4)
        .some((w) => q.includes(w)),
    );
    if (chosen.length) {
      const selected =
        state.historyEventIds === null
          ? events.map((e) => e.id)
          : state.historyEventIds.split(",");
      patch.historyEventIds = (
        /entfern|remove|ocultar|quitar|ohne|without/.test(q)
          ? selected.filter((id) => !chosen.some((e) => e.id === id))
          : Array.from(new Set([...selected, ...chosen.map((e) => e.id)]))
      ).join(",");
    }
  }
  if (/geglattet|smooth|suaviz/.test(q)) patch.mode = "trend";
  if (/einzelmessung|punkte|individual polls|poll points|mediciones/.test(q))
    patch.mode = "polls";
  const range = q.match(
    /(?:letzte[nr]?|last|ultimos)\s+(\d+)\s+(jahr|year|anos)/,
  );
  if (range && { 1: "year", 2: "two", 5: "five", 10: "ten" }[range[1]])
    patch.range = { 1: "year", 2: "two", 5: "five", 10: "ten" }[range[1]];
  if (!Object.keys(patch).length) return generic();
  const target = STUDIO_TEMPLATES.find(t => t.id === (patch.template || state.template));
  const timeline = ['history', 'party'].includes(target?.topic) || target?.profile === 'approval-history';
  if ((patch.barScale !== undefined && timeline) ||
      (patch.historyLineWidth !== undefined && !timeline) ||
      (patch.mode !== undefined && !timeline)) return unsupported(l(
        'Diese Einstellung passt nicht zum ausgewählten Grafiktyp. Wähle für Linien einen Zeitverlauf und für Balken eine Balkengrafik. Ich habe nichts geändert.',
        'That setting does not apply to this chart type. Choose a timeline for lines or a bar chart for bars. I have not changed anything.',
        'Ese ajuste no corresponde a este tipo de gráfica. Elige una serie temporal para líneas o una gráfica de barras. No he cambiado nada.'
      ));
  return {
    kind: "edit",
    message: l(
      "Diese Gestaltung passt zu deinem Wunsch.",
      "This design matches your request.",
      "Este diseño encaja con tu petición.",
    ),
    patch,
  };
}
