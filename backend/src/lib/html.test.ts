import { describe, expect, it } from 'vitest';
import { bodyToHtml, cleanHtml, toPlainText } from './html';

// [name, html that is trying something, a word that must not survive]
const attacks: [string, string, string][] = [
  ['script tag', '<script>alert(1)</script>hello', 'alert'],
  ['onerror handler', '<img src=x onerror=alert(1)>', 'onerror'],
  ['javascript link', '<a href="javascript:alert(1)">x</a>', 'javascript'],
  ['mixed case javascript link', '<a href="JaVaScRiPt:alert(1)">x</a>', 'javascript'],
  ['data link', '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>', 'data:'],
  ['style with url', '<div style="background:url(javascript:alert(1))">x</div>', 'url('],
  ['fixed position style', '<div style="position:fixed;top:0">x</div>', 'position'],
  ['svg onload', '<svg onload=alert(1)>', 'onload'],
  ['iframe', '<iframe src="https://evil.example"></iframe>', 'iframe'],
  ['style tag', '<style>body{display:none}</style>text', 'display'],
  ['protocol relative link', '<a href="//evil.example/phish">x</a>', 'evil.example'],
];

describe('cleanHtml removes dangerous html', () => {
  it.each(attacks)('%s', (_name, input, forbidden) => {
    expect(cleanHtml(input).toLowerCase()).not.toContain(forbidden);
  });
});

describe('cleanHtml keeps what the editor makes', () => {
  it('keeps basic formatting', () => {
    const html = '<b>bold</b> <i>italic</i> <u>under</u> <strike>old</strike>';
    expect(cleanHtml(html)).toBe(html);
  });

  it('keeps lists and quotes', () => {
    const html = '<ul><li>one</li></ul><ol><li>two</li></ol><blockquote>quote</blockquote>';
    expect(cleanHtml(html)).toBe(html);
  });

  it('keeps alignment, indent margins and font sizes', () => {
    expect(cleanHtml('<div style="text-align: center;">hi</div>')).toContain('text-align');
    expect(
      cleanHtml('<blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;">q</blockquote>'),
    ).toContain('margin');
    expect(cleanHtml('<font size="5">big</font>')).toContain('size="5"');
  });

  it('keeps normal links and makes them open safely', () => {
    const html = cleanHtml('<a href="https://example.com/page">link</a>');
    expect(html).toContain('href="https://example.com/page"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('keeps mailto links', () => {
    expect(cleanHtml('<a href="mailto:hi@example.com">mail</a>')).toContain('href="mailto:hi@example.com"');
  });
});

describe('toPlainText', () => {
  it('turns paragraphs and line breaks into new lines', () => {
    expect(toPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo');
    expect(toPlainText('one<br>two')).toBe('one\ntwo');
  });

  it('turns html entities back into characters', () => {
    expect(toPlainText('Tom &amp; Jerry &lt;3')).toBe('Tom & Jerry <3');
  });

  it('drops scripts and their content', () => {
    expect(toPlainText('hi<script>alert(1)</script>there')).toBe('hithere');
  });

  it('squeezes long gaps and trims the ends', () => {
    expect(toPlainText('<p>a</p><p></p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
    expect(toPlainText('  <p>x</p>  ')).toBe('x');
  });
});

describe('bodyToHtml', () => {
  it('turns old plain text into html with line breaks', () => {
    expect(bodyToHtml('line one\nline two')).toBe('line one<br>line two');
  });

  it('escapes the characters of plain text', () => {
    expect(bodyToHtml('1 < 2 & 3 > 2')).toBe('1 &lt; 2 &amp; 3 &gt; 2');
  });

  it('leaves real html alone', () => {
    expect(bodyToHtml('<p>already html</p>')).toBe('<p>already html</p>');
  });
});