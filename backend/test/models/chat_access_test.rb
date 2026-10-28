require "test_helper"

class ChatAccessTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @owner, role: "owner", nickname: "Alice")
    @admin = create_member(@team, "Adam")
    @admin.memberships.first.update!(role: "admin")
    @lead = create_member(@team, "Lena")
    @member = create_member(@team, "Bob")
    @outsider = create_member(@team, "Carol")
    @game = Project.create!(team: @team, name: "Game", owner: @lead, creator: @owner)
    @game.project_members.create!(user: @member)
    @general = channel("General", "team")
    @game_chat = channel("Game", "project", project: @game)
    @private = channel("Private", "users")
    @private.chat_channel_members.create!(user: @member)
  end

  def channel(name, scope, project: nil, creator: @owner)
    ChatChannel.create!(team: @team, creator: creator, name: name, scope: scope, project: project)
  end

  def access(user)
    ChatAccess.new(user, @team)
  end

  def visible_names(user)
    access(user).visible_scope(@team.chat_channels).order(:name).pluck(:name)
  end

  test "each scope is visible to the right people" do
    assert_equal %w[Game General Private], visible_names(@owner)
    assert_equal %w[Game General Private], visible_names(@admin)
    assert_equal %w[Game General Private], visible_names(@member)
    assert_equal %w[Game General], visible_names(@lead)
    assert_equal %w[General], visible_names(@outsider)
  end

  test "visible? matches the visible scope and hides trashed channels" do
    assert access(@member).visible?(@private)
    assert_not access(@lead).visible?(@private)
    assert_not access(@outsider).visible?(@game_chat)

    Trash.move(@general, @owner)
    assert_not access(@owner).visible?(@general.reload)
  end

  test "managers create every kind, project owners only their project's channels, members none" do
    other = Project.create!(team: @team, name: "Other", owner: @owner, creator: @owner)

    assert ChatChannel::SCOPES.all? { |scope| access(@admin).can_create?(scope, @game) }
    assert access(@lead).can_create?("project", @game)
    assert_not access(@lead).can_create?("project", other)
    assert_not access(@lead).can_create?("team")
    assert_not access(@lead).can_create?("users")
    assert_equal [ "project" ], access(@lead).creatable_scopes
    assert_equal [], access(@member).creatable_scopes
  end

  test "the creator and whoever may create that kind manage a channel" do
    created_by_member = channel("Bob's", "users", creator: @member)

    assert access(@member).can_manage?(created_by_member)
    assert access(@admin).can_manage?(created_by_member)
    assert access(@lead).can_manage?(@game_chat)
    assert_not access(@member).can_manage?(@game_chat)
    assert_not access(@lead).can_manage?(@general)
  end

  test "user ids who can see follow the scope" do
    assert_equal [ @owner, @admin, @lead, @member, @outsider ].map(&:id).sort, ChatAccess.user_ids_who_can_see(@general).sort
    assert_equal [ @owner, @admin, @lead, @member ].map(&:id).sort, ChatAccess.user_ids_who_can_see(@game_chat).sort
    assert_equal [ @owner, @admin, @member ].map(&:id).sort, ChatAccess.user_ids_who_can_see(@private).sort
  end
end
