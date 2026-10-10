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

  test "is valid with a title" do
    assert Board.new(team: @team, creator: @user, title: "Sprint 12").valid?
  end

  test "columns association is ordered by position" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    done = Column.create!(board: board, title: "Done", position: 2)
    todo = Column.create!(board: board, title: "To Do", position: 0)
    doing = Column.create!(board: board, title: "Doing", position: 1)

    assert_equal [todo, doing, done], board.columns
  end

  test "destroying a board destroys its columns" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)

    board.destroy

    assert_nil Column.find_by(id: column.id)
  end
end
