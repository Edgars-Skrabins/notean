export interface SnippetParts {
  before: string;
  match: string;
  after: string;
}

export function splitSnippet(snippet: string, query: string): SnippetParts {
  const term = query.trim().toLowerCase();
  const index = term ? snippet.toLowerCase().indexOf(term) : -1;
  if (index < 0) {
    return {before: snippet, match: '', after: ''};
  }
  return {
    before: snippet.slice(0, index),
    match: snippet.slice(index, index + term.length),
    after: snippet.slice(index + term.length),
  };
}
