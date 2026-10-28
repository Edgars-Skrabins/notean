require "test_helper"

class AttachmentTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = create_member(@team, "Alice")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  test "rejects files over the size limit" do
    attachment = Attachment.new(team: @team, attachable: @ticket, kind: "file", creator: @user)
    attachment.file.attach(io: StringIO.new("a" * (Attachment::MAX_BYTES + 1)), filename: "big.bin", content_type: "application/octet-stream")

    assert_not attachment.valid?
    assert attachment.errors.of_kind?(:file, :too_large)
  end

  test "inline attachments must be images and never belong to tickets" do
    text = Attachment.new(team: @team, attachable: @page, kind: "inline", creator: @user)
    text.file.attach(io: file_fixture("notes.txt").open, filename: "notes.txt", content_type: "text/plain")
    assert_not text.valid?
    assert text.errors.of_kind?(:kind, :inline_image_type)

    on_ticket = Attachment.new(team: @team, attachable: @ticket, kind: "inline", creator: @user)
    on_ticket.file.attach(io: file_fixture("avatar.png").open, filename: "avatar.png", content_type: "image/png")
    assert_not on_ticket.valid?
    assert on_ticket.errors.of_kind?(:kind, :ticket_inline)
  end

  test "team usage sums every row including pending ones and copies" do
    first = create_attachment(@ticket, @user)
    create_attachment(nil, @user, team: @team, kind: "inline")
    first.copy_for(@page, @user).save!

    assert_equal 3 * first.byte_size, Attachment.team_usage(@team)
    assert Attachment.fits_quota?(@team, Attachment::TEAM_QUOTA_BYTES - 3 * first.byte_size)
    assert_not Attachment.fits_quota?(@team, Attachment::TEAM_QUOTA_BYTES - 3 * first.byte_size + 1)
  end

  test "a copy keeps the shared blob after the original is destroyed" do
    original = create_attachment(@ticket, @user)
    copy = original.copy_for(@page, @user)
    copy.save!
    blob = original.file.blob

    perform_enqueued_jobs { original.destroy }
    assert ActiveStorage::Blob.exists?(blob.id)

    perform_enqueued_jobs { copy.destroy }
    assert_not ActiveStorage::Blob.exists?(blob.id)
  end

  test "ticket attachments change the count and updated_at without bumping lock_version" do
    travel_to 1.hour.from_now do
      attachment = create_attachment(@ticket, @user)
      @ticket.reload
      assert_equal 1, @ticket.attachments_count
      assert_equal 0, @ticket.lock_version
      assert_in_delta Time.current, @ticket.updated_at, 1.second

      attachment.destroy
      @ticket.reload
      assert_equal 0, @ticket.attachments_count
      assert_equal 0, @ticket.lock_version
    end
  end

  test "destroying a ticket or page destroys its attachments" do
    create_attachment(@ticket, @user)
    create_attachment(@page, @user, kind: "inline")

    @ticket.destroy
    @page.destroy

    assert_equal 0, Attachment.count
  end

  test "deleting a board, column, folder or team removes the attachments inside it" do
    column = Column.create!(board: @board, title: "To Do", position: 0)
    in_column = Ticket.create!(column: column, team: @team, created_by_user_id: @user.id, title: "In column", position: 0)
    folder = Folder.create!(team: @team, creator: @user, title: "Docs", item_type: "Page")
    in_folder = Page.create!(team: @team, creator: @user, title: "In folder", content: "", folder: folder)
    attachments = [ in_column, @ticket, in_folder ].map { |item| create_attachment(item, @user) }

    column.destroy
    assert_not Attachment.exists?(attachments[0].id)
    @board.destroy
    assert_not Attachment.exists?(attachments[1].id)
    folder.destroy
    assert_not Attachment.exists?(attachments[2].id)

    create_attachment(@page, @user)
    create_attachment(nil, @user, team: @team)
    @team.destroy
    assert_equal 0, Attachment.count
  end

  test "purging trashed items removes their attachments and files" do
    page_file = create_attachment(@page, @user, kind: "inline")
    ticket_file = create_attachment(@ticket, @user)
    blob_ids = [ page_file, ticket_file ].map { |attachment| attachment.file.blob.id }
    entries = [ Trash.move(@page, @user), Trash.move(@board, @user) ]

    assert_equal 2, Attachment.count
    perform_enqueued_jobs { entries.each { |entry| Trash.purge(entry) } }

    assert_equal 0, Attachment.count
    assert_not ActiveStorage::Blob.exists?(id: blob_ids)
  end

  test "purge_stale_pending removes only old unclaimed uploads" do
    stale = create_attachment(nil, @user, team: @team)
    stale.update_column(:created_at, (Attachment::PENDING_TTL + 1.minute).ago)
    fresh = create_attachment(nil, @user, team: @team)
    claimed = create_attachment(@page, @user)
    claimed.update_column(:created_at, 2.days.ago)

    Attachment.purge_stale_pending

    assert_equal [ claimed.id, fresh.id ].sort, Attachment.pluck(:id).sort
  end
end
