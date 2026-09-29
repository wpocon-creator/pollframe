import catalog from './studio-public-catalog.json' with { type: 'json' };
export const studioPublicCatalog = catalog;
export function studioTemplateAtPath(path) {
  return catalog.find(item => `/studio/${item.id}` === path.replace(/\/+$/, ''));
}
export function studioPublicPath(template) {
  return catalog.some(item => item.id === template) ? `/studio/${template}` : '/studio';
}
