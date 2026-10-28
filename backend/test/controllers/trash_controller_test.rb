require "test_helper"

class TrashControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = create_member(@team, "Owner")
    @owner.memberships.first.update!(role: "owner")
    @alice = create_member(@team, "Alice")
    @headers = { "Authorization" => "Bearer #{session_token(@alice)}" }
    @owner_headers = { "Authorization" => "Bearer #{session_token(@owner)}" }
    @board = Board.create!(team: @team, creator: @owner, title: "Sprint")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  def trash_page(title, project: nil)
    page = Page.create!(team: @team, creator: @owner, title: title, project: project)
    Trash.move(page, @owner)
  end

  def trash_ticket(title, board: @board)
    ticket = Ticket.create!(board: board, column: @column, team: @team, creator: @owner, title: title, position: board.tickets.count)
    Trash.move_tickets(board, [ ticket ], @owner).first.first
  end

  def private_project
    Project.create!(team: @team, name: "Secret", owner: @owner, creator: @owner)
  end

  def list(params = {}, headers: @headers)
    get "/teams/#{@team.code}/trash", params: params, headers: headers
    JSON.parse(response.body)
  end

  test "index lists visible entries newest first with who deleted them" do
    older = trash_page("Older")
    older.update_column(:created_at, 2.days.ago)
    newer = trash_page("Newer")
    trash_page("Hidden", project: private_project)

    body = list

    assert_response :success
    assert_equal [ newer.id, older.id ], body["trash_entries"].map { |entry| entry["id"] }
    assert_equal "Owner", body["trash_entries"].first["deleted_by"]["nickname"]
    assert_equal false, body["has_more"]
  end

  test "index filters by type, search and project" do
    project = private_project
    ProjectMember.create!(project: project, user: @alice)
    trash_page("Roadmap")
    in_project = trash_page("Roadmap draft", project: project)
    trash_ticket("Roadmap ticket")

    assert_equal [ "Roadmap ticket" ], list({ type: "ticket" })["trash_entries"].map { |entry| entry["title"] }
    assert_equal 3, list({ search: "roadmap" })["trash_entries"].length
    assert_equal [ in_project.id ], list({ project_id: project.id })["trash_entries"].map { |entry| entry["id"] }
  end

  test "index hides entries of disabled features" do
    trash_page("Notes")
    trash_ticket("Bug")
    folder = Folder.create!(team: @team, creator: @owner, title: "Docs", item_type: "Page")
    Trash.move(folder, @owner)
    @team.update!(pages_enabled: false)

    assert_equal [ "Ticket" ], list["trash_entries"].map { |entry| entry["item_type"] }
  end

  test "index shows a ticket's board, whether it can be restored and a container's children" do
    ticket_entry = trash_ticket("Bug")
    folder = Folder.create!(team: @team, creator: @owner, title: "Docs", item_type: "Page")
    Folder.create!(team: @team, creator: @owner, title: "Sub", item_type: "Page", parent: folder)
    Page.create!(team: @team, creator: @owner, title: "Inside", folder: folder)
    Trash.move(folder, @owner)
    Ticket.create!(board: @board, column: @column, team: @team, creator: @owner, title: "Live", position: 0)
    Trash.move(@board, @owner)

    entries = list["trash_entries"].index_by { |entry| entry["item_type"] }

    assert_equal({ "id" => @board.id, "title" => "Sprint" }, entries["Ticket"]["board"])
    assert_equal false, entries["Ticket"]["restorable"]
    assert_equal ticket_entry.id, entries["Ticket"]["id"]
    assert_equal 2, entries["Folder"]["children_count"]
    assert_equal 1, entries["Board"]["children_count"]
    assert_equal true, entries["Board"]["restorable"]
  end

  test "index runs the same number of queries for 1 and 10 entries" do
    trash_page("Page 0")
    trash_ticket("Ticket 0")
    one = query_count { list }

    9.times { |index| trash_page("Page #{index + 1}") }
    9.times { |index| trash_ticket("Ticket #{index + 1}") }
    ten = query_count { list }

    assert_equal one, ten
  end

  test "restore brings every requested entry back" do
    page_entry = trash_page("Notes")
    ticket_entry = trash_ticket("Bug")

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ page_entry.id, ticket_entry.id ] } }, headers: @headers

    assert_response :success
    assert_equal [ "Page", "Ticket" ], JSON.parse(response.body)["restored"].map { |item| item["item_type"] }.sort
    assert Page.exists?(page_entry.item_id)
    assert Ticket.exists?(ticket_entry.item_id)
  end

  test "restore is all or nothing" do
    page_entry = trash_page("Notes")
    hidden = trash_page("Secret", project: private_project)

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ page_entry.id, hidden.id ] } }, headers: @headers

    assert_response :not_found
    assert_equal "TRASH_ENTRY_NOT_FOUND", JSON.parse(response.body)["code"]
    assert_not Page.exists?(page_entry.item_id)
  end

  test "restore of a ticket whose board is trashed fails and changes nothing" do
    page_entry = trash_page("Notes")
    ticket_entry = trash_ticket("Bug")
    Trash.move(@board, @owner)

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ page_entry.id, ticket_entry.id ] } }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "TRASH_BOARD_IN_TRASH", JSON.parse(response.body)["code"]
    assert_not Page.exists?(page_entry.item_id)
  end

  test "restoring a ticket broadcasts it to the board" do
    entry = trash_ticket("Bug")

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ entry.id ] } }, headers: @headers

    message = board_broadcasts(@board).last
    assert_equal "tickets_upserted", message["type"]
    assert_equal [ entry.item_id ], message["tickets"].map { |ticket| ticket["id"] }
    assert message["tickets"].first.key?("description")
  end

  test "destroy deletes a visible entry for good" do
    entry = trash_page("Notes")

    delete "/teams/#{@team.code}/trash/#{entry.id}", headers: @headers

    assert_response :no_content
    assert_not Page.unscoped.exists?(entry.item_id)
  end

  test "destroy returns TRASH_ENTRY_NOT_FOUND for another project's entry" do
    entry = trash_page("Secret", project: private_project)

    delete "/teams/#{@team.code}/trash/#{entry.id}", headers: @headers

    assert_response :not_found
    assert Page.unscoped.exists?(entry.item_id)
  end

  test "empty is forbidden for a regular member" do
    trash_page("Notes")

    delete "/teams/#{@team.code}/trash", headers: @headers

    assert_response :forbidden
    assert_equal 1, TrashEntry.count
  end

  test "empty purges every entry of enabled features" do
    trash_page("Notes")
    trash_page("Secret", project: private_project)
    ticket_entry = trash_ticket("Bug")
    @team.update!(boards_enabled: false)

    delete "/teams/#{@team.code}/trash", headers: @owner_headers

    assert_response :no_content
    assert_equal [ ticket_entry.id ], TrashEntry.pluck(:id)
  end

  test "chat channel entries are listed and restored only by people who may manage the channel" do
    channel = ChatChannel.create!(team: @team, creator: @owner, name: "General", scope: "team")
    entry = Trash.move(channel, @owner)

    get "/teams/#{@team.code}/trash", params: { type: "chat_channel" }, headers: @headers
    assert_empty JSON.parse(response.body)["trash_entries"]

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ entry.id ] } }, headers: @headers, as: :json
    assert_response :not_found

    post "/teams/#{@team.code}/trash/restore", params: { trash: { entry_ids: [ entry.id ] } }, headers: @owner_headers, as: :json
    assert_response :success
    assert_not channel.reload.trashed?
    assert_equal "channel_upserted", ::JSON.parse(broadcasts(ChatCable.stream_name(@team, @alice.id)).last)["type"]
  end

  test "purging a chat channel deletes its messages and notifications" do
    channel = ChatChannel.create!(team: @team, creator: @owner, name: "General", scope: "team")
    message = ChatMessage.create!(chat_channel: channel, author: @owner, body: "Hi @[user:#{@alice.id}|Alice]")
    message.chat_reactions.create!(user: @alice, emoji: "👍")
    MentionNotifications.call(item: message, before: "", after: message.body, actor: @owner, html: false)
    entry = Trash.move(channel, @owner)

    delete "/teams/#{@team.code}/trash/#{entry.id}", headers: @owner_headers

    assert_response :no_content
    assert_not ChatChannel.unscoped.exists?(channel.id)
    assert_not ChatMessage.exists?(message.id)
    assert_not ChatReaction.exists?
    assert_not Notification.exists?(item_type: "ChatMessage")
  end
end
