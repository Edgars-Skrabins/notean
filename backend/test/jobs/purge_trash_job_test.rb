require "test_helper"

class PurgeTrashJobTest < ActiveJob::TestCase
  test "purges only entries past the retention period" do
    team = Team.create!(name: "Engineering", password: "supersecret")
    user = create_member(team, "Alice")
    expired = Page.create!(team: team, creator: user, title: "Old")
    fresh = Page.create!(team: team, creator: user, title: "New")
    Trash.move(expired, user).update_column(:created_at, (TrashEntry::RETENTION + 1.hour).ago)
    Trash.move(fresh, user)

    PurgeTrashJob.perform_now

    assert_not Page.unscoped.exists?(expired.id)
    assert Page.unscoped.exists?(fresh.id)
    assert_equal 1, TrashEntry.count
  end
end
