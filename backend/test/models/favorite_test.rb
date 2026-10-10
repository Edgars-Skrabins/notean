require "test_helper"

class FavoriteTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  test "is valid with a user, team, item from that team and positions" do
    assert Favorite.new(user: @user, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0).valid?
  end

  test "is invalid with a favoritable type other than Page, Diagram, Board or Card" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Runbooks")
    favorite = Favorite.new(user: @user, team: @team, favoritable: folder, home_position: 0, sidebar_position: 0)

    assert_not favorite.valid?
    assert_includes favorite.errors[:favoritable_type], "is not included in the list"
  end

  test "is invalid when the item belongs to another team" do
    other_team = Team.create!(name: "Other", password: "supersecret")
    favorite = Favorite.new(user: @user, team: other_team, favoritable: @page, home_position: 0, sidebar_position: 0)

    assert_not favorite.valid?
    assert_includes favorite.errors[:favoritable], "must belong to the same team"
  end

  test "is invalid without positions" do
    favorite = Favorite.new(user: @user, team: @team, favoritable: @page)

    assert_not favorite.valid?
    assert_includes favorite.errors[:home_position], "can't be blank"
    assert_includes favorite.errors[:sidebar_position], "can't be blank"
  end

  test "is unique per user and item" do
    Favorite.create!(user: @user, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0)
    duplicate = Favorite.new(user: @user, team: @team, favoritable: @page, home_position: -1, sidebar_position: -1)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:favoritable_id], "has already been taken"
  end

  test "the same item can be favorited by two users" do
    bob = User.create!(email: "bob@example.com", password: "supersecret")
    Favorite.create!(user: @user, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0)

    assert Favorite.new(user: bob, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0).valid?
  end

  test "destroying a page removes its favorites" do
    favorite = Favorite.create!(user: @user, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0)

    @page.destroy

    assert_nil Favorite.find_by(id: favorite.id)
  end

  test "destroying a diagram removes its favorites" do
    diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    favorite = Favorite.create!(user: @user, team: @team, favoritable: diagram, home_position: 0, sidebar_position: 0)

    diagram.destroy

    assert_nil Favorite.find_by(id: favorite.id)
  end

  test "destroying a board removes its favorites and those of its cards" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    column = Column.create!(board: board, title: "To Do", position: 0)
    card = Card.create!(column: column, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    board_favorite = Favorite.create!(user: @user, team: @team, favoritable: board, home_position: 0, sidebar_position: 0)
    card_favorite = Favorite.create!(user: @user, team: @team, favoritable: card, home_position: 1, sidebar_position: 1)

    board.destroy

    assert_nil Favorite.find_by(id: board_favorite.id)
    assert_nil Favorite.find_by(id: card_favorite.id)
  end

  test "destroying a folder removes the favorites of items nested inside it" do
    root = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    child = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Child", parent: root)
    nested_page = Page.create!(team: @team, creator: @user, title: "Nested", content: "", folder: child)
    favorite = Favorite.create!(user: @user, team: @team, favoritable: nested_page, home_position: 0, sidebar_position: 0)

    root.destroy

    assert_nil Favorite.find_by(id: favorite.id)
  end

  test "destroying a team removes its favorites" do
    favorite = Favorite.create!(user: @user, team: @team, favoritable: @page, home_position: 0, sidebar_position: 0)

    @team.destroy

    assert_nil Favorite.find_by(id: favorite.id)
  end
end
