class AttachmentReference < ApplicationRecord
  belongs_to :attachment
  belongs_to :page

  validates :page_id, uniqueness: { scope: :attachment_id }
end
