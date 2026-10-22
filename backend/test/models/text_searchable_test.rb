require "test_helper"

class TextSearchableTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
    Membership.create!(team: @team, user: @user, role: "owner", nickname: "Alice")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint")
  end

  def project(name, description: "")
    Project.create!(team: @team, name: name, description: description, owner: @user, creator: @user)
  end

  def page(title, content: "")
    Page.create!(team: @team, creator: @user, title: title, content: content)
  end

  def diagram(title, label: nil)
    content = label ? { cells: [ { attrs: { text: { text: label } } } ] }.to_json : ""
    Diagram.create!(team: @team, creator: @user, title: title, content: content)
  end

  def ticket(title, description: nil)
    Ticket.create!(board: @board, team: @team, creator: @user, title: title, description: description, position: 0)
  end

  test "projects match name and description case-insensitively" do
    project("Rocket Launch")
    project("Garden", description: "Plant the ROCKET seeds")
    project("Other")

    assert_equal [ "Garden", "Rocket Launch" ], Project.text_search("rocket").pluck(:name).sort
  end

  test "pages match title and page text" do
    page("Rocket notes")
    page("Plans", content: "<p>Build a <strong>rocket</strong></p>")
    page("Other", content: "<p>Nothing</p>")

    assert_equal [ "Plans", "Rocket notes" ], Page.text_search("ROCKET").pluck(:title).sort
  end

  test "diagrams match title and labels" do
    diagram("Rocket flow")
    diagram("Flow", label: "Launch the Rocket")
    diagram("Other", label: "Stop")

    assert_equal [ "Flow", "Rocket flow" ], Diagram.text_search("rocket").pluck(:title).sort
  end

  test "boards match title" do
    Board.create!(team: @team, creator: @user, title: "Rocket board")

    assert_equal [ "Rocket board" ], Board.text_search("rOcKeT").pluck(:title)
  end

  test "tickets match title and description" do
    ticket("Rocket bug")
    ticket("Crash", description: "The rocket crashes")
    ticket("Other", description: nil)

    assert_equal [ "Crash", "Rocket bug" ], Ticket.text_search("rocket").pluck(:title).sort
  end

  test "percent and underscore are treated literally" do
    page("Release 50% done")
    page("Release 500 done")
    page("snake_case")
    page("snakeXcase")

    assert_equal [ "Release 50% done" ], Page.text_search("50%").pluck(:title)
    assert_equal [ "snake_case" ], Page.text_search("e_c").pluck(:title)
  end

  test "title_match_first puts title matches first, then the most recently updated" do
    content_old = page("Old content", content: "<p>rocket</p>")
    title_old = page("Rocket old")
    content_new = page("New content", content: "<p>rocket</p>")
    title_new = page("Rocket new")
    content_old.update_column(:updated_at, 4.days.ago)
    title_old.update_column(:updated_at, 3.days.ago)
    content_new.update_column(:updated_at, 2.days.ago)
    title_new.update_column(:updated_at, 1.day.ago)

    ordered = Page.text_search("rocket").title_match_first("rocket").pluck(:title)

    assert_equal [ "Rocket new", "Rocket old", "New content", "Old content" ], ordered
  end

  test "title_match_first uses the name column for projects" do
    described = project("Garden", description: "rocket")
    named = project("Rocket")
    named.update_column(:updated_at, 2.days.ago)
    described.update_column(:updated_at, 1.day.ago)

    assert_equal [ "Rocket", "Garden" ], Project.text_search("rocket").title_match_first("rocket").pluck(:name)
  end
end
