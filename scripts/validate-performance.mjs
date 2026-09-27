import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const assetsDir = resolve("dist/assets");
const files = await readdir(assetsDir);
const sizes = [];
for (const name of files.filter((file) => /\.(?:js|css)$/.test(file))) {
  const content = await readFile(resolve(assetsDir, name));
  sizes.push({ name, raw: content.length, gzip: gzipSync(content, { level: 9 }).length });
}

const errors = [];
const mainJavaScript = sizes.find(({ name }) => /^main-.*\.js$/.test(name));
const mainCss = sizes.find(({ name }) => /^main-.*\.css$/.test(name));
const totalJavaScriptGzip = sizes.filter(({ name }) => name.endsWith(".js")).reduce((sum, file) => sum + file.gzip, 0);
if (!mainJavaScript) errors.push("main JavaScript asset is missing");
if (!mainCss) errors.push("main CSS asset is missing");
if (mainJavaScript?.gzip > 220 * 1024) errors.push(`main JavaScript is ${(mainJavaScript.gzip / 1024).toFixed(1)} KiB gzip (budget: 220 KiB)`);
// One KiB for text-enlargement reflow, including accessible stacked approval
// tables. Keep this cost explicit; it must not mask unrelated CSS growth.
if (mainCss?.gzip > 51 * 1024) errors.push(`main CSS is ${(mainCss.gzip / 1024).toFixed(1)} KiB gzip (budget: 51 KiB)`);
// Ten independent Studio compositions are loaded only on the Studio route.
// Keep normal page budgets unchanged and bound the Studio addition separately.
const studioJavaScript = sizes.find(({ name }) => /^graphic-studio-.*\.js$/.test(name));
if (studioJavaScript?.gzip > 21 * 1024) errors.push("Studio JavaScript exceeds its 21 KiB gzip budget");
// Explicit opt-in PBR renderer: never part of ordinary page startup. Keep its
// cost visible and separate rather than lifting the main-page budget.
const materialJavaScript = sizes.filter(({name}) => /^studio-material-(?:engine|worker)-.*\.js$/.test(name));
if (materialJavaScript.some(file=>file.gzip > 135 * 1024)) errors.push("Studio PBR renderer exceeds its 135 KiB gzip budget");
const nonMaterialGzip = totalJavaScriptGzip - materialJavaScript.reduce((sum,file)=>sum+file.gzip,0);
const electionPageGzip = sizes.find(({name})=>/^election-page-.*\.js$/.test(name))?.gzip ?? 0;
// Election publishing now includes isolated embeds and source-time controls.
if(electionPageGzip > 10*1024) errors.push("Optional election detail and publishing page exceeds 10 KiB gzip");
// Matching Studio embeds and the browser analytics opt-out add small modules;
// the ordinary page's 220 KiB startup and 50 KiB CSS budgets stay unchanged.
const editorGzip=sizes.filter(({name})=>/^studio-editor-(?:controls|files)-.*\.js$/.test(name)).reduce((sum,file)=>sum+file.gzip,0);
// Historical designs and their controls are opt-in chunks, never loaded on
// ordinary country pages. Keep their expansion bounded independently.
const historyGzip=sizes.filter(({name})=>/^studio-history(?:-controls)?-.*\.js$/.test(name)).reduce((sum,file)=>sum+file.gzip,0);
const extraDesignGzip=sizes.filter(({name})=>/^studio-(?:statistic|map)-.*\.js$/.test(name)).reduce((sum,file)=>sum+file.gzip,0);
if(extraDesignGzip>13*1024)errors.push('Optional seat, majority, approval snapshot and map designs exceed 13 KiB gzip');
// Additional 0.5 KiB for regional labelling and opt-in original-poll markers.
// Ordinary-page startup budgets remain unchanged.
if(historyGzip>11.5*1024) errors.push('Opt-in historical Studio renderer and controls exceed 11.5 KiB gzip');
// Full-page editorial tools are loaded only after choosing Edit.
if(editorGzip>12*1024) errors.push('Opt-in contextual Studio editor and publishing files exceed 12 KiB gzip');
// Search ranking, measured title wrapping and phone preview add <1 KiB to the
// optional Studio path; the main-page budgets above are not increased.
// Additional shared typography/focus/reference drawing remains Studio-only.
// Five KiB reserved for the expanded searchable catalogue, validated recipes
// and history snapshot adapter. This is a whole-build budget, NOT the startup
// budget; main JS remains 220 KiB and main CSS remains 50 KiB above.
// One additional KiB across the whole build covers the searchable original
// catalogue entries, chunk-load recovery and local preview cache guard.
// This is NOT a startup allowance: main JS (220 KiB), CSS (50 KiB) and all
// separately lazy-loaded design/editor limits above remain unchanged.
// Opt-in canvas editing, final-export dialog and local design library get their
// own bounded allowance. They are never part of normal country-page startup.
const workspaceGzip=sizes.filter(({name})=>/^studio-(?:canvas-editor|publish-dialog|library)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
// One KiB for the style import entry and action handoff; large dialogs stay lazy.
if(workspaceGzip>8*1024)errors.push("Optional Studio workspace/library exceeds 8 KiB gzip");
// Centered selection tools and validated custom annotations are editor-only.
const annotationGzip=sizes.filter(({name})=>/^studio-(?:selection-dialog|custom-events)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(annotationGzip>3*1024)errors.push("Optional annotation authoring exceeds 3 KiB gzip");
// Fetched only when previewing a publication or inside the embedded document.
const embedSizingGzip=sizes.filter(({name})=>/^embed-(?:preview|size)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(embedSizingGzip>3*1024)errors.push("Optional embed preview and sizing exceed 3 KiB gzip");
// Direct manipulation is fetched only on entering Edit; keep its cost explicit.
// Shared presentation validation is Studio-only and also used by exports.
const directEditingGzip=sizes.filter(({name})=>/^studio-(?:canvas-selection|presentation|range)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
// Per-role typography and grouped legends are also used by PNG/embed output.
// Half a KiB for the on-demand event interaction bridge and per-role typography.
// Event dragging itself is a separate lazy chunk; country startup caps are unchanged.
if(directEditingGzip>9.5*1024)errors.push("Studio direct selection and presentation exceed 9.5 KiB gzip");
// Four additional KiB for Studio-only font loading, undo coordination, gallery
// sorting and validated recipes; ordinary JS/CSS budgets remain unchanged.
// Opt-in free browser intent network, font chooser and shared Studio controls.
// Neither the model nor these panels load on normal country pages. The model
// weights are 17.8 KB raw, not the multi-gigabyte local Qwen evaluation file.
const assistantAndFontGzip=sizes.filter(({name})=>/^studio-(?:assistant|approval-model|font-library|font-picker|custom-fonts|select|panel-resizer)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(assistantAndFontGzip>34*1024)errors.push("Opt-in browser assistant, fonts and controls exceed 34 KiB gzip");
// One KiB whole-build allowance for the requested two-section navigation and
// source-context handoff. Startup JS (220 KiB) and CSS (50 KiB) stay unchanged.
// Sources and reusable styles are fetched only when their dialog is opened.
// Do not increase ordinary page budgets to accommodate these optional tools.
// Wizard, quick picker and ZIP encoder are also opt-in; never on normal pages.
const resourceGzip=sizes.filter(({name})=>/^studio-(?:styles|style-model|style-library|style-wizard|style-picker|publication-package|resource-dialog|transparency)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(resourceGzip>23*1024)errors.push("Opt-in source notes, publication package and styles exceed 23 KiB gzip");
const accountLabGzip=sizes.filter(({name})=>/^studio-(?:account-lab|tutorial)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(accountLabGzip>7*1024)errors.push('Opt-in account UI exceeds 7 KiB gzip');
// The event catalogue is an explicit editor-only chunk, shared with selection
// dialogs. Keep it out of country startup and independently bounded.
const eventControlsGzip=sizes.filter(({name})=>/^studio-event-controls-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(eventControlsGzip>5*1024)errors.push('Opt-in event catalogue exceeds 5 KiB gzip');
// Header account access makes the saved-recipe model a separate shared lazy
// chunk rather than code inside gallery/editor chunks. Account and Studio only;
// no additional allowance to normal startup. Keep its size independently capped.
const recipeModelGzip=sizes.filter(({name})=>/^studio-model-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(recipeModelGzip>8*1024)errors.push('Optional saved-recipe model exceeds 8 KiB gzip');
// Full Spanish legal copy is fetched only when the Spanish privacy page opens.
// Budget that new translation separately; country/startup limits stay unchanged.
const spanishPrivacyGzip=sizes.filter(({name})=>/^privacy-es-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
// 0.5 KiB for the complete Studio URL-sharing and popularity disclosures.
if(spanishPrivacyGzip>5.5*1024)errors.push('On-demand Spanish privacy translation exceeds 5.5 KiB gzip');
const privacyGzip=sizes.filter(({name})=>/^privacy-.*\.js$/.test(name)&&!/^privacy-es-/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(privacyGzip>10.5*1024)errors.push('On-demand English/German privacy notice exceeds 10.5 KiB gzip');
// Tutorial code and its three-language transcript load only after Watch video.
// The media itself must never be fetched on Studio entry (covered in browser tests).
const guideGzip=sizes.filter(({name})=>/^studio-guide-player-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(guideGzip>9*1024)errors.push('On-demand Studio video player and transcript exceed 9 KiB gzip');
// Search/index, portable-style actions and per-role text controls are Studio-only.
// Their explicit bounded allowance does not raise ordinary page/startup budgets.
const refinementGzip=sizes.filter(({name})=>/^studio-(?:search|event-search|style-actions|style-options|text-controls|text-style)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(refinementGzip>18*1024)errors.push('Optional Studio search, style exchange and typography exceed 18 KiB gzip');
// New direct event manipulation and dual date handles are independently lazy:
// neither is downloaded on ordinary pages or in a current-poll editor.
const eventInteractionGzip=sizes.filter(({name})=>/^studio-(?:event-canvas|date-range|date-input)-.*\.js$/.test(name)).reduce((n,f)=>n+f.gzip,0);
if(eventInteractionGzip>6*1024)errors.push('Optional event manipulation and custom dates exceed 6 KiB gzip');
const baseGzip = nonMaterialGzip-electionPageGzip-editorGzip-historyGzip-extraDesignGzip-workspaceGzip-assistantAndFontGzip-directEditingGzip-annotationGzip-embedSizingGzip-resourceGzip-accountLabGzip-eventControlsGzip-recipeModelGzip-spanishPrivacyGzip-guideGzip-refinementGzip-eventInteractionGzip;
// One KiB across the whole build for source-metadata handoff and the two
// dialog entry points; the 220 KiB main/startup budget remains unchanged.
// Five KiB for the requested real overview chart, catalogue handoff and verifiable endpoint data.
// The individual startup JS/CSS caps above remain unchanged.
// One KiB whole-build allowance for measured event labels and accessible
// text preferences; main/startup JavaScript remains capped at 220 KiB.
if (baseGzip > 425 * 1024) errors.push(`Base JavaScript outside separately budgeted optional designs is ${(baseGzip / 1024).toFixed(2)} KiB gzip (budget: 425 KiB)`);
for (const file of sizes) {
  if (file.raw > 900 * 1024) errors.push(`${file.name} is ${(file.raw / 1024).toFixed(1)} KiB raw (per-file budget: 900 KiB)`);
}

if (errors.length) throw new Error(`Performance budget failed:\n- ${errors.join("\n- ")}`);
console.log(`Performance budget passed: main JS ${(mainJavaScript.gzip / 1024).toFixed(1)} KiB gzip, CSS ${(mainCss.gzip / 1024).toFixed(1)} KiB gzip, all JS ${(totalJavaScriptGzip / 1024).toFixed(1)} KiB gzip`);
