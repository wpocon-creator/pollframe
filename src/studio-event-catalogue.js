// Studio-only editorial annotations. The public polling chart is unchanged.
// Dates are the specific decision/announcement, not a claim about polling effects.
// Primary sources checked 20 September 2026; labels are our own summaries.
const rows=[
 ['studio-gaza-ceasefire-2025','2025-10-10','global',1,'Gaza: Waffenstillstand vereinbart','Gaza ceasefire agreement','Acuerdo de alto el fuego en Gaza','https://www.bundesregierung.de/breg-de/aktuelles/bundeskanzler-friedrich-merz-erklaert-zum-waffenstillstand-in-gaza-2388480'],
 ['studio-budget-2026','2025-11-28','germany',2,'Bundestag beschließt Haushalt 2026','Bundestag passes 2026 budget','El Bundestag aprueba el presupuesto de 2026','https://www.bundestag.de/parlament/plenum/abstimmung/abstimmung?id=980'],
 ['studio-military-service-2025','2025-12-05','germany',1,'Neuer Wehrdienst beschlossen','New military service law passed','Aprobada la nueva ley de servicio militar','https://www.bundestag.de/parlament/plenum/abstimmung/abstimmung?id=984'],
 ['studio-ukraine-loan-2025','2025-12-19','europe',1,'EU einigt sich auf Ukraine-Kredit','EU agrees Ukraine loan','La UE acuerda un préstamo a Ucrania','https://www.consilium.europa.eu/en/european-council/president/x-posts/2025-12-19-025600/'],
 ['studio-basic-security-2026','2026-03-05','germany',1,'Bundestag beschließt Grundsicherungsreform','Bundestag passes welfare reform','El Bundestag aprueba la reforma de prestaciones','https://bmas.de/DE/Service/Presse/Meldungen/2026/neue-grundsicherung-verlaessliche-unterstuetzung-nachhaltige-vermittlung.html'],
 ['studio-budget-draft-2027','2026-07-06','germany',2,'Kabinett beschließt Etatentwurf 2027','Cabinet agrees draft 2027 budget','El gabinete aprueba el proyecto de presupuesto de 2027','https://www.bundestag.de/dokumente/textarchiv/2026/kw34-haushalt-2027-ablauf-1187766'],
];
export function studioCatalogue(lang='de') {
 return rows.map(([id,date,category,priority,de,en,es,source])=>({id,date,category,priority,de,en,es,source,label:lang==='de'?de:lang==='es'?es:en,studioOnly:true,election:false}));
}
