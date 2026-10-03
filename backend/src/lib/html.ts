import sanitizeHtml from 'sanitize-html';

// only characters that cannot hide a url or a script
const SAFE_STYLE = /^[0-9a-z\s.%-]+$/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote', 'a', 'font', 'h1', 'h2', 'h3', 'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    font: ['size'],
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      margin: [SAFE_STYLE],
      'margin-left': [SAFE_STYLE],
      padding: [SAFE_STYLE],
      border: [SAFE_STYLE],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

// the editor is the only source of email html, and this keeps it harmless
export function cleanHtml(html: string) {
  return sanitizeHtml(html, OPTIONS);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// older emails were saved as plain text
export function bodyToHtml(body: string) {
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(body);
  return looksLikeHtml ? body : escapeHtml(body).replace(/\r?\n/g, '<br>');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

// plain text version, used for the text part of the email, previews and search
export function toPlainText(html: string) {
  const withBreaks = html.replace(/<(?:br|\/p|\/div|\/li|\/h[1-3]|\/blockquote)\s*\/?>/gi, '\n');
  const stripped = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });

  return stripped
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match] ?? match)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}