require "test_helper"

class BoardPriorityTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  def priority(attributes = {})
    BoardPriority.new({ board: @board, name: "Urgent", color: "red", position: 5 }.merge(attributes))
  end

  test "is valid with a name, a known colour and a position" do
    assert priority.valid?
  end

  test "requires a name of at most 40 characters" do
    assert_not priority(name: "").valid?
    assert_not priority(name: "a" * 41).valid?
    assert priority(name: "a" * 40).valid?
  end

  test "names are unique per board, ignoring case" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    priority.save!

    assert_not priority(name: "URGENT").valid?
    assert priority(name: "URGENT", board: other_board).valid?
  end

  test "only accepts the palette colours" do
    assert_not priority(color: "pink").valid?
    BoardPriority::COLORS.each { |color| assert priority(color: color).valid? }
  end

  test "requires a position" do
    assert_not priority(position: nil).valid?
  end

  test "deleting a priority leaves its tickets without one" do
    high = @board.priorities.find_by!(name: "High")
    ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0, priority: high)

    high.destroy

    assert_nil ticket.reload.priority_id
  end
end
