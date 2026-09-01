/** Escapes untrusted search text so MongoDB regex queries perform literal matching. */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
