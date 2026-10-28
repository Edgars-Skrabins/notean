function commentText(html: string): string {
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function hasCommentText(html: string): boolean {
  return commentText(html) !== '';
}

export function commentExcerpt(html: string, length = 120): string {
  const text = commentText(html);
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
