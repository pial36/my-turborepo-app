const sanitizeHtml = require('sanitize-html')

// Announcements are rich text (TipTap HTML). Keep formatting tags only.
const sanitizeRichText = (html) => sanitizeHtml(String(html || ''), {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'a', 'hr'
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
  }
})

// true when sanitized HTML has no visible text (e.g. "<p></p>")
const isEmptyRichText = (html) => !sanitizeHtml(html, { allowedTags: [] }).trim()

// escape user text before putting it in an email
const escapeHtml = (text) => String(text ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

module.exports = { sanitizeRichText, isEmptyRichText, escapeHtml }
