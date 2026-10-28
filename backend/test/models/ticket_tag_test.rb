require "test_helper"

class TicketTagTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
    @ticket = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @tag = BoardTag.create!(board: @board, name: "bug", color: "red")
  end

  test "rejects a tag from another board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    other_tag = BoardTag.create!(board: other_board, name: "bug", color: "red")
    link = TicketTag.new(ticket: @ticket, tag: other_tag)

    assert_not link.valid?
    assert_includes link.errors[:tag], "must belong to the ticket's board"
  end

  test "tags a ticket at most once" do
    TicketTag.create!(ticket: @ticket, tag: @tag)

    assert_not TicketTag.new(ticket: @ticket, tag: @tag).valid?
  end

  test "a ticket carries at most 10 tags" do
    Ticket::MAX_TAGS.times do |index|
      TicketTag.create!(ticket: @ticket, tag: BoardTag.create!(board: @board, name: "tag #{index}", color: "grey"))
    end

    link = TicketTag.new(ticket: @ticket, tag: @tag)
    assert_not link.valid?
    assert_includes link.errors.details[:ticket], { error: :limit_reached }
  end

  test "tagging and untagging a stale ticket refresh updated_at and keep its lock version" do
    Ticket.find(@ticket.id).update!(description: "Saved elsewhere")

    travel_to 1.hour.from_now do
      link = @ticket.ticket_tags.create!(tag: @tag)
      assert_equal 1, @ticket.reload.lock_version
      assert_in_delta Time.current, @ticket.updated_at, 1.second

      travel 1.hour
      link.destroy!
      assert_equal 1, @ticket.reload.lock_version
      assert_in_delta Time.current, @ticket.updated_at, 1.second
    end
  end

  test "deleting a tag removes it from its tickets" do
    TicketTag.create!(ticket: @ticket, tag: @tag)

    @tag.destroy

    assert_empty @ticket.reload.tags
  end
end
