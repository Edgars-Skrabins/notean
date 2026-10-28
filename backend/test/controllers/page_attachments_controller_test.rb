require "test_helper"

class PageAttachmentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "olivia@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Olivia")
    @user = create_member(@team, "Alice")
    @bob = create_member(@team, "Bob")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def attachments_url(id = nil)
    [ "/teams/#{@team.code}/pages/#{@page.id}/attachments", id ].compact.join("/")
  end

  test "create uploads a file shown in the page's attachments" do
    post attachments_url, params: { attachment: { file: fixture_file_upload("notes.txt", "text/plain") } }, headers: @headers

    assert_response :created
    get "/teams/#{@team.code}/pages/#{@page.id}", headers: @headers
    assert_equal [ "notes.txt" ], JSON.parse(response.body)["page"]["attachments"].map { |attachment| attachment["filename"] }
  end

  test "pages in a hidden project are not found" do
    @page.update!(project: Project.create!(team: @team, name: "Secret", creator: @owner, owner: @owner))

    post attachments_url, params: { attachment: { file: fixture_file_upload("notes.txt", "text/plain") } }, headers: @headers

    assert_response :not_found
  end

  test "only the uploader, admins and the owner may delete a file, and inline images are not deleted here" do
    file = create_attachment(@page, @user)
    inline = create_attachment(@page, @user, kind: "inline")

    delete attachments_url(file.id), headers: { "Authorization" => "Bearer #{session_token(@bob)}" }
    assert_response :forbidden

    delete attachments_url(inline.id), headers: @headers
    assert_response :not_found

    delete attachments_url(file.id), headers: { "Authorization" => "Bearer #{session_token(@owner)}" }
    assert_response :no_content
  end

  test "page create claims pending uploads and returns the attachments" do
    inline = create_attachment(nil, @user, team: @team, kind: "inline")
    file = create_attachment(nil, @user, team: @team, fixture: "notes.txt", content_type: "text/plain")

    post "/teams/#{@team.code}/pages", params: { page: { title: "New", content: %(<img data-attachment-id="#{inline.id}">), attachment_ids: [ file.id ] } }, headers: @headers, as: :json

    assert_response :created
    page = JSON.parse(response.body)["page"]
    assert_equal [ file.id ], page["attachments"].map { |attachment| attachment["id"] }
    assert_equal [ page["id"] ] * 2, [ inline, file ].map { |attachment| attachment.reload.attachable_id }
  end

  test "a page save over the quota fails and keeps the old content" do
    other = Page.create!(team: @team, creator: @bob, title: "Other", content: "")
    source = create_attachment(other, @bob, kind: "inline")
    source.update_column(:byte_size, Attachment::TEAM_QUOTA_BYTES)

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: %(<img data-attachment-id="#{source.id}">), lock_version: @page.lock_version } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "STORAGE_QUOTA_EXCEEDED", JSON.parse(response.body)["code"]
    assert_equal "", @page.reload.content
    assert_equal 1, Attachment.count
  end

  test "a page save returns the content with copied image ids" do
    other = Page.create!(team: @team, creator: @bob, title: "Other", content: "")
    source = create_attachment(other, @bob, kind: "inline")

    patch "/teams/#{@team.code}/pages/#{@page.id}", params: { page: { content: %(<p>Hi</p><img data-attachment-id="#{source.id}">), lock_version: @page.lock_version } }, headers: @headers, as: :json

    assert_response :ok
    copy = @page.attachments.inline.sole
    assert_equal %(<p>Hi</p><img data-attachment-id="#{copy.id}">), JSON.parse(response.body)["page"]["content"]
  end
end
