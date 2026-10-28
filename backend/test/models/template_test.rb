require "test_helper"

class TemplateTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = User.create!(email: "alice@example.com", password: "supersecret")
  end

  def template(attributes = {})
    Template.new({ team: @team, creator: @user, kind: "page", title: "Meeting notes", content: "<p>Agenda</p>" }.merge(attributes))
  end

  def board_template(data)
    template(kind: "board", content: data.is_a?(String) ? data : data.to_json)
  end

  def board_data(columns: [ "To Do", "Done" ], priorities: [ { name: "Low", color: "blue" } ], tags: [ { name: "Bug", color: "red" } ])
    { columns: columns, priorities: priorities, tags: tags }
  end

  test "only accepts known kinds" do
    assert_not template(kind: "ticket").valid?
    Template::KINDS.each { |kind| assert template(kind: kind, content: kind == "board" ? board_data.to_json : "").valid? }
  end

  test "limits the title and the content size" do
    assert_not template(title: "a" * (ContentLimits::TITLE_MAX_LENGTH + 1)).valid?
    big = template(content: "a" * (ContentLimits::CONTENT_MAX_BYTES + 1))
    assert_not big.valid?
    assert big.errors.of_kind?(:content, :too_large)
  end

  test "accepts board content with columns and priorities, including empty lists" do
    assert board_template(board_data).valid?
    assert board_template(board_data(columns: [], priorities: [])).valid?
  end

  test "accepts board content without tags and validates tags like board tags" do
    assert board_template({ columns: [], priorities: [] }).valid?
    assert board_template(board_data(tags: [ { name: " #{"a" * 24} ", color: "teal" } ])).valid?
    assert board_template(board_data(tags: Array.new(BoardTag::MAX_PER_BOARD) { |index| { name: "Tag #{index}", color: "grey" } })).valid?

    [
      board_data(tags: [ { name: "", color: "red" } ]),
      board_data(tags: [ { name: "a" * 25, color: "red" } ]),
      board_data(tags: [ { name: "Bug", color: "pink" } ]),
      board_data(tags: [ { name: "Bug", color: "red" }, { name: " bug ", color: "blue" } ]),
      board_data(tags: Array.new(BoardTag::MAX_PER_BOARD + 1) { |index| { name: "Tag #{index}", color: "grey" } }),
      board_data(tags: "Bug")
    ].each do |data|
      assert_not board_template(data).valid?, "expected #{data[:tags].inspect} to be invalid"
    end
  end

  test "rejects board content that is not the expected shape" do
    [
      "not json",
      [ "To Do" ].to_json,
      { columns: [ "To Do" ] }.to_json,
      board_data(columns: [ "" ]),
      board_data(columns: [ 3 ]),
      board_data(columns: [ "a" * (ContentLimits::TITLE_MAX_LENGTH + 1) ]),
      board_data(priorities: [ { name: "Low", color: "pink" } ]),
      board_data(priorities: [ { name: "a" * 41, color: "blue" } ]),
      board_data(priorities: [ { name: "Low", color: "blue" }, { name: "LOW", color: "red" } ])
    ].each do |data|
      record = board_template(data)
      assert_not record.valid?, "expected #{data.inspect} to be invalid"
      assert record.errors.of_kind?(:content, :invalid)
    end
  end

  test "board content from a board keeps column and priority order and copies tags" do
    board = Board.create!(team: @team, creator: @user, title: "Sprint")
    board.columns.create!(title: "Review", position: 1)
    board.columns.create!(title: "Backlog", position: 0)
    board.priorities.first.update!(position: 10)
    board.tags.create!(name: "Urgent", color: "red")
    board.tags.create!(name: "api", color: "blue")

    record = board_template(Template.board_content_from(board.reload))

    assert record.valid?
    assert_equal [ "Backlog", "Review" ], record.board_columns
    assert_equal [ { "name" => "api", "color" => "blue" }, { "name" => "Urgent", "color" => "red" } ], record.board_tags
    assert_equal BoardPriority::DEFAULTS.drop(1).map { |priority| priority[:name] } + [ BoardPriority::DEFAULTS.first[:name] ], record.board_priorities.map { |priority| priority["name"] }
  end
end
