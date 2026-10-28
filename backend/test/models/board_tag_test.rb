require "test_helper"

class BoardTagTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  def tag(attributes = {})
    BoardTag.new({ board: @board, name: "frontend", color: "blue" }.merge(attributes))
  end

  test "requires a name of 1 to 24 characters after trimming" do
    assert_not tag(name: "   ").valid?
    assert_not tag(name: "a" * 25).valid?
    assert tag(name: "  #{"a" * 24}  ").valid?
  end

  test "names are unique per board, ignoring case and surrounding spaces" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    tag.save!

    assert_not tag(name: " FRONTEND ").valid?
    assert tag(name: "FRONTEND", board: other_board).valid?
  end

  test "requires a known colour" do
    assert_not tag(color: "pink").valid?
  end

  test "a board holds at most 100 tags" do
    BoardTag::MAX_PER_BOARD.times { |index| BoardTag.create!(board: @board, name: "tag #{index}", color: "grey") }

    assert_includes tag.tap(&:valid?).errors.details[:board], { error: :limit_reached }
    assert BoardTag.first.update(name: "renamed")
  end

  test "next_color picks the least used colour, first in order on a tie" do
    assert_equal "grey", BoardTag.next_color(@board)

    BoardTag.create!(board: @board, name: "a", color: "grey")
    BoardTag.create!(board: @board, name: "b", color: "teal")
    assert_equal "blue", BoardTag.next_color(@board)

    (BoardTag::COLORS - %w[grey teal]).each { |color| BoardTag.create!(board: @board, name: color, color: color) }
    BoardTag.create!(board: @board, name: "c", color: "grey")
    assert_equal "blue", BoardTag.next_color(@board)
  end

  test "deleting the board deletes its tags and their links" do
    column = Column.create!(board: @board, title: "To Do", position: 0)
    ticket = Ticket.create!(column: column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    TicketTag.create!(ticket: ticket, tag: tag.tap(&:save!))

    @board.destroy

    assert_equal 0, BoardTag.count
    assert_equal 0, TicketTag.count
  end
end
