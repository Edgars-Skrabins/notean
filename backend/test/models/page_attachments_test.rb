require "test_helper"

class PageAttachmentsTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @owner = User.create!(email: "olivia@example.com", password: "supersecret")
    Membership.create!(user: @owner, team: @team, role: "owner", nickname: "Olivia")
    @user = create_member(@team, "Alice")
    @bob = create_member(@team, "Bob")
    @page = Page.create!(team: @team, creator: @user, title: "Notes", content: "")
  end

  def image(attachment)
    %(<img data-attachment-id="#{attachment.id}" alt="pic">)
  end

  def sync(page, content, user: @user, pending_file_ids: [])
    page.content = content
    attachments = PageAttachments.new(page, user, ProjectAccess.new(user, @team), pending_file_ids: pending_file_ids)
    return false unless attachments.prepare

    page.save!
    attachments.finish
    true
  end

  test "claims the user's own pending inline and file uploads" do
    inline = create_attachment(nil, @user, team: @team, kind: "inline")
    file = create_attachment(nil, @user, team: @team, fixture: "notes.txt", content_type: "text/plain")
    page = Page.new(team: @team, creator: @user, title: "New")

    assert sync(page, "<p>Hi</p>#{image(inline)}", pending_file_ids: [ file.id ])

    assert_equal [ [ "Page", page.id ] ] * 2, [ inline.reload, file.reload ].map { |attachment| [ attachment.attachable_type, attachment.attachable_id ] }
    assert_equal "<p>Hi</p>#{image(inline)}", page.content
  end

  test "drops other users' pending uploads and unknown ids from the content" do
    foreign = create_attachment(nil, @bob, team: @team, kind: "inline")

    sync(@page, "<p>Hi</p>#{image(foreign)}<img data-attachment-id=\"999999\">")

    assert_equal "<p>Hi</p>", @page.content
    assert foreign.reload.pending?
  end

  test "destroys inline images removed from the content but keeps file attachments" do
    kept = create_attachment(@page, @user, kind: "inline")
    removed = create_attachment(@page, @user, kind: "inline")
    file = create_attachment(@page, @user)

    sync(@page, image(kept))

    assert_equal [ file.id, kept.id ].sort, Attachment.pluck(:id).sort
    assert_not Attachment.exists?(removed.id)
  end

  test "copies an image pasted from a visible page onto the same blob" do
    other = Page.create!(team: @team, creator: @bob, title: "Other", content: "")
    source = create_attachment(other, @bob, kind: "inline")

    sync(@page, image(source))

    copy = @page.attachments.inline.sole
    assert_not_equal source.id, copy.id
    assert_equal source.file.blob, copy.file.blob
    assert_equal image(copy), @page.content
    assert_equal @user.id, copy.created_by_user_id
  end

  test "removes an image pasted from a page the user cannot see" do
    secret = Page.create!(team: @team, creator: @owner, title: "Secret", content: "", project: Project.create!(team: @team, name: "Secret", creator: @owner, owner: @owner))
    source = create_attachment(secret, @owner, kind: "inline")

    sync(@page, image(source))

    assert_equal "", @page.content
    assert_empty @page.attachments
  end

  test "refuses copies that would exceed the team quota without writing anything" do
    other = Page.create!(team: @team, creator: @bob, title: "Other", content: "")
    source = create_attachment(other, @bob, kind: "inline")
    source.update_column(:byte_size, Attachment::TEAM_QUOTA_BYTES)

    assert_not sync(@page, image(source))
    assert_equal 1, Attachment.count
  end
end
