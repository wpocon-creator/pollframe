// Numerical records come exclusively from the attributed DAWUM ODbL database.
export const FEDERAL_INSTITUTES = Object.freeze(['1','2','3','5','6','9','13']);
export const REGIONAL_INSTITUTES = Object.freeze([...FEDERAL_INSTITUTES,'4','16']);
export function includesInstitute(regionType, id) {
  return (regionType === 'state' ? REGIONAL_INSTITUTES : FEDERAL_INSTITUTES).includes(id);
}
