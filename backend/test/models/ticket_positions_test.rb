require "test_helper"

class TicketPositionsTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  test "shift moves a closed range down" do
    tickets = create_tickets(@column, 5)

    result = TicketPositions.shift(@board, @column.id, from: 1, to: 3, delta: 1)

    assert_equal [ 0, 2, 3, 4, 4 ], positions(tickets)
    assert_equal [ { column_id: @column.id, from_position: 1, to_position: 3, delta: 1 } ], result
  end

  test "shift moves an open-ended range up" do
    tickets = create_tickets(@column, 4)

    result = TicketPositions.shift(@board, @column.id, from: 2, delta: -1)

    assert_equal [ 0, 1, 1, 2 ], positions(tickets)
    assert_equal [ { column_id: @column.id, from_position: 2, to_position: nil, delta: -1 } ], result
  end

  test "shift returns nothing and changes nothing for an empty range" do
    tickets = create_tickets(@column, 3)

    assert_equal [], TicketPositions.shift(@board, @column.id, from: 2, to: 1, delta: 1)
    assert_equal [ 0, 1, 2 ], positions(tickets)
  end

  test "shift only touches its own group" do
    column_tickets = create_tickets(@column, 3)
    backlog_tickets = create_tickets(nil, 3)
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    other_tickets = create_tickets(nil, 3, board: other_board)

    TicketPositions.shift(@board, nil, from: 1, delta: 1)

    assert_equal [ 0, 2, 3 ], positions(backlog_tickets)
    assert_equal [ 0, 1, 2 ], positions(column_tickets)
    assert_equal [ 0, 1, 2 ], positions(other_tickets)
  end

  test "shift and close_gaps keep updated_at and lock_version" do
    tickets = create_tickets(@column, 4)
    tickets.each { |ticket| ticket.update_columns(updated_at: 1.day.ago) }
    before = tickets.map { |ticket| ticket.reload.attributes.slice("updated_at", "lock_version") }

    TicketPositions.shift(@board, @column.id, from: 0, delta: 2)
    TicketPositions.close_gaps(@board, @column.id, [ 0, 1 ])

    assert_equal [ 0, 1, 2, 3 ], positions(tickets)
    assert_equal before, tickets.map { |ticket| ticket.reload.attributes.slice("updated_at", "lock_version") }
  end

  test "close_gaps renumbers the group densely in order" do
    tickets = create_tickets(@column, 12)
    removed = tickets.values_at(3, 7, 10)
    removed.each(&:destroy!)
    kept = tickets - removed

    result = TicketPositions.close_gaps(@board, @column.id, [ 10, 3, 7 ])

    assert_equal (0...9).to_a, positions(kept)
    assert_equal [
      { column_id: @column.id, from_position: 4, to_position: 6, delta: -1 },
      { column_id: @column.id, from_position: 8, to_position: 9, delta: -2 },
      { column_id: @column.id, from_position: 11, to_position: nil, delta: -3 }
    ], result
  end

  test "close_gaps returns one open range for the first position" do
    tickets = create_tickets(nil, 3)
    tickets.first.destroy!

    result = TicketPositions.close_gaps(@board, nil, [ 0 ])

    assert_equal [ 0, 1 ], positions(tickets.drop(1))
    assert_equal [ { column_id: nil, from_position: 1, to_position: nil, delta: -1 } ], result
  end

  test "close_gaps drops the empty range between adjacent positions" do
    tickets = create_tickets(@column, 6)
    tickets.values_at(2, 3).each(&:destroy!)

    result = TicketPositions.close_gaps(@board, @column.id, [ 2, 3 ])

    assert_equal [ 0, 1, 2, 3 ], positions(tickets.values_at(0, 1, 4, 5))
    assert_equal [ { column_id: @column.id, from_position: 4, to_position: nil, delta: -2 } ], result
  end

  test "append places the tickets at the end of the group in the given order" do
    existing = create_tickets(@column, 2)
    moved = create_tickets(nil, 3)
    moved.each { |ticket| ticket.update_columns(updated_at: 1.day.ago) }

    TicketPositions.append(@board, @column.id, moved.reverse.map(&:id))

    assert_equal [ 0, 1 ], positions(existing)
    assert_equal [ 4, 3, 2 ], positions(moved)
    assert moved.all? { |ticket| ticket.reload.column_id == @column.id && ticket.updated_at > 1.minute.ago }
  end

  test "append starts after the highest position left in the group" do
    tickets = create_tickets(@column, 3)

    TicketPositions.append(@board, @column.id, [ tickets.first.id ])

    assert_equal [ 3, 1, 2 ], positions(tickets)
  end

  private

  def create_tickets(column, count, board: @board)
    Array.new(count) do |index|
      Ticket.create!(board: board, column: column, team: @team, created_by_user_id: @user.id, title: "Ticket #{index}", position: index)
    end
  end

  def positions(tickets)
    tickets.map { |ticket| ticket.reload.position }
  end
end
