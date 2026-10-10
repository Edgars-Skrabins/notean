require "test_helper"

class CardTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  test "is invalid without a title" do
    card = Card.new(column: @column, team: @team, created_by_user_id: @user.id, title: nil, position: 0)

    assert_not card.valid?
    assert_includes card.errors[:title], "can't be blank"
  end

  test "is invalid without a position" do
    card = Card.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: nil)

    assert_not card.valid?
    assert_includes card.errors[:position], "can't be blank"
  end

  test "is valid with a title and position" do
    assert Card.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0).valid?
  end

  test "cards association on column is ordered by position" do
    second = Card.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    first = Card.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "First", position: 0)

    assert_equal [first, second], @column.cards
  end

  test "destroying a column destroys its cards" do
    card = Card.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    @column.destroy

    assert_nil Card.find_by(id: card.id)
  end

  test "board can reach its cards through columns" do
    card = Card.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    assert_includes @board.cards, card
  end
end
