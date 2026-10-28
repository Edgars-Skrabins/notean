class Folder < ApplicationRecord
  include BelongsToProject
  include ContentLimits
  include Trashable

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  belongs_to :parent, class_name: "Folder", optional: true
  has_many :children, class_name: "Folder", foreign_key: :parent_id, dependent: :destroy
  has_many :pages, foreign_key: :folder_id, dependent: :destroy
  has_many :diagrams, foreign_key: :folder_id, dependent: :destroy

  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :item_type, inclusion: { in: %w[Page Diagram] }
  validate :parent_has_same_item_type
  validate :parent_is_not_self_or_descendant
  validate :project_matches_parent

  before_destroy :release_trashed_contents

  private

  def release_trashed_contents
    [ Page, Diagram ].each { |klass| klass.unscoped.where(folder_id: id).where.not(trash_entry_id: nil).update_all(folder_id: nil) }
    Folder.unscoped.where(parent_id: id).where.not(trash_entry_id: nil).update_all(parent_id: nil)
  end

  def parent_has_same_item_type
    errors.add(:parent_id, :type_mismatch, message: "must be a folder of the same type") if parent && parent.item_type != item_type
  end

  def project_matches_parent
    errors.add(:project_id, :project_set_by_folder, message: "must match the parent folder's project") if parent && parent.project_id != project_id
  end

  def parent_is_not_self_or_descendant
    return unless parent_id

    node = parent
    while node
      if node.id == id
        errors.add(:parent_id, :circular, message: "can't be this folder or one of its own descendants")
        return
      end
      node = node.parent
    end
  end
end
