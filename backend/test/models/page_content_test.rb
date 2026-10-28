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
end
