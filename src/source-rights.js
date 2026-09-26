// Publication permissions are per source AND per use, not per pollster name.
// Evidence emails stay private. A code-reviewed reference is required before
// changing a withheld permission; a runtime environment flag is not a grant.
import { USES } from './source-permissions.js';
export { USES };
const uses = (allowed) => Object.freeze(Object.fromEntries(USES.map(use => [use, allowed.includes(use)])));
const open = (evidence, scope) => Object.freeze({ status: 'licensed', evidence, scope, reviewed: '2026-09-26', uses: uses(USES) });
const pending = (evidence, scope) => Object.freeze({ status: 'permission-required', evidence, scope, reviewed: '2026-09-26', uses: uses([]) });
export const SOURCE_RIGHTS = Object.freeze({
  dawum: open('https://dawum.de/API/', 'Numerical polling records from the ODbL API; preserve attribution, changes and derivative database access.'),
  vault: open('https://electiondatavault.co.uk/about/', 'The Vault compilation and supplied calculations; not a licence to scrape original pollster archives.'),
  wikipedia: open('https://creativecommons.org/licenses/by-sa/4.0/', 'Attributed Wikipedia numerical compilations; CC BY-SA for adapted compilations, not copied third-party articles or graphics.'),
  cis: open('https://www.cis.es/es/condiciones-reutilizaci%C3%B3n-datos-del-cis', 'Published aggregate CIS data with source, study/date, integrity and no endorsement.'),
  parliament: open('https://www.parliament.uk/site-information/copyright/open-parliament-licence/', 'Published election results with the prescribed attribution; no additional personal data.'),
  bundeswahlleiterin: open('https://www.bundeswahlleiterin.de/info/impressum.html', 'Official numerical election results with publisher credit and modification notice.'),
  'sachsen-anhalt': open('https://statistik.sachsen-anhalt.de/wir-ueber-uns-service/agb', 'Official numerical results under dl-de/by-2-0; source URI and own calculation/presentation notice.'),
  'fgw-direct': pending('https://www.forschungsgruppe.de/Imprint/', 'Direct approval archive: separate from FGW voting intention recorded in DAWUM.'),
  'ipsos-direct': pending('https://www.ipsos.com/en/legal-mentions', 'Direct Ipsos archives, Issues Index and economic/approval tables; commercial permission not recorded.'),
});
export { canUseSource, assertSourceUse, pollingSourceId } from './source-permissions.js';
