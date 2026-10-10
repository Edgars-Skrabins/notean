require "test_helper"

class ColumnTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
  end

  test "is invalid without a title" do
    column = Column.new(board: @board, title: nil, position: 0)

    assert_not column.valid?
    assert_includes column.errors[:title], "can't be blank"
  end

  test "is invalid without a position" do
    column = Column.new(board: @board, title: "To Do", position: nil)

    assert_not column.valid?
    assert_includes column.errors[:position], "can't be blank"
  end

  test "is valid with a title and position" do
    assert Column.new(board: @board, title: "To Do", position: 0).valid?
  end
end
