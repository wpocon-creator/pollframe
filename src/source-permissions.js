// Small runtime policy. Evidence and scope live in source-rights.js and the
// public source receipt, rather than adding their text to every page load.
export const USES = Object.freeze(['display','storage','png','embed','csv','publicData','publicRepository','automatedFetch','paidProduct']);
const none = Object.freeze([]);
export const SOURCE_PERMISSIONS = Object.freeze({
  dawum: USES, vault: USES, wikipedia: USES, cis: USES,
  parliament: USES, bundeswahlleiterin: USES, 'sachsen-anhalt': USES,
  'fgw-direct': none, 'ipsos-direct': none,
});
export function canUseSource(id, use) { return SOURCE_PERMISSIONS[id]?.includes(use) === true; }
export function assertSourceUse(id, use) {
  if (!canUseSource(id, use)) throw new Error(`Source permission missing: ${id}/${use}`);
}
export function pollingSourceId(metadata = {}, poll = {}) {
  if (metadata.rightsSource && !canUseSource(metadata.rightsSource, 'display')) return metadata.rightsSource;
  if (/^https:\/\/[^/]+\.wikipedia\.org\//.test(poll.compilationUrl ?? '')) return 'wikipedia';
  if (metadata.rightsSource) return metadata.rightsSource;
  if (/dawum/i.test(metadata.sourceUrl ?? '')) return 'dawum';
  if (/electiondatavault/i.test(metadata.sourceUrl ?? '')) return 'vault';
  if (/wikipedia/i.test(metadata.sourceUrl ?? '')) return 'wikipedia';
  return null;
}
