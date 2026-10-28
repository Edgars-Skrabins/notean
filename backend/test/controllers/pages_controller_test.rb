require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret", avatar_color: "blue")
    Membership.create!(user: @user, team: @team, role: "owner", nickname: "Alice")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    token = session_token(@user)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  test "show returns the creator with their avatar" do
    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_response :success
    creator = JSON.parse(response.body)["page"]["creator"]
    assert_equal "Alice", creator["nickname"]
    assert_equal({ "color" => "blue", "image_url" => nil }, creator["avatar"])
  end

  test "show returns the last nickname of a creator who was removed from the team" do
    former = create_member(@team, "Former")
    page = Page.create!(team: @team, creator: former, title: "Old notes", content: "")
    former.memberships.first.update!(removed_at: Time.current)

    get "/teams/#{@team.code}/pages/#{page.id}", headers: @headers

    assert_response :success
    assert_equal "Former", JSON.parse(response.body)["page"]["creator"]["nickname"]
  end

  test "destroy moves the page to the trash" do
    delete "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_response :success
    entry = TrashEntry.find_by!(item_type: "Page", item_id: @page.id)
    assert_equal({ "trash_entry_ids" => [ entry.id ] }, JSON.parse(response.body))
    assert_equal "Notes", entry.title
    assert_equal @user, entry.deleted_by

    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers
    assert_response :not_found
  end

  test "show returns only the payload without a message" do
    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_equal [ "page" ], JSON.parse(response.body).keys
  end

  test "show returns PAGE_NOT_FOUND for a missing page" do
    get "/teams/#{@team.code}/pages/0", headers: @headers

    assert_response :not_found
    assert_equal({ "code" => "PAGE_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "returns NOT_TEAM_MEMBER for someone outside the team" do
    outsider = User.create!(email: "mallory@example.com", password: "supersecret")

    get "/teams/#{@team.code}/pages", headers: { "Authorization" => "Bearer #{session_token(outsider)}" }

    assert_response :forbidden
    assert_equal "NOT_TEAM_MEMBER", JSON.parse(response.body)["code"]
  end

  test "returns TEAM_NOT_FOUND for an unknown team" do
    get "/teams/doesnotexist/pages", headers: @headers

    assert_response :not_found
    assert_equal "TEAM_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "returns UNAUTHORIZED without a token" do
    get "/teams/#{@team.code}/pages"

    assert_response :unauthorized
    assert_equal "UNAUTHORIZED", JSON.parse(response.body)["code"]
  end

  test "index runs the same number of queries for 1 and 10 pages" do
    attach_avatar(@user)
    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    one = query_count { get "/teams/#{@team.code}/pages", headers: @headers }

    9.times { |index| Page.create!(team: @team, creator: members[index % 3], title: "Page #{index}", content: "") }
    ten = query_count { get "/teams/#{@team.code}/pages", headers: @headers }

    assert_equal 10, JSON.parse(response.body)["pages"].length
    assert_equal one, ten
  end

  test "show and update run the same number of queries for 1 and 10 contributors" do
    attach_avatar(@user)
    @page.page_contributors.create!(user: @user)
    show_one = query_count { get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers }
    update_one = query_count { patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Notes", lock_version: @page.reload.lock_version } }, headers: @headers, as: :json }

    9.times { |index| @page.page_contributors.create!(user: create_member(@team, nickname_for(index), with_avatar: index.zero?)) }
    show_ten = query_count { get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers }
    update_ten = query_count { patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Notes", lock_version: @page.reload.lock_version } }, headers: @headers, as: :json }

    assert_equal 10, JSON.parse(response.body)["page"]["contributors"].length
    assert_equal show_one, show_ten
    assert_equal update_one, update_ten
  end

  test "returns FEATURE_DISABLED when pages are turned off" do
    @team.update!(pages_enabled: false)

    get "/teams/#{@team.code}/pages", headers: @headers
    assert_response :forbidden
    assert_equal({ "code" => "FEATURE_DISABLED" }, JSON.parse(response.body))

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { title: "Changed" } }, headers: @headers, as: :json
    assert_response :forbidden
    assert_equal "Notes", @page.reload.title
  end

  test "serves pages again once they are turned back on" do
    @team.update!(pages_enabled: false)
    @team.update!(pages_enabled: true)

    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers

    assert_response :success
  end

  test "create stores the content and folder" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")

    post "/teams/#{@team.code}/pages", params: { page: { title: "Plan", content: "<p>Hello world</p>", folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :created
    page = Page.find(JSON.parse(response.body)["page"]["id"])
    assert_equal "<p>Hello world</p>", page.content
    assert_equal folder.id, page.folder_id
    assert_equal "Hello world", page.search_text
    assert_empty page.contributors
  end

  test "create sanitises the page HTML" do
    post "/teams/#{@team.code}/pages", params: { page: { title: "Plan", content: "<p>Hi</p><script>alert(1)</script>" } }, headers: @headers, as: :json

    assert_response :created
    assert_not_includes Page.find(JSON.parse(response.body)["page"]["id"]).content, "<script>"
  end

  test "create rejects a folder of another type" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Diagram", title: "Flows")

    assert_no_difference "Page.count" do
      post "/teams/#{@team.code}/pages", params: { page: { title: "Plan", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal({ "code" => "PAGE_CREATE_FAILED" }, JSON.parse(response.body))
  end

  test "create rejects a folder from another team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    folder = Folder.create!(team: other_team, creator: @user, item_type: "Page", title: "Elsewhere")

    assert_no_difference "Page.count" do
      post "/teams/#{@team.code}/pages", params: { page: { title: "Plan", folder_id: folder.id } }, headers: @headers, as: :json
    end

    assert_response :not_found
    assert_equal({ "code" => "FOLDER_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "update rejects a folder from another team" do
    other_team = Team.create!(name: "Design", password: "supersecret")
    folder = Folder.create!(team: other_team, creator: @user, item_type: "Page", title: "Elsewhere")

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :not_found
    assert_equal({ "code" => "FOLDER_NOT_FOUND" }, JSON.parse(response.body))
    assert_nil @page.reload.folder_id
  end

  test "create in a folder takes the folder's project and ignores a sent project_id" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    other = Project.create!(team: @team, name: "Zeus", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)

    post "/teams/#{@team.code}/pages", params: { page: { title: "New", folder_id: folder.id, project_id: other.id } }, headers: @headers, as: :json

    assert_response :created
    assert_equal [ folder.id, project.id ], JSON.parse(response.body)["page"].values_at("folder_id", "project_id")
  end

  test "create in a folder the user can't see is not found" do
    member = create_member(@team, "Bob")
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Plans", project: secret)
    member_headers = { "Authorization" => "Bearer #{session_token(member)}" }

    post "/teams/#{@team.code}/pages", params: { page: { title: "New", folder_id: folder.id } }, headers: member_headers, as: :json

    assert_response :not_found
    assert_equal "FOLDER_NOT_FOUND", JSON.parse(response.body)["code"]
  end

  test "moving into a folder adopts the folder's project" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root", project: project)

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ folder.id, project.id ], [ @page.reload.folder_id, @page.project_id ]
  end

  test "changing the project while staying in a folder is rejected with PROJECT_SET_BY_FOLDER" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    @page.update!(folder: folder)

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { project_id: project.id } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "PROJECT_SET_BY_FOLDER", JSON.parse(response.body)["code"]
    assert_nil @page.reload.project_id
  end

  test "moving out of a folder can set the project in the same request" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")
    @page.update!(folder: folder)

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { folder_id: nil, project_id: project.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ nil, project.id ], [ @page.reload.folder_id, @page.project_id ]
  end

  test "update with the current version saves and increments it" do
    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: "<p>New</p>", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :success
    assert_equal 1, JSON.parse(response.body)["page"]["lock_version"]
    assert_equal [ "<p>New</p>", 1 ], [ @page.reload.content, @page.lock_version ]
  end

  test "update with a stale version returns EDIT_CONFLICT with the latest page" do
    @page.update!(content: "<p>Theirs</p>")

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: "<p>Mine</p>", lock_version: 0 } }, headers: @headers, as: :json

    assert_response :conflict
    body = JSON.parse(response.body)
    assert_equal "EDIT_CONFLICT", body["code"]
    assert_equal [ "<p>Theirs</p>", 1 ], [ body["page"]["content"], body["page"]["lock_version"] ]
    assert_equal "<p>Theirs</p>", @page.reload.content
  end

  test "update of the content without a version returns LOCK_VERSION_REQUIRED" do
    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: "<p>Mine</p>" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "LOCK_VERSION_REQUIRED", JSON.parse(response.body)["code"]
    assert_equal "", @page.reload.content
  end

  test "moving into a folder needs no version" do
    @page.update!(title: "Renamed")
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Root")

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { folder_id: folder.id } }, headers: @headers, as: :json

    assert_response :success
    assert_equal folder.id, @page.reload.folder_id
  end

  test "index includes each page's version" do
    @page.update!(title: "Renamed")

    get "/teams/#{@team.code}/pages", headers: @headers

    assert_equal 1, JSON.parse(response.body)["pages"][0]["lock_version"]
  end

  test "create returns TITLE_TOO_LONG for an over-limit title" do
    post "/teams/#{@team.code}/pages", params: { page: { title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "TITLE_TOO_LONG" }, JSON.parse(response.body))
  end

  test "update returns CONTENT_TOO_LARGE for over-limit content" do
    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: "a" * (ContentLimits::CONTENT_MAX_BYTES + 1), lock_version: 0 } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal({ "code" => "CONTENT_TOO_LARGE" }, JSON.parse(response.body))
  end

  def list_pages(params = {})
    get "/teams/#{@team.code}/pages", params: params, headers: @headers
    JSON.parse(response.body)
  end

  def listed_titles(params = {})
    list_pages(params)["pages"].map { |page| page["title"] }
  end

  test "index lists root pages without the foldered ones, sorted by title" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")
    Page.create!(team: @team, creator: @user, title: "alpha", content: "")
    Page.create!(team: @team, creator: @user, title: "Inside", content: "", folder: folder)

    assert_equal [ "alpha", "Notes" ], listed_titles(folder_id: "root")
  end

  test "index lists only the pages of the requested folder" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")
    other = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Other")
    Page.create!(team: @team, creator: @user, title: "Inside", content: "", folder: folder)
    Page.create!(team: @team, creator: @user, title: "Elsewhere", content: "", folder: other)

    assert_equal [ "Inside" ], listed_titles(folder_id: folder.id)
  end

  test "index returns FOLDER_NOT_FOUND for a folder the user can't see" do
    secret = Project.create!(team: @team, name: "Secret", owner: @user, creator: @user)
    bob = create_member(@team, "Bob")
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Hidden", project: secret)

    get "/teams/#{@team.code}/pages", params: { folder_id: folder.id }, headers: { "Authorization" => "Bearer #{session_token(bob)}" }

    assert_response :not_found
    assert_equal({ "code" => "FOLDER_NOT_FOUND" }, JSON.parse(response.body))
  end

  test "index search crosses folders and ignores folder_id" do
    folder = Folder.create!(team: @team, creator: @user, item_type: "Page", title: "Specs")
    Page.create!(team: @team, creator: @user, title: "Roadmap draft", content: "", folder: folder)
    Page.create!(team: @team, creator: @user, title: "roadmap", content: "")

    assert_equal [ "roadmap", "Roadmap draft" ], listed_titles(search: "ROAD", folder_id: "root")
  end

  test "index pages by 50 and flips has_more at the end" do
    @page.destroy
    55.times { |index| Page.create!(team: @team, creator: @user, title: format("Item %02d", index), content: "") }

    first = list_pages(folder_id: "root")
    assert_equal 50, first["pages"].length
    assert first["has_more"]

    rest = list_pages(folder_id: "root", offset: 50)
    assert_equal (50..54).map { |index| format("Item %02d", index) }, rest["pages"].map { |page| page["title"] }
    assert_not rest["has_more"]
  end

  test "index applies the project filter and hides other people's projects" do
    project = Project.create!(team: @team, name: "Apollo", owner: @user, creator: @user)
    Page.create!(team: @team, creator: @user, title: "In project", content: "", project: project)
    bob = create_member(@team, "Bob")

    assert_equal [ "In project" ], listed_titles(project_id: project.id, folder_id: "root")

    get "/teams/#{@team.code}/pages", params: { folder_id: "root" }, headers: { "Authorization" => "Bearer #{session_token(bob)}" }
    assert_equal [ "Notes" ], JSON.parse(response.body)["pages"].map { |page| page["title"] }
  end

  test "update notifies the creator about title and content changes but not moves" do
    bob = create_member(@team, "Bob")
    page = Page.create!(team: @team, creator: bob, title: "Plan", content: "")
    folder = Folder.create!(team: @team, creator: @user, title: "Docs", item_type: "Page")

    patch "/teams/#{@team.code}/pages/#{page.id}", params: { page: { folder_id: folder.id } }, headers: @headers, as: :json
    assert_equal 0, Notification.count

    patch "/teams/#{@team.code}/pages/#{page.id}", params: { page: { content: "<p>New</p>", lock_version: page.reload.lock_version } }, headers: @headers, as: :json
    assert_response :ok
    assert_equal [ [ bob.id, "item_changed", [ "content" ] ] ], Notification.pluck(:user_id, :kind, :changed_fields)
  end

  test "moving a page to the trash leaves an item deleted notice for the creator" do
    bob = create_member(@team, "Bob")
    page = Page.create!(team: @team, creator: bob, title: "Plan", content: "")

    delete "/teams/#{@team.code}/pages/#{page.id}", headers: @headers

    assert_response :ok
    assert_equal [ [ bob.id, "item_deleted", "Plan" ] ], Notification.pluck(:user_id, :kind, :item_title)
  end

  test "create and update notify people newly mentioned in the content" do
    bob = create_member(@team, "Bob")
    carol = create_member(@team, "Carol")
    mention = ->(user, name) { %(<span data-type="mention" data-mention-type="user" data-id="#{user.id}" data-label="#{name}">@#{name}</span>) }

    post "/teams/#{@team.code}/pages", params: { page: { title: "Plan", content: "<p>#{mention.(bob, "Bob")}</p>" } }, headers: @headers, as: :json
    assert_response :created
    page = JSON.parse(response.body)["page"]
    patch "/teams/#{@team.code}/pages/#{page["id"]}", params: { page: { content: "<p>#{mention.(bob, "Bob")} #{mention.(carol, "Carol")}</p>", lock_version: page["lock_version"] } }, headers: @headers, as: :json

    assert_response :success
    assert_equal [ bob.id, carol.id ], Notification.where(kind: "mentioned").order(:id).pluck(:user_id)
  end

  test "saved content keeps no title of mentioned items" do
    html = '<p><span data-type="mention" data-mention-type="page" data-id="99" data-label="Secret plan">@Secret plan</span> ' \
      '<span data-type="mention" data-mention-type="user" data-id="1" data-label="Alice">@Alice</span></p>'

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: html, lock_version: @page.lock_version } }, headers: @headers, as: :json

    assert_response :success
    content = JSON.parse(response.body)["page"]["content"]
    assert_not_includes content, "Secret plan"
    assert_includes content, 'data-label="Alice"'
    assert_not_includes @page.reload.search_text, "Secret plan"
    assert_includes @page.search_text, "@Alice"
  end
end
