require "test_helper"

class TicketAttachmentsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "olivia@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Olivia")
    @user = create_member(@team, "Alice")
    @bob = create_member(@team, "Bob")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint 12")
    @ticket = Ticket.create!(board: @board, team: @team, created_by_user_id: @user.id, title: "Fix bug", position: 0)
    @headers = { "Authorization" => "Bearer #{session_token(@user)}" }
  end

  def attachments_url(id = nil)
    [ "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}/attachments", id ].compact.join("/")
  end

  def upload(headers: @headers)
    post attachments_url, params: { attachment: { file: fixture_file_upload("notes.txt", "text/plain") } }, headers: headers
  end

  test "create stores the file, returns it and broadcasts the new count" do
    upload

    assert_response :created
    attachment = JSON.parse(response.body)["attachment"]
    assert_equal [ "notes.txt", "text/plain", "file", "Alice" ], attachment.values_at("filename", "content_type", "kind").push(attachment["uploader"]["nickname"])
    assert_equal 1, @ticket.reload.attachments_count
    assert_equal [ 1 ], board_broadcasts(@board).map { |message| message["tickets"].first["attachment_count"] }
  end

  test "create without a file is rejected" do
    post attachments_url, params: { attachment: { kind: "file" } }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "FILE_REQUIRED", JSON.parse(response.body)["code"]
  end

  test "create rejects files over the size limit" do
    stub_const_max_bytes(10) { upload }

    assert_response :unprocessable_entity
    assert_equal "FILE_TOO_LARGE", JSON.parse(response.body)["code"]
  end

  test "create fails when the team quota would be exceeded" do
    filler = create_attachment(@ticket, @user)
    filler.update_column(:byte_size, Attachment::TEAM_QUOTA_BYTES)

    upload

    assert_response :unprocessable_entity
    assert_equal "STORAGE_QUOTA_EXCEEDED", JSON.parse(response.body)["code"]
  end

  test "tickets on a board in a hidden project are not found" do
    @board.update!(project: Project.create!(team: @team, name: "Secret", creator: @owner, owner: @owner))

    upload

    assert_response :not_found
  end

  test "create is forbidden while boards are disabled" do
    @team.update!(boards_enabled: false)

    upload

    assert_response :forbidden
    assert_equal "FEATURE_DISABLED", JSON.parse(response.body)["code"]
  end

  test "the uploader, admins and the owner may delete but other members may not" do
    attachments = 3.times.map { create_attachment(@ticket, @user) }
    admin = create_member(@team, "Ada")
    admin.memberships.first.update!(role: "admin")

    delete attachments_url(attachments[0].id), headers: { "Authorization" => "Bearer #{session_token(@bob)}" }
    assert_response :forbidden

    [ @user, admin, @owner ].each_with_index do |deleter, index|
      delete attachments_url(attachments[index].id), headers: { "Authorization" => "Bearer #{session_token(deleter)}" }
      assert_response :no_content
    end
    assert_equal 0, @ticket.reload.attachments_count
  end

  test "ticket show lists files newest first with the same number of queries for 1 and 10 attachments" do
    attach_avatar(@user)
    first = create_attachment(@ticket, @user)
    url = "/teams/#{@team.code}/boards/#{@board.id}/tickets/#{@ticket.id}"
    one = query_count { get url, headers: @headers }

    members = 3.times.map { |index| create_member(@team, nickname_for(index), with_avatar: index.zero?) }
    9.times { |index| create_attachment(@ticket, members[index % 3]) }
    ten = query_count { get url, headers: @headers }

    assert_equal one, ten
    body = JSON.parse(response.body)["ticket"]
    assert_equal 10, body["attachment_count"]
    assert_equal first.id, body["attachments"].last["id"]
  end

  private

  def stub_const_max_bytes(value)
    original = Attachment::MAX_BYTES
    Attachment.send(:remove_const, :MAX_BYTES)
    Attachment.const_set(:MAX_BYTES, value)
    yield
  ensure
    Attachment.send(:remove_const, :MAX_BYTES)
    Attachment.const_set(:MAX_BYTES, original)
  end
end
