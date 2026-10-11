class FolderVisibility
  def initialize(folders, item_folder_ids:, matching_folder_ids:, include_empty:)
    @parent_ids = folders.to_h { |folder| [ folder.id, folder.parent_id ] }
    @item_folder_ids = item_folder_ids
    @matching_folder_ids = matching_folder_ids
    @include_empty = include_empty
  end

  def visible_ids
    shown = Set.new
    @matching_folder_ids.each { |folder_id| add_with_ancestors(shown, folder_id) }
    return shown unless @include_empty

    holding_items = Set.new
    @item_folder_ids.each { |folder_id| add_with_ancestors(holding_items, folder_id) }
    @parent_ids.each_key { |folder_id| add_with_ancestors(shown, folder_id) unless holding_items.include?(folder_id) }
    shown
  end

  private

  def add_with_ancestors(set, folder_id)
    while folder_id && @parent_ids.key?(folder_id) && set.add?(folder_id)
      folder_id = @parent_ids[folder_id]
    end
  end
end
