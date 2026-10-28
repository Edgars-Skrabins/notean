require "test_helper"

class AttachmentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "olivia@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Olivia")
    @user = create_member(@team, "Alice")
    @bob = create_member(@team, "Bob")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
    @bob_headers = { "Authorization" => "Bearer #{session_token(@bob)}" }
  end

  def file_url(attachment)
    "/teams/#{@team.code}/attachments/#{attachment.id}/file"
  end

  def hide_in_project(record)
    record.update!(project: Project.create!(team: @team, name: "Secret #{record.class}", creator: @owner, owner: @owner))
  end

  test "create stores a pending upload that only its uploader can fetch or delete" do
    post "/teams/#{@team.code}/attachments", params: { attachment: { file: fixture_file_upload("avatar.png", "image/png"), kind: "inline" } }, headers: @headers

    assert_response :created
    attachment = Attachment.find(JSON.parse(response.body)["attachment"]["id"])
    assert attachment.pending?

    get file_url(attachment), headers: @bob_headers
    assert_response :not_found
    delete "/teams/#{@team.code}/attachments/#{attachment.id}", headers: @bob_headers
    assert_response :not_found

    get file_url(attachment), headers: @headers
    assert_response :ok
    delete "/teams/#{@team.code}/attachments/#{attachment.id}", headers: @headers
    assert_response :no_content
  end

  test "create rejects an inline upload that is not an image" do
    post "/teams/#{@team.code}/attachments", params: { attachment: { file: fixture_file_upload("notes.txt", "text/plain"), kind: "inline" } }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "INLINE_IMAGE_TYPE_INVALID", JSON.parse(response.body)["code"]
  end

  test "claimed attachments cannot be deleted through the pending endpoint" do
    attachment = create_attachment(@page, @user)

    delete "/teams/#{@team.code}/attachments/#{attachment.id}", headers: @headers

    assert_response :not_found
    assert Attachment.exists?(attachment.id)
  end

  test "ticket and page files follow their item's project visibility" do
    ticket_file = create_attachment(@ticket, @user)
    page_file = create_attachment(@page, @user)

    get file_url(ticket_file), headers: @bob_headers
    assert_response :ok
    get file_url(page_file), headers: @bob_headers
    assert_response :ok

    hide_in_project(@board)
    hide_in_project(@page)

    get file_url(ticket_file), headers: @bob_headers
    assert_response :not_found
    get file_url(page_file), headers: @bob_headers
    assert_response :not_found
    get file_url(page_file), headers: { "Authorization" => "Bearer #{session_token(@owner)}" }
    assert_response :ok
  end

  test "files of trashed tickets, boards and pages are not found" do
    ticket_file = create_attachment(@ticket, @user)
    page_file = create_attachment(@page, @user)
    other_board = Board.create!(team: @team, creator: @user, title: "Other")
    board_ticket = Ticket.create!(board: other_board, team: @team, created_by_user_id: @user.id, title: "On board", position: 0)
    board_file = create_attachment(board_ticket, @user)

    Trash.move(@ticket, @user)
    Trash.move(@page, @user)
    Trash.move(other_board, @user)

    [ ticket_file, page_file, board_file ].each do |attachment|
      get file_url(attachment), headers: @headers
      assert_response :not_found
    end
  end

  test "files of a disabled feature are not found" do
    attachment = create_attachment(@page, @user)
    @team.update!(pages_enabled: false)

    get file_url(attachment), headers: @headers

    assert_response :not_found
  end

  test "non-images download as attachments and images display inline, both with nosniff" do
    text = create_attachment(@ticket, @user, fixture: "notes.txt", content_type: "text/plain")
    image = create_attachment(@ticket, @user)

    get file_url(text), headers: @headers
    assert_response :ok
    assert_match(/\Aattachment;/, response.headers["Content-Disposition"])
    assert_equal "application/octet-stream", response.media_type
    assert_equal "nosniff", response.headers["X-Content-Type-Options"]

    get file_url(image), headers: @headers
    assert_match(/\Ainline;/, response.headers["Content-Disposition"])
    assert_equal "image/png", response.media_type
    assert_equal file_fixture("avatar.png").binread, response.body
  end

  test "storage usage is shown to admins and the owner only" do
    attachment = create_attachment(@ticket, @user)

    get "/teams/#{@team.code}/storage_usage", headers: { "Authorization" => "Bearer #{session_token(@owner)}" }
    assert_response :ok
    assert_equal({ "used_bytes" => attachment.byte_size, "quota_bytes" => Attachment::TEAM_QUOTA_BYTES }, JSON.parse(response.body)["storage"])

    get "/teams/#{@team.code}/storage_usage", headers: @headers
    assert_response :forbidden
  end
end
