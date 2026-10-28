require "test_helper"

class PageContentTest < ActiveSupport::TestCase
  test "keeps only the attachment id and alt on images" do
    html = PageContent.sanitize('<p>Hi</p><img data-attachment-id="12" alt="Chart" src="https://evil.example/x.png" onerror="alert(1)" width="10">')

    assert_equal '<p>Hi</p><img data-attachment-id="12" alt="Chart">', html
  end

  test "removes images without a numeric attachment id" do
    assert_equal "<p>Hi</p>", PageContent.sanitize('<p>Hi</p><img src="https://example.com/a.png"><img data-attachment-id="x">')
  end

  test "keeps the usual safe list for other tags and drops data attributes there" do
    html = '<p data-attachment-id="1"><strong>Bold</strong> <a href="/x" onclick="x()">link</a></p>'

    assert_equal '<p><strong>Bold</strong> <a href="/x">link</a></p>', PageContent.sanitize(html)
  end

  test "keeps only the mention attributes on mention spans and strips item titles" do
    html = '<p><span data-type="mention" data-mention-type="ticket" data-id="3" data-label="Bug" onclick="x()" style="color:red">@Bug</span> ' \
      '<span data-type="mention" data-mention-type="user" data-id="4" data-label="Ann" style="x">@Ann</span></p>'

    assert_equal '<p><span data-type="mention" data-mention-type="ticket" data-id="3">@</span> ' \
      '<span data-type="mention" data-mention-type="user" data-id="4" data-label="Ann">@Ann</span></p>', PageContent.sanitize(html)
  end

  test "drops mention attributes from spans that are not valid mentions" do
    html = '<p><span data-type="mention" data-mention-type="team" data-id="3">@x</span></p>'

    assert_equal "<p><span>@x</span></p>", PageContent.sanitize(html)
  end

  test "comment bodies keep user mentions and strip item titles" do
    html = '<p><span data-type="mention" data-mention-type="user" data-id="3" data-label="Ann">@Ann</span>' \
      '<span data-type="mention" data-mention-type="page" data-id="5" data-label="Secret">@Secret</span></p>'

    assert_equal '<p><span data-type="mention" data-mention-type="user" data-id="3" data-label="Ann">@Ann</span>' \
      '<span data-type="mention" data-mention-type="page" data-id="5">@</span></p>', CommentBody.sanitize(html)
  end
end
