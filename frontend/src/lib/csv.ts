export const MAX_EMAILS = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedLeads = {
  emails: string[];
  invalid: number;
  duplicates: number;
};

// works for csv or plain text, anything with an @ counts, names and headers are ignored
export function parseLeads(text: string): ParsedLeads {
  const seen = new Set<string>();
  let invalid = 0;
  let duplicates = 0;

  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/^["'<(]+|["'>),.]+$/g, '').toLowerCase();
    if (!token.includes('@')) continue;

    if (!EMAIL_RE.test(token)) {
      invalid++;
    } else if (seen.has(token)) {
      duplicates++;
    } else {
      seen.add(token);
    }
  }

  return { emails: [...seen], invalid, duplicates };
}