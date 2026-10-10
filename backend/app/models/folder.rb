class Folder < ApplicationRecord
  belongs_to :team
  belongs_to :creator, class_name: 'User', foreign_key: :created_by_user_id
  belongs_to :parent, class_name: 'Folder', optional: true
  has_many :children, class_name: 'Folder', foreign_key: :parent_id, dependent: :destroy
  has_many :pages, foreign_key: :folder_id, dependent: :destroy
  has_many :diagrams, foreign_key: :folder_id, dependent: :destroy

  validates :title, presence: true
  validates :item_type, inclusion: { in: %w[Page Diagram] }
  validate :parent_has_same_item_type
  validate :parent_is_not_self_or_descendant

  private

  def parent_has_same_item_type
    errors.add(:parent_id, 'must be a folder of the same type') if parent && parent.item_type != item_type
  end

  def parent_is_not_self_or_descendant
    return unless parent_id

    node = parent
    while node
      if node.id == id
        errors.add(:parent_id, "can't be this folder or one of its own descendants")
        return
      end
      node = node.parent
    end
  end
end
