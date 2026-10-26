require "test_helper"

class BoardTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  test "is invalid without a title" do
    board = Board.new(team: @team, creator: @user, title: nil)

    assert_not board.valid?
    assert_includes board.errors[:title], "can't be blank"
  end

  test "accepts a title at the length limit and rejects one over it" do
    assert Board.new(team: @team, creator: @user, title: "a" * ContentLimits::TITLE_MAX_LENGTH).valid?

    record = Board.new(team: @team, creator: @user, title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1))
    assert_not record.valid?
    assert record.errors.of_kind?(:title, :too_long)
  end

  test "is valid with a title" do
    assert Board.new(team: @team, creator: @user, title: "Sprint 12").valid?
  end

  test "columns association is ordered by position" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    done = Column.create!(board: board, title: "Done", position: 2)
    todo = Column.create!(board: board, title: "To Do", position: 0)
    doing = Column.create!(board: board, title: "Doing", position: 1)

    assert_equal [ todo, doing, done ], board.columns
  end

  test "destroying a board destroys its columns" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)

    board.destroy

    assert_nil Column.find_by(id: column.id)
  end

  test "a new board starts with the five default priorities in order" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")

    assert_equal [
      [ "Very low", "grey", 0 ], [ "Low", "blue", 1 ], [ "Medium", "yellow", 2 ], [ "High", "orange", 3 ], [ "Very high", "red", 4 ]
    ], board.priorities.map { |priority| [ priority.name, priority.color, priority.position ] }
  end

  test "destroying a board destroys its priorities" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    Ticket.create!(board: board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0, priority: board.priorities.first)

    board.destroy

    assert_equal 0, BoardPriority.where(board_id: board.id).count
  end
end
