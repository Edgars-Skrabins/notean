require "test_helper"

class PageEditingStatusTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @previous_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, nickname: "Alice")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  teardown do
    Rails.cache = @previous_cache
  end

  test "read returns nil when nothing has been cached" do
    assert_nil PageEditingStatus.read(@page.id)
  end

  test "start caches the editing user and broadcasts it" do
    assert_broadcast_on("page_editing_#{@page.id}", editing: { id: @user.id, nickname: "Alice" }) do
      PageEditingStatus.start(@page.id, @user)
    end

    assert_equal({ user_id: @user.id, nickname: "Alice" }, PageEditingStatus.read(@page.id))
  end

  test "start caches a nil nickname when the user is not a member of the page's team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    PageEditingStatus.start(@page.id, outsider)

    assert_equal({ user_id: outsider.id, nickname: nil }, PageEditingStatus.read(@page.id))
  end

  test "stop clears the cache and broadcasts nil when the current editor stops" do
    PageEditingStatus.start(@page.id, @user)

    assert_broadcast_on("page_editing_#{@page.id}", editing: nil) do
      PageEditingStatus.stop(@page.id, @user)
    end

    assert_nil PageEditingStatus.read(@page.id)
  end

  test "stop does nothing when a different user attempts to stop" do
    PageEditingStatus.start(@page.id, @user)
    other_user = User.create!(email: "bob@example.com", password: "supersecret")

    assert_no_broadcasts("page_editing_#{@page.id}") do
      PageEditingStatus.stop(@page.id, other_user)
    end

    assert_equal({ user_id: @user.id, nickname: "Alice" }, PageEditingStatus.read(@page.id))
  end
end
