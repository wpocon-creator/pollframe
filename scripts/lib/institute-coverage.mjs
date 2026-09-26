// Numerical records come exclusively from the attributed DAWUM ODbL database.
export const DEFAULT_FEDERAL_INSTITUTES = Object.freeze(['1','2','3','5','6','9','13']);
export const DEFAULT_REGIONAL_INSTITUTES = Object.freeze([...DEFAULT_FEDERAL_INSTITUTES,'4','16']);
// Additional published DAWUM series are selectable, not silently added to
// existing averages. Rights-pending Ipsos (17) remains excluded.
export const FEDERAL_INSTITUTES = Object.freeze([...DEFAULT_FEDERAL_INSTITUTES,'4','16','22']);
export const REGIONAL_INSTITUTES = Object.freeze([...DEFAULT_REGIONAL_INSTITUTES,'22']);
export function includesInstitute(regionType, id) {
  return (regionType === 'state' ? REGIONAL_INSTITUTES : FEDERAL_INSTITUTES).includes(id);
}
