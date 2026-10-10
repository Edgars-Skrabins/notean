require "test_helper"

class DiagramEditingStatusTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @previous_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @diagram = Diagram.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  teardown do
    Rails.cache = @previous_cache
  end

  test "read returns nil when nothing has been cached" do
    assert_nil DiagramEditingStatus.read(@diagram.id)
  end

  test "start caches the editing user and broadcasts it" do
    assert_broadcast_on("diagram_editing_#{@diagram.id}", editing: { id: @user.id, nickname: "Alice" }) do
      DiagramEditingStatus.start(@diagram.id, @user)
    end

    assert_equal({ user_id: @user.id, nickname: "Alice" }, DiagramEditingStatus.read(@diagram.id))
  end

  test "start caches a nil nickname when the user is not a member of the diagram's team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    DiagramEditingStatus.start(@diagram.id, outsider)

    assert_equal({ user_id: outsider.id, nickname: nil }, DiagramEditingStatus.read(@diagram.id))
  end

  test "stop clears the cache and broadcasts nil when the current editor stops" do
    DiagramEditingStatus.start(@diagram.id, @user)

    assert_broadcast_on("diagram_editing_#{@diagram.id}", editing: nil) do
      DiagramEditingStatus.stop(@diagram.id, @user)
    end

    assert_nil DiagramEditingStatus.read(@diagram.id)
  end

  test "stop does nothing when a different user attempts to stop" do
    DiagramEditingStatus.start(@diagram.id, @user)
    other_user = User.create!(email: "bob@example.com", password: "supersecret")

    assert_no_broadcasts("diagram_editing_#{@diagram.id}") do
      DiagramEditingStatus.stop(@diagram.id, other_user)
    end

    assert_equal({ user_id: @user.id, nickname: "Alice" }, DiagramEditingStatus.read(@diagram.id))
  end
end
