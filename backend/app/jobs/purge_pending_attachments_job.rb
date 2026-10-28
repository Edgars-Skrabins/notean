class PurgePendingAttachmentsJob < ApplicationJob
  def perform
    Attachment.purge_stale_pending
  end
end
