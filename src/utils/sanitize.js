/**
 * Escape HTML special characters to prevent XSS in PDF template generation.
 * @param {string} str - Raw string to escape
 * @returns {string} Escaped string safe for insertion into HTML
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
