export interface TitledItem {
  id: number;
  title: string;
}

export function compareByTitle(a: TitledItem, b: TitledItem): number {
  return a.title.toLowerCase().localeCompare(b.title.toLowerCase()) || a.id - b.id;
}
