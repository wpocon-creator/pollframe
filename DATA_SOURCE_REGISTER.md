# Pollframe data-source register

Last reviewed: 22 August 2026. This register records provenance and publication
status; it is not a legal opinion. “Review required” means that public access to
a table is not being treated as permission to republish a compiled database.

| Material | Owner / publisher | Source | Reuse basis | Pollframe use | Status |
| --- | --- | --- | --- | --- | --- |
| German federal/state voting-intention database | DAWUM | <https://dawum.de/API/> | ODbL 1.0 | Filter, normalise, average and redistribute derivative JSON with attribution/change notice | Cleared; attribution and share-alike notice published |
| German official election results | Die Bundeswahlleiterin | <https://www.bundeswahlleiterin.de/bundestagswahlen/2025/ergebnisse/opendata.html> | Datenlizenz Deutschland – Namensnennung – Version 2.0 | Baseline results and change calculations | Cleared within licence scope; source and licence link published |
| UK voting-intention archive | UK Election Data Vault | <https://electiondatavault.co.uk/data/> | Publisher’s reuse statement permits commercial/other use | Normalised polls, weighted trend and election summaries | Cleared subject to preserving source/reuse link |
| UK 2024 constituency results | UK Parliament | <https://electionresults.parliament.uk/> | Open Parliament Licence v3.0 | Candidate, vote and constituency result display | Cleared; required attribution published |
| UK postcode lookup | Postcodes.io / OS and named upstream providers | <https://postcodes.io/docs/licences/> | Service-specific open-data notices | Voluntary live lookup; no retained query; Northern Ireland excluded | Cleared within documented scope |
| Spanish national voting-intention tables | Wikipedia contributors and cited pollsters | <https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Spanish_general_election> | CC BY-SA 4.0 for Wikipedia compilation | Normalised historical table with archive attribution and original citations where available | Cleared for compilation; preserve CC BY-SA attribution/share-alike |
| Spanish concerns/economic snapshots | Centro de Investigaciones Sociológicas | <https://www.cis.es/> | CIS reuse terms permit commercial and non-commercial reuse with attribution and integrity requirements | Current national percentages and question wording | Cleared within the published reuse terms; preserve attribution and question context |
| Spanish regional polling/elections | Wikipedia contributors, cited pollsters and official election sources listed in dataset metadata | `public/data/spain-regions.json` | Mixed: CC BY-SA compilation plus official/cited sources | Latest election and polling snapshots by autonomous community | Per-source review required; pages remain accessible but noindex and excluded from the sitemap |
| German government/chancellor evaluations | Forschungsgruppe Wahlen / Politbarometer | <https://www.forschungsgruppe.de/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick/Politik_II/> | Written permission for Pollframe’s public use with attribution | Historical answer shares and calculated net values | Cleared within the permission’s scope; preserve source credit |
| UK government/prime-minister satisfaction | Ipsos Political Monitor | <https://www.ipsos.com/en-uk/political-monitor-satisfaction-ratings-1997-present> | Public tables, no commercial reuse permission recorded | Historical answer shares and calculated net values | Quarantined locally and excluded from publication pending commercial clearance |
| UK problems/personal concerns/economic perceptions | Ipsos | Source links retained in the local rights-pending recovery snapshot | Public releases, no commercial reuse permission recorded | Limited current snapshots and wording | Quarantined locally and excluded from publication pending commercial clearance |
| Spanish leader evaluation archive | CIS | Source links in `scripts/update-approval-data.mjs` | CIS reuse terms permit reuse with attribution and integrity requirements | Retained in the dataset but not offered as a public approval route | Rights basis recorded; route remains disabled for product/data-quality reasons |
| Party profiles | Official party manifestos/pages plus neutral institutional/reference sources linked in `src/party-profiles.jsx` | Per-profile links | Facts are summarised; no long quotations or copied profile text | Neutral orientation and policy summary in modal | Editorial source review; links and update dates must remain current |
| German map geometry | `@svg-maps/germany` | npm package metadata/LICENCE | MIT | Interactive state geometry | Cleared |
| UK map geometry | `@react-map/united-kingdom` | npm package metadata/LICENCE | MIT | Interactive national/regional geometry | Cleared |
| Spain autonomy geometry | Data source named on the public licences page and dataset metadata | `public/data/spain-autonomies.geojson` | Attribution terms recorded with dataset | Simplified autonomy map | Confirm attribution text whenever geometry is replaced |

## Release rule

No row marked “review required” should be represented as openly licensed. Before
public promotion, either obtain written permission, record a qualified reuse
assessment with its scope, or keep the affected module unpublished. Store any
permission email outside the public repository and record only its date, scope
and responsible reviewer here.
