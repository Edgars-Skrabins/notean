class FolderProject
  def self.apply(folder, project_id)
    folder_ids = subtree_ids(folder)

    Folder.where(id: folder_ids).update_all(project_id: project_id)
    Page.where(folder_id: folder_ids).update_all(project_id: project_id)
    Diagram.where(folder_id: folder_ids).update_all(project_id: project_id)
  end

  def self.subtree_ids(folder)
    ids = [ folder.id ]
    level = ids

    while level.any?
      level = Folder.where(parent_id: level).pluck(:id)
      ids += level
    end

    ids
  end
end
