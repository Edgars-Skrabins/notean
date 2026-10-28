require "test_helper"

class MentionsTest < ActiveSupport::TestCase
  test "reads plain-text tokens with and without labels and skips invalid ones" do
    text = "See @[ticket:12|Login bug] and @[user:3]\n@[ticket:12|Old name] @[folder:4|x] @[page:abc|y] @[page:7|"

    assert_equal [ [ "ticket", 12 ], [ "user", 3 ] ], Mentions.refs_in_text(text)
  end

  test "reads mention spans from html and skips invalid ones" do
    html = '<p><span data-type="mention" data-mention-type="page" data-id="5" data-label="Spec">@Spec</span> ' \
      '<span data-type="mention" data-mention-type="team" data-id="1">@x</span> ' \
      '<span data-type="mention" data-mention-type="user" data-id="x">@y</span> ' \
      '<span data-mention-type="user" data-id="2">@z</span></p>'

    assert_equal [ [ "page", 5 ] ], Mentions.refs_in_html(html)
  end

  test "returns the mentioned user ids" do
    assert_equal [ 3, 9 ], Mentions.user_ids_in("@[user:3|Ann] @[page:1] @[user:9] @[user:3]", html: false)
    assert_equal [ 4 ], Mentions.user_ids_in('<span data-type="mention" data-mention-type="user" data-id="4">@Bo</span>', html: true)
  end

  test "strips item labels from plain-text tokens and keeps user labels" do
    text = "@[ticket:1|Secret bug] @[user:2|Ann] @[project:3|Apollo] @[page:4]"

    assert_equal "@[ticket:1] @[user:2|Ann] @[project:3] @[page:4]", Mentions.strip_item_labels(text, html: false)
    assert_nil Mentions.strip_item_labels(nil, html: false)
  end
end
