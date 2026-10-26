require "test_helper"

class TicketAssigneeTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
    @ticket = Ticket.create!(column: @column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
  end

  test "is valid for a member of the ticket's team" do
    assert TicketAssignee.new(ticket: @ticket, user: @user).valid?
  end

  test "rejects a user outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")
    assignee = TicketAssignee.new(ticket: @ticket, user: outsider)

    assert_not assignee.valid?
    assert_includes assignee.errors[:user], "must be a member of the ticket's team"
  end

  test "assigns a user to a ticket at most once" do
    TicketAssignee.create!(ticket: @ticket, user: @user)

    assert_not TicketAssignee.new(ticket: @ticket, user: @user).valid?
  end

  test "assigning and unassigning touch the ticket" do
    travel_to 1.hour.from_now do
      assignee = TicketAssignee.create!(ticket: @ticket, user: @user)
      assert_in_delta Time.current, @ticket.reload.updated_at, 1.second

      travel 1.hour
      assignee.destroy
      assert_in_delta Time.current, @ticket.reload.updated_at, 1.second
    end
  end

  test "assigning through a stale ticket keeps its lock version and refreshes updated_at" do
    Ticket.find(@ticket.id).update!(description: "Saved elsewhere")

    travel_to 1.hour.from_now do
      @ticket.ticket_assignees.create!(user: @user)

      assert_equal 1, @ticket.reload.lock_version
      assert_in_delta Time.current, @ticket.updated_at, 1.second
    end
  end

  test "unassigning through a stale ticket keeps its lock version and refreshes updated_at" do
    TicketAssignee.create!(ticket: @ticket, user: @user)
    @ticket.reload
    assignee = @ticket.ticket_assignees.find_by(user: @user)
    Ticket.find(@ticket.id).update!(description: "Saved elsewhere")

    travel_to 1.hour.from_now do
      assignee.destroy!

      assert_equal 1, @ticket.reload.lock_version
      assert_in_delta Time.current, @ticket.updated_at, 1.second
    end
  end

  test "lists assignees in the order they were assigned" do
    bob = create_member(@team, "Bob")
    travel_to(2.minutes.ago) { TicketAssignee.create!(ticket: @ticket, user: bob) }
    TicketAssignee.create!(ticket: @ticket, user: @user)

    assert_equal [ bob, @user ], @ticket.reload.assignees.to_a
  end

  { "ticket" => -> { @ticket.destroy }, "column" => -> { @column.destroy }, "board" => -> { @board.destroy }, "team" => -> { @team.destroy } }.each do |name, destroy|
    test "deleting the #{name} removes the assignments" do
      TicketAssignee.create!(ticket: @ticket, user: @user)

      instance_exec(&destroy)

      assert_equal 0, TicketAssignee.count
    end
  end
end
