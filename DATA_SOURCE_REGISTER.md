# Pollframe data-source register

Last reviewed: 26 September 2026. This register records provenance and publication
status; it is not a legal opinion. “Review required” means that public access to
a table is not being treated as permission to republish a compiled database.

Important: the detailed production audit in `DATA_RIGHTS_AUDIT_2026-09-26.md`
qualifies the older “cleared” labels below. A commercial-compatible source
licence does not mean every PNG, CSV or standalone dataset currently carries
all required notices. The identified export/provenance gaps remain release work.

| Material | Owner / publisher | Source | Reuse basis | Pollframe use | Status |
| --- | --- | --- | --- | --- | --- |
| German federal/state voting-intention database | DAWUM | <https://dawum.de/API/> | ODbL 1.0 | Filter, normalise, average and redistribute derivative JSON with attribution/change notice | Cleared; attribution and share-alike notice published |
| German official election results | Die Bundeswahlleiterin | <https://www.bundeswahlleiterin.de/bundestagswahlen/2025/ergebnisse/opendata.html> | Datenlizenz Deutschland – Namensnennung – Version 2.0 | Baseline results and change calculations | Cleared within licence scope; source and licence link published |
| UK voting-intention archive | UK Election Data Vault | <https://electiondatavault.co.uk/data/> | Publisher’s reuse statement permits commercial/other use | Normalised polls, weighted trend and election summaries | Cleared subject to preserving source/reuse link |
| Recent UK voting-intention supplement | Wikipedia contributors, with original poll references | <https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_United_Kingdom_general_election> | CC BY-SA 4.0 for the reused compilation | National GB rows newer than the Vault feed; source links preserved; extra parties grouped in Other; Ipsos excluded | Attribution and modification notice in dataset, info, sources page and exports; supplemented compilation redistributed under CC BY-SA 4.0 |
| UK 2024 constituency results | UK Parliament | <https://electionresults.parliament.uk/> | Open Parliament Licence v3.0 | Candidate, vote and constituency result display | Cleared; required attribution published |
| UK postcode lookup | Postcodes.io / OS and named upstream providers | <https://postcodes.io/docs/licences/> | Service-specific open-data notices | Voluntary live lookup; no retained query; Northern Ireland excluded | Cleared within documented scope |
| Spanish national voting-intention tables | Wikipedia contributors and cited pollsters | <https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Spanish_general_election> | CC BY-SA 4.0 for Wikipedia compilation | Normalised historical table with archive attribution and original citations where available | Cleared for compilation; preserve CC BY-SA attribution/share-alike |
| Spanish concerns/economic snapshots | Centro de Investigaciones Sociológicas | <https://www.cis.es/> | CIS reuse terms permit commercial and non-commercial reuse with attribution and integrity requirements | Current national percentages and question wording | Cleared within the published reuse terms; preserve attribution and question context |
| Spanish regional polling/elections | Wikipedia contributors, original references linked per row | `public/data/spain-regions.json` | Actual importer reads Wikipedia compilations under CC BY-SA 4.0, not each cited publisher directly | Latest election and polling snapshots by autonomous community | Licence/provenance display incomplete; noindex is NOT a rights safeguard. Record compilation licence URL, modifications and all imported archive pages. Third-party rights are not guaranteed by Wikipedia's licence. |
| German government/chancellor evaluations | Forschungsgruppe Wahlen / Politbarometer | <https://www.forschungsgruppe.de/Imprint/> | No verified permission; the previous clearance claim was unsupported and is withdrawn | Historical answer shares and calculated net values | Withdrawn from publication 2026-09-21; importer disabled; private recovery copy retained pending documented permission |
| UK government/prime-minister satisfaction | Ipsos Political Monitor | <https://www.ipsos.com/en-uk/political-monitor-satisfaction-ratings-1997-present> | Public tables, no commercial reuse permission recorded | Historical answer shares and calculated net values | Quarantined locally and excluded from publication pending commercial clearance |
| UK problems/personal concerns/economic perceptions | Ipsos | Source links retained in the local rights-pending recovery snapshot | Public releases, no commercial reuse permission recorded | Limited current snapshots and wording | Quarantined locally and excluded from publication pending commercial clearance |
| Spanish leader evaluation archive | CIS | Source links in `scripts/update-approval-data.mjs` | CIS reuse terms permit reuse with attribution and integrity requirements | Retained in the dataset but not offered as a public approval route | Rights basis recorded; route remains disabled for product/data-quality reasons |
| Party profiles | Official party manifestos/pages plus neutral institutional/reference sources linked in `src/party-profiles.jsx` | Per-profile links | Facts are summarised; no long quotations or copied profile text | Neutral orientation and policy summary in modal | Editorial source review; links and update dates must remain current |
| German map geometry | MapSVG / Victor Cazanave, `@svg-maps/germany` | npm package metadata/README | CC BY 4.0 (the earlier MIT entry was wrong) | Interactive state geometry | Commercial reuse permitted with attribution and modification notice; review standalone image notices |
| UK map geometry | `@react-map/united-kingdom` | npm package metadata/LICENCE | MIT | Interactive national/regional geometry | Cleared |
| Spain autonomy geometry | IGN BDLJE via Opendatasoft georef | `public/data/spain-autonomies.geojson` | CC BY 4.0, verified against exact dataset API metadata on 2026-09-26 | Simplified autonomy map | Preserve IGN and Opendatasoft credit, licence and modification notice |
| Inter font | Inter Project Authors | `@fontsource-variable/inter` | SIL Open Font License 1.1 | Self-hosted web font and exported text | Commercial use permitted; distributed WOFF2 has copyright and licence URL, but publish full accessible OFL notice as well |

## Release rule

No row marked “review required” should be represented as openly licensed. Before
public promotion, either obtain written permission, record a qualified reuse
assessment with its scope, or keep the affected module unpublished. Store any
permission email outside the public repository and record only its date, scope
and responsible reviewer here.
