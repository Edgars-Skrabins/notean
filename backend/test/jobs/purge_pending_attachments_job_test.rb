require "test_helper"

class PurgePendingAttachmentsJobTest < ActiveJob::TestCase
  test "deletes pending uploads past their lifetime and their files" do
    team = Team.create!(name: "Engineering", password: "supersecret")
    user = create_member(team, "Alice")
    stale = create_attachment(nil, user, team: team)
    stale.update_column(:created_at, (Attachment::PENDING_TTL + 1.minute).ago)
    fresh = create_attachment(nil, user, team: team)

    perform_enqueued_jobs { PurgePendingAttachmentsJob.perform_now }

    assert_equal [ fresh.id ], Attachment.pluck(:id)
    assert_not ActiveStorage::Blob.exists?(stale.file.blob.id)
  end
end
