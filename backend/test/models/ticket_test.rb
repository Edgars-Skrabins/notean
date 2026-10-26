require "test_helper"

class TicketTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  test "is invalid without a title" do
    ticket = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: nil, position: 0)

    assert_not ticket.valid?
    assert_includes ticket.errors[:title], "can't be blank"
  end

  test "accepts a title at the length limit and rejects one over it" do
    assert Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "a" * ContentLimits::TITLE_MAX_LENGTH, position: 0).valid?

    record = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1), position: 0)
    assert_not record.valid?
    assert record.errors.of_kind?(:title, :too_long)
  end

  test "accepts a description at the length limit and rejects one over it" do
    assert Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", description: "a" * ContentLimits::DESCRIPTION_MAX_LENGTH, position: 0).valid?

    record = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", description: "a" * (ContentLimits::DESCRIPTION_MAX_LENGTH + 1), position: 0)
    assert_not record.valid?
    assert record.errors.of_kind?(:description, :too_long)
  end

  test "is invalid without a position" do
    ticket = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: nil)

    assert_not ticket.valid?
    assert_includes ticket.errors[:position], "can't be blank"
  end

  test "is valid with a title and position" do
    assert Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0).valid?
  end

  test "tickets association on column is ordered by position" do
    second = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    first = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "First", position: 0)

    assert_equal [ first, second ], @column.tickets
  end

  test "destroying a column destroys its tickets" do
    ticket = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    @column.destroy

    assert_nil Ticket.find_by(id: ticket.id)
  end

  test "takes its board from the column when none is given" do
    ticket = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    assert_equal @board, ticket.board
  end

  test "is valid in the backlog without a column" do
    assert Ticket.new(board: @board, team: @team, created_by_user_id: @user.id, title: "Idea", position: 0).valid?
  end

  test "is invalid with a column from another board" do
    other_column = Column.create!(board: Board.create!(team: @team, creator: @user, title: "Other"), title: "To Do", position: 0)
    ticket = Ticket.new(board: @board, column: other_column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    assert_not ticket.valid?
    assert_includes ticket.errors[:column], "must belong to the same board"
  end

  test "backlog_tickets returns column-less tickets of the board in position order" do
    second = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Second", position: 1)
    first = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "First", position: 0)
    Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "On board", position: 0)

    assert_equal [ first, second ], @board.backlog_tickets
  end

  test "destroying a board destroys backlog tickets and their favorites" do
    ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Idea", position: 0)
    favorite = Favorite.create!(user: @user, team: @team, favoritable: ticket, home_position: 0, sidebar_position: 0)

    @board.destroy

    assert_nil Ticket.find_by(id: ticket.id)
    assert_nil Favorite.find_by(id: favorite.id)
  end

  test "destroying a column destroys only its own tickets" do
    on_column = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "On board", position: 0)
    in_backlog = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Idea", position: 0)

    @column.destroy

    assert_nil Ticket.find_by(id: on_column.id)
    assert Ticket.exists?(in_backlog.id)
  end

  test "a ticket has no priority by default and accepts one from its own board" do
    ticket = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)

    assert ticket.valid?
    assert_nil ticket.priority

    ticket.priority = @board.priorities.first
    assert ticket.valid?
  end

  test "rejects a priority from another board" do
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    ticket = Ticket.new(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0, priority: other_board.priorities.first)

    assert_not ticket.valid?
    assert_includes ticket.errors[:priority], "must belong to the same board"
  end

  test "without_description loads every summary field but not the description" do
    Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", description: "<p>Steps</p>", position: 0)

    ticket = Ticket.without_description.find_by!(title: "Fix bug")

    assert_not ticket.has_attribute?(:description)
    assert_raises(ActiveModel::MissingAttributeError) { ticket.description }
    assert_equal [ "Fix bug", 0, @column.id, nil ], [ ticket.title, ticket.position, ticket.column_id, ticket.priority_id ]
    assert_not_nil ticket.lock_version
    assert_not_nil ticket.created_at
    assert_not_nil ticket.updated_at
    assert_empty ticket.ticket_assignees
  end
end
