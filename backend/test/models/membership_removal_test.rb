require "test_helper"

class MembershipRemovalTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @previous_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = create_member(@team, "Owner")
    @owner.memberships.first.update!(role: "owner")
    @alice = create_member(@team, "Alice")
    @membership = @alice.memberships.first
  end

  teardown do
    Rails.cache = @previous_cache
  end

  test "sets removed_at" do
    MembershipRemoval.apply(@membership)

    assert @membership.reload.removed?
  end

  test "moves projects owned by the member to the team owner" do
    project = Project.create!(team: @team, name: "Apollo", owner: @alice, creator: @alice)

    MembershipRemoval.apply(@membership)

    assert_equal @owner, project.reload.owner
  end

  test "deletes the member's project member rows" do
    project = Project.create!(team: @team, name: "Apollo", owner: @owner, creator: @owner)
    ProjectMember.create!(project: project, user: @alice)

    MembershipRemoval.apply(@membership)

    assert_not ProjectMember.exists?(project: project, user: @alice)
    assert ProjectMember.exists?(project: project, user: @owner)
  end

  test "deletes the member's ticket assignments" do
    board = Board.create!(team: @team, creator: @owner, title: "Sprint 12")
    ticket = Ticket.create!(board: board, team: @team, created_by_user_id: @owner.id, title: "Fix bug", position: 0)
    TicketAssignee.create!(ticket: ticket, user: @alice)
    TicketAssignee.create!(ticket: ticket, user: @owner)

    MembershipRemoval.apply(@membership)

    assert_equal [ @owner.id ], ticket.ticket_assignees.pluck(:user_id)
  end

  test "deletes the member's favorites in the team only" do
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "")
    Favorite.create!(user: @alice, team: @team, favoritable: page, home_position: 0, sidebar_position: 0)
    other_team = Team.create!(name: "Design", password: "supersecret")
    Membership.create!(team: other_team, user: @alice, nickname: "Alice")
    other_page = Page.create!(team: other_team, creator: @alice, title: "Other", content: "")
    Favorite.create!(user: @alice, team: other_team, favoritable: other_page, home_position: 0, sidebar_position: 0)

    MembershipRemoval.apply(@membership)

    assert_equal [ other_team.id ], @alice.favorites.pluck(:team_id)
  end

  test "stops the member's editing presence in the team" do
    page = Page.create!(team: @team, creator: @owner, title: "Notes", content: "")
    PageEditingStatus.start(page.id, @alice)

    MembershipRemoval.apply(@membership)

    assert_nil PageEditingStatus.read(page.id)
  end

  test "broadcasts member_removed on the team stream" do
    assert_broadcasts(TeamChannel.stream_name(@team), 1) do
      MembershipRemoval.apply(@membership)
    end
  end
end
