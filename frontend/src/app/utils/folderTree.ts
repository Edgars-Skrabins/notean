interface FolderNode {
  id: number;
  parentId: number | null;
}

interface FolderedNode {
  id: number;
  folderId: number | null;
}

export function descendantFolderIds(folders: FolderNode[], folderId: number): number[] {
  const folderIds = new Set([folderId]);
  let added = true;

  while (added) {
    added = false;
    for (const folder of folders) {
      if (folder.parentId !== null && folderIds.has(folder.parentId) && !folderIds.has(folder.id)) {
        folderIds.add(folder.id);
        added = true;
      }
    }
  }

  folderIds.delete(folderId);
  return [...folderIds];
}

export function itemIdsWithin(folders: FolderNode[], items: FolderedNode[], folderId: number): number[] {
  const folderIds = new Set([folderId, ...descendantFolderIds(folders, folderId)]);
  return items
    .filter((item) => item.folderId !== null && folderIds.has(item.folderId))
    .map((item) => item.id);
}

export function removeFolderCascade<F extends FolderNode, I extends FolderedNode>(
  folders: F[],
  items: I[],
  folderId: number,
): { folders: F[]; items: I[] } {
  const removedFolderIds = new Set([folderId, ...descendantFolderIds(folders, folderId)]);
  return {
    folders: folders.filter((folder) => !removedFolderIds.has(folder.id)),
    items: items.filter((item) => item.folderId === null || !removedFolderIds.has(item.folderId)),
  };
}

export function promoteFolderContents<F extends FolderNode, I extends FolderedNode>(
  folders: F[],
  items: I[],
  folderId: number,
): { folders: F[]; items: I[] } {
  const parentId = folders.find((folder) => folder.id === folderId)?.parentId ?? null;
  return {
    folders: folders
      .filter((folder) => folder.id !== folderId)
      .map((folder) => folder.parentId === folderId ? {...folder, parentId} : folder),
    items: items.map((item) => item.folderId === folderId ? {...item, folderId: parentId} : item),
  };
}
