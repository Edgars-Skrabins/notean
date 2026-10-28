import {Injectable} from '@angular/core';

const STORAGE_KEY = 'recentReactions';
const RECENT_COUNT = 6;

export const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

@Injectable({
  providedIn: 'root',
})
export class RecentReactionsService {
  recent: string[] = this.read();

  use(emoji: string) {
    this.recent = [emoji, ...this.recent.filter((existing) => existing !== emoji)].slice(0, RECENT_COUNT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.recent));
  }

  private read(): string[] {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Array.isArray(stored) && stored.every((emoji) => typeof emoji === 'string')) {
        return [...stored, ...DEFAULT_REACTIONS.filter((emoji) => !stored.includes(emoji))].slice(0, RECENT_COUNT);
      }
    } catch {
      return [...DEFAULT_REACTIONS];
    }
    return [...DEFAULT_REACTIONS];
  }
}
