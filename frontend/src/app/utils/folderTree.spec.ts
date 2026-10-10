import {descendantFolderIds, itemIdsWithin, promoteFolderContents, removeFolderCascade} from "./folderTree";

describe('folderTree', () => {
  const folders = [
    {id: 1, parentId: null},
    {id: 2, parentId: 1},
    {id: 3, parentId: 2},
    {id: 4, parentId: null},
  ];
  const items = [
    {id: 10, folderId: 1},
    {id: 11, folderId: 3},
    {id: 12, folderId: 4},
    {id: 13, folderId: null},
  ];

  it('finds every nested folder below a folder', () => {
    expect(descendantFolderIds(folders, 1).sort()).toEqual([2, 3]);
    expect(descendantFolderIds(folders, 4)).toEqual([]);
  });

  it('finds the items inside a folder and its subfolders', () => {
    expect(itemIdsWithin(folders, items, 1).sort()).toEqual([10, 11]);
  });

  it('cascade removes the folder, its subfolders and their items only', () => {
    const result = removeFolderCascade(folders, items, 1);

    expect(result.folders.map((folder) => folder.id)).toEqual([4]);
    expect(result.items.map((item) => item.id)).toEqual([12, 13]);
  });

  it('promote moves direct children and items up to the parent', () => {
    const result = promoteFolderContents(folders, items, 2);

    expect(result.folders).toEqual([
      {id: 1, parentId: null},
      {id: 3, parentId: 1},
      {id: 4, parentId: null},
    ]);
    expect(result.items).toEqual(items);
  });

  it('promote moves items of a top-level folder to the root', () => {
    const result = promoteFolderContents(folders, items, 1);

    expect(result.folders.find((folder) => folder.id === 2)?.parentId).toBeNull();
    expect(result.items.find((item) => item.id === 10)?.folderId).toBeNull();
  });
});
