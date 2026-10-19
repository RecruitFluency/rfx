// Message formatting shared by the dispatcher.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain-text email body → simple, safe HTML (paragraphs, line breaks, links). */
export function textToHtml(text: string): string {
  const paragraphs = text.trim().split(/\n{2,}/).map((para) => {
    const html = escapeHtml(para)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
      .replace(/\n/g, '<br>');
    return `<p style="margin:0 0 16px">${html}</p>`;
  });
  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0A0A0A">${paragraphs.join('')}</div>`;
}

/** Splits "Jane Q. Smith" into GHL's first/last name fields. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}
