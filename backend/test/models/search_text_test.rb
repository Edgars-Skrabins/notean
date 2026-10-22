require "test_helper"

class SearchTextTest < ActiveSupport::TestCase
  test "from_html strips tags and collapses whitespace" do
    html = "<h1>Release   plan</h1>\n<p>Ship <strong>v2</strong> &amp; notes</p>"

    assert_equal "Release plan Ship v2 & notes", SearchText.from_html(html)
  end

  test "from_html keeps words in adjacent blocks apart" do
    assert_equal "first second", SearchText.from_html("<p>first</p><p>second</p>")
  end

  test "from_html handles nil" do
    assert_equal "", SearchText.from_html(nil)
  end

  test "from_diagram extracts node and edge labels" do
    json = {
      cells: [
        { shape: "flowchart-process", attrs: { text: { text: "Start  here" } } },
        { shape: "edge", labels: [ { attrs: { label: { text: "next" } } } ] },
        { shape: "edge", labels: [ "plain" ] },
        { shape: "flowchart-decision", attrs: { body: { fill: "#fff" } } }
      ]
    }.to_json

    assert_equal "Start here next plain", SearchText.from_diagram(json)
  end

  test "from_diagram gives an empty string for invalid JSON" do
    assert_equal "", SearchText.from_diagram("{not json")
    assert_equal "", SearchText.from_diagram("")
    assert_equal "", SearchText.from_diagram("[1, 2]")
  end
end
